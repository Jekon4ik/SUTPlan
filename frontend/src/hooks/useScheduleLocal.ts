/**
 * Client-side schedule fetching and parsing hook
 * 
 * Replaces the old useSchedule hook that called the backend API.
 * Now fetches ICS directly from Cloudflare Worker proxy and parses it in the browser.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchIcs } from "../utils/icsClient";
import { parseIcs } from "../utils/parseIcs";
import { toUniWeek } from "../lib/weeks";
import type { ScheduleEvent } from "../types";

const GROUP_ID = "343167655";

export function useScheduleLocal(week: number) {
  return useQuery<ScheduleEvent[], Error>({
    queryKey: ["schedule", GROUP_ID, week],
    queryFn: async () => {
      // Step 1: Fetch raw ICS from Cloudflare Worker proxy
      // toUniWeek maps sequential app weeks to the university's actual ?w= numbers
      // (uni numbering skips 15 between spring and summer semester)
      const icsContent = await fetchIcs(GROUP_ID, toUniWeek(week));

      // Step 2: Parse ICS to structured events with timezone conversion
      const events = parseIcs(icsContent);

      return events;
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (matches backend TTL)
    retry: 2,
    // Enable longer memory cache for offline support
    gcTime: 24 * 60 * 60 * 1000, // Cache in memory for 24 hours
  });
}
