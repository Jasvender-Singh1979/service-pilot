# Engineer Call Detail & Status Update Flow - Test Guide

## Prerequisites

Before testing, ensure:
- ✅ Fresh database (or database with test data)
- ✅ Super admin account created
- ✅ Manager account created
- ✅ Engineer account created
- ✅ Service call created and assigned to engineer
- ✅ App is running locally

---

## TEST PHASE 1: Engineer Can Open Call Detail

### Setup
1. Login as **manager**
2. Create a service call with all details filled in
3. Assign the call to an engineer
4. Logout and login as **engineer**

### Test Steps

**Step 1: Engineer Dashboard**
- [ ] Engineer logs in successfully
- [ ] Engineer dashboard shows the assigned call
- [ ] Call appears in one of these buckets:
  - Assigned (if status = assigned)
  - In Progress (if status = in_progress)
  - Pending (if status = pending_action_required)
  - Pending Services (if status = pending_under_services)

**Step 2: Click on Call**
- [ ] Click on the assigned call
- [ ] **No 500 error should appear** ✅
- [ ] Call detail page loads successfully

**Step 3: Verify Call Data**
- [ ] Customer name is visible
- [ ] Customer phone number is visible
- [ ] Customer address is visible
- [ ] Problem reported is visible
- [ ] Category is visible
- [ ] Status badge shows correct status (e.g., "Assigned")
- [ ] Priority level is visible
- [ ] Call ID is visible

**Step 4: Verify Call History**
- [ ] History section loads without error
- [ ] At minimum, shows initial call creation entry
- [ ] Each history entry shows:
  - Event type (e.g., "call_created", "status_changed")
  - Timestamp
  - Actor role ("engineer", "manager", "system")

**Step 5: Verify Action Buttons**
Depending on current status, verify correct buttons appear:
- If `assigned`: Should see "Mark In Progress" ✅
- If `in_progress`: Should see "Mark Pending Action" and "Mark Pending Services" ✅
- If `in_progress`: Should see "Close Call" option ✅

---

## TEST PHASE 2: Engineer Can Update Status

### Prerequisites
- Call should be in `assigned` status
- Engineer is on call detail page

### Test A: assigned → in_progress

**Step 1: Click "Mark In Progress"**
- [ ] Click button
- [ ] Page should update
- [ ] Status badge should change to "In Progress"
- [ ] New history entry should appear showing status change
- [ ] No error message appears

**Step 2: Verify Backend Updated**
- [ ] Refresh the page
- [ ] Status is still "In Progress" ✅
- [ ] History entry persists ✅

**Step 3: Verify Manager Sees Change**
- [ ] Logout as engineer
- [ ] Login as manager
- [ ] Open same service call
- [ ] Status should show "In Progress" ✅
- [ ] Manager dashboard should reflect the change ✅

---

### Test B: in_progress → pending_action_required

**Step 1: From in_progress call**
- [ ] Engineer clicks "Mark Pending Action"
- [ ] Page displays prompt for note
- [ ] (Or auto-generates note if quick action)

**Step 2: Enter Note (if prompted)**
- [ ] Type a note like "Waiting for customer parts"
- [ ] Submit

**Step 3: Verify Status Change**
- [ ] Status badge changes to "Pending Action" ✅
- [ ] History entry shows the note ✅
- [ ] Refresh and verify persistence ✅

**Step 4: Verify Manager Sees It**
- [ ] Manager opens same call
- [ ] Status shows "Pending Action" ✅
- [ ] Note is visible ✅

---

### Test C: in_progress → pending_under_services

**From in_progress call:**
- [ ] Click "Mark Pending Services"
- [ ] (Auto-generates or prompts for note)
- [ ] Status changes to "Pending Services" ✅
- [ ] Manager sees update ✅

---

## TEST PHASE 3: Engineer Can Close Calls

### Prerequisites
- Call should be in `in_progress` status

### Test Steps

**Step 1: Click "Close Call"**
- [ ] Click close button
- [ ] Taken to closure form
- [ ] Form shows fields for:
  - Closure note (required)
  - Service charges
  - Material costs
  - Discounts
  - Paid amount

**Step 2: Fill Closure Form**
- [ ] Enter closure note: "Service completed successfully"
- [ ] Enter service charges: 500
- [ ] Enter material total: 200
- [ ] Enter paid amount: 700
- [ ] (Discounts optional)
- [ ] Click Submit

**Step 3: Verify Closure**
- [ ] Form submits without error ✅
- [ ] Redirected back to call detail ✅
- [ ] Status shows "Closed" ✅
- [ ] Closure data is visible:
  - Closure note
  - Closure timestamp
  - Charges breakdown

**Step 4: Verify Manager Sees Closure**
- [ ] Manager opens same call
- [ ] Status shows "Closed" ✅
- [ ] Closure details are visible ✅
- [ ] Manager dashboard no longer shows call in active buckets ✅

