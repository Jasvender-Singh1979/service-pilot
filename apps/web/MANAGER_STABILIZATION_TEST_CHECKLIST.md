# Manager Module Stabilization - Test Checklist

## Test Flow (Run in Order)

### SETUP
- [ ] App has restarted successfully (no compilation errors)
- [ ] Browser console is open to capture logs
- [ ] Network tab is monitoring API calls

---

## TEST 1: Manager Login
**Goal:** Verify authentication and session setup
```
1. Navigate to /login
2. Enter manager email: (use previously created manager account)
3. Enter password: (use correct password)
4. Click Sign In
```

**Expected Result:**
- ✅ Login succeeds
- ✅ Redirected to /manager dashboard
- ✅ Console shows: "[Auth Utils] Session user found: [manager-email]"
- ✅ Session cookie `auth.session` visible in DevTools

**If FAILS:**
- Check console for error messages
- Verify manager user exists in database
- Check `/api/user/me` returns valid JSON with manager data

---

## TEST 2: Fetch Categories List
**Goal:** Verify category listing works
```
1. From manager dashboard, click on "Categories" or navigate to /manager/categories
2. Wait for page to load
3. Observe categories list
```

**Expected Result:**
- ✅ Categories list loads (may be empty if none created)
- ✅ No error message "failed to fetch category"
- ✅ Console shows: "[Categories API] Fetching categories for business: [id]"
- ✅ API call to `/api/categories?managerEmail=...` succeeds (200 status)

**If FAILS:**
- Check browser console for errors
- Check network tab - what status code does `/api/categories` return?
- Check server logs for SQL errors or session lookup failures
- Verify manager has business_id assigned

---

## TEST 3: Create Category
**Goal:** Verify category creation works
```
1. From categories list, click "Add Category" or create button
2. Fill form:
   - Category Name: "Test Category A"
   - Description: "This is a test"
   - Active: Yes (toggle on)
3. Click "Create" or "Save"
4. Observe result
```

**Expected Result:**
- ✅ Category creation succeeds
- ✅ New category appears in list immediately
- ✅ No error "Error creating category: Failed to create category"
- ✅ Console shows: "[Categories API] Creating category: Test Category A for business: [id]"
- ✅ API call to `/api/categories` (POST) succeeds (201 status)
- ✅ New record visible in database

**If FAILS:**
- Check console error - what is the actual message?
- Check network tab - what does POST response say?
- Check server logs for: "createUserWithPassword" or SQL insert errors
- Verify manager_user_id is set correctly

---

## TEST 4: Create Another Category
**Goal:** Verify multiple categories work
```
1. Create another category:
   - Name: "Test Category B"
   - Description: "Second test"
2. Refresh the page (F5)
3. Verify both categories still appear
```

**Expected Result:**
- ✅ Second category created successfully
- ✅ Both categories visible after refresh
- ✅ Session persists across page refresh

**If FAILS:**
- Session may have expired
- Categories not being saved to database
- Check database directly for records

---

## TEST 5: Navigate to Engineers List
**Goal:** Verify engineers page loads
```
1. From dashboard, click "Manage Engineers" or navigate to /manager/engineers
2. Wait for page to load
3. Observe engineers list
```

**Expected Result:**
- ✅ Engineers page loads
- ✅ Shows "No Engineers Yet" message (if none created) OR list of engineers
- ✅ "Add Engineer" floating button visible
- ✅ No errors in console

**If FAILS:**
- Check network tab - does `/api/engineers?managerEmail=...` call succeed?
- Check console for error messages
- Verify manager email is being passed correctly

---

## TEST 6: Open Add Engineer Form
**Goal:** Verify form loads without errors
```
1. Click the floating "+" button or "Add Engineer" button
2. Wait for form to load
3. Observe form fields
```

**Expected Result:**
- ✅ Form loads with fields: Name, Email, Mobile, Password, Designation
- ✅ No error messages
- ✅ Back button visible in header

**If FAILS:**
- Check console for JavaScript errors
- Check that page navigation worked correctly

---

## TEST 7: Create Engineer
**Goal:** Verify engineer creation works (CRITICAL)
```
1. Fill engineer form:
   - Full Name: "Test Engineer 1"
   - Email: "engineer1@test.com"
   - Mobile Number: "9876543210"
   - Temporary Password: "SecurePass123"
   - Designation: "Senior Technician"
2. Click "Create Engineer"
3. Wait for response
```

**Expected Result:**
- ✅ Engineer created successfully
- ✅ Redirected back to engineers list
- ✅ New engineer appears in list with:
  - Name: "Test Engineer 1"
  - Email: "engineer1@test.com"
  - Mobile: "9876543210"
  - Status: Active
- ✅ Console shows: "[Engineers API] Creating engineer with utility..."
- ✅ NO error "cannot read properties of undefined (reading 'Singupemail')"
- ✅ API call succeeds (201 status)

