/**
 * Parse SUMMARY field from ICS VEVENT
 * 
 * Expected format: "Subject Type Teacher Room"
 * Example: "Gk lab MaS 3073 - s.lab. 352A"
 */

// Class type keywords ordered longest-first to avoid partial matches
// (e.g., "lektorat" before "lab")
const KNOWN_TYPES = ["lektorat", "semin", "proj", "wyk", "lab", "ćw"] as const;

// Build regex pattern: ^Subject Type Teacher Room$
const TYPES_PATTERN = KNOWN_TYPES.join("|");
const SUMMARY_REGEX = new RegExp(
  `^(?<subject>.+?)\\s+(?<type>${TYPES_PATTERN})\\s+(?<teacher>\\S+)\\s+(?<rest>.+)$`,
  "i" // case-insensitive
);

export type ClassType = (typeof KNOWN_TYPES)[number];

export interface ParsedSummary {
  subject: string | null;
  type: ClassType | null;
  teacher: string | null;
  room: string | null;
}

/**
 * Parse the SUMMARY field from a VEVENT.
 * Returns an object with subject, type, teacher, room - all can be null if parsing fails.
 * 
 * Example inputs from real data:
 *   "Gk lab MaS 3073 - s.lab. 352A"           → subject: "Gk", type: "lab", teacher: "MaS", room: "3073 - s.lab. 352A"
 *   "GK (BN) lab BNo 3072 - s.lab. 353"       → subject: "GK (BN)", type: "lab", teacher: "BNo", room: "3072 - s.lab. 353"
 *   "Smiw w wyk BZ 4001 - OLIMP - sekcja"     → subject: "Smiw w", type: "wyk", teacher: "BZ", room: "4001 - OLIMP - sekcja"
 *   "Prir wyk MBl 3030 - s.lab. 329 3029 ..." → subject: "Prir", type: "wyk", teacher: "MBl", room: "3030 - s.lab. 329 ..."
 */
export function parseSummary(summary: string): ParsedSummary {
  const trimmed = summary.trim();

  const match = trimmed.match(SUMMARY_REGEX);
  if (!match?.groups) {
    console.warn("Failed to parse SUMMARY:", summary);
    return { subject: null, type: null, teacher: null, room: null };
  }

  return {
    subject: match.groups.subject.trim(),
    type: (match.groups.type.toLowerCase() as ClassType) || null,
    teacher: match.groups.teacher.trim(),
    room: match.groups.rest.trim(),
  };
}
