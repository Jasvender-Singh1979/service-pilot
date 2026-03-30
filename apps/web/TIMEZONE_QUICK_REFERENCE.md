# ⏰ Timezone Quick Reference Guide

## 📌 Core Rule

**Everything goes through `/lib/dateUtils.ts`**

---

## 🔧 Available Functions

### Get Date Ranges (Returns UTC timestamps for DB queries)

```typescript
// Today's range (00:00 to 23:59 IST, converted to UTC)
const { start, end } = getTodayRangeIST();
// Use in query: WHERE created_at >= ${start.toISOString()} AND created_at <= ${end.toISOString()}

// Last 7 calendar days
const { start, end } = getWeekRangeIST();

// Last 30 calendar days
const { start, end } = getMonthRangeIST();

// Custom range (both dates as YYYY-MM-DD strings)
const { start, end } = getCustomRangeIST('2026-03-20', '2026-03-29');
```

### Get Date Strings

```typescript
// Today as YYYY-MM-DD in IST
const today = getTodayIST();  // "2026-03-29"

// Current time in IST (for logging/debugging)
const now = getNowAsIST();  // "2026-03-29 14:30:45 IST"

// Debug info
const info = getTimezoneDebugInfo();
// Returns: { timezone, nowUTC, nowIST, todayIST, todayRange, weekRange, monthRange }
```

---

## ✅ Usage Pattern (API Routes)

```typescript
import {
  getTodayRangeIST,
  getWeekRangeIST,
  getMonthRangeIST,
  getCustomRangeIST,
  getTodayIST
} from '@/lib/dateUtils';
import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  // Get date range
  const range = getTodayRangeIST();
  
  // Use in query
  const calls = await sql`
    SELECT * FROM service_call
    WHERE created_at >= ${range.start.toISOString()}
    AND created_at <= ${range.end.toISOString()}
  `;
  
  return Response.json(calls);
}
```

---

## 🔍 Where It's Used

| Module | Function | Updated |
|--------|----------|---------|
| Engineer Dashboard | `getTodayRangeIST()`, `getWeekRangeIST()`, `getMonthRangeIST()` | ✅ |
| Manager Reports | `getTodayRangeIST()`, `getWeekRangeIST()`, `getMonthRangeIST()`, `getCustomRangeIST()` | ✅ |
| Any new date filtering | All functions | Ready to use |

---

## 🚫 What NOT To Do

❌ **DON'T**:
```typescript
// ❌ Wrong - uses browser's local time
const now = new Date();

// ❌ Wrong - doesn't account for timezone
const today = new Date().toISOString().split('T')[0];

// ❌ Wrong - uses timezone-naive comparison
WHERE DATE(created_at) = '2026-03-29'

// ❌ Wrong - calculates locally
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
```

✅ **DO**:
```typescript
// ✅ Correct - uses centralized IST-aware utility
const range = getTodayRangeIST();

// ✅ Correct - uses IST date string
const today = getTodayIST();

// ✅ Correct - timezone-aware comparison
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = ${todayIST}::date

// ✅ Correct - uses returned UTC timestamps
WHERE created_at >= ${range.start.toISOString()} AND created_at <= ${range.end.toISOString()}
```

---

## 🧪 Testing Helpers

Check current timezone status:

```typescript
import { getTimezoneDebugInfo } from '@/lib/dateUtils';

console.log(getTimezoneDebugInfo());
// Output:
// {
//   timezone: 'Asia/Kolkata',
//   nowUTC: '2026-03-29T08:46:00.000Z',
//   nowIST: '2026-03-29 14:16:00 IST',
//   todayIST: '2026-03-29',
//   todayRange: { start: Date, end: Date },
//   weekRange: { start: Date, end: Date },
//   monthRange: { start: Date, end: Date }
// }
```

---

## 🔄 Migration Checklist

When updating existing date logic:

1. ✅ Remove any local date calculation functions
2. ✅ Import from `/lib/dateUtils.ts`
3. ✅ Replace hardcoded timezone strings with utility calls
4. ✅ Use `toISOString()` when passing dates to SQL queries
5. ✅ Test edge cases (midnight, week boundary, month boundary)

---

## 📌 Remember

- **All functions return UTC timestamps** (suitable for DB BETWEEN queries)
- **All calculations happen in IST** (business timezone)
- **No local timezone assumptions** (uses explicit IST conversion)
- **Single source of truth** (all date logic in `/lib/dateUtils.ts`)

---

## 🎯 Key Facts

| Fact | Value |
|------|-------|
| Business Timezone | IST (Asia/Kolkata) |
| Database Timezone | UTC |
| UTC Offset for IST | +5:30 hours |
| Today Range | 00:00:00 to 23:59:59 (IST) |
| Week Range | Today - 6 days to Today |
| Month Range | Today - 29 days to Today |

---

## ❓ Common Questions

**Q: Why convert to UTC before storing in DB?**
A: UTC is timezone-neutral and allows consistent queries regardless of where the server is running.

**Q: Why not use database-level timezone functions?**
A: We do! Queries use `AT TIME ZONE 'Asia/Kolkata'` for comparisons, but initial range calculation happens in JavaScript using the centralized utility.

**Q: What if the app needs to support multiple timezones later?**
A: Just update the `TIMEZONE` constant in `/lib/dateUtils.ts` and all calculations automatically adjust.

**Q: Can I hardcode IST offsets in my code?**
A: No! Always use the centralized functions. Hardcoding leads to inconsistencies.

---

## 🚀 For New Features

If adding a new date-filtered module:

```typescript
import { getTodayRangeIST, getWeekRangeIST, getMonthRangeIST } from '@/lib/dateUtils';

// That's it! Just use the functions, don't reinvent date logic.
```

**Result**: Automatic consistency with rest of app. ✅
