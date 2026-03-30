# Quick Test Guide - 4 Workflow Fixes

## Quick Verification (5 minutes)

### 1. PDF Business Info ✅
```
Engineer → Open Call → Close Call → View PDF
Expected: Business name, address, phone number visible
```

### 2. Manager Edit Pending Action ✅
```
Manager → Edit Pending Action Call → Form should load
Expected: All fields populated, no "Failed to load" error
```

### 3. Engineer Resume CTA ✅
```
Engineer → Pending Action Call → Should see "Resume" button
Expected: Button appears, clicking goes to mark-in-progress
```

### 4. Reports Same-Day Data ✅
```
Manager → Reports → Today filter → Check Engineer & Category sections
Expected: Data appears (not empty)
Also test: Custom date = single day (e.g., 29-03-2026 to 29-03-2026)
```

---

## Full Test Plan (60 minutes)

### Setup (5 min)
1. Login as Business Owner
2. Create Manager "Test Manager"
3. Create 3 Engineers: "Eng1", "Eng2", "Eng3"
4. Create 2 Categories: "AC Repair", "Plumbing"

### Test Issue #1: PDF Business Info (10 min)
```
1. Login as Engineer
2. Assign call with Manager
3. Mark as In Progress
4. Close Call form:
   - Closure note: "Work completed"
   - Service charge: 500
   - Add 1 material: "Condenser coil, 1 qty, 1000 price"
5. Submit
6. View PDF
   ✓ Check "From" section has business details
   ✓ Check layout is clean on A4 page
```

### Test Issue #2: Manager Edit (10 min)
```
1. Login as Manager
2. Create service call, assign to Eng1
3. Eng1 marks as In Progress
4. Eng1 marks as Pending Action
5. Manager clicks Edit on that call
   ✓ Form loads (don't see "Failed to load")
   ✓ All fields have existing values
6. Change Priority Level
7. Save
   ✓ No error shown
   ✓ Changes persist
```

### Test Issue #3: Engineer Resume CTA (10 min)
```
1. Setup: Call is in Pending Action, assigned to Eng1
2. Eng1 opens call detail
   ✓ Sees "Resume" button (not "Mark In Progress")
3. Click Resume
   ✓ Navigates to mark-in-progress action
4. Complete mark-in-progress
   ✓ Call back in "In Progress" state
5. Test: Manager reassigns call to Eng2
6. Eng1 opens their call list
   ✓ Call is no longer visible
7. Eng2 opens that call
   ✓ Eng2 can see it and Resume (if pending_action)
```

### Test Issue #4: Reports Same-Day Data (15 min)
```
Setup:
- Manager has 3 calls across 2 categories
- Calls assigned to 2 different engineers

Test "Today" filter:
1. Manager → Reports → Today
   ✓ Engineer section: shows engineers, call counts
   ✓ Category section: shows categories, call counts
   ✓ Summary shows correct created count

Test Custom same-day filter:
1. Manager → Reports → Custom = 29-03-2026 to 29-03-2026
   ✓ Engineer data appears (same as Today)
   ✓ Category data appears (same as Today)

Test Week filter still works:
1. Manager → Reports → Week
   ✓ Data appears as before
   
Test Month filter still works:
1. Manager → Reports → Month
   ✓ Data appears as before
```

### Regression Test (10 min)
```
1. Create call → Assign → In Progress → Pending Service → Close
   ✓ All transitions work
2. Manager edits assigned/in_progress/pending_under_services calls
   ✓ Form loads for each status
3. Engineer closes call from different entry points
   ✓ PDF generates correctly
4. Reports: All filters (Today/Week/Month/All Time/Custom)
   ✓ Data consistent across all filters
```

---

## Success Criteria

| Item | Status | Notes |
|------|--------|-------|
| PDF shows business info | ✓ | Name, address, contact |
| Manager can edit pending_action | ✓ | Form loads, data populated |
| Engineer sees resume CTA | ✓ | Button for pending_action status |
| Reports same-day engineer data | ✓ | Today and custom single-day |
| Reports same-day category data | ✓ | Today and custom single-day |
| No regressions | ✓ | All existing flows still work |

---

## Key Logs to Check

### Business Fetch
```
[Quotation] Business info fetched: { id: "...", name: "..." }
[Quotation] Business fetch failed: ... (if error)
```

### Service Call Edit
```
[ServiceCallDetail GET] Call not found: ... (if 404)
Error: Service call not found or does not belong to you (if unauthorized)
```

### Reports Same-Day
```
REPORTS_ENGINEER_QUERY_SUCCESS { rows: N, engineer_linked_call_count: N }
REPORTS_CATEGORY_QUERY_SUCCESS { rows: N, category_linked_call_count: N }
```

---

## Quick Debugging

| Issue | Check |
|-------|-------|
| PDF blank business section | Console: `[Quotation] Business fetch failed:` - note the error |
| Manager edit form empty | Network tab: Check response from `/api/service-calls/[id]` - is it 200 or 404/500? |
| Engineer no resume button | Check call status in DB - must be `pending_action_required` |
| Reports missing data | Check filter dates sent to API - must be correct YYYY-MM-DD format |

---

**Last Updated:** Post-fix
**Ready for:** Full regression testing
