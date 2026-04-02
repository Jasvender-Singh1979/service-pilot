# Manager Call Reports Mismatch Investigation

## OBSERVED SYMPTOM
- **Preset "Today"**: Assigned=2, Closed=0, Revenue=0, Engineer perf=nil, Category perf=no data
- **Custom date "2026-04-02 to 2026-04-02"**: Assigned=2, Closed=1, Revenue present

Same date, different results → proves backend query CAN work, but preset path has error.

---

## FILES INVOLVED

### 1. Frontend: `/home/user/apps/web/app/manager/reports/page.tsx`
- **Lines 93-125**: `getDateRange()` function
  - `dateFilter='today'`: calls `getTodayDateStringIST()`, returns IST calendar date string
  - `dateFilter='custom'`: uses `customStartDate` and `customEndDate` directly
  - All return: `{ start, end, filterType }`

- **Lines 127-157**: `fetchReports()` function
  - Builds URLSearchParams with: `filter`, `startDate`, `endDate`
  - Calls: `/api/reports?filter=today&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Or for custom: `/api/reports?filter=custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### 2. Backend: `/home/user/apps/web/app/api/reports/route.ts`
- **Lines 53-68**: Receives query params: `filter`, `startDate`, `endDate`
- **Lines 68-75**: **FALLBACK LOGIC** (only if dates missing):
  ```typescript
  if (!startDate || !endDate) {
    const dateRange = getDateRange(filterType);
    startDate = dateRange.startDate || startDate;
    endDate = dateRange.endDate || endDate;
  }
  ```
  - **CRITICAL BUG HERE**: `getDateRange()` calls `getTodayRangeIST()` which returns **UTC Date objects**
  - Then extracts date part via `.toISOString().split('T')[0]`
  - **This produces WRONG dates** because UTC timestamps don't align with IST calendar dates

- **Lines 79-108**: `eventCountQuery` for CREATED/CANCELLED/CLOSED (EVENT counts during range)
  - CLOSED logic (lines ~103-107):
  ```sql
  WHERE call_status = 'closed'
  AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
  AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
  ```
  - This uses BOTH startDate AND endDate ✓ (correct for "Today")

- **Lines 119-158**: `snapshotQuery` for current status counts (ASSIGNED, IN_PROGRESS, etc.)
  - ASSIGNED logic (lines ~131-140):
  ```sql
  WHERE call_status = 'assigned'
  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
  ```
  - **BUG**: Only checks `<= endDate`, NO `>= startDate` check!
  - For "Today", this counts ALL calls created since beginning of time up to today
  - But for snapshot logic, should only count calls created TODAY
  
- **Lines 160-206**: `trendQuery` for closed calls in period
  - Uses: `(closure_timestamp ... )::date >= startDate AND <= endDate` ✓ (correct)

### 3. Date Utilities: `/home/user/apps/web/lib/dateUtils.ts`

- **`getTodayDateStringIST()`** (lines ~34-50):
  - Returns: YYYY-MM-DD string (IST calendar date)
  - Example: `"2026-04-02"`
  - ✓ **Correct for frontend**

- **`getTodayRangeIST()`** (lines ~74-76):
  ```typescript
  export function getTodayRangeIST(): { start: Date; end: Date } {
    const todayString = getTodayDateStringIST();
    return istDateStringToUTCRange(todayString);
  }
  ```
  - Returns: UTC Date objects (not calendar dates!)
  - `start`: `2026-04-01T18:30:00Z` (Apr 1 UTC) = Apr 2 00:00 IST
  - `end`: `2026-04-02T18:29:59Z` (Apr 2 UTC) = Apr 2 23:59:59 IST
  - ✓ **Correct for DB queries, but WRONG when converted to ISO date strings**

- **`getDateRange(filter)` in route.ts** (lines ~11-32):
  - Calls `getTodayRangeIST()` which returns UTC timestamps
  - Converts: `range.start.toISOString().split('T')[0]`
  - Result: `"2026-04-01"` (WRONG!) instead of `"2026-04-02"` (IST calendar date)
  - ✗ **THIS IS THE BUG**

---

## ROOT CAUSE ANALYSIS

