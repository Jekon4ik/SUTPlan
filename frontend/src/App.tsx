import { useState } from 'react'
import { useSchedule } from './hooks/useSchedule'
import { WeekNavigator } from './components/WeekNavigator'
import { DaySection } from './components/DaySection'
import { SkeletonWeek, EmptyWeek, ErrorState } from './components/StatusViews'
import { currentWeek, toDateKey } from './lib/weeks'
import type { ScheduleEvent } from './types'

const WEEK_KEY = 'sutplan_week'
const MIN_WEEK = 19   // first week of semester — never go before this
const MAX_WEEK = 54

function getInitialWeek(): number {
  const stored = localStorage.getItem(WEEK_KEY)
  if (stored) {
    const n = parseInt(stored, 10)
    if (!isNaN(n) && n >= MIN_WEEK && n <= MAX_WEEK) return n
  }
  return currentWeek()
}

function groupByDay(events: ScheduleEvent[]): [string, ScheduleEvent[]][] {
  const map = new Map<string, ScheduleEvent[]>()
  for (const event of events) {
    const key = toDateKey(event.start)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(event)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export default function App() {
  const [week, setWeek] = useState<number>(getInitialWeek)
  const { data, isLoading, isError, error, refetch } = useSchedule(week)

  function changeWeek(next: number) {
    const clamped = Math.max(MIN_WEEK, Math.min(MAX_WEEK, next))
    setWeek(clamped)
    localStorage.setItem(WEEK_KEY, String(clamped))
  }

  const days = data ? groupByDay(data) : []

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-100 leading-none">Plan PŚ</h1>
            <p className="text-xs text-gray-500 mt-0.5">s1_IPpp VI/1</p>
          </div>
        </div>
      </header>

      {/* Week navigator */}
      <WeekNavigator
        week={week}
        events={data}
        onPrev={() => changeWeek(week - 1)}
        onNext={() => changeWeek(week + 1)}
        canGoPrev={week > MIN_WEEK}
        canGoNext={week < MAX_WEEK}
      />

      {/* Content */}
      <main className="max-w-2xl mx-auto pb-10">
        {isLoading && <SkeletonWeek />}

        {isError && (
          <ErrorState
            message={error?.message ?? 'Sprawdź połączenie z internetem.'}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && days.length === 0 && <EmptyWeek />}

        {!isLoading && !isError && days.map(([dateKey, events]) => (
          <DaySection key={dateKey} dateKey={dateKey} events={events} />
        ))}
      </main>
    </div>
  )
}
