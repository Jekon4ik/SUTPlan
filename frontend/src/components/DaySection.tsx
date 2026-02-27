import type { ScheduleEvent } from '../types'
import { ClassCard } from './ClassCard'
import { dayHeader } from '../lib/weeks'

interface Props {
  dateKey: string          // YYYY-MM-DD
  events: ScheduleEvent[]
}

export function DaySection({ dateKey, events }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-4 pt-5 pb-2">
        {dayHeader(dateKey + 'T00:00:00')}
      </h2>
      <div className="px-4 flex flex-col gap-3">
        {events.map(event => (
          <ClassCard key={event.uid} event={event} />
        ))}
      </div>
    </section>
  )
}