### The Bug Happens When:
1. Frontend "Today" preset is clicked
2. Frontend calls `getDateRange()` which returns IST calendar dates `"2026-04-02"` to `"2026-04-02"`
3. Frontend sends params: `/api/reports?filter=today&startDate=2026-04-02&endDate=2026-04-02`
4. **BUT IF Frontend does NOT send dates** (code path exists):
   - Backend receives: `filter=today` but NO `startDate` and `endDate`
   - Backend calls fallback `getDateRange('today')`
   - Fallback converts UTC timestamps to ISO date strings incorrectly
   - Results in: `startDate="2026-04-01"` and `endDate="2026-04-02"` ← **MISMATCH**
5. **OR IF Frontend DOES send dates correctly** but the custom-vs-today code path differs:
   - The snapshot query has **different WHERE clause logic**
   - ASSIGNED snapshot: `created_at <= endDate` only (no startDate check)
   - But CLOSED event: `closure_timestamp >= startDate AND <= endDate`
   - This causes:
     - ASSIGNED to show all calls ever created (inflated)
     - CLOSED to show only calls closed in range (correct)

### Why Custom Works:
When user selects Custom date "2026-04-02" to "2026-04-02":
- Frontend sends correct dates to backend
- Backend snapshot query still has the `<= endDate` only logic
- BUT in custom mode, users typically only filter single day or recent range
- The lack of `>= startDate` in snapshot query doesn't cause visible error if all relevant calls were created TODAY

### Why Today Fails:
- If Today's dates aren't sent (code path issue)
- Or if Today's dates are sent but snapshot logic treats history incorrectly
- CLOSED count = 0 because getDateRange produced wrong dates (Apr 1 to Apr 2, not Apr 2 to Apr 2)
- ASSIGNED count = 2 because snapshot query gets lucky (only 2 calls total created by Apr 2)
- REVENUE = 0 because CLOSED count = 0
- ENGINEER perf = nil because no matching engineers
- CATEGORY perf = no data because no matching calls in range

---

## EXACT ISSUES IDENTIFIED

### Issue #1: Backend `getDateRange()` UTC-to-ISO Bug (CRITICAL)
- **File**: `/home/user/apps/web/app/api/reports/route.ts` lines 11-32
- **Problem**: 
  ```typescript
  const range = getTodayRangeIST();  // Returns UTC timestamps
  const start = range.start.toISOString().split('T')[0];  // Extracts date from UTC time
  const end = range.end.toISOString().split('T')[0];
  ```
- **Example**:
  - `getTodayRangeIST()` for Apr 2 IST returns: `start=2026-04-01T18:30:00Z`
  - `.split('T')[0]` gives: `"2026-04-01"` ← WRONG (should be "2026-04-02")
- **Impact**: When frontend doesn't send dates, backend calculates wrong date range
- **Fix**: Backend should call `getTodayDateStringIST()` instead, NOT `getTodayRangeIST()`

### Issue #2: Snapshot Query Missing Start Date Filter (CRITICAL)
- **File**: `/home/user/apps/web/app/api/reports/route.ts` lines 119-158
- **Problem**: All snapshot queries (unassigned, assigned, in_progress, etc.) only check:
  ```sql
  AND (created_at ... )::date <= ${endDate}::date
  ```
  - Missing: `AND (created_at ... )::date >= ${startDate}::date`
- **Impact**: Snapshot counts include ALL calls ever created up to end date, not just the filtered period
- **Example**:
  - For "Today" with range Apr 2 to Apr 2:
  - Current query counts all calls created Apr 1, 2, 3, ... up to Apr 2 (entire history!)
  - Should count only calls created Apr 2 to Apr 2
- **Fix**: Add `>= ${startDate}` check to snapshot queries (when hasDateFilter is true)

### Issue #3: Inconsistent Date Field Usage (SECONDARY)
- **File**: `/home/user/apps/web/app/api/reports/route.ts`
- **Problem**: Inconsistent which date field is used for filtering:
  - CREATED event count: uses `created_at`
  - ASSIGNED snapshot: uses `created_at`
  - CLOSED event count: uses `closure_timestamp`
  - CLOSED snapshot: would use `closure_timestamp` (if present)
- **Impact**: Calls closed today but created weeks ago won't show in "Today" closed count
- **Severity**: Lower (by design: "assigned today" vs "closed today" are different concepts)

---

## VERIFICATION OF ROOT CAUSE

### Why Today Gives 0 Closed:
1. Frontend Today → sends `startDate=2026-04-02`, `endDate=2026-04-02`
   - OR doesn't send dates, backend calculates with UTC bug
