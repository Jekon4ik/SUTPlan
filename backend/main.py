import asyncio
import os
import re
import logging
import subprocess
import warnings
from datetime import datetime
from typing import Optional

import pytz
from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from icalendar import Calendar
from pydantic import BaseModel

warnings.filterwarnings("ignore", message=".*Unverified HTTPS.*")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv()

CACHE_TTL = int(os.getenv("CACHE_TTL", 7200))
CACHE_MAXSIZE = int(os.getenv("CACHE_MAXSIZE", 128))

PLAN_URL = "https://plan.polsl.pl/plan.php"
WARSAW_TZ = pytz.timezone("Europe/Warsaw")

# Use the Windows system curl (schannel TLS) — plan.polsl.pl rejects OpenSSL connections.
# Falls back to whatever curl is on PATH (works on Linux/Mac too with -k).
CURL_EXE = os.getenv("CURL_EXE", "C:/Windows/System32/curl.exe")
if not os.path.isfile(CURL_EXE):
    CURL_EXE = "curl"   # fallback to PATH on non-Windows

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SUT Plan API",
    description="API do pobierania planu zajęć Politechniki Śląskiej.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def _fetch_ics_sync(group_id: str, week: int) -> str:
    """
    Fetch ICS via Windows system curl (schannel TLS).

    plan.polsl.pl resets connections from Python's OpenSSL stack regardless of
    verify=False or OP_LEGACY_SERVER_CONNECT — the server only accepts the
    Windows-native schannel TLS fingerprint. Calling the system curl.exe
    (C:/Windows/System32/curl.exe) is the reliable workaround.
    """
    url = (
        f"{PLAN_URL}"
        f"?type=0&id={group_id}&cvsfile=true&w={week}"
    )
    result = subprocess.run(
        [CURL_EXE, "-s", "-k", "--max-time", "15", url],
        capture_output=True,
        timeout=20,
    )

    if result.returncode not in (0, 56):
        # returncode 56 = "recv() failure" — server closes without close_notify
        # (common with old IIS) but the body is still fully received.
        # Any other non-zero code is a real error.
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"curl zakończył się kodem {result.returncode}: {stderr}")

    return result.stdout.decode("utf-8", errors="replace")


async def fetch_ics(group_id: str, week: int) -> str:
    """Async wrapper around _fetch_ics_sync."""
    try:
        content = await asyncio.to_thread(_fetch_ics_sync, group_id, week)
    except subprocess.TimeoutExpired:
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
