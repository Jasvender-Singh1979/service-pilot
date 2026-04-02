# BUG INVESTIGATION REPORT
## Manager Dashboard "Today's Performance" vs Reports "Today"

---

## 1. FRONTEND FILES & FUNCTIONS

### PATH A: Manager Dashboard "Today's Performance"
- **File**: `/home/user/apps/web/app/manager/page.tsx`
- **Function**: `ManagerDashboard()` → `fetchPerformanceData()`
- **Location**: Line ~90
- **Action**:
  ```javascript
  const response = await fetch(`/api/dashboard/performance`);
  ```
- **Endpoint Called**: `/api/dashboard/performance`
- **Query Params**: NONE

### PATH B: Reports Preset "Today"
- **File**: `/home/user/apps/web/app/manager/reports/page.tsx`
- **Function**: `ManagerReports()` → `fetchReports()`
- **Location**: Lines 176-209
- **Action**:
  ```javascript
  const { start, end, filterType } = getDateRange();
  // Returns: { start: "2026-04-02", end: "2026-04-02", filterType: "today" }
  
  const params = new URLSearchParams();
  params.append("filter", "today");
  params.append("startDate", start);      // IST calendar date
  params.append("endDate", end);          // IST calendar date
  
  const response = await fetch(`/api/reports?${params.toString()}`);
  ```
- **Endpoint Called**: `/api/reports`
- **Query Params**: 
  - `filter=today`
  - `startDate=YYYY-MM-DD` (IST calendar date from getTodayDateStringIST())
  - `endDate=YYYY-MM-DD` (IST calendar date from getTodayDateStringIST())

### PATH C: Reports Custom Date Filter
- **File**: `/home/user/apps/web/app/manager/reports/page.tsx`
- **Function**: `ManagerReports()` → `fetchReports()`
- **Location**: Lines 177-209
- **Action**: Same as PATH B but with user-selected dates and `filter=custom`
- **Endpoint Called**: `/api/reports`
- **Query Params**:
  - `filter=custom`
  - `startDate=YYYY-MM-DD` (user input from date picker)
  - `endDate=YYYY-MM-DD` (user input from date picker)

---

## 2. LITERAL REQUEST PARAMETERS (EXACT DATA SENT)

### PATH A: Dashboard Today's Performance
```
GET /api/dashboard/performance
(no query parameters)
```

### PATH B: Reports Preset "Today"
```
GET /api/reports?filter=today&startDate=2026-04-02&endDate=2026-04-02
```

### PATH C: Reports Custom (today, today)
```
GET /api/reports?filter=custom&startDate=2026-04-02&endDate=2026-04-02
```

---

## 3. BACKEND API ROUTES & BUSINESS LOGIC

### ROUTE A: /api/dashboard/performance
- **File**: `/home/user/apps/web/app/api/dashboard/performance/route.ts`
- **Auth**: Manager only (role !== "manager" → 403)
- **Date Handling**: Uses `getTodayRange()` from `/lib/timezone.ts`
  ```typescript
  const todayRange = getTodayRange();
  const todayStartDate = format(todayRange.start, "yyyy-MM-dd");
  const todayEndDate = format(todayRange.end, "yyyy-MM-dd");
  ```
  ⚠️ **ISSUE #1**: Uses OLD `timezone.ts`, NOT `dateUtils.ts`

### Key Metrics (Dashboard):
| Metric | SQL Query | Date Field |
|--------|-----------|-----------|
| Created | COUNT(*) | `created_at` |
| Closed | COUNT(*) WHERE status='closed' | `closure_timestamp` |
| Pending | COUNT(*) NOT IN ('closed','cancelled') | **NO DATE FILTER** (snapshot) |
| Cancelled | COUNT(*) WHERE status='cancelled' | `updated_at` |

### SQL Date Conversion (Dashboard):
```sql
(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
(closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
```

### Manager Filter:
```sql
WHERE manager_user_id = ${managerId}
AND business_id = ${businessId}
```

---

