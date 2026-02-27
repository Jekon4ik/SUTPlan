/**
 * Week number ↔ date mapping for Politechnika Śląska schedule system.
 *
 * The university uses an internal week numbering that does NOT match ISO weeks
 * and skips over exam sessions / semester breaks. Within taught weeks the
 * numbers are contiguous (+1 per calendar week).
 *
 * Anchor confirmed from live server data:
 *   Week 19 = Monday 02 Mar 2026
 */

import type { ScheduleEvent } from '../types'

const ANCHOR_WEEK = 19
// Monday 02 Mar 2026 — confirmed from live server data
const ANCHOR_MONDAY = new Date('2026-03-02T00:00:00')

// First week of the semester — never default to an earlier week
const FIRST_SEMESTER_WEEK = 19

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

/** Returns the Monday Date for a given university week number. */
export function weekToMonday(week: number): Date {
  return new Date(ANCHOR_MONDAY.getTime() + (week - ANCHOR_WEEK) * MS_PER_WEEK)
}

/** Returns the Sunday Date for a given university week number. */
export function weekToSunday(week: number): Date {
  return new Date(weekToMonday(week).getTime() + 6 * MS_PER_DAY)
}

/**
 * Returns the university week number for a given date.
 * Clamps to the valid range [1, 54].
 */
export function dateToWeek(date: Date): number {
  const diffMs = date.getTime() - ANCHOR_MONDAY.getTime()
  const diffWeeks = Math.floor(diffMs / MS_PER_WEEK)
  const week = ANCHOR_WEEK + diffWeeks
  return Math.max(1, Math.min(54, week))
}

/** Returns the university week number for today.
 *  Never returns a week before the semester starts. */
export function currentWeek(): number {
  return Math.max(dateToWeek(new Date()), FIRST_SEMESTER_WEEK)
}

const PL_MONTHS = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
]

function fmt(date: Date): string {
  return `${date.getDate()} ${PL_MONTHS[date.getMonth()]}`
}

/** Returns a human-readable label e.g. "9 mar – 13 mar" from the anchor formula. */
export function weekLabel(week: number): string {
  const mon = weekToMonday(week)
  const sun = weekToSunday(week)
  return `${fmt(mon)} – ${fmt(sun)}`
}

/**
 * Returns a human-readable week label derived from actual event dates.
 * When events are present this is always accurate regardless of anchor drift.
 * Falls back to weekLabel(week) when the events array is empty.
 */
export function weekLabelFromEvents(events: ScheduleEvent[], week: number): string {
  if (!events || events.length === 0) return weekLabel(week)

  // Collect unique YYYY-MM-DD keys from event start times
  const dateKeys = Array.from(new Set(events.map(e => e.start.split('T')[0]))).sort()
  const first = dateKeys[0]
  const last  = dateKeys[dateKeys.length - 1]

  const [fy, fm, fd] = first.split('-').map(Number)
  const [ly, lm, ld] = last.split('-').map(Number)

  const firstDate = new Date(fy, fm - 1, fd)
  const lastDate  = new Date(ly, lm - 1, ld)

  if (fm === lm) {
    // Same month: "9 – 13 mar"
    return `${firstDate.getDate()} – ${fmt(lastDate)}`
  }
  // Different months: "30 mar – 3 kwi"
  return `${fmt(firstDate)} – ${fmt(lastDate)}`
}

const PL_DAYS_LONG = [
  'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa',
  'Czwartek', 'Piątek', 'Sobota',
]

const PL_MONTHS_LONG = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** Returns a full Polish day header e.g. "Poniedziałek, 9 marca" */
export function dayHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dayName = PL_DAYS_LONG[date.getDay()]
  const monthName = PL_MONTHS_LONG[date.getMonth()]
  return `${dayName}, ${day} ${monthName}`
}

/** Returns the YYYY-MM-DD date string from an ISO 8601 datetime string. */
export function toDateKey(isoString: string): string {
  return isoString.split('T')[0]
}

/** Formats a time string from ISO 8601 e.g. "08:15" */
export function formatTime(isoString: string): string {
  return isoString.split('T')[1].substring(0, 5)
}
