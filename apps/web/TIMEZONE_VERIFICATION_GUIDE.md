# 🔍 Timezone Fix Verification Guide

## Quick Test Instructions

### Test Case 1: Call ID Month Correction
**What was broken**: A call created on April 1 IST was getting month "MAR" in the ID instead of "APR"

**How to verify**:
1. Login as a manager
2. Go to "Add Service Call" or create a new call
3. Create a call on **any date**
4. Check the generated call ID - the month should match the **local IST date**, not UTC date
5. Example: If created on April 1, 2026 at 12:09 AM IST:
   - ✅ CORRECT: `AUM-0126-APR-01` (Month is APR)
   - ❌ WRONG: `AUM-3126-MAR-03` (Month is MAR)

**Expected behavior after fix**:
- Call IDs always use the IST month and date, never UTC

---

### Test Case 2: "Today" Filter in Reports
**What was broken**: Reports "Today" filter showed no results or wrong date range

**How to verify**:
1. Login as manager
2. Go to Manager → Reports
3. Click on "Today" preset filter
4. Check if results appear (should show calls created today in IST)
5. Verify the date range shown matches today's date in your timezone (IST)

**Expected behavior after fix**:
- "Today" filter shows calls created in IST date range 00:00 to 23:59 IST
- Results appear if there are calls created today

---

### Test Case 3: "This Week" Filter in Reports
**How to verify**:
1. Login as manager
2. Go to Manager → Reports
3. Click on "This Week" preset filter
4. Check if results appear (should show calls from last 7 calendar days)

**Expected behavior after fix**:
- "This Week" shows calls created in last 7 days (IST date range)
- Results should be the same whether checked on March 31 or April 1 (date boundaries respect IST, not UTC)

---

### Test Case 4: "This Month" Filter in Reports
**How to verify**:
1. Login as manager
2. Go to Manager → Reports
3. Click on "This Month" preset filter
4. Check if results appear (should show calls from last 30 calendar days)

**Expected behavior after fix**:
- "This Month" shows calls from last 30 days (IST date range)
- The 30-day window correctly resets on IST month boundaries

---

### Test Case 5: Engineer Dashboard "Today" Summary
**What was broken**: Engineer's "Today Summary" showed empty results or wrong date range

**How to verify**:
1. Login as engineer
2. View the Engineer Dashboard (home page)
3. Look at "Today Summary" section showing:
   - Assigned Today
   - Completed Today
   - Pending Today
4. Verify the numbers are non-zero if there are calls assigned/completed today

**Expected behavior after fix**:
- "Assigned Today" shows calls assigned on IST date (not UTC)
- "Completed Today" shows calls closed on IST date (not UTC)
- Numbers update correctly based on IST timezone

---

### Test Case 6: Engineer Dashboard "Today/Week/Month" Filters
**How to verify**:
1. Login as engineer
2. View the Engineer Dashboard
3. Click on the filter tabs: "Today" → "This Week" → "This Month"
4. Check if data appears for each filter
5. Verify numbers match what you expect

**Expected behavior after fix**:
- All preset filters work without empty results
- Date ranges respect IST boundaries, not UTC

---

### Test Case 7: Monthly Sequence Number Reset
**What was broken**: Call ID sequence was resetting on UTC month boundary, not IST

**How to verify**:
1. Create multiple calls spanning across IST month boundaries
2. Example: Create calls on:
   - March 31 IST (might be March 30 UTC)
   - April 1 IST (might be March 31 UTC)
   - April 2 IST (might be April 1 UTC)
3. Check the call IDs generated:
   - Last call of March: `AUM-3103-MAR-XX` (where XX is high number like 10, 15, etc.)
   - First call of April: `AUM-0104-APR-01` (sequence resets to 01 for new month)
   - Not: First call of April with March sequence like `AUM-0104-APR-16` (would be wrong)

**Expected behavior after fix**:
- Sequence numbers reset when crossing IST month boundary
- NOT when crossing UTC month boundary
- March's last call might have sequence 15, April's first call resets to 01

---

## Debugging Commands