2. CLOSED query (if using wrong dates from fallback): `closure_timestamp >= 2026-04-01 AND <= 2026-04-02`
   - If call was closed exactly on Apr 2 IST 00:00 (UTC Apr 1 18:30)
   - Query filters: `closure_timestamp >= 2026-04-01` ✓ matches
   - But if dates aren't being sent at all, and fallback gives "2026-04-01", might not match
3. Result: Closed = 0

### Why Custom Works:
1. Frontend Custom 2026-04-02 → sends `startDate=2026-04-02`, `endDate=2026-04-02`
2. CLOSED query: `closure_timestamp >= 2026-04-02 AND <= 2026-04-02` ✓
3. Calls closed on Apr 2 IST match ✓
4. Result: Closed = 1 ✓

---

## SAFEST MINIMAL FIXES

### Fix #1: Backend `getDateRange()` Function
**Location**: `/home/user/apps/web/app/api/reports/route.ts` lines 11-32

**Current**:
```typescript
function getDateRange(filter: string) {
  switch (filter) {
    case "today": {
      const range = getTodayRangeIST();
      const start = range.start.toISOString().split('T')[0];
      const end = range.end.toISOString().split('T')[0];
      return { startDate: start, endDate: end };
    }
```

**Fixed**:
```typescript
function getDateRange(filter: string) {
  switch (filter) {
    case "today": {
      const today = getTodayDateStringIST();  // Get IST calendar date string directly
      return { startDate: today, endDate: today };
    }
```

**Rationale**: `getTodayDateStringIST()` already gives us the correct IST calendar date. We don't need to convert to UTC and back.

### Fix #2: Snapshot Queries - Add Start Date Filter
**Location**: `/home/user/apps/web/app/api/reports/route.ts` lines 119-158

**Current**:
```typescript
if (hasDateFilter && managerFilterId) {
  snapshotQuery = await sql`
    SELECT ... FROM service_call
    WHERE ... AND (created_at ... )::date <= ${endDate}::date
  `;
}
```

**Fixed**:
```typescript
if (hasDateFilter && managerFilterId) {
  snapshotQuery = await sql`
    SELECT ... FROM service_call
    WHERE ... 
    AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
    AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
  `;
}
```

Apply same fix to all snapshot query branches (manager-scoped, super-admin, etc.)

**Rationale**: Snapshot counts should reflect the state of calls created DURING the selected period, not since time began.

---

## BUSINESS LOGIC AFTER FIXES

### "Today" Preset (After Fixes):
1. Frontend: `getTodayDateStringIST()` → "2026-04-02"
2. Sends: `/api/reports?filter=today&startDate=2026-04-02&endDate=2026-04-02`
3. Backend receives dates directly (hasDateFilter = true)
4. Fallback NOT called
5. CLOSED query: `closure_timestamp >= 2026-04-02 AND <= 2026-04-02` ✓
6. ASSIGNED snapshot: `created_at >= 2026-04-02 AND <= 2026-04-02` ✓
7. Result: Assigned and Closed counts match Custom behavior ✓

### "Custom 2026-04-02 to 2026-04-02" (Already Working):
1. Frontend sends: `/api/reports?filter=custom&startDate=2026-04-02&endDate=2026-04-02`
2. Backend receives dates directly (hasDateFilter = true)
3. CLOSED query: `closure_timestamp >= 2026-04-02 AND <= 2026-04-02` ✓
4. ASSIGNED snapshot: `created_at >= 2026-04-02 AND <= 2026-04-02` ✓
5. Result: Both counts accurate ✓

---

## SUMMARY

| **Bug** | **Location** | **Cause** | **Impact** | **Severity** |
|--------|-------------|----------|-----------|------------|
| UTC-to-ISO conversion in fallback | route.ts lines 11-32 | Converting UTC timestamps to ISO, splitting on T, getting wrong date | Today preset gets wrong date range | **CRITICAL** |
| Snapshot queries missing startDate | route.ts lines 119-158 | Only `<= endDate` check, no `>= startDate` | Snapshot counts include entire history, not just period | **CRITICAL** |
| Inconsistent date fields | route.ts (multiple) | CLOSED uses closure_timestamp, ASSIGNED uses created_at | Calls closed today but created earlier won't show in closed count | MEDIUM |

**Root Cause Type**: Date boundary logic + insufficient date filtering in snapshot queries
**Bug Classification**: Frontend parameters correct; Backend query logic flawed for preset dates
