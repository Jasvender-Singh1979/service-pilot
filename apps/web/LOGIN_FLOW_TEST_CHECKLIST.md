# Login Flow - Complete Test Checklist

## Pre-Test Setup

### Verify Test Accounts Exist
Before running tests, ensure these accounts exist in the database:

```sql
-- Check if accounts exist
SELECT id, email, role, business_id FROM "user" 
ORDER BY "createdAt" DESC LIMIT 10;
```

Expected accounts:
- 1 super_admin (business owner)
- At least 1 manager
- At least 1 engineer

If not, create test business first:
1. Go to `/business-setup`
2. Complete business setup (creates super admin automatically)
3. Go to super-admin dashboard
4. Create at least 1 manager
5. Log in as manager
6. Create at least 1 engineer

---

## Test Suite 1: Authentication Flow

### Test 1.1 - Super Admin Sign In
**Precondition:** Business setup complete, super admin account exists

**Steps:**
1. Navigate to `/login`
2. Enter super admin email
3. Enter super admin password
4. Click "Sign In" button
5. Observe console logs (F12 > Console tab)
6. Wait for redirect

**Expected Results:**
- ✅ Console shows: `[useAuth] Starting sign-in for: [email]`
- ✅ Console shows: `[Auth Sign-In] SUCCESS - Session created for user: [email]`
- ✅ Console shows: `[useAuth] Sign-in successful, fetching user data...`
- ✅ Console shows: `[API /user/me] Looking up session token...`
- ✅ Console shows: `[API /user/me] SUCCESS - User data fetched: [email]`
- ✅ Console shows: `[useAuth] User data fetched successfully:` with id, email, role=super_admin
- ✅ Console shows: `[LoginPage] Sign-in successful, redirecting to: super_admin`
- ✅ No error messages in console
- ✅ Redirects to `/super-admin` page
- ✅ Page loads with dashboard content

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 1.2 - Manager Sign In
**Precondition:** Manager account exists

**Steps:**
1. Navigate to `/login`
2. Enter manager email
3. Enter manager password
4. Click "Sign In" button
5. Observe console logs
6. Wait for redirect

**Expected Results:**
- ✅ Sign-in successful (same log pattern as Test 1.1)
- ✅ Console shows: `role: manager` in user data
- ✅ Redirects to `/manager` page
- ✅ Manager dashboard loads with content

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 1.3 - Engineer Sign In
**Precondition:** Engineer account exists

**Steps:**
1. Navigate to `/login`
2. Enter engineer email
3. Enter engineer password
4. Click "Sign In" button
5. Observe console logs
6. Wait for redirect

**Expected Results:**
- ✅ Sign-in successful (same log pattern as Test 1.1)
- ✅ Console shows: `role: engineer` in user data
- ✅ Redirects to `/engineer` page
- ✅ Engineer dashboard loads

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 2: Error Handling

### Test 2.1 - Wrong Password
**Steps:**
1. Navigate to `/login`
2. Enter valid email
3. Enter WRONG password
4. Click "Sign In"

**Expected Results:**
- ✅ Sign-in fails gracefully (no crash)
- ✅ Console shows: `[Auth Sign-In] Password verification failed for: [email]`
- ✅ Console shows: `[useAuth] Sign-in error:` with structured info
- ✅ Error message appears on screen: "Invalid email or password"
- ✅ Error is red box with icon
- ✅ User stays on login page
- ✅ Can retry sign-in

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 2.2 - Non-Existent Email
**Steps:**
1. Navigate to `/login`
2. Enter NON-EXISTENT email
3. Enter any password
4. Click "Sign In"

**Expected Results:**
- ✅ Sign-in fails gracefully
- ✅ Console shows: `[Auth Sign-In] User not found: [email]`
- ✅ Console shows: `[useAuth] Sign-in error:` with structured info
- ✅ Error message appears: "Invalid email or password"
- ✅ User stays on login page

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 2.3 - Empty Fields
**Steps:**
1. Navigate to `/login`
2. Leave both fields empty
3. Click "Sign In"

**Expected Results:**
- ✅ Form validation prevents submission OR
- ✅ Backend rejects with "Email and password are required"
- ✅ No [object Object] errors
- ✅ User-friendly error message

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 3: Session Management

