# Quick Reference: Client-Side Schedule Processing

## How the App Works Now

### Data Flow
```
User selects week (React state)
         ↓
useScheduleLocal(week) hook triggers
         ↓
fetchIcs(groupId, week) from Cloudflare proxy
         ↓
parseIcs(icsContent) transforms ICS → ScheduleEvent[]
         ↓
React Query caches for 2 hours
         ↓
App displays schedule with components
```

---

## Key Files & What They Do

### 1. `src/utils/icsClient.ts` - Fetching
**Purpose:** Download ICS calendar from Cloudflare Worker proxy

```typescript
const content = await fetchIcs('343167655', 19);
// Returns raw ICS file content (text)
```

**Key config:** `VITE_PLAN_URL` env variable
- Default: `https://sutplan-proxy.yaold623.workers.dev`
- Timeout: 20 seconds
- CORS: Enabled (`Access-Control-Allow-Origin: *`)

---

### 2. `src/utils/parseIcs.ts` - ICS Parsing
**Purpose:** Convert ICS calendar format to structured events

```typescript
const events = parseIcs(icsContent);
// Returns: ScheduleEvent[] sorted by start time
```

**Processing:**
1. Parse ICS with ical.js
2. Extract VEVENT components
3. Convert UTC times to Warsaw timezone
4. Parse SUMMARY field for metadata
5. Sort chronologically

---

### 3. `src/utils/parseSummary.ts` - SUMMARY Parsing
**Purpose:** Extract subject, type, teacher, room from SUMMARY field

```typescript
const parsed = parseSummary("Gk lab MaS 3073 - s.lab. 352A");
// Returns: {
//   subject: "Gk",
//   type: "lab",
//   teacher: "MaS",
//   room: "3073 - s.lab. 352A"
// }
```

**Class types recognized:**
- `wyk` - Wykład (lecture)
- `lab` - Laboratorium (lab)
- `proj` - Projekt (project)
- `ćw` - Ćwiczenia (exercises)
- `semin` - Seminarium (seminar)
- `lektorat` - Lektorat (tutoring)

---

### 4. `src/utils/timezoneHelpers.ts` - Time Conversion
**Purpose:** Convert UTC times to Europe/Warsaw timezone

```typescript
const isoString = dateToIso(utcDate);
// Returns: "2026-03-09T16:45:00+01:00"
```

**Why needed:** ICS files store times in UTC, app displays Warsaw timezone

---

### 5. `src/hooks/useScheduleLocal.ts` - React Integration
**Purpose:** Provide React hook for fetching and caching schedule

```typescript
const { data, isLoading, isError, error, refetch } = useScheduleLocal(19);
// Returns React Query state
```

**Cache strategy:**
- Stale time: 2 hours (same as backend)
- GC time: 24 hours (keep for offline)
- Retries: 2 attempts on failure

---

## Data Structure

### ScheduleEvent
```typescript
interface ScheduleEvent {
  uid: string;              // Unique identifier
  start: string;            // ISO 8601 with offset (e.g., "2026-03-09T08:15:00+01:00")
  end: string;              // ISO 8601 with offset
  subject: string | null;   // Class name (e.g., "Gk")
  type: ClassType | null;   // Class type (wyk, lab, proj, ćw, semin, lektorat)
  teacher: string | null;   // Teacher abbreviation (e.g., "MaS")
  room: string | null;      // Room info (e.g., "3073 - s.lab. 352A")
  summary_raw: string;      // Original SUMMARY from ICS
}

type ClassType = "wyk" | "lab" | "proj" | "ćw" | "semin" | "lektorat";
```

---

## Environment Configuration

### Development (.env.local)
```env
VITE_PLAN_URL=https://sutplan-proxy.yaold623.workers.dev
```

### Production (.env.production)
```env
VITE_PLAN_URL=https://sutplan-proxy.yaold623.workers.dev
```