### ROUTE B: /api/reports
- **File**: `/home/user/apps/web/app/api/reports/route.ts`
- **Auth**: Multi-user (manager, engineer, super_admin)
- **Date Handling (getDateRange function - lines 18-45)**:
  ```typescript
  function getDateRange(filter: string) {
    switch (filter) {
      case "today": {
        const today = getTodayDateStringIST();
        return { startDate: today, endDate: today };
      }
      // ... other filters
    }
  }
  ```
  ⚠️ **ISSUE #2**: This `getDateRange()` is a FALLBACK and is NEVER USED for preset "today"!

  Code (lines 71-76):
  ```typescript
  if (!startDate || !endDate) {
    const dateRange = getDateRange(filterType);
    startDate = dateRange.startDate || startDate;
    endDate = dateRange.endDate || endDate;
  } else {
    console.log("REPORTS_USING_FRONTEND_DATES");  // <-- This always prints!
  }
  ```
  Since frontend SENDS `startDate` & `endDate` params, this fallback is NEVER executed.
  The API **always trusts frontend-supplied dates**.

### Key Metrics (Reports):
| Metric | SQL Query | Date Field |
|--------|-----------|-----------|
| Created (event) | COUNT(*) | `created_at` |
| Cancelled (event) | COUNT(*) WHERE status='cancelled' | `updated_at` |
| Closed (event) | COUNT(*) WHERE status='closed' | `closure_timestamp` |
| Unassigned (snap) | COUNT(*) WHERE status='unassigned' | `created_at` + DATE FILTER |
| Assigned (snap) | COUNT(*) WHERE status='assigned' | `created_at` + DATE FILTER |
| In Progress (snap) | COUNT(*) WHERE status='in_progress' | `created_at` + DATE FILTER |
| Action Required (snap) | COUNT(*) WHERE status='pending_action' | `created_at` + DATE FILTER |
| Under Services (snap) | COUNT(*) WHERE status='pending_under' | `created_at` + DATE FILTER |

### SQL Date Conversion (Reports):
```sql
(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
(closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
```

### Manager Filter:
```sql
[AND manager_user_id = ${managerFilterId}]  -- Only if manager or super_admin with selection
```

---

## 4. DETAILED SQL LOGIC COMPARISON

### METRIC: Calls Closed Today

**Dashboard** (`/api/dashboard/performance`):
```sql
SELECT COUNT(*) as count FROM service_call
WHERE manager_user_id = ${managerId}
  AND business_id = ${businessId}
  AND call_status = 'closed'
  AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${todayStartDate}::date
  AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${todayEndDate}::date
```
Where:
- `todayStartDate`, `todayEndDate` = formatted from `getTodayRange()` (timezone.ts)

**Reports** (`/api/reports`, with `filter=today`):
```sql
SELECT COUNT(*) FILTER (
  WHERE call_status = 'closed'
    AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
    AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
)
FROM service_call
WHERE business_id = ${businessId}
  [AND manager_user_id = ${managerFilterId}]
```
Where:
- `startDate` = "2026-04-02" (calendar date from getTodayDateStringIST() on frontend)
- `endDate` = "2026-04-02" (calendar date from getTodayDateStringIST() on frontend)

⚠️ **CRITICAL DIFFERENCE #1**:
- **Dashboard**: Uses `todayStartDate`, `todayEndDate` from `getTodayRange()` (timezone.ts)
- **Reports**: Uses `startDate`, `endDate` from frontend (getTodayDateStringIST() from dateUtils.ts)

These two timezone utilities have **DIFFERENT IMPLEMENTATIONS**:
- `timezone.ts`: Uses `Date.toLocaleString()` (potentially unreliable)
- `dateUtils.ts`: Uses `Intl.DateTimeFormat` (more precise)

If they return different "today" dates → **different query results**.

---

### METRIC: Calls Pending Today

**Dashboard** (`/api/dashboard/performance`):
```sql
SELECT COUNT(*) as count FROM service_call
WHERE manager_user_id = ${managerId}
  AND business_id = ${businessId}
  AND call_status NOT IN ('closed', 'cancelled')
```
⚠️ **NO DATE FILTER** - This is a SNAPSHOT of ALL open calls (any creation date)

**Reports** (`/api/reports`):
```sql
SELECT COUNT(*) FILTER (WHERE call_status = 'unassigned')
  ...
FROM service_call
WHERE business_id = ${businessId}
  [AND manager_user_id = ${managerFilterId}]
  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
```

