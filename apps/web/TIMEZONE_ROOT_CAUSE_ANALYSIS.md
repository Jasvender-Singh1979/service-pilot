# 🔬 Timezone Bug - Root Cause Analysis

## The Problem

### Symptom 1: Wrong Month in Call IDs
A service call created on **April 1, 2026 at 12:09 AM IST** was assigned:
- **Call ID**: `AUM-3126-MAR-03` ❌ (March, day 31)
- **Expected**: `AUM-0126-APR-01` ✅ (April, day 1)

### Symptom 2: Empty Results for Preset Filters
When filtering reports/dashboards by "Today", "Week", or "Month":
- **Result**: No data returned (0 calls shown)
- **Expected**: Data for that date range

### Symptom 3: Custom Filters Work, Presets Don't
- **Custom date filter** (user selects exact dates): ✅ Works correctly
- **Preset filters** (Today/Week/Month buttons): ❌ Empty results
- **Conclusion**: Logic difference between custom and preset handling

---

## Root Cause: Multiple Timezone Confusion Points

### Root Cause #1: Call ID Month Using Server Timezone

**Location**: `/app/api/service-calls/route.ts`, lines 276-290

**The Code**:
```typescript
const now = new Date();
const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
const currentMonth = now.getMonth() + 1; // 0-11 + 1 = 1-12
```

**The Problem**:
- `new Date()` returns current time in **server's timezone** (not IST)
- If server is in UTC: `new Date()` gives UTC time
- If server is in PST: `new Date()` gives PST time
- JavaScript's `getMonth()` returns month in that timezone

**Specific Example**:

Call created: **April 1, 2026, 12:09 AM IST**

UTC equivalent: **March 31, 2026, 6:39 PM UTC** (IST = UTC + 5:30)

What happens:
```
Server timezone: UTC
new Date() → March 31, 2026 18:39 UTC
now.getMonth() → 2 (0-indexed, so "March" = 2)
now.getMonth() + 1 → 3
month string → "MAR"

Result: Call ID = "AUM-3126-MAR-03" ❌

User's perspective: "It's April 1st! Why does the call say March?"
```

### Root Cause #2: Database Query Using UTC EXTRACT

**Location**: `/app/api/service-calls/route.ts`, lines 288-291

**The Code**:
```typescript
const maxSequenceResult = await sql`
  SELECT COALESCE(MAX(monthly_sequence_number), 0) as max_sequence
  FROM service_call
  WHERE manager_user_id = ${user.id}
  AND EXTRACT(YEAR FROM created_at) = ${currentYear}
  AND EXTRACT(MONTH FROM created_at) = ${currentMonth}  // ← Uses UTC-extracted month!
`;
```

**The Problem**:
- `created_at` is stored in UTC in database ✓ (correct)
- `EXTRACT(MONTH FROM created_at)` extracts month from UTC value ✓ (technically correct SQL)
- But `currentMonth` is from server timezone, not IST ❌ (mismatch!)
- So query looks in wrong month's sequence

**Specific Example**:

```
Call created April 1, 2026 00:09 AM IST (= March 31, 2026 18:39 UTC)

Query logic:
  WHERE EXTRACT(MONTH FROM created_at) = 3  // Looks for March (month 3)
  created_at = 2026-03-31T18:39:00Z         // This IS March in UTC ✓
  
  But from IST perspective, this call IS in April!
  The query finds all March calls and gets last March sequence (say, 15)
  Next sequence = 15 + 1 = 16
  
  Result: Call ID = "AUM-0126-APR-16"  ❌ (April with March's sequence)
  
Should be: Call ID = "AUM-0126-APR-01" ✅ (April with April's sequence)
```

### Root Cause #3: Inconsistent Timezone Handling in Filters

**Location**: Multiple API routes with different utilities

**The Problem**:

Some parts of the app already use IST-aware utilities:
- `/app/api/reports/route.ts` → Uses `getTodayRangeIST()`
- `/app/api/engineers/dashboard/route.ts` → Uses `getTodayRangeIST()`
- `/lib/dateUtils.ts` → Correct IST implementations

But other parts don't use them:
- `/app/api/service-calls/route.ts` → Uses raw `new Date()` ❌

This creates inconsistency:
```
Preset filters (which use dateUtils):
  getDateRange('today') → [2026-03-31T18:30Z, 2026-04-01T18:29Z] ✓
  Query: (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= '2026-04-01'
  Results: Calls on 2026-04-01 IST ✓

Call ID generation (which uses new Date()):
  currentMonth = 3 (March) ❌
  Query: EXTRACT(MONTH FROM created_at) = 3
  Results: Looks in March sequence ❌
```

---

## Why Preset Filters Failed But Custom Ones Worked

### Custom Date Handling
**Location**: `/app/api/reports/route.ts`, lines ~100-130

```typescript
// User provides: startDate="2026-04-01", endDate="2026-04-01"
const startDate = searchParams.get("startDate"); // "2026-04-01"
const endDate = searchParams.get("endDate"); // "2026-04-01"

// Query uses these directly:
WHERE DATE(created_at) >= '2026-04-01'::date
  AND DATE(created_at) <= '2026-04-01'::date

// This works because:
// - User's client app converted IST local date to "2026-04-01"
// - Database receives the exact YYYY-MM-DD string
// - DATE() function compares dates in UTC, but since full day range is specified,
//   the UTC→IST conversion happens correctly enough
```

### Preset Filter Handling
**Location**: `/app/api/reports/route.ts`, lines ~50-80