**If FAILS (CRITICAL - Go back and fix):**
- Check console error - exact message?
- Check network tab - what's the actual error response?
- Verify email is not duplicate
- Check server logs for: "createUserWithPassword" or SQL errors
- Check database - was user record created?

---

## TEST 8: Test Back Button
**Goal:** Verify back button works (not looping)
```
1. From engineers list, click "Add Engineer"
2. Form opens
3. Click the back arrow button in header
4. Observe navigation
```

**Expected Result:**
- ✅ Navigates back to `/manager/engineers` list
- ✅ Does NOT loop back to add engineer form
- ✅ No infinite redirects

**If FAILS:**
- Check URL - what's the current page?
- Check router state in console
- Verify navigation didn't get stuck

---

## TEST 9: Navigate to Service Calls
**Goal:** Verify service calls page loads
```
1. From dashboard, click "Service Calls" or navigate to /manager/service-calls
2. Wait for page to load
3. Observe calls list
```

**Expected Result:**
- ✅ Service calls page loads
- ✅ Shows "No service calls found" message (if none) OR list of calls
- ✅ No error "failed to load service call"
- ✅ Console shows: "[Service Calls API] User: [manager-email]"

**If FAILS:**
- Check network tab - does `/api/service-calls` call succeed?
- Check console for errors
- Verify manager user exists and has business_id

---

## TEST 10: Create Service Call (Optional - if needed)
**Goal:** Verify service call creation works
```
1. Click "+" button to create new service call
2. Fill basic form fields
3. Try to create call
```

**Expected Result:**
- ✅ Form loads
- ✅ Can create call successfully
- ✅ Appears in list

**If FAILS:**
- Check which field is causing error
- Check network response

---

## TEST 11: Session Persistence
**Goal:** Verify session stays valid across page refreshes
```
1. From any manager page, press F5 (refresh)
2. Wait for page to reload
3. Verify you're still logged in (not redirected to login)
```

**Expected Result:**
- ✅ Page reloads
- ✅ Still authenticated (no redirect to login)
- ✅ Data loads correctly
- ✅ Console shows session user lookup succeeds

**If FAILS:**
- Session may be expiring too quickly
- Check database for session records
- Check cookie expiry times

---

## TEST 12: Error Handling
**Goal:** Verify error messages are clear
```
1. Try to create category with no name → should show error
2. Try to create engineer with duplicate email → should show error
3. Try to create engineer without required field → should show error
```

**Expected Result:**
- ✅ Clear, user-friendly error messages
- ✅ No [object Object] errors
- ✅ Errors logged with context in console
- ✅ No HTML error responses (only JSON)

**If FAILS:**
- Error messages might be unclear
- Check what the actual error response is

---

## Final Verification

After all tests pass:

- [ ] **Manager Create/Read Operations**: ✅ Work
  - Category create ✅
  - Category fetch ✅
  - Engineer create ✅
  - Engineer list ✅
  - Service call list ✅

- [ ] **Navigation**: ✅ Works
  - Back buttons work ✅
  - Forward navigation works ✅
  - No loops ✅

- [ ] **Session Management**: ✅ Works
  - Login successful ✅
  - Session persists ✅
  - User data fetched ✅

- [ ] **Error Handling**: ✅ Works
  - Clear error messages ✅
  - No [object Object] ✅
  - Proper JSON responses ✅

- [ ] **Database**: ✅ Works
  - Records created ✅
  - Records fetched ✅
  - Relationships correct ✅

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "failed to fetch category" | Session lookup failed | Check `/api/user/me` returns valid data |
| "Error creating category: Failed to create category" | getSessionUserFromRequest() returned null | Check session cookie exists and is valid |
| "cannot read properties of undefined" | Engineer creation still using broken auth helper | Check `/app/api/engineers/route.ts` uses `createUserWithPassword` |
| "Add Engineer loops back to itself" | Navigation using Link component | Check back button uses `onClick` with `router.push()` |
| Engineer created but doesn't appear | Fetch not running again | Check list refreshes after creation |
| Categories empty after refresh | Session expired | Check session timeout is 30 days |
| "failed to load service call" | Manager role not set correctly | Check user.role == 'manager' |

---

## Success Criteria ✅

This task is COMPLETE when:

1. ✅ Manager can log in successfully
2. ✅ Categories can be created and fetched without errors
3. ✅ Engineers can be created without "cannot read properties" error
4. ✅ Service call list loads without "failed to load" error
5. ✅ Back button from Add Engineer doesn't loop
6. ✅ All error messages are user-friendly (no [object Object])
7. ✅ Session persists after page refresh
8. ✅ All API responses are valid JSON (no HTML errors)

**Status: READY FOR TESTING** 🚀
