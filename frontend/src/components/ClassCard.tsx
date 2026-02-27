import type { ScheduleEvent } from '../types'
import { CLASS_TYPE_META, DEFAULT_TYPE_META } from '../types'
import { formatTime } from '../lib/weeks'

interface Props {
  event: ScheduleEvent
}

export function ClassCard({ event }: Props) {
  const meta = event.type ? (CLASS_TYPE_META[event.type] ?? DEFAULT_TYPE_META) : DEFAULT_TYPE_META
  const startTime = formatTime(event.start)
  const endTime = formatTime(event.end)

  return (
    <div className="flex bg-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* Colored accent bar */}
      <div className={`w-1.5 shrink-0 ${meta.color}`} />

      {/* Content */}
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {/* Subject + type badge */}
          <div className="min-w-0">
            <span className="text-base font-bold text-gray-100 leading-tight block truncate">
              {event.subject ?? event.summary_raw}
            </span>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badgeBg} ${meta.textColor}`}>
              {meta.label}
            </span>
          </div>

          {/* Time */}
          <div className="text-right shrink-0">
            <span className="text-sm font-semibold text-gray-200">{startTime}</span>
            <span className="block text-xs text-gray-500">{endTime}</span>
          </div>
        </div>

        {/* Teacher + room */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          {event.teacher && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-60">
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
              </svg>
              {event.teacher}
            </span>
          )}
          {event.room && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-60">
                <path fillRule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.36 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.237 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
              </svg>
              {event.room}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