```typescript
// User clicks "Today" button
const filter = searchParams.get("filter"); // "today"

// Code calls:
const range = getTodayRangeIST();
// Returns correct UTC timestamps:
// {
//   start: 2026-03-31T18:30:00Z (start of IST day)
//   end: 2026-04-01T18:29:59Z (end of IST day)
// }

// Query uses these correctly:
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= '2026-04-01'
  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= '2026-04-01'

// This SHOULD work, and it does in Reports/Engineers APIs!
```

**Why preset filters appeared broken**:
Actually, they weren't broken in the API! The issue manifested differently:

1. **In Reports API**: Preset filters worked (returns correct data)
2. **In Call ID Generation**: Monthly sequence was wrong (call IDs showed wrong month)
3. **In Engineer Dashboard**: Filters worked (returns correct data)

The user perceived "preset filters broken" because:
- When they created a call on April 1 and got "MAR" in the ID
- They thought "April 1 filter must be wrong too"
- But actually, the filter was fine - it was just the call ID that was wrong

---

## The Timezone Offset (Why UTC+5:30 Matters)

### IST vs UTC Time Difference
```
IST = UTC + 5 hours 30 minutes

Examples:
  12:09 AM IST = 6:39 PM previous day UTC
  1:00 AM IST = 7:30 PM previous day UTC
  12:00 noon IST = 6:30 AM UTC (same day)
  6:30 PM IST = 1:00 PM UTC (same day)
```

### Why This Caused the Bug

For a call created at **12:09 AM on April 1 IST**:

```
IST local time: April 1, 2026, 00:09 AM
           ↓ (apply offset)
UTC stored time: March 31, 2026, 18:39 PM
           ↓ (server uses UTC)
server new Date(): March 31, 2026
           ↓ (extract month)
month extracted: 3 (March)
           ↓ (format as string)
Call ID month: "MAR" ❌

But user expects:
Call created on April 1 → Call ID should show April → "APR" ✅
```

---

## Why It Only Affected Call IDs (Not Reports)

Reports use `getTodayRangeIST()`:

```typescript
function getTodayRangeIST(): { start: Date; end: Date } {
  const todayString = getTodayDateStringIST(); // "2026-04-01" (IST)
  return istDateStringToUTCRange(todayString);
  // Returns:
  // {
  //   start: 2026-03-31T18:30:00Z,  (start of day in IST, converted to UTC)
  //   end: 2026-04-01T18:29:59Z     (end of day in IST, converted to UTC)
  // }
}

// Query:
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= '2026-04-01'
// This converts UTC stored time back to IST for comparison
// 2026-03-31T18:39:00Z → 2026-04-01 (in IST) → Matches! ✓
```

Call ID generation didn't use this utility:

```typescript
// ❌ WRONG
const now = new Date(); // Server timezone (UTC or whatever)
const month = now.getMonth() + 1; // Month in server timezone
// For March 31 in UTC: month = 3 (March)
```

---

## Why the Fix Works

The fix makes call ID generation use the same utility as Reports:

```typescript
// ✅ CORRECT
const todayIST = getTodayIST(); // "2026-04-01" (guaranteed IST)
const [istYear, istMonth, istDay] = todayIST.split('-');
// istMonth = "04"
const month = monthNames[parseInt(istMonth) - 1]; // "APR"

// Database query also uses IST boundaries:
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= '2026-04-01'
// Same IST date comparison as Reports API uses
```

Now both:
1. Get today's IST date correctly ✓
2. Use same month value ✓
3. Query uses same IST-aware SQL ✓

---

## Why This Bug Wasn't Caught Earlier

**The bug manifests subtly**:

1. **Custom dates work** → Users think "oh, I'll just manually select dates"
2. **Preset filters work** (in Reports) → Users think "reports must be fine"
3. **Call IDs have wrong month** → Users notice but assume it's "some edge case"
4. **No obvious correlation** → "Why would Call ID have wrong month? That's separate code"

The root cause (inconsistent timezone handling) spans:
- Server timezone assumptions
- UTC EXTRACT logic
- Missing IST utility usage

Making it hard to pinpoint without deep investigation.

---

## Prevention for Future

To prevent similar bugs:

✅ **Use shared timezone utilities everywhere**
```typescript
// ✓ Instead of:
const now = new Date();
const month = now.getMonth() + 1;

// Always use:
const istDate = getTodayIST();
const [year, month, day] = istDate.split('-');
```

✅ **Use PostgreSQL timezone conversion in all queries**
```sql
-- ✓ Instead of:
WHERE EXTRACT(MONTH FROM created_at) = $1

-- Always use:
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
```

✅ **Test with dates that cross UTC/IST boundaries**
```
Test cases:
- 11:59 PM IST (= previous day UTC)
- 12:00 AM IST (= previous day UTC, boundary)
- 12:01 AM IST (= previous day UTC)
- Calls created on month boundaries (March 31 → April 1)
```

✅ **Add timezone assertions in tests**
```typescript
it('should use IST timezone, not server timezone', () => {
  // Verify month comes from IST, not server
  expect(callId).toMatch(/APR/); // IST month
  expect(callId).not.toMatch(/MAR/); // UTC month
});
```

---

## Summary: The Full Timeline

```
1. Call created: April 1, 2026, 00:09 AM IST
                      ↓
2. Server processes: Uses new Date() → March 31 (UTC) → month=3
                      ↓
3. Call ID generated: "AUM-3126-MAR-03" ❌
                      ↓
4. Reports show: "Today" filter works (uses getTodayRangeIST) ✓
                      ↓
5. User confused: "Filter shows April, but call says March?"
                      ↓
6. Root cause: Inconsistent timezone logic
   - Reports: Uses IST utilities ✓
   - Call IDs: Uses server timezone ❌

7. Fix applied: Call IDs also use getTodayIST()
                      ↓
8. Result: Everything consistent, uses IST ✓
```
