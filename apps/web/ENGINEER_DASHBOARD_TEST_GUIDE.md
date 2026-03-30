# Engineer Dashboard Summary Testing Guide

## 📋 Pre-Test Setup

### Test Account Credentials
- **Email:** ankit@ankit.com (Engineer)
- **Password:** ankit123 (or as configured)
- **Role:** Engineer
- **Business:** Should have existing test business and service calls

### Required Test Data
Make sure these exist in database before testing:
1. At least 1 business
2. At least 1 manager
3. At least 2 engineers (including test engineer)
4. Service calls in various statuses:
   - Some assigned today
   - Some closed today
   - Some still open from earlier
   - Some in different statuses

---

## 🧪 Test Scenarios

### TEST A: Basic Assigned/Closed/Pending Counts

**Time:** 10 minutes

**Steps:**
1. Log in as Engineer (ankit@ankit.com)
2. Navigate to Engineer Dashboard
3. Verify filter is set to "Today"
4. Check the three summary cards:
   - **Assigned Today** card
   - **Closed Today** card  
   - **Pending** card (labeled "Pending Today" or "Open Work")

**Expected Results:**
- ✅ All three numbers display (no errors)
- ✅ Assigned Today = count of calls assigned to you today
- ✅ Closed Today = count of calls you closed today
- ✅ Pending = count of all your open calls (across all days)

**Validation Steps:**
1. Note the three numbers from the summary cards
2. Open browser Developer Tools → Console
3. Look for logs like:
   ```
   [ENGINEER_DASHBOARD_SUMMARY] Assigned Today: X
   [ENGINEER_DASHBOARD_SUMMARY] Closed Today: Y
   [ENGINEER_DASHBOARD_SUMMARY] Pending (Open Work): Z
   ```
4. Verify the numbers match what the UI shows

**Pass Criteria:** ✅
- No console errors
- All three numbers are visible and non-negative
- Console logs show the expected counts

---

### TEST B: Verify Date Range Logic

**Time:** 5 minutes

**Steps:**
1. In Engineer Dashboard, switch filter to "This Week"
2. Verify the summary cards update
3. Switch to "This Month"
4. Verify the summary cards update again
5. Switch back to "Today"
6. Verify numbers return to original values

**Expected Results:**
- ✅ Assigned Today = calls assigned in selected range
- ✅ Closed Today = calls closed in selected range
- ✅ Pending = ALL currently open (independent of filter)

**Important:** Pending count should NOT change when you switch filters because it's a snapshot of current work, not a date-filtered count.

