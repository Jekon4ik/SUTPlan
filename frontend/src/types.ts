export interface ScheduleEvent {
  uid: string
  start: string        // ISO 8601 e.g. "2026-03-09T08:15:00+01:00"
  end: string          // ISO 8601
  subject: string | null
  type: ClassType | null
  teacher: string | null
  room: string | null
  summary_raw: string
}

export type ClassType = 'wyk' | 'lab' | 'proj' | 'ćw' | 'semin' | 'lektorat'

export interface ClassTypeMeta {
  label: string        // Polish display name
  color: string        // Tailwind bg class for the accent bar
  textColor: string    // Tailwind text class for the badge
  badgeBg: string      // Tailwind bg class for the badge
}

export const CLASS_TYPE_META: Record<string, ClassTypeMeta> = {
  wyk:      { label: 'Wykład',       color: 'bg-amber-500',  textColor: 'text-amber-400',  badgeBg: 'bg-amber-500/20' },
  lab:      { label: 'Laboratorium', color: 'bg-blue-500',   textColor: 'text-blue-400',   badgeBg: 'bg-blue-500/20'  },
  proj:     { label: 'Projekt',      color: 'bg-purple-500', textColor: 'text-purple-400', badgeBg: 'bg-purple-500/20'},
  'ćw':     { label: 'Ćwiczenia',    color: 'bg-green-500',  textColor: 'text-green-400',  badgeBg: 'bg-green-500/20' },
  semin:    { label: 'Seminarium',   color: 'bg-teal-500',   textColor: 'text-teal-400',   badgeBg: 'bg-teal-500/20'  },
  lektorat: { label: 'Lektorat',     color: 'bg-rose-500',   textColor: 'text-rose-400',   badgeBg: 'bg-rose-500/20'  },
}

export const DEFAULT_TYPE_META: ClassTypeMeta = {
  label: 'Zajęcia',
  color: 'bg-gray-500',
  textColor: 'text-gray-400',
  badgeBg: 'bg-gray-500/20',
}
