# Attendance Timezone/Date Consistency Bug Fix

## Problem Statement
Engineer checked in and checked out on Apr 2, 2026 (IST):
- ✅ **Dashboard/live attendance**: Shows the attendance correctly
- ❌ **Full Attendance Report**: Shows NO attendance record for Apr 2, 2026

This indicated a UTC vs IST date-boundary mismatch between:
- How `attendance_date` is created during check-in
- How the Full Attendance Report filters records by date range
- How dashboard/live attendance decides what counts as "today"

## Root Cause Analysis

### The Issue
The **Attendance Report page** was initializing date filters using **browser's local date**, not IST:

```typescript
// ❌ WRONG: Uses browser's local timezone
const [startDate, setStartDate] = useState(() => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];  // Browser local time
});
```

If the browser/device is in a different timezone (not IST), this sends wrong dates to the API.

### Why Dashboard Works, Report Doesn't

1. **Dashboard (`/api/attendance/team`)**: Uses `getTodayIST()` (IST-based calculation)
   - Queries: `WHERE attendance_date = ${todayDate}`
   - For Apr 2 IST, sends `"2026-04-02"`
   - ✅ Matches records because `attendance_date` is IST-based

2. **Report Page**: Uses `new Date().toISOString()` (browser's local time)
   - Queries: `WHERE attendance_date >= ${startDate} AND attendance_date <= ${endDate}`
   - If browser is in different timezone, sends wrong date strings
   - ❌ Misses records because dates don't match

### Database Storage
- `attendance_date` column (DATE type) stores IST calendar dates (e.g., "2026-04-02")
- This is set during check-in using `getTodayIST()` which correctly uses Asia/Kolkata timezone
- The date filtering works ONLY if both storage and querying use the same timezone

## Solution

### Core Principle
**attendance_date must ALWAYS be IST calendar date, and all date operations must use IST.**

### Changes Made

#### 1. **`lib/dateUtils.ts`**
Fixed `istDateStringToUTCRange()` function:
- Corrected the UTC offset calculation
- Added detailed comments explaining IST ↔ UTC conversion
- Added helper function `browserDateToISTDate()` (for future timezone support)

#### 2. **`app/api/attendance/report/route.ts`**
- Added debug logging to trace date values
- Added comprehensive comments explaining date handling
- Removed unused `getCustomRangeIST` import (not needed for DATE column queries)
- Added validation and logging of received dates

#### 3. **`app/manager/attendance/report/page.tsx`** ⭐ **MAIN FIX**
Changed date initialization from browser-local to IST-based:

```typescript
// ✅ CORRECT: Uses IST timezone
const [startDate, setStartDate] = useState(() => getISTDateNDaysAgo(30));
const [endDate, setEndDate] = useState(() => getTodayIST());

function getISTDateNDaysAgo(daysAgo: number): string {
  // Get current time in IST using Intl.DateTimeFormat
  // Return YYYY-MM-DD string for N days ago in IST
}
```

#### 4. **`app/api/attendance/check-in/route.ts`**
- Added debug logging to trace date calculation and record creation
- Helps diagnose future timezone issues

#### 5. **`app/api/attendance/check-out/route.ts`**
- Already correct (uses `getTodayIST()`)
- No changes needed

## How It Works Now

### 1. Check-In/Check-Out (Backend)
```
Engineer checks in at 9:00 AM IST on Apr 2, 2026
↓
getTodayIST() returns "2026-04-02" (IST calendar date)
↓
attendance_date = "2026-04-02" (stored in DATE column)
check_in_time = "2026-04-02T03:30:00Z" (UTC timestamp)
```

### 2. Dashboard/Live Attendance (Backend)
```
Manager views team attendance
↓
getTodayIST() returns "2026-04-02" (IST calendar date TODAY)
↓
Query: WHERE attendance_date = "2026-04-02"
↓
✅ Finds the record (same date logic as check-in)
```

### 3. Attendance Report (Frontend + Backend)
```
Manager selects date range in report page
↓
Frontend uses getISTDateNDaysAgo(30) and getTodayIST()
↓
Sends: startDate = "2026-04-02", endDate = "2026-04-02"
(guaranteed to be IST calendar dates, not browser-local)
↓
Backend queries: WHERE attendance_date >= "2026-04-02" AND attendance_date <= "2026-04-02"
↓
✅ Finds the record (dates match)
```

## Single Source of Truth

**Rule: All attendance business dates are IST calendar dates (YYYY-MM-DD)**

- `attendance_date` column: IST calendar date (DATE type)
- `getTodayIST()`: Returns IST calendar date string
- Report page date pickers: Initialized with IST calendar dates
- Dashboard "today" logic: Uses `getTodayIST()`
- Cutoff time comparisons: Use IST timezone (`Asia/Kolkata`)

## Files Changed

1. ✅ `/home/user/apps/web/lib/dateUtils.ts`
   - Fixed `istDateStringToUTCRange()` UTC offset logic
   - Added `browserDateToISTDate()` helper

2. ✅ `/home/user/apps/web/app/api/attendance/report/route.ts`
   - Added debug logging
   - Added comments explaining date handling

3. ✅ `/home/user/apps/web/app/manager/attendance/report/page.tsx` **← MAIN FIX**
   - Changed date initialization from browser-local to IST-based
   - Added `getISTDateNDaysAgo()` helper function
   - Imports `getTodayIST` from `lib/dateUtils`

4. ✅ `/home/user/apps/web/app/api/attendance/check-in/route.ts`
   - Added debug logging for date calculation

## Testing the Fix

### Before (Broken)
1. Engineer in India checks in on Apr 2, 2026, 9:00 AM IST
2. Dashboard shows attendance ✅
3. Manager in USA opens report, selects Apr 2, 2026
4. Report shows NO records ❌ (dates mismatch due to timezone difference)

### After (Fixed)
1. Engineer in India checks in on Apr 2, 2026, 9:00 AM IST
2. Dashboard shows attendance ✅
3. Manager in USA opens report, selects Apr 2, 2026
4. Report shows records ✅ (dates calculated in IST, not browser timezone)

## Future Improvements

If the app expands to support multiple business timezones:
1. Add `business_timezone` column to `business` table
2. Create `getDateInTimezone()` helper function
3. Modify check-in to use business timezone instead of hardcoded IST
4. Modify report to allow timezone selection per business
5. Use `browserDateToISTDate()` helper as template for other timezones

## Debug Logging

Enable debug logging by checking server logs:
- `[ATTENDANCE_CHECKIN_DEBUG]` - Date calculation during check-in
- `[ATTENDANCE_REPORT_DEBUG]` - Date values and record filtering

These logs help diagnose timezone issues in the future.