**Pass Criteria:** ✅
- Numbers change appropriately when filter changes
- Pending count stays the same (it's not date-filtered)
- No console errors during filter switches

---

### TEST C: Create New Calls and Verify Assignment Count

**Time:** 15 minutes

**Setup:**
1. Log in as Manager
2. Create 2 new service calls
3. Assign both to the test Engineer
4. Log out

**Test:**
1. Log in as Engineer
2. Go to Engineer Dashboard (Today filter)
3. Check "Assigned Today" card

**Expected Results:**
- ✅ Assigned Today count increases by 2
- ✅ Pending count increases by 2 (new calls are "assigned" status)

**Database Check (Optional):**
```sql
SELECT COUNT(*) as new_calls 
FROM service_call 
WHERE assigned_engineer_user_id = '{engineerId}'
AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')
AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE;
```

**Pass Criteria:** ✅
- Assigned Today count matches new calls created
- Pending increases
- No errors in console

---

### TEST D: Close Calls and Verify Closed Count

**Time:** 15 minutes

**Setup:**
1. Engineer has at least 2 open calls (from TEST C or existing)
2. Engineer is logged in to the dashboard

**Test:**
1. Click "Mark Closed" on 2 calls
2. Verify closure details are filled in
3. Mark them as closed
4. Return to Dashboard
5. Refresh page (F5) to reload data

**Expected Results:**
- ✅ Closed Today count increases by 2
- ✅ Pending count decreases by 2
- ✅ Both calls now show as "closed" in the calls list

**Database Check (Optional):**
```sql
SELECT COUNT(*) as closed_today 
FROM service_call 
WHERE assigned_engineer_user_id = '{engineerId}'
AND call_status = 'closed'
AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE;
```

**Pass Criteria:** ✅
- Closed Today count matches closures today
- Pending count decreases correctly
- Closed calls disappear from open calls list

---

### TEST E: Multi-Day Scenario (Critical)

**Time:** 20 minutes

**Setup:**
1. Engineer has calls from multiple days:
   - **Day 1 (Yesterday):** 3 calls in "in_progress" status
   - **Day 2 (Today):** 2 new calls assigned today
   - **Day 3 (Today):** 1 call in "pending_action" for days

**Test:**
1. Go to Engineer Dashboard
2. Set filter to "Today"
3. Verify counts match business rules exactly

**Expected Results:**
- ✅ Assigned Today = 2 (only today's new calls)
- ✅ Closed Today = 0 (no calls closed yet)
- ✅ Pending = 6 (all open: 3 from yesterday + 2 today + 1 older)

**Key Validation:** This test proves that:
- Assigned Today only counts TODAY's calls ✓
- Pending counts ALL open work regardless of age ✓
- Counts are independent and use correct date filters ✓

**Pass Criteria:** ✅
- Assigned Today = exactly 2 (no more, no less)
- Pending = exactly 6 (includes old calls still open)
- This proves the "Pending Today without date filter" fix works correctly

---

### TEST F: Reassignment Scenario (If Implemented)

**Time:** 15 minutes

**Precondition:** Manager must have reassignment feature

**Setup:**
1. Engineer A has 5 open calls
2. Manager reassigns 2 calls from Engineer A to Engineer B

**Test:**
1. Log in as Engineer A → Check Dashboard
2. Log in as Engineer B → Check Dashboard

**Expected Results:**
- ✅ Engineer A Pending count decreases by 2
- ✅ Engineer B Pending count increases by 2
- ✅ Reassigned calls no longer appear in Engineer A's call list
- ✅ Reassigned calls appear in Engineer B's call list

**Pass Criteria:** ✅
- Reassignment immediately reflects in both engineers' dashboards
- Pending counts update correctly
- No stale data

---

### TEST G: Cancellation Scenario

**Time:** 10 minutes

**Setup:**
1. Engineer has some open calls
2. Manager cancels 1 of them

**Test:**
1. Engineer checks dashboard

**Expected Results:**
- ✅ Pending count decreases by 1 (cancelled call no longer in open statuses)
- ✅ Cancelled call no longer appears in call list

**Note:** Pending only counts statuses: 'assigned', 'in_progress', 'pending_action_required', 'pending_under_services'. Cancelled calls are not counted.

**Pass Criteria:** ✅
- Pending count decreases when call is cancelled
- Cancelled call disappears from work list

---

## 📝 Console Log Checklist

When debugging, look for these logs in Browser Console (F12 → Console tab):

**Expected logs (should appear on dashboard load):**
```
[ENGINEER_DASHBOARD_START] Engineer ID: xxxxx Role: engineer
[ENGINEER_DASHBOARD_AUTH] User verified. Business ID: xxxxx
[ENGINEER_DASHBOARD_TIME] Today (IST): 2026-03-29
[ENGINEER_DASHBOARD_FILTER] Filter: today with startDate: ... endDate: ...
[ENGINEER_DASHBOARD_SUMMARY] Assigned Today: X
[ENGINEER_DASHBOARD_SUMMARY] Closed Today: Y
[ENGINEER_DASHBOARD_SUMMARY] Pending (Open Work): Z
```

**Red flags (should NOT appear):**
```
Error counting assigned today
Error counting completed today
Error counting pending work
[object Object]  // Generic error
```

---

## 🔍 Database Verification (Advanced)

If you have database access, verify the fix with these queries:

**Assigned Today (for Engineer ID: abc123):**
```sql
SELECT COUNT(*) FROM service_call
WHERE assigned_engineer_user_id = 'abc123'
AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE;
```

**Closed Today:**
```sql
SELECT COUNT(*) FROM service_call
WHERE assigned_engineer_user_id = 'abc123'
AND call_status = 'closed'
AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE;
```

**Pending (All Open):**
```sql
SELECT COUNT(*) FROM service_call
WHERE assigned_engineer_user_id = 'abc123'
AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services');
```

The counts from these queries should exactly match what the dashboard displays.

---

## ✅ Final Sign-Off Checklist

- [ ] TEST A: Basic counts display correctly
- [ ] TEST B: Filter logic works correctly
- [ ] TEST C: New assignments increase Assigned Today
- [ ] TEST D: Closures increase Closed Today and decrease Pending
- [ ] TEST E: Multi-day scenario proves correct business logic
- [ ] TEST F: Reassignments update counts (if applicable)
- [ ] TEST G: Cancellations decrease Pending
- [ ] No console errors in any test
- [ ] All counts match expected values
- [ ] Database queries match UI display

---

## 🎯 Success Criteria

The Engineer Dashboard Summary fix is **COMPLETE** when:

1. ✅ Assigned Today = calls assigned to engineer today only
2. ✅ Closed Today = calls closed by engineer today only
3. ✅ Pending = ALL currently open calls (no date filter)
4. ✅ All three numbers update immediately when calls are created/updated/closed
5. ✅ No console errors or warnings
6. ✅ Multi-day scenarios work correctly
7. ✅ All test scenarios pass

---

**Test Duration:** ~90 minutes total  
**Difficulty:** Medium (requires understanding business logic)  
**Critical Tests:** E (multi-day), D (closed calls), B (filter logic)  