### Check timezone info in API response
When calling any Reports API with debugging:
```
GET /api/reports?filter=today

Response includes:
{
  "debug": {
    "timezone": "Asia/Kolkata",
    "current_time": "2026-04-01 12:09:00 IST",
    "today_ist": "2026-04-01",
    "filter_type": "today",
    "start_date": "2026-04-01",
    "end_date": "2026-04-01"
  }
}
```

### Check engineer dashboard debug info
```
GET /api/engineers/dashboard?filter=today

Server logs show:
[ENGINEER_DASHBOARD_TIME] Today (IST): 2026-04-01
[ENGINEER_DASHBOARD_FILTER] Filter: today
  startDate: 2026-03-31T18:30:00.000Z
  endDate: 2026-04-01T18:29:59.999Z
```

---

## Common Issues & Solutions

### Issue: Still seeing "MAR" month in April 1 call IDs
**Solution**: 
- Clear browser cache: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
- Restart the app
- Create a new call and check the ID

### Issue: Reports filters still show no data
**Solution**:
- Verify you're logged in as correct user (manager/engineer)
- Check if there are calls created in that date range
- Try "All Time" filter to see if data exists at all
- Check server logs for timezone debug info

### Issue: One filter works but another doesn't
**Solution**:
- This indicates mixed timezone logic in different code paths
- Check which API endpoint is being used
- All should use same `getTodayIST()`, `getWeekRangeIST()`, `getMonthRangeIST()` utilities
- Look in the relevant route file (reports, engineers/dashboard, etc.)

---

## Files to Check if Issues Persist

**If call ID month is still wrong**:
- Check: `/app/api/service-calls/route.ts` line 276-290
- Verify: Imports `getTodayIST` from `@/lib/dateUtils`
- Verify: Uses `istMonth` variable for month name, not `now.getMonth()`

**If reports filters aren't working**:
- Check: `/app/api/reports/route.ts` line 1-50
- Verify: Imports from `@/lib/dateUtils` (not just `timezone.ts`)
- Verify: Uses `getDateRange()` helper function

**If engineer dashboard filters aren't working**:
- Check: `/app/api/engineers/dashboard/route.ts` line 1-60
- Verify: Imports `getTodayIST`, `getTodayRangeIST`, etc.
- Verify: Filters use UTC timestamps from `toISOString()`

---

## Rollback Instructions (if needed)

If the fix causes unexpected issues:

1. **Restore original call ID generation** (before fix):
   ```bash
   git checkout app/api/service-calls/route.ts
   ```

2. **Restart server**:
   - The app will revert to using UTC timezone for call IDs
   - Note: Any calls created with the fix will keep their IST-based IDs

3. **No database cleanup needed**:
   - Existing call IDs are not affected
   - monthly_sequence_number values unchanged
   - Can be rolled back without data loss

---

## Performance Impact

✅ **No performance degradation**:
- Timezone conversion happens at application level, not database level
- Same number of database queries as before
- No additional indexes needed
- No schema changes required

---

## Summary of Changes by Component

| Component | Issue | Status | Verification |
|-----------|-------|--------|--------------|
| Call ID Generation | Month was UTC instead of IST | ✅ FIXED | Call ID month matches IST date |
| Manager Reports - Today | No data shown | ✅ FIXED | Filter returns calls created today (IST) |
| Manager Reports - Week | No data shown | ✅ FIXED | Filter returns last 7 days (IST) |
| Manager Reports - Month | No data shown | ✅ FIXED | Filter returns last 30 days (IST) |
| Engineer Dashboard - Today | No data shown | ✅ FIXED | Summary shows today's calls (IST) |
| Engineer Dashboard - Week | No data shown | ✅ FIXED | Filter returns last 7 days (IST) |
| Engineer Dashboard - Month | No data shown | ✅ FIXED | Filter returns last 30 days (IST) |
| Custom Date Filters | Already working | ✅ VERIFIED | Custom dates continue to work |

---

## Next Steps (Optional Improvements)

Future enhancements (not in this fix):
1. Make business timezone configurable (currently hardcoded to IST)
2. Add timezone setting in Business Setup page
3. Support other timezones (PST, EST, SGT, etc.)
4. Add timezone indicator in UI showing "IST" next to dates
5. Add timezone conversion for client-side date display