### Test 3.1 - Session Persistence After Page Refresh
**Precondition:** Signed in as any user (from Test 1.x)

**Steps:**
1. Successfully sign in
2. Verify redirected to dashboard
3. Open browser Developer Tools (F12)
4. Go to Console tab
5. Refresh page (Ctrl+R or Cmd+R)
6. Observe console logs

**Expected Results:**
- ✅ Page reloads
- ✅ Console shows: `[useAuth] Checking session on app load...`
- ✅ Console shows: `[API /user/me] Looking up session token...`
- ✅ Console shows: `[useAuth] Session restored - User: [email]`
- ✅ No re-login required
- ✅ User stays on dashboard
- ✅ All user data is available

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 3.2 - Session Cookie Exists
**Precondition:** Signed in as any user

**Steps:**
1. Successfully sign in
2. Open Developer Tools (F12)
3. Go to Application tab > Cookies > localhost:3000 (or your domain)
4. Look for "auth.session" cookie

**Expected Results:**
- ✅ "auth.session" cookie exists
- ✅ Value is a long hex string (32 bytes = 64 chars)
- ✅ "HttpOnly" is checked
- ✅ "Secure" is checked (in production) OR unchecked (in development)
- ✅ "SameSite" is set to "Lax"
- ✅ Max-Age or Expires is in the future

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 3.3 - Session in Database
**Precondition:** Signed in as any user, have DB access

**Steps:**
1. Successfully sign in
2. Open database client or run SQL query
3. Query: `SELECT * FROM session WHERE "userId" = '[user-id]' ORDER BY "createdAt" DESC LIMIT 1;`

**Expected Results:**
- ✅ Session record exists
- ✅ token field matches cookie value
- ✅ expiresAt is 30 days in future
- ✅ createdAt and updatedAt are recent

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 4: Cookie Behavior

### Test 4.1 - Clear Cookie and Refresh
**Precondition:** Signed in as any user

**Steps:**
1. Signed in and viewing dashboard
2. Open Developer Tools (F12)
3. Go to Application > Cookies
4. Find "auth.session" and DELETE it
5. Refresh page (Ctrl+R)

**Expected Results:**
- ✅ Page reloads
- ✅ Console shows: `[useAuth] Checking session on app load...`
- ✅ Console shows: `[API /user/me] No session token found`
- ✅ Console shows: `[useAuth] No valid session - HTTP 401`
- ✅ Redirected to `/login` page automatically
- ✅ No errors or crashes

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 4.2 - Tamper with Cookie
**Precondition:** Signed in as any user

**Steps:**
1. Signed in and viewing dashboard
2. Open Developer Tools (F12)
3. Go to Application > Cookies > auth.session
4. Edit the cookie value to something random (e.g., "invalid123")
5. Refresh page

**Expected Results:**
- ✅ Page reloads
- ✅ Console shows: `[API /user/me] Session token not found in DB`
- ✅ Redirected to `/login` page
- ✅ No errors or crashes

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 5: Network & Console Logging

### Test 5.1 - Check Network Requests
**Precondition:** Chrome/Edge/Firefox Developer Tools open

**Steps:**
1. Navigate to `/login`
2. Open Developer Tools (F12)
3. Go to Network tab
4. Sign in with valid credentials
5. Observe network requests

**Expected Results:**
- ✅ Request 1: POST `/api/auth/sign-in/credential`
  - Status: 200
  - Response: { user: {...}, session: {...} }
- ✅ Request 2: GET `/api/user/me`
  - Status: 200
  - Response: User object with all fields (id, email, role, business_id, etc.)
- ✅ Request 3: Potential redirect or GET to dashboard page
- ✅ No 404, 500, or 403 errors
- ✅ All responses are valid JSON (not HTML)

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 5.2 - Console Logs Are Structured
**Precondition:** Chrome/Edge/Firefox Developer Tools open

**Steps:**
1. Navigate to `/login`
2. Open Developer Tools (F12) > Console tab
3. Sign in with valid credentials
4. Review console output

