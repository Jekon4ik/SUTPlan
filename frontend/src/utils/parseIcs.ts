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
    // Parse ICS content into jCal format
    const jcal = ICAL.parse(icsContent);
    
    // Create a Component from jCal format
    const component = new ICAL.Component(jcal);

    // Walk through all VEVENT components
    for (const vevent of component.getAllSubcomponents("vevent")) {
      const uid = String(vevent.getFirstPropertyValue("uid") || "");
      const summaryRaw = String(vevent.getFirstPropertyValue("summary") || "");
      const dtstart = vevent.getFirstPropertyValue("dtstart");
      const dtend = vevent.getFirstPropertyValue("dtend");

      // Skip events without proper start/end times
      if (!dtstart || !dtend) {
        console.warn("VEVENT without DTSTART/DTEND (uid=%s) — skipping", uid);
        continue;
      }

      // Convert ICAL.Time to JavaScript Date and then to ISO string with Warsaw timezone
      // Type assertion needed because ical.js has loose typing
      const dtstartTime = dtstart as ICAL.Time;
      const dtendTime = dtend as ICAL.Time;
      
      const startIso = dateToIso(dtstartTime.toJSDate());
      const endIso = dateToIso(dtendTime.toJSDate());

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
