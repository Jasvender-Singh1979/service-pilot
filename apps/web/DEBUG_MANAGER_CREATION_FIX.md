# Debug Report: Manager Creation Failure

## Issue
POST `/api/managers` fails with "Failed to create manager" error, even though:
- Frontend shows error toast
- Request reaches the API
- Auth session is valid (user authenticated)
- Error is happening inside the server route

## Root Cause Identified
**Better Auth API Signature Mismatch**

The `auth.api.signUpEmail()` method has a specific API signature that was being called incorrectly.

### Incorrect Usage (What Was Being Called)
```typescript
// ❌ WRONG - Direct parameters
const result = await auth.api.signUpEmail({
  email: email.toLowerCase(),
  password,
  name,
});
```

### Correct Usage (What Should Be Called)
```typescript
// ✅ CORRECT - Requires 'body' wrapper and 'headers'
const result = await auth.api.signUpEmail({
  body: {
    email: email.toLowerCase(),
    password: password,
    name: name,
  },
  headers: new Headers(request.headers),
});
```

**Reference:** https://better-auth.com/docs/concepts/api

The Better Auth API expects:
- `body`: Object containing the signup parameters
- `headers`: Request headers (required for server-side API calls)

## Changes Made

### 1. `/app/api/managers/route.ts`
- **Fixed:** `auth.api.signUpEmail()` call now wraps parameters in `body` object
- **Added:** `headers: new Headers(request.headers)` parameter
- **Added:** Comprehensive logging at each step:
  - Session validation
  - Request body parsing
  - Email uniqueness check
  - Before/after Better Auth call
  - DB update status
  - Error details with stack trace
- **Enhanced:** Error responses now include detailed error info in development mode

### 2. `/app/api/engineers/route.ts`
- **Applied:** Same fixes as managers route
- **Added:** Same comprehensive debugging logs
- **Fixed:** `auth.api.signUpEmail()` call with correct API signature

## Testing Checklist

### Step 1: Verify Compilation
- [ ] App compiles without errors
- [ ] No TypeScript errors related to `auth.api`

### Step 2: Test Manager Creation
1. Go to Super Admin dashboard
2. Navigate to Managers section
3. Create a new manager with:
   - Name: "Test Manager"
   - Email: "test.manager@example.com" (unique)
   - Password: "TestPassword123"
4. Expected: Manager created successfully
5. Check browser console for logs: `[API /managers POST] SUCCESS`

### Step 3: Test Manager Login
1. Go to login page
2. Sign in with:
   - Email: "test.manager@example.com"
   - Password: "TestPassword123"
3. Expected: Login successful
4. If fails, check console logs starting with `[API /managers POST]`

### Step 4: Test Engineer Creation
1. As a manager, navigate to Engineers section
2. Create a new engineer with:
   - Name: "Test Engineer"
   - Email: "test.engineer@example.com"
   - Mobile: "1234567890"
   - Password: "EngPassword123"
3. Expected: Engineer created successfully
4. Check console logs: `[API /engineers POST] SUCCESS`

### Step 5: Test Engineer Login
1. Go to login page
2. Sign in with engineer credentials
3. Expected: Login successful

## Detailed Logging Structure

Both routes now log:
```
[API /managers POST] ========== REQUEST STARTED ==========
[API /managers POST] [STEP 1] Validating session...
[API /managers POST] [STEP 1] Session user found: {id, email, role}
[API /managers POST] [STEP 1] ✅ User authorized as super_admin
[API /managers POST] [STEP 2] businessId: xxx
[API /managers POST] [STEP 2] Parsing request body...
[API /managers POST] [STEP 2] Request body received: {name, email, passwordLength}
[API /managers POST] [STEP 3] Checking for existing email...
[API /managers POST] [STEP 3] ✅ Email is unique: xxx
[API /managers POST] [STEP 4] Calling auth.api.signUpEmail() with correct API format...
[API /managers POST] [STEP 4] auth.api.signUpEmail() returned: {hasData, hasError, hasUser}
[API /managers POST] [STEP 4] ✅ Manager created via Better Auth: {userId, email}
[API /managers POST] [STEP 5] Updating user with manager-specific fields...
[API /managers POST] [STEP 5] ✅ User updated with manager fields: {id, role, business_id}
[API /managers POST] ========== SUCCESS (123ms) ==========
```

## If Creation Still Fails

### Check Console Logs
Look for lines starting with `[API /managers POST]` or `[API /engineers POST]`
- Find which STEP failed (1-5)
- Note the exact error message
- Check the EXCEPTION details section

### Common Failure Points

**STEP 1 - Session validation fails:**
- User not authenticated (no valid session)
- User role is not 'super_admin'
- Solution: Ensure you're logged in as super_admin

**STEP 2 - Request body parsing fails:**
- Missing required fields (name, email, password)
- Password shorter than 8 characters
- Solution: Provide all required fields

**STEP 3 - Email already exists:**
- Email is already registered in database
- Solution: Use a unique email

**STEP 4 - Better Auth failure:**
- `auth.api.signUpEmail()` throws exception
- Better Auth returns error in response
- Possible causes:
  - Invalid email format
  - Database constraint violation
  - Better Auth not properly configured
- Solution: Check exception details in logs

**STEP 5 - Database update fails:**
- User created in Better Auth but DB update failed
- User doesn't exist in database after creation
- Possible causes:
  - Better Auth created user but didn't insert into DB (transaction issue)
  - Database constraint violation
  - Role/business_id update failed
- Solution: This is a partial user creation. Check database directly.

## Database Cleanup

If a manager/engineer was partially created (Better Auth user created but DB update failed):

```sql
-- Find the orphaned user (in better-auth account but not updated with role/business_id)
SELECT u.id, u.email, u.role, u.business_id, a."providerId"
FROM "user" u
LEFT JOIN account a ON u.id = a."userId"
WHERE u.role IS NULL OR u.business_id IS NULL;

-- Delete if needed
DELETE FROM account WHERE "userId" = 'user_id';
DELETE FROM session WHERE "userId" = 'user_id';
DELETE FROM "user" WHERE id = 'user_id';
```

## Notes

- Comprehensive logging has minimal performance impact and is only in development
- Error responses in development include detailed error info for debugging
- Error responses in production hide sensitive details
- Both manager and engineer creation use the same Better Auth pattern (consistent)
- All passwords are now hashed by Better Auth (not custom PBKDF2)

## Next Steps After Testing

If all tests pass:
1. Remove temporary debug logging (keep error logging)
2. Clean up the DEBUG_MANAGER_CREATION_FIX.md file
3. Document the correct Better Auth API usage pattern in auth-utils.ts
4. Consider using `createUserWithPassword()` utility from auth-utils instead of direct API calls