⚠️ **CRITICAL DIFFERENCE #2**:
- **Dashboard "Pending"** = ALL open calls (no date restriction)
- **Reports "Unassigned/Assigned/In Progress"** = ONLY calls CREATED TODAY that are still open

These are **fundamentally different metrics**.

**Example**:
- You had 10 open calls yesterday + 2 created today
- Dashboard Pending = 12
- Reports open status cards = 2

**→ This is likely causing the zeros/mismatch in Reports!**

---

## 5. DATE FIELD USED BY EACH METRIC

### Dashboard "Today's Performance":
- **Created**: `created_at` (event - calls created today)
- **Closed**: `closure_timestamp` (event - calls closed today)
- **Pending**: NONE - snapshot of open calls (all statuses, any creation date)
- **Cancelled**: `updated_at` (event - calls cancelled today)

### Reports "Summary" (when filter=today):
- **Created**: `created_at` (event - calls created today)
- **Cancelled**: `updated_at` (event - calls cancelled today)
- **Closed**: `closure_timestamp` (event - calls closed today)
- **Unassigned**: `created_at` (snapshot - created today, still unassigned)
- **Assigned**: `created_at` (snapshot - created today, still assigned)
- **In Progress**: `created_at` (snapshot - created today, still in progress)
- **Action Required**: `created_at` (snapshot - created today, pending action)
- **Under Services**: `created_at` (snapshot - created today, under services)

---

## 6. ROOT CAUSE ANALYSIS

### FINDING #1: Different timezone calculation libraries
- **Dashboard**: Uses `/lib/timezone.ts` → `getTodayRange()`
- **Reports**: Uses `/lib/dateUtils.ts` → `getTodayDateStringIST()`

These have **DIFFERENT IMPLEMENTATIONS**:
- `timezone.ts` uses `Date.toLocaleString()` method (potentially unreliable)
- `dateUtils.ts` uses `Intl.DateTimeFormat` (more precise)

**If they return different "today" dates, the query results won't match.**

### FINDING #2: Snapshot vs Event count confusion
- **Dashboard "Pending Today"** = ALL open calls (snapshot at this moment)
- **Reports open status cards** = ONLY calls CREATED TODAY that are still open

These are **fundamentally different metrics**.

**This is why Reports shows zeros** - it's looking for calls created today that match a status, but most open calls were created yesterday/earlier.

### FINDING #3: Manager filter context mismatch
- **Dashboard**: Always uses logged-in manager's ID
- **Reports**: For managers, uses `user.id`; for super_admin, uses `selectedManagerId` or ALL

If a super_admin is viewing reports, they see different data.

### FINDING #4: Frontend date parameter passing
- Reports sends `startDate` & `endDate` as calendar dates (e.g., "2026-04-02")
- These are IST calendar dates, not UTC timestamps
- API uses them directly in SQL

This **works** IF the dates are correct, but relies on frontend calculation accuracy.

---

## 7. EXACT DIFFERENCE CAUSING THE BUG

**DISCREPANCY**: Dashboard shows Closed=1, Pending=2 but Reports Today shows zeros/different values

### HYPOTHESIS:

The Reports page calculates IST dates using `getTodayDateStringIST()` from `dateUtils.ts`, but Dashboard uses `getTodayRange()` from `timezone.ts`.

**If these two functions return different "today" dates**, the SQL queries operate on different date ranges.

**EXAMPLE**:
- Current time: 2026-04-02 10:00 UTC (= 2026-04-02 15:30 IST)

**Dashboard** (timezone.ts - potentially buggy):
- `getTodayRange()` → might return Apr 1 00:00-23:59 UTC
- Queries look for calls from Apr 1

**Reports** (dateUtils.ts - correct):
- `getTodayDateStringIST()` → returns "2026-04-02"
- Queries look for calls from Apr 2 IST (= Apr 1 18:30 - Apr 2 18:29 UTC)

**Result**: Different date ranges → Different counts → **Bug manifests**

### SECONDARY HYPOTHESIS:

The Reports "Pending Today" metric is showing **zero** because:
- Reports filters: "calls created TODAY that are still open"
- Dashboard filters: "all open calls, any age"

If you had 10 open calls from yesterday + 2 created today:
- Dashboard Pending = 12 ✓
- Reports shows: Unassigned=0, Assigned=1, In Progress=0, Action Required=0, Under Services=1