---

## TEST PHASE 4: Dashboard Consistency

### After Each Status Change, Verify:

**Engineer Dashboard:**
- [ ] Call count for "Assigned" is correct
- [ ] Call count for "In Progress" is correct
- [ ] Call count for "Pending Action" is correct
- [ ] Call count for "Pending Services" is correct
- [ ] Total open calls count is correct
- [ ] Call appears/disappears from correct bucket after status change

**Manager Dashboard:**
- [ ] Service Call Status widget shows:
  - Correct number of Assigned calls
  - Correct number of In Progress calls
  - Correct number of Pending Action calls
  - Correct number of Pending Services calls
  - Correct number of Closed calls
- [ ] Today's Performance section shows:
  - Created (initial count)
  - Assigned (count of assigned calls)
  - In Progress (count)
  - Closed (count)
- [ ] Numbers match between engineer and manager views ✅

**Cross-Dashboard Verification:**
After engineer updates a call:
- [ ] Logout engineer
- [ ] Login manager
- [ ] Refresh dashboard
- [ ] **Without full page refresh**, check if data updates
- [ ] **With full page refresh**, verify data is correct ✅

---

## TEST PHASE 5: Call History

### History Entry Verification

**When Engineer Opens Call Detail:**
- [ ] History section loads (no 500) ✅
- [ ] Initial call creation entry appears

**After Engineer Updates Status:**
- [ ] New history entry appears immediately ✅
- [ ] Entry shows:
  - Correct event_type (e.g., "status_changed")
  - Correct timestamp
  - Correct actor_role: "engineer"
  - Note text (if any)

**After Engineer Closes Call:**
- [ ] History entry shows "call_closed" event ✅
- [ ] Closure note appears in history ✅
- [ ] Timestamp is correct ✅

**Manager Can View History:**
- [ ] Manager opens same call
- [ ] History section loads ✅
- [ ] All same entries visible ✅
- [ ] Includes both engineer and manager actions ✅

---

## TEST PHASE 6: Search Functionality

### Engineer Service Call Search

**Setup:**
1. Engineer is on dashboard
2. Create 3-5 service calls assigned to engineer
3. Create calls with different patterns:
   - call_id: "CALL-001", "CALL-002", "SPECIAL-100"
   - customer_name: "John Smith", "Jane Doe", "ABC Company"
   - phone: "9876543210", "1234567890", etc.

**Test Search by Call ID:**
- [ ] Type "CALL" in search
- [ ] Results show calls matching "CALL-*" ✅
- [ ] Results exclude "SPECIAL-100" ✅

**Test Search by Customer Name:**
- [ ] Type "John" in search
- [ ] Results show "John Smith" call ✅
- [ ] Results exclude other customers ✅

**Test Search by Phone:**
- [ ] Type "9876" in search
- [ ] Results show call with that phone number ✅

**Test No Results:**
- [ ] Type something that doesn't match any call
- [ ] Returns empty list (not error) ✅

---

## TEST PHASE 7: Edge Cases & Error Handling

### Test Engineer Cannot Access Other Engineer's Call

**Setup:**
1. Create 2 engineers
2. Create call assigned to engineer A
3. Login as engineer B

**Test:**
- [ ] Engineer B tries to open engineer A's call (via URL manipulation or direct API call)
- [ ] Should get error: "Service call not found or is not assigned to you" ✅
- [ ] Returns 404 status code ✅
- [ ] Not 500 error ✅

### Test Engineer Cannot Update Status on Unassigned Call

**Setup:**
- Engineer B tries to update status of engineer A's call

**Test:**
- [ ] Request to `/api/engineers/service-calls/{callId}/update-status` fails ✅
- [ ] Returns 404 or 403 ✅
- [ ] Error message is clear ✅

### Test Invalid Status Transitions

**Setup:**
- Call is in "assigned" status
- Engineer tries to go directly to "pending_action_required" (skipping "in_progress")

**Test:**
- [ ] Request fails with 400 error ✅
- [ ] Error message explains valid transitions ✅
- [ ] Status does not change ✅

### Test Engineer Cannot Close Non-In-Progress Call

**Setup:**
- Call is in "assigned" status
- Engineer tries to close it

**Test:**
- [ ] Close request fails ✅
- [ ] Returns 400 error ✅
- [ ] Error: "Only in-progress calls can be closed" ✅
- [ ] Call status unchanged ✅

### Test Closure Form Validation

**Setup:**
- Call is in "in_progress"
- Engineer on closure form

**Test Closure Note Required:**
- [ ] Leave closure note empty
- [ ] Try to submit
- [ ] Form rejects (either client-side or server 400) ✅

