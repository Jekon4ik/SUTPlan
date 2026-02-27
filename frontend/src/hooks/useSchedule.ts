import { useQuery } from '@tanstack/react-query'
import type { ScheduleEvent } from '../types'

const GROUP_ID = '343167655'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:6565'

async function fetchSchedule(week: number): Promise<ScheduleEvent[]> {
  const url = `${API_URL}/schedule?group_id=${GROUP_ID}&week=${week}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Błąd serwera: ${res.status}`)
  }
  return res.json()
}

export function useSchedule(week: number) {
  return useQuery<ScheduleEvent[], Error>({
    queryKey: ['schedule', GROUP_ID, week],
    queryFn: () => fetchSchedule(week),
    staleTime: 1000 * 60 * 60 * 2,   // 2h — matches backend cache TTL
    retry: 2,
  })
}
