/**
 * Parse ICS (iCalendar) files into structured ScheduleEvent objects
 */

import ICAL from "ical.js";
import { parseSummary } from "./parseSummary";
import { dateToIso } from "./timezoneHelpers";
import type { ScheduleEvent } from "../types";

/**
 * Parse raw ICS text into a list of ScheduleEvent objects
 * @param icsContent - Raw ICS file content (text)
 * @returns Array of ScheduleEvent objects sorted by start time
 * @throws Error if ICS content is invalid or cannot be parsed
 */
export function parseIcs(icsContent: string): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];

  try {
    // Parse ICS content into jCal format, then to ICAL.js components
    const jcal = ICAL.parse(icsContent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calendar = new (ICAL as any).Calendar(jcal);

    // Walk through all VEVENT components in calendar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const component of (calendar as any).getAllSubcomponents("vevent")) {
      const uid = component.getFirstPropertyValue("uid") || "";
      const summaryRaw = component.getFirstPropertyValue("summary") || "";
      const dtstart = component.getFirstPropertyValue("dtstart");
      const dtend = component.getFirstPropertyValue("dtend");

      // Skip events without proper start/end times
      if (!dtstart || !dtend) {
        console.warn("VEVENT without DTSTART/DTEND (uid=%s) — skipping", uid);
        continue;
      }

      // Convert ICAL.Time to JavaScript Date and then to ISO string with Warsaw timezone
      const startIso = dateToIso(dtstart.toJSDate());
      const endIso = dateToIso(dtend.toJSDate());

      // Parse SUMMARY field to extract subject, type, teacher, room
      const { subject, type, teacher, room } = parseSummary(summaryRaw);

      events.push({
        uid,
        start: startIso,
        end: endIso,
        subject,
        type,
        teacher,
        room,
        summary_raw: summaryRaw,
      });
    }

    // Sort events by start time (ascending)
    events.sort((a, b) => a.start.localeCompare(b.start));

    return events;
  } catch (error) {
    console.error("Error parsing ICS content:", error);
    throw new Error(
      `Failed to parse ICS calendar data: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
