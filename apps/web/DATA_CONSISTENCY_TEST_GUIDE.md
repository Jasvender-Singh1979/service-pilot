# Data Consistency & Engineer Call Flow - Test Verification Guide

## Pre-Test Setup

### Required State:
- Database is clean (or has test data)
- Business created ✅
- Super Admin created ✅
- Manager created ✅
- At least 2 engineers created ✅

### Test Users:
- Manager account: Use existing manager login
- Engineer 1: Use existing engineer 1 login
- Engineer 2: Use existing engineer 2 login

---

## TEST A: Manager Service Call Status Consistency

### Objective:
Verify that newly created and assigned calls appear in the correct status bucket on manager dashboard.

### Steps:

**Step 1: Manager Login**
1. Open app
2. Login as manager
3. Navigate to manager dashboard (/)
4. Note the current counts in "Service Call Status" section
   - Unassigned: X
   - Assigned: Y
   - In Progress: Z
   - (etc.)

**Expected:** Dashboard loads without errors

---

**Step 2: Create Service Call**
1. Click "Service Calls" button
2. Click "+ Create Service Call"
3. Fill form:
   - Customer Name: "Test Customer A"
   - Customer Phone: "9876543210"
   - Problem: "Test issue"
   - Category: Select any category
   - Priority: "High"
   - DO NOT assign engineer yet
4. Click "Create Call"

**Expected:** Call created successfully, UI shows confirmation

---

**Step 3: Assign Call to Engineer**
1. Go back to manager dashboard
2. Click "Service Calls" or "All Calls"
3. Find the call just created ("Test Customer A")
4. Open the call
5. Click "Assign Engineer" or similar button
6. Select Engineer 1
7. Confirm assignment

**Expected:** Call is now assigned to Engineer 1

---

**Step 4: Verify Manager Dashboard Status Buckets**
1. Go back to manager dashboard (/)
2. Scroll to "Service Call Status" section
3. Check the counts:
   - "Unassigned" should have DECREASED by 1
   - "Assigned" should have INCREASED by 1

**Expected:** ✅ Assigned count shows 1 (or previous count + 1)

---

**Step 5: Refresh Dashboard**
1. Refresh the page (F5)
2. Wait for dashboard to load
3. Check "Service Call Status" counts again

**Expected:** ✅ Counts persist after refresh
- Assigned: Still shows the newly assigned call count

---

**Step 6: Create Second Call and Assign Different Engineer**
1. Repeat Steps 2-3 but assign to Engineer 2
2. Create one more call and DO NOT assign it
3. Go back to dashboard

**Expected:**
- Unassigned: 1 (the unassigned call)
- Assigned: 2 (two engineers with one call each)

---

## TEST B: Engineer Dashboard Real Data

### Objective:
Verify that engineer dashboard shows actual assigned call counts and real data.

### Steps:

**Step 1: Engineer 1 Login**
1. Logout from manager account
2. Login as Engineer 1
3. Should see engineer dashboard

**Expected:** Dashboard loads without 500 error

---

**Step 2: Check Engineer Dashboard Data**
1. Look at "Status Overview" section with stat cards:
   - Assigned: Should be 1 (the call assigned to this engineer)
   - In Progress: Should be 0
   - Pending Action: Should be 0
   - Under Services: Should be 0
   - Closed: Should be 0
   - Cancelled: Should be 0

**Expected:** ✅ At least "Assigned" count shows 1

---

**Step 3: Check Today's Summary**
1. Look at the blue card showing "Today's Summary"
2. Should show:
   - "Assigned Today": 1 (the call just assigned)
   - "Completed Today": 0
   - "Pending Today": 1

**Expected:** ✅ Counts match actual assigned calls

---

**Step 4: Engineer 2 Login and Verify**
1. Logout and login as Engineer 2
2. Check the dashboard

**Expected:** ✅ Engineer 2 should see:
- Assigned: 1
- All other counts: 0
(Different call than Engineer 1, so one call total for Engineer 2)

---

## TEST C: Engineer Service Calls Fetch & List

### Objective:
Verify engineer can fetch and view their assigned service calls without 500 errors.

### Steps:

**Step 1: Open Service Calls Page**
1. Login as Engineer 1
2. Click "Service Calls" or "Tasks" in navigation
3. Page should load

**Expected:** ✅ No 500 error, page loads with content

---

**Step 2: Verify Calls Display**
1. Look at the list of service calls
2. Should show the call assigned to Engineer 1
   - Call ID visible
   - Customer Name visible
   - Status visible (should be "assigned")

**Expected:** ✅ At least 1 call appears in the list

---

**Step 3: Filter by Status**
1. If available, click filter "Assigned"
2. Should show only assigned calls (not in_progress, closed, etc.)

**Expected:** ✅ Filtered list shows only "assigned" status calls

---

**Step 4: Click on a Call**
1. Click on the call from the list
2. Should open call detail page without errors

**Expected:** ✅ Call detail page loads with call information

---

## TEST D: Engineer Status Update Flow

### Objective:
Verify engineer can update call status and changes reflect on both dashboards.

### Steps:

