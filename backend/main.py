import os
import re
import logging
from datetime import datetime
from typing import Optional

import httpx
import pytz
from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from icalendar import Calendar
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv(override=False)  # Railway env vars take priority over any .env file

CACHE_TTL     = int(os.getenv("CACHE_TTL", 7200))
CACHE_MAXSIZE = int(os.getenv("CACHE_MAXSIZE", 128))

# On production this points to the Cloudflare Worker proxy URL so that
# Linux httpx never has to negotiate TLS directly with plan.polsl.pl.
# Locally it falls back to the university server directly (Windows curl
# workaround is no longer needed — httpx is used everywhere).
PLAN_URL  = os.getenv("PLAN_URL", "https://sutplan-proxy.yaold623.workers.dev").strip()
# Ensure the protocol is present — Railway UI sometimes strips 'https://' on paste
if not PLAN_URL.startswith("http"):
    PLAN_URL = "https://" + PLAN_URL
WARSAW_TZ = pytz.timezone("Europe/Warsaw")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("PLAN_URL = %r", PLAN_URL)  # shows exact value (incl. hidden chars) on startup

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SUT Plan API",
    description="API do pobierania planu zajęć Politechniki Śląskiej.",
    version="1.0.0",
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://sut-plan.vercel.app",
).strip().split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

cache: TTLCache = TTLCache(maxsize=CACHE_MAXSIZE, ttl=CACHE_TTL)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ScheduleEvent(BaseModel):
    uid: str
    start: str          # ISO 8601 with Europe/Warsaw offset
    end: str            # ISO 8601 with Europe/Warsaw offset
    subject: Optional[str] = None
    type: Optional[str] = None
    teacher: Optional[str] = None
    room: Optional[str] = None
    summary_raw: str

# ---------------------------------------------------------------------------
# SUMMARY parser
# ---------------------------------------------------------------------------

# Known class type keywords, ordered longest-first to avoid partial matches
# (e.g. "lektorat" before "lab")
_KNOWN_TYPES = ["lektorat", "semin", "proj", "wyk", "lab", "ćw"]
_TYPES_PATTERN = "|".join(re.escape(t) for t in _KNOWN_TYPES)

# Pattern:
#   ^(?P<subject>.+?)          — subject: non-greedy, everything before the type
#   \s+                        — whitespace separator
#   (?P<type>wyk|lab|...)      — one of the known type keywords
#   \s+                        — whitespace separator
#   (?P<teacher>\S+)           — teacher: first non-whitespace token
#   \s+                        — whitespace separator
#   (?P<rest>.+)$              — rest: building + room (everything remaining)
_SUMMARY_RE = re.compile(
    rf"^(?P<subject>.+?)\s+(?P<type>{_TYPES_PATTERN})\s+(?P<teacher>\S+)\s+(?P<rest>.+)$",
    re.IGNORECASE,
)


def parse_summary(summary: str) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Parse the SUMMARY field from a VEVENT.

    Returns (subject, type, teacher, room) — all can be None if parsing fails.

    Example inputs from real data:
        "Gk lab MaS 3073 - s.lab. 352A"           → ("Gk", "lab", "MaS", "3073 - s.lab. 352A")
        "GK (BN) lab BNo 3072 - s.lab. 353"       → ("GK (BN)", "lab", "BNo", "3072 - s.lab. 353")
        "Smiw w wyk BZ 4001 - OLIMP - sekcja"     → ("Smiw w", "wyk", "BZ", "4001 - OLIMP - sekcja")
        "Prir wyk MBl 3030 - s.lab. 329 3029 ..." → ("Prir", "wyk", "MBl", "3030 - s.lab. 329 ...")
    """
    summary = summary.strip()
    match = _SUMMARY_RE.match(summary)
    if not match:
        logger.warning("Nie można sparsować SUMMARY: %r", summary)
        return None, None, None, None

    subject = match.group("subject").strip()
    class_type = match.group("type").lower()
    teacher = match.group("teacher").strip()
    room = match.group("rest").strip()

    return subject, class_type, teacher, room


# ---------------------------------------------------------------------------
# Timezone helpers
# ---------------------------------------------------------------------------

def to_warsaw(dt: datetime) -> datetime:
    """Convert a timezone-aware datetime to Europe/Warsaw."""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(WARSAW_TZ)


def dt_to_iso(dt: datetime) -> str:
    """Return ISO 8601 string with UTC offset, e.g. 2026-03-09T16:45:00+01:00"""
    return to_warsaw(dt).isoformat()


# ---------------------------------------------------------------------------
# ICS fetching & parsing
# ---------------------------------------------------------------------------

async def fetch_ics(group_id: str, week: int) -> str:
    """
    Fetch the ICS file for a given group and week.

    In production PLAN_URL points to a Cloudflare Worker proxy so that
    httpx never negotiates TLS directly with plan.polsl.pl (which rejects
    non-Windows TLS fingerprints).  Locally the default URL hits the
    university server directly — works fine on Windows.
    """
    url = f"{PLAN_URL}?type=0&id={group_id}&cvsfile=true&w={week}"
    logger.info("Fetching: %r", url)
    try:
        async with httpx.AsyncClient(timeout=20, verify=False) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.text
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=502,
            detail="Nie można połączyć się z serwerem uczelni (przekroczono czas oczekiwania).",
        )
    except Exception as e:
        logger.error("Błąd pobierania planu: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Nie można połączyć się z serwerem uczelni.",
        )

    if not content.strip().startswith("BEGIN:VCALENDAR"):
        raise HTTPException(
            status_code=502,
            detail="Serwer uczelni zwrócił nieprawidłowe dane (brak pliku iCalendar).",
        )
    return content


def parse_ics(ics_content: str) -> list[ScheduleEvent]:
    """Parse raw ICS text into a list of ScheduleEvent objects."""
    cal = Calendar.from_ical(ics_content)
    events: list[ScheduleEvent] = []

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        uid = str(component.get("UID", ""))
        summary_raw = str(component.get("SUMMARY", ""))
        dtstart = component.get("DTSTART")
        dtend = component.get("DTEND")

        if dtstart is None or dtend is None:
            logger.warning("VEVENT bez DTSTART/DTEND (uid=%s) – pomijam.", uid)
            continue

        start_iso = dt_to_iso(dtstart.dt)
        end_iso = dt_to_iso(dtend.dt)

        subject, class_type, teacher, room = parse_summary(summary_raw)

        events.append(
            ScheduleEvent(
                uid=uid,
                start=start_iso,
                end=end_iso,
                subject=subject,
                type=class_type,
                teacher=teacher,
                room=room,
                summary_raw=summary_raw,
            )
        )

    # Sort by start time ascending
    events.sort(key=lambda e: e.start)
    return events


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Diagnostyka"])
async def health():
    """Sprawdzenie stanu serwisu."""
    return {"status": "ok"}


@app.get("/schedule", response_model=list[ScheduleEvent], tags=["Plan zajęć"])
async def get_schedule(
    group_id: str = Query(..., description="ID grupy zajęciowej"),
    week: int = Query(..., ge=1, le=54, description="Numer tygodnia (1–54)"),
):
    """
    Zwraca listę zajęć dla podanej grupy i tygodnia.
    Wyniki są buforowane przez 2 godziny.
    """
    cache_key = f"{group_id}:{week}"

    if cache_key in cache:
        logger.info("Cache hit: %s", cache_key)
        return cache[cache_key]

    logger.info("Cache miss: %s — pobieranie z serwera uczelni.", cache_key)
    ics_content = await fetch_ics(group_id, week)
    events = parse_ics(ics_content)

    cache[cache_key] = events
    return events
