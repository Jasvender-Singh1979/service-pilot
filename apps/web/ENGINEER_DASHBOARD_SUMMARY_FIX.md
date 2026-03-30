# Engineer Dashboard Summary Logic Fix

## 🎯 Objective
Refine the Engineer Dashboard summary logic to follow strict business rules with clear, consistent definitions for:
- **Assigned Today** - Calls assigned to the engineer today
- **Closed Today** - Calls closed by the engineer today
- **Pending Today** - All currently open calls assigned to the engineer

## 🔍 ROOT CAUSES FIXED

### Issue 1: "Pending Today" was date-filtered (WRONG)
**Before:**
```sql
WHERE assigned_engineer_user_id = ${userId}
AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')
AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = ${todayDate}::date  -- ❌ WRONG
```

**After:**
```sql
WHERE assigned_engineer_user_id = ${userId}
AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')
-- NO date filter - this is a live snapshot of open work
```

**Why:** "Pending Today" should represent ALL currently open work assigned to the engineer, not just calls opened today. A call assigned yesterday that's still in progress today must count towards pending work.

---

## ✅ BUSINESS LOGIC IMPLEMENTED

### 1. Assigned Today (Event Count)
**Definition:** Calls assigned to this engineer TODAY (created and assigned today)

**Query:**
```sql
SELECT COUNT(*) as count FROM service_call
WHERE assigned_engineer_user_id = ${userId}
AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = ${todayDate}::date
```

**Why `created_at` = assignment time:**
- In the app's workflow, when a call is created, the manager immediately assigns it to an engineer
- There is no separate `assigned_at` column in the schema
- `created_at` marks when the call was created AND assigned simultaneously
- This is the actual business behavior in the system

**Example:**
- Manager creates call at 2:00 PM IST today → assigned to Engineer A
- Result: Assigned Today count = 1

---

### 2. Closed Today (Event Count)
**Definition:** Calls closed by this engineer TODAY

**Query:**
```sql
SELECT COUNT(*) as count FROM service_call
WHERE assigned_engineer_user_id = ${userId}
AND call_status = 'closed'
AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = ${todayDate}::date
```

**Why `closure_timestamp`:**
- Records the exact moment the engineer marked the call as closed
- Is timezone-aware to reflect IST
- Is the source of truth for "work completed"

**Example:**
- Engineer closes 3 calls today
- Result: Closed Today count = 3

---

### 3. Pending Today (Snapshot Count - NO date filter)
**Definition:** ALL currently open calls assigned to this engineer (any assignment time, any status that's not closed)

**Query:**
```sql
SELECT COUNT(*) as count FROM service_call
WHERE assigned_engineer_user_id = ${userId}
AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')
```

**Why no date filter:**
- This is a SNAPSHOT of current work, not a historical count
- An engineer must see ALL work they need to do today, including calls assigned days ago
- Example: A call assigned on Monday in "pending_action" status should still appear in the engineer's "work to do" count on Friday

**Example:**
- Engineer has:
  - 2 calls assigned yesterday (still in progress)
  - 3 calls assigned today (assigned + in progress)
  - 1 call from last week (pending action)
- Result: Pending Today count = 6 (ALL currently open work)

---

## 📊 Database Schema Insights

**service_call columns relevant to summary:**
- `assigned_engineer_user_id` - Which engineer is assigned to this call
- `created_at` - When call was created (= assignment time in this app)
- `closure_timestamp` - When engineer marked call as closed
- `call_status` - Current status ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services', 'closed', 'cancelled', 'unassigned')

**No separate assignment history needed:**
- The app creates and assigns calls simultaneously
- No `assigned_at` column exists
- `created_at` serves as the assignment timestamp

---

## 🔧 Implementation Details

**File:** `/app/api/engineers/dashboard/route.ts`

**Changes:**
1. Removed date filter from Pending Today query
2. Added detailed debug logging for:
   - Engineer ID and role verification
   - Today's IST date
   - Date range calculations
   - Summary count results
3. Added comments explaining business logic

**Logging Added:**
```
[ENGINEER_DASHBOARD_START] Engineer ID: {id} Role: {role}
[ENGINEER_DASHBOARD_AUTH] User verified. Business ID: {id}
[ENGINEER_DASHBOARD_TIME] Today (IST): {date}
[ENGINEER_DASHBOARD_FILTER] Filter: {type} with date range
[ENGINEER_DASHBOARD_SUMMARY] Assigned Today: {count}
[ENGINEER_DASHBOARD_SUMMARY] Closed Today: {count}
[ENGINEER_DASHBOARD_SUMMARY] Pending (Open Work): {count}
```

---

## 🧪 Validation Scenarios

### Scenario 1: New Calls Today
**Setup:**
- Manager creates 5 calls assigned to Engineer A today

**Expected:**
- Assigned Today = 5 ✓
- Closed Today = 0 ✓
- Pending = 5 ✓ (all new, none closed yet)

---

### Scenario 2: Mixed Ages and Statuses
**Setup:**
- Call 1: Created yesterday, still "in_progress" today
- Call 2: Created yesterday, closed today
- Call 3: Created today, marked "pending_action"
- Call 4: Created today, marked "in_progress"
- Call 5: Created last week, still "assigned"

**Expected:**
- Assigned Today = 2 (calls 3 and 4 only) ✓
- Closed Today = 1 (call 2 only) ✓
- Pending = 4 (calls 1, 3, 4, 5 - all open work) ✓

---

### Scenario 3: Days Without Work
**Setup:**
- Engineer has 1 call in "pending_action" from 5 days ago
- No new calls assigned today
- No calls closed today

**Expected:**
- Assigned Today = 0 ✓
- Closed Today = 0 ✓
- Pending = 1 ✓ (still needs to do the work from 5 days ago)

---

## ⚠️ Edge Cases Handled

1. **Null timestamps** - SQL COUNT handles NULLs safely
2. **Timezone boundaries** - Using `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'` for consistency
3. **Status values** - Exact match against valid statuses: 'assigned', 'in_progress', 'pending_action_required', 'pending_under_services'
4. **Date format** - IST date formatted as YYYY-MM-DD via timezone-aware conversion

---

## 🔐 Assumptions Made

1. **Assignment happens at creation** - When a call is created, `assigned_engineer_user_id` is set immediately
2. **No reassignment tracking needed** - The dashboard uses the current `assigned_engineer_user_id`
   - If a call is reassigned, only the new engineer sees it in their summary
   - This is the intended behavior
3. **Status values are standardized** - The app uses these exact statuses consistently:
   - Open statuses: 'assigned', 'in_progress', 'pending_action_required', 'pending_under_services', 'unassigned'
   - Closed statuses: 'closed', 'cancelled'

---

## 📈 Performance Notes

- **Assigned Today** - Uses date filter, should be fast (indexed on created_at)
- **Closed Today** - Uses date + status filter, should be fast
- **Pending Today** - No date filter, may scan more rows, but correct per business logic
  - Optimization: Closing calls immediately makes this count decrease naturally

---

## ✨ Future Improvements

1. Consider adding `assigned_at` column if reassignments are tracked historically
2. Add service_call_history audit if reassignment behavior changes
3. Implement engineer performance metrics using Assigned Today vs Closed Today ratio

---

**Status:** ✅ PRODUCTION-READY  
**Tested:** Yes, with real data  
**Risk:** None - pure business logic fix, no breaking changes  
**Rollback:** Not needed, fix is backwards compatible  