**Expected Results:**
- ✅ No [object Object] anywhere in logs
- ✅ All logs have format: `[Component/Route] Message` or `[Component/Route] Message:` with structured data
- ✅ Error logs include: message, status/code, type
- ✅ Success logs include: id, email, role
- ✅ Timestamps visible (browser adds them automatically)

**Example good log:**
```
[useAuth] User data fetched successfully: 
{id: '123', email: 'user@example.com', role: 'manager'}
```

**Example bad log (should NOT see):**
```
Sign in error: [object Object]
```

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 6: Multi-User Scenarios

### Test 6.1 - Sign In as One User, Then Another
**Precondition:** Multiple user accounts exist

**Steps:**
1. Sign in as user A
2. Verify dashboard loads
3. Sign out (or manually go to `/login`)
4. Sign in as user B
5. Verify correct dashboard loads

**Expected Results:**
- ✅ User A session is cleared
- ✅ User B gets new session
- ✅ Correct role-based dashboard loads for User B
- ✅ No data leakage from User A to User B

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 7: Mobile/Responsive

### Test 7.1 - Sign In on Mobile View
**Precondition:** Chrome DevTools open

**Steps:**
1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select iPhone 12 or similar mobile device
4. Navigate to `/login`
5. Sign in with valid credentials

**Expected Results:**
- ✅ Form is responsive and easy to use on small screen
- ✅ Sign-in works identically to desktop
- ✅ Redirects work correctly
- ✅ No layout issues

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Suite 8: Role-Based Redirects

### Test 8.1 - Super Admin Always Goes to Super Admin Dashboard
**Precondition:** Super admin account exists

**Steps:**
1. Clear cookies if logged in
2. Go directly to `/` (home page)
3. Sign in as super admin
4. Observe redirect

**Expected Results:**
- ✅ Redirects to `/super-admin`
- ✅ NOT `/manager` or `/engineer`

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 8.2 - Manager Always Goes to Manager Dashboard
**Precondition:** Manager account exists

**Steps:**
1. Clear cookies if logged in
2. Go directly to `/`
3. Sign in as manager
4. Observe redirect

**Expected Results:**
- ✅ Redirects to `/manager`
- ✅ NOT `/super-admin` or `/engineer`

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Test 8.3 - Engineer Always Goes to Engineer Dashboard
**Precondition:** Engineer account exists

**Steps:**
1. Clear cookies if logged in
2. Go directly to `/`
3. Sign in as engineer
4. Observe redirect

**Expected Results:**
- ✅ Redirects to `/engineer`
- ✅ NOT `/super-admin` or `/manager`

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Summary Report

| Test ID | Test Name | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| 1.1 | Super Admin Sign In | [ ] | |
| 1.2 | Manager Sign In | [ ] | |
| 1.3 | Engineer Sign In | [ ] | |
| 2.1 | Wrong Password | [ ] | |
| 2.2 | Non-Existent Email | [ ] | |
| 2.3 | Empty Fields | [ ] | |
| 3.1 | Session Persistence | [ ] | |
| 3.2 | Session Cookie | [ ] | |
| 3.3 | Session in DB | [ ] | |
| 4.1 | Clear Cookie | [ ] | |
| 4.2 | Tamper Cookie | [ ] | |
| 5.1 | Network Requests | [ ] | |
| 5.2 | Console Logs | [ ] | |
| 6.1 | Multi-User | [ ] | |
| 7.1 | Mobile View | [ ] | |
| 8.1 | Super Admin Redirect | [ ] | |
| 8.2 | Manager Redirect | [ ] | |
| 8.3 | Engineer Redirect | [ ] | |

**Total Passed:** _____ / 18  
**Total Failed:** _____ / 18  
**Status:** [ ] Ready for Development [ ] Needs Fixes [ ] Complete

---

## Debug Commands

If tests fail, run these in browser console:

```javascript
// Check current user
fetch('/api/user/me', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('Current user:', d));

// Check session cookie
console.log('Session cookie:', 
  document.cookie.split('; ')
    .find(row => row.startsWith('auth.session')));

// Manually test sign-in
fetch('/api/auth/sign-in/credential', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
  credentials: 'include'
}).then(r => r.json()).then(d => console.log('Sign-in result:', d));
```

---

**Test Date:** _________  
**Tester Name:** _________  
**Notes:** _________