Both use the same Cloudflare Worker (it's globally available and CORS-enabled).

---

## Testing

### Unit Tests (Example)
```typescript
import { parseSummary } from '../utils/parseSummary';

test('parseSummary parses lab class', () => {
  const result = parseSummary('Gk lab MaS 3073 - s.lab. 352A');
  expect(result.subject).toBe('Gk');
  expect(result.type).toBe('lab');
  expect(result.teacher).toBe('MaS');
  expect(result.room).toBe('3073 - s.lab. 352A');
});
```

### Integration Test (Example)
```typescript
import { useScheduleLocal } from '../hooks/useScheduleLocal';

test('useScheduleLocal fetches and parses schedule', async () => {
  const { result } = renderHook(() => useScheduleLocal(19));
  
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  
  expect(result.current.data?.length).toBeGreaterThan(0);
});
```

---

## Common Issues & Fixes

### Issue: "Failed to fetch schedule"
**Cause:** Network error or proxy is down
**Fix:** 
```typescript
// useScheduleLocal has retry: 2, so it retries automatically
// If still fails, check:
// 1. Cloudflare proxy: curl https://sutplan-proxy.yaold623.workers.dev?...
// 2. Internet connection: ping cloudflare.com
// 3. CORS headers: check Network tab in DevTools
```

### Issue: "Failed to parse ICS calendar data"
**Cause:** University returned invalid ICS
**Fix:**
```typescript
// Fetch the raw ICS and inspect:
const response = await fetch('https://sutplan-proxy.yaold623.workers.dev?...');
const ics = await response.text();
console.log(ics.substring(0, 100)); // Should start with "BEGIN:VCALENDAR"
```

### Issue: Times showing incorrectly
**Cause:** Timezone conversion issue
**Fix:**
```typescript
// Check that formatISO is using WARSAW_TZ:
// Output should have +01:00 (winter) or +02:00 (summer) offset
const iso = dateToIso(new Date());
console.log(iso); // "2026-03-09T16:45:00+01:00" ✅
```

---

## Adding New Features

### Example: Add caching to localStorage
```typescript
// In src/utils/icsClient.ts
async function fetchIcs(groupId: string, week: number) {
  const cached = localStorage.getItem(`ics-${groupId}-${week}`);
  if (cached) return cached;
  
  const content = await fetch(...);
  localStorage.setItem(`ics-${groupId}-${week}`, content);
  return content;
}
```

### Example: Support multiple groups
```typescript
// In src/hooks/useScheduleLocal.ts
export function useScheduleLocal(groupId: string, week: number) {
  return useQuery({
    queryKey: ["schedule", groupId, week], // groupId in key!
    queryFn: async () => {
      const icsContent = await fetchIcs(groupId, week);
      return parseIcs(icsContent);
    },
    // ...
  });
}
```

### Example: Add error recovery
```typescript
// In src/utils/icsClient.ts
export async function fetchIcsWithFallback(
  groupId: string,
  week: number
) {
  try {
    return await fetchIcs(groupId, week);
  } catch (error) {
    // Try alternate proxy if available
    return await fetchFromAlternateProxy(groupId, week);
  }
}
```

---

## Performance Tips

### ✅ Good Practices
```typescript
// Use memoization for expensive parsing
const memoizedParse = useMemo(
  () => parseIcs(icsContent),
  [icsContent]
);

// Lazy-load ical.js if only used on specific routes
import { lazy } from 'react';
const SchedulePage = lazy(() => import('./SchedulePage'));
```

### ⚠️ Things to Avoid
```typescript
// ❌ Don't parse ICS on every render
events = parseIcs(icsContent); // Bad - called on each render

// ❌ Don't re-fetch on every state change
useEffect(() => {
  fetchIcs(groupId, week); // Bad - refetches too often
}, [userInputs]);

// ✅ Do use React Query - it handles retries & caching
const { data } = useScheduleLocal(week);
```

---

## Troubleshooting Checklist

- [ ] Build succeeds: `npm run build`
- [ ] Dev server runs: `npm run dev`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Proxy is reachable: `curl https://sutplan-proxy.yaold623.workers.dev?type=0&id=343167655&cvsfile=true&w=19`
- [ ] ICS has events: Response contains `BEGIN:VEVENT` (multiple)
- [ ] CORS headers present: `Access-Control-Allow-Origin: *`
- [ ] App fetches schedule: Check Network tab in DevTools
- [ ] Times display correctly: Should show Europe/Warsaw timezone offset

---

## Migration Status

✅ **Complete** - All business logic migrated to React
✅ **Tested** - Build succeeds, dev server runs, fetch works
✅ **Documented** - Full guides and examples provided
✅ **Committed** - Changes in git with clear commit messages

**Ready for production deployment!**

---

## Quick Links

- **Main migration doc:** `MIGRATION_COMPLETE.md`
- **TypeScript types:** `src/types.ts`
- **Components:** `src/components/`
- **Week utilities:** `src/lib/weeks.ts`
- **App entry:** `src/App.tsx`

---

*Last updated: March 31, 2026 - Post-migration v1.0*