**Step 1: Engineer 1 - Update Call to In Progress**
1. Login as Engineer 1
2. Open a service call (the one assigned to this engineer)
3. Look for a button to update status (e.g., "Mark as In Progress")
4. Click it and select "In Progress"
5. Confirm

**Expected:** ✅ Status updates successfully

---

**Step 2: Engineer 1 Dashboard - Verify Count Change**
1. Go back to engineer dashboard (/)
2. Check "Status Overview":
   - Assigned: Should decrease from 1 to 0
   - In Progress: Should increase from 0 to 1

**Expected:** ✅ Counts reflect status change

---

**Step 3: Manager Dashboard - Verify Sync**
1. Logout Engineer 1
2. Login as Manager
3. Go to manager dashboard (/)
4. Check "Service Call Status":
   - Assigned: Should decrease
   - In Progress: Should increase

**Expected:** ✅ Manager sees same updated status as engineer

---

**Step 4: Engineer 1 - Continue Status Updates**
1. Login as Engineer 1 again
2. Open the same call (now "In Progress")
3. Update to next status (e.g., "Pending Action Required")
4. Check dashboard updated

**Expected:** ✅ Dashboard shows new status

---

**Step 5: Engineer 1 - Complete the Call**
1. Open the call again
2. Update status to "Closed"
3. Check dashboard

**Expected:** ✅ Call now appears in "Closed" bucket

---

**Step 6: Manager Verification**
1. Logout Engineer 1
2. Login as Manager
3. Manager dashboard should show:
   - "Closed" count increased
   - "Assigned" count decreased (or stayed same if other calls exist)
   - "Today's Performance → Closed" count increased

**Expected:** ✅ All consistent

---

## TEST E: Integration - Full Workflow

### Objective:
Complete end-to-end workflow from call creation through closure.

### Steps:

1. **Manager creates 3 new service calls**
   - Call 1: Assign to Engineer 1
   - Call 2: Assign to Engineer 2
   - Call 3: Leave unassigned

2. **Manager Dashboard Check:**
   - Unassigned: 1
   - Assigned: 2
   - Total counts updated

3. **Engineer 1 Dashboard Check:**
   - Assigned: 1
   - (Their specific call)

4. **Engineer 2 Dashboard Check:**
   - Assigned: 1
   - (Their specific call, different from Engineer 1's)

5. **Engineer 1 Updates Call:**
   - Assigned → In Progress → Pending Action

6. **Engineer 2 Updates Call:**
   - Assigned → In Progress → Closed

7. **Final Manager Dashboard:**
   - Unassigned: 1 (the one not assigned)
   - Assigned: 0 (all were either closed or moved to other status)
   - In Progress: 1 (Engineer 1's call)
   - Pending Action: 1 (Engineer 1's call)
   - Closed: 1 (Engineer 2's call)

**Expected:** ✅ All counts accurate across all dashboards

---

## Error Scenarios to Test

### Scenario 1: Engineer with No Calls
- Logout all users
- Create new engineer (no calls assigned yet)
- Login as new engineer
- Dashboard should load with all zeros

**Expected:** ✅ No crash, all counts = 0

---

### Scenario 2: Manager with No Engineers
- Create manager without any engineers
- Login as manager
- Dashboard should load without errors

**Expected:** ✅ Loads with zero engineer performance data

---

### Scenario 3: Rapid Status Changes
- Engineer updates call status rapidly (Assigned → In Progress → Pending)
- Refresh dashboard between updates
- Manager should see consistent updates

**Expected:** ✅ No race conditions or incorrect counts

---

## Logging to Check

Monitor browser console and server logs for these prefixes:
- `[ENGINEER_SERVICE_CALLS_API]` - Engineer service calls endpoint
- `[ENGINEER_DASHBOARD_API]` - Engineer dashboard endpoint
- `[SERVICE_CALLS_COUNTS]` - Manager call counts endpoint
- `[DASHBOARD_PERFORMANCE]` - Manager performance dashboard endpoint

**Expected:** No error logs, only info/debug logs

---

## Success Criteria

✅ **TEST A (Manager Status Consistency):**
- Newly assigned calls appear in "Assigned" bucket
- Counts persist after refresh
- Multiple engineers each see their own calls

✅ **TEST B (Engineer Dashboard):**
- Dashboard loads without 500 errors
- Shows actual assigned call counts
- Counts reflect real database data

✅ **TEST C (Engineer Service Calls):**
- Calls fetch successfully (no 500)
- List shows assigned calls
- Can filter and view call details

✅ **TEST D (Status Updates):**
- Engineer can update call status
- Both dashboards reflect changes
- Progression through statuses works (Assigned → In Progress → Pending → Closed)

✅ **TEST E (Integration):**
- Full workflow from creation through closure
- All counts consistent across manager and engineer views
- No data inconsistencies

---

## Sign-Off

If ALL tests pass:
- ✅ Engineer call fetch 500 is **FIXED**
- ✅ Engineer dashboard zero data is **FIXED**
- ✅ Manager assigned status missing is **FIXED**
- ✅ Data consistency is **VERIFIED**

**Status:** Ready for production testing
