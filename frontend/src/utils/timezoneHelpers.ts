/**
 * Timezone utilities for converting UTC times to Europe/Warsaw
 */

import { toZonedTime, format } from "date-fns-tz";

const WARSAW_TZ = "Europe/Warsaw";

/**
 * Convert a Date to Europe/Warsaw timezone
 * @param date - JavaScript Date object (can be in any timezone)
 * @returns Date object in Warsaw timezone
 */
export function toWarsaw(date: Date): Date {
  return toZonedTime(date, WARSAW_TZ);
}

/**
 * Convert a Date to ISO 8601 string with timezone offset
 * Example output: "2026-03-09T16:45:00+01:00"
 * @param date - JavaScript Date object
 * @returns ISO 8601 string with UTC offset
 */
export function dateToIso(date: Date): string {
  const zonedDate = toWarsaw(date);
  // Format as ISO string with offset in Europe/Warsaw timezone
  // The 'X' format token gives us the timezone offset as ±HH:mm
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm:ssX", { timeZone: WARSAW_TZ });
}
