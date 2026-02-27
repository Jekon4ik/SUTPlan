import { weekLabel, weekLabelFromEvents } from '../lib/weeks'
import type { ScheduleEvent } from '../types'

interface Props {
  week: number
  events?: ScheduleEvent[]   // when provided, label is derived from actual dates
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
}

export function WeekNavigator({ week, events, onPrev, onNext, canGoPrev, canGoNext }: Props) {
  const label = events && events.length > 0
    ? weekLabelFromEvents(events, week)
    : weekLabel(week)

  return (
    <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Poprzedni tydzień"
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-300
                     hover:bg-gray-700 active:bg-gray-600 disabled:opacity-30
                     disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-medium">Tydzień {week}</div>
          <div className="text-sm text-gray-200 font-semibold mt-0.5">{label}</div>
        </div>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Następny tydzień"
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-300
                     hover:bg-gray-700 active:bg-gray-600 disabled:opacity-30
                     disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