The discrepancy makes sense!

---

## 8. TYPE OF BUG

| Factor | Verdict |
|--------|---------|
| Frontend state bug | NO (frontend correctly passes dates) |
| Wrong preset filter param | **YES** (date calculation might be wrong) |
| Backend route mismatch | **YES** (dashboard and reports use different paths + timezone libs) |
| SQL mismatch | **YES** (different snapshot/event logic for pending/open) |
| Stale cache/state | NO (each request is independent) |
| Wrong date field per metric | **YES** (pending uses different logic) |

### CONCLUSION
**Multi-layered bug involving**:
1. **Timezone library mismatch** - Dashboard uses `timezone.ts`, Reports uses `dateUtils.ts`
2. **Business logic mismatch** - Dashboard snapshots ALL open calls, Reports only counts TODAY's open calls
3. **SQL filter mismatch** - Different approaches to defining "pending" metric

---

## 9. SMALLEST SAFE FIX

### **Option 1: Migrate Dashboard to use dateUtils.ts** (RECOMMENDED - LOWEST RISK)

**File**: `/home/user/apps/web/app/api/dashboard/performance/route.ts`

**Changes**:
1. Replace import:
   - FROM: `import { getTodayRange } from "@/lib/timezone";`
   - TO: `import { getTodayDateStringIST } from "@/lib/dateUtils";`

2. Replace date calculation:
   - FROM: 
     ```typescript
     const todayRange = getTodayRange();
     const todayStartDate = format(todayRange.start, "yyyy-MM-dd");
     const todayEndDate = format(todayRange.end, "yyyy-MM-dd");
     ```
   - TO:
     ```typescript
     const todayIST = getTodayDateStringIST();
     const todayStartDate = todayIST;
     const todayEndDate = todayIST;
     ```

**Benefit**: Eliminates timezone calculation discrepancy. Both routes now use same timezone library.

**Risk**: LOW (dateUtils is already proven correct in Reports)

---

### **Option 2: Fix Reports snapshot query logic**

**File**: `/home/user/apps/web/app/api/reports/route.ts`

**Changes**: Remove date filter from snapshot queries (lines 142-186)

**Current (WRONG)**:
```sql
SELECT COUNT(*) FILTER (WHERE call_status = 'unassigned')
FROM service_call
WHERE business_id = ${businessId}
  AND manager_user_id = ${managerFilterId}
  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
```

**New (CORRECT - true snapshot)**:
```sql
SELECT COUNT(*) FILTER (WHERE call_status = 'unassigned')
FROM service_call
WHERE business_id = ${businessId}
  AND manager_user_id = ${managerFilterId}
```

**Benefit**: Makes snapshot counts match Dashboard (shows ALL open work, not just today's)

**Risk**: MEDIUM (changes Reports behavior - may confuse users if they expect date-filtered snapshots)

**Note**: This is a philosophical choice about what "Pending" means:
- Dashboard: All currently open work (regardless of age)
- Reports: New work opened in the selected period

---

### **Option 3: Do BOTH (BEST - RECOMMENDED)**

Migrate Dashboard to `dateUtils.ts` AND clarify Reports snapshot logic.

**Result**:
- Both use same timezone calculation ✓
- Both use same business logic ✓
- Consistent results across app ✓

**Risk**: LOW + MEDIUM = requires testing but highest confidence

---

## 10. SUMMARY

| Aspect | Dashboard | Reports | Status |
|--------|-----------|---------|--------|
| Timezone lib | timezone.ts ❌ | dateUtils.ts ✓ | MISMATCH |
| Date format | Formatted dates | Calendar strings | COMPATIBLE |
| Pending logic | ALL open calls | Created today + open | MISMATCH |
| Manager filter | Always uses user.id | Conditional | COMPATIBLE |
| SQL syntax | Standard SELECT | FILTER clause | COMPATIBLE |

**The bug exists because**:
1. Dashboard and Reports use different timezone libraries (timezone.ts vs dateUtils.ts)
2. Dashboard and Reports define "pending" differently (all open vs today's open)
3. If timezone calculations differ, query dates don't match
4. Reports shows zeros/wrong numbers because it's looking for calls created today that are still open (fewer results than dashboard's "all open work")