**Test Service Charges Required:**
- [ ] Enter closure note
- [ ] Leave service charges empty
- [ ] Try to submit
- [ ] Form rejects ✅

**Test Discount Cannot Exceed Total:**
- [ ] Enter service charges: 100
- [ ] Enter discount: 150
- [ ] Try to submit
- [ ] Rejected with error: "discount cannot exceed charges" ✅

---

## TEST PHASE 8: Error Handling

### Verify Error Messages Are Meaningful

**For 401 Unauthorized:**
- [ ] Response includes: `{ "error": "Unauthorized" }`
- [ ] Not: `{ "error": "[object Object]" }`
- [ ] Not: `{ "error": "undefined" }`

**For 403 Forbidden:**
- [ ] Response includes: `{ "error": "Only engineers can..." }`
- [ ] Clear indication of why access was denied

**For 404 Not Found:**
- [ ] Response includes: `{ "error": "Service call not found..." }`
- [ ] Not generic 404

**For 400 Bad Request:**
- [ ] Response includes: `{ "error": "Invalid status transition..." }`
- [ ] Explains what's wrong and what's expected

**For 500 Server Error (shouldn't happen):**
- [ ] If it does occur, check browser console
- [ ] Check server logs for actual error
- [ ] Should not see "auth.api.getSession" in error ✅

---

## TEST PHASE 9: Performance & Data Integrity

### Call Detail Load Time
- [ ] Initial call detail load takes < 1 second
- [ ] History loads within 1 second
- [ ] No N+1 queries (monitor network tab)

### Data Consistency After Status Update
- [ ] Engineer refreshes immediately after update → still new status ✅
- [ ] Engineer waits 1 minute, refreshes → still correct ✅
- [ ] Manager opens same call → sees correct status ✅

### Call Closing Data Integrity
- [ ] All closure data persists correctly
- [ ] Quotation document data is stored
- [ ] Material items are saved if applicable
- [ ] Charges breakdown is correct
- [ ] Paid vs pending calculation is correct

---

## TEST PHASE 10: Regression Testing

### Verify Existing Flows Still Work

**Manager Can Still:**
- [ ] Create service calls ✅
- [ ] Assign to engineers ✅
- [ ] View service call list ✅
- [ ] Update call notes ✅
- [ ] View dashboard ✅
- [ ] See call status changes ✅

**Engineer Can Still:**
- [ ] Login ✅
- [ ] See dashboard ✅
- [ ] See assigned calls ✅
- [ ] Search calls ✅
- [ ] View customer history ✅

---

## 📋 Full Workflow Integration Test

**Complete end-to-end flow:**

1. [ ] Manager creates service call
2. [ ] Manager assigns to engineer
3. [ ] Engineer logs in and sees assigned call
4. [ ] Engineer opens call detail (NO 500)
5. [ ] Engineer marks as "In Progress"
6. [ ] Manager refreshes dashboard and sees "In Progress"
7. [ ] Engineer marks as "Pending Action"
8. [ ] Both dashboards show "Pending Action"
9. [ ] Engineer marks as "In Progress" again
10. [ ] Engineer closes call with notes
11. [ ] Both dashboards show "Closed"
12. [ ] History shows all 4 state changes
13. [ ] All data is consistent

---

## ✅ Test Results Summary

| Test Phase | Status | Notes |
|-----------|--------|-------|
| 1. Engineer Opens Call Detail | ⏳ | Run tests above |
| 2. Status Updates | ⏳ | Run tests above |
| 3. Close Calls | ⏳ | Run tests above |
| 4. Dashboard Consistency | ⏳ | Run tests above |
| 5. Call History | ⏳ | Run tests above |
| 6. Search | ⏳ | Run tests above |
| 7. Edge Cases | ⏳ | Run tests above |
| 8. Error Handling | ⏳ | Run tests above |
| 9. Performance | ⏳ | Run tests above |
| 10. Regression | ⏳ | Run tests above |

---

## 🐛 If Tests Fail

### Call Detail Returns 500
- [ ] Check browser console for actual error
- [ ] Check server logs
- [ ] Verify engineer is logged in
- [ ] Verify call is assigned to this engineer

### Status Update Shows No Change
- [ ] Refresh page
- [ ] Check browser network tab for 500 error
- [ ] Verify request body includes status field
- [ ] Check server logs

### Dashboard Not Updating
- [ ] Refresh page
- [ ] Check if call appears in correct bucket
- [ ] Verify call status in database matches UI
- [ ] Check if dashboard query has caching issue

### Error Message Says "[object Object]"
- [ ] This means error response is not proper JSON
- [ ] Check server logs for actual error
- [ ] Verify endpoint returns JSON response
- [ ] May indicate catch block not handling error properly

---

**All 8 engineer service-call routes are now fixed. Follow this guide to verify everything works end-to-end.** ✅
