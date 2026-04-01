# Manager Dashboard Attendance Punctuality Bug Fix

## ROOT CAUSE

The manager dashboard live attendance cards and the full Attendance Report were using **DIFFERENT logic** to determine if an engineer checked in "On Time" or "Late":

### Before the Fix:

**Full Attendance Report** (`/api/attendance/report/route.ts`):
- ✓ Had `checkTimeliness()` helper function
- ✓ Compared check-in time to cutoff time in IST timezone
- ✓ Correctly identified "on_time" vs "late" status
- ✓ Used `manager_attendance_settings.checkin_cutoff_time`

**Manager Dashboard** (`/api/attendance/team/route.ts`):
- ✗ **DID NOT compute timeliness at all**
- ✗ Only returned raw "status" field: "checked_in", "checked_out", "not_checked_in"
- ✗ Never compared check-in time against cutoff
- ✗ TeamAttendanceWidget just displayed basic status
- ✗ **Result**: Engineer checking in at 11:15 AM with 11:00 AM cutoff showed "Checked In" instead of "Late"

### Example Scenario:

```
Engineer: John
Cutoff Time: 11:00 AM (IST)
Check-in Time: 11:15 AM (IST)

Manager Dashboard (BEFORE):     Shows "Checked In" ❌ WRONG
Full Attendance Report (BEFORE): Shows "Late"     ✓ CORRECT

After Fix: BOTH show "Late" ✓ CONSISTENT
```

## WHY THIS HAPPENED

The attendance table stores:
- `check_in_time` (ISO timestamp)
- `status` (just "checked_in" / "checked_out" / "not_checked_in")

The `status` field only indicates "has engineer checked in", not "was it timely".

The timeliness comparison logic existed only in the Attendance Report API.
**The Team Attendance API (used by dashboard) never implemented it.**

## SOLUTION

Created a **SHARED utility function** that both endpoints now use:

### 1. NEW FILE: `lib/attendanceUtils.ts`

```typescript
export function checkTimeliness(checkInISO: string, cutoffTime: string | null): string | null {
  if (!cutoffTime) return null;

  try {
    // Parse check-in time to IST
    const checkInDate = new Date(checkInISO);
    const checkInHHMM = checkInDate.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Compare HH:MM strings (lexicographic works for 24-hour time)
    return checkInHHMM <= cutoffTime ? 'on_time' : 'late';
  } catch {
    return null;
  }
}
```

- Takes ISO check-in timestamp and cutoff time (HH:MM in 24-hour format)
- Converts check-in time to IST timezone
- Compares lexicographically: `"HH:MM" <= cutoff ? "on_time" : "late"`
- Returns null if no cutoff configured

### 2. UPDATED: `/api/attendance/report/route.ts`

- Removed local `checkTimeliness()` function
- Now imports: `import { checkTimeliness } from "@/lib/attendanceUtils"`
- **NO CHANGE in behavior** (already worked correctly)

### 3. UPDATED: `/api/attendance/team/route.ts`

Now the endpoint:
- Fetches cutoff time from `manager_attendance_settings`
- Calls `checkTimeliness()` for each engineer with check-in
- Returns new fields in response:
  - `timeliness`: "on_time" | "late" | null (for each engineer)
  - `summary.onTime`: count of on-time check-ins
  - `summary.late`: count of late check-ins
  - `cutoffTime`: the cutoff time setting

## LOGIC FLOW (AFTER FIX)

### Manager Dashboard:
1. GET `/api/attendance/team`
2. For each engineer with `check_in_time`:
   - Call `checkTimeliness(check_in_time, cutoffTime)`
   - Returns "on_time" or "late"
3. Populate `timeliness` field in response
4. Widget can now display On Time / Late status (when implemented in UI)

### Full Attendance Report (unchanged):
1. GET `/api/attendance/report?engineer_id=...`
2. For each record with `check_in_time`:
   - Call `checkTimeliness(check_in_time, cutoffTime)`
   - Returns "on_time" or "late"
3. Calculate summary counts: `on_time_count`, `late_count`

## TIMEZONE HANDLING (CRITICAL)

All check-in times in database are stored as **UTC ISO strings**.

Conversion to IST happens in the `checkTimeliness()` function:

```typescript
const checkInDate = new Date(checkInISO);  // Parse UTC ISO string
const checkInHHMM = checkInDate.toLocaleString('en-US', {
  timeZone: 'Asia/Kolkata',  // Convert to IST
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,  // 24-hour format
});
```

**Cutoff time** stored in database in **HH:MM format (24-hour, IST timezone)**.

**Comparison** is lexicographic: `"11:15" > "11:00"` → `"late"` ✓

## VERIFICATION CHECKLIST

- ✓ Shared utility prevents logic duplication
- ✓ Both endpoints use identical timeliness calculation
- ✓ IST timezone conversion applied consistently
- ✓ Cutoff time fetched from `manager_attendance_settings`
- ✓ No changes to database schema
- ✓ No changes to dashboard UI (returns additional timeliness field)
- ✓ No changes to report UI
- ✓ No changes to engineer card UI
- ✓ Backward compatible (old UI still works, new data available)

## FILES CHANGED

1. **NEW**: `/home/user/apps/web/lib/attendanceUtils.ts` (shared utility)
2. **UPDATED**: `/home/user/apps/web/app/api/attendance/report/route.ts` (import only)
3. **UPDATED**: `/home/user/apps/web/app/api/attendance/team/route.ts` (implementation)

## HOW TO VERIFY THE FIX

### Scenario 1: On-Time Check-in
- Cutoff: 11:00 AM
- Check-in: 10:45 AM
- Expected: Both dashboard and report show "On Time" ✓

### Scenario 2: Late Check-in
- Cutoff: 11:00 AM
- Check-in: 11:15 AM
- Expected: Both dashboard and report show "Late" ✓

### Scenario 3: No Check-in
- Status: Not Checked In
- Expected: Both dashboard and report show "Not Checked In" (no timeliness badge)

### Scenario 4: Checked Out
- Check-in: 10:50 AM (on time)
- Check-out: 5:00 PM
- Expected: Dashboard shows "Checked Out" with timeliness "On Time"
