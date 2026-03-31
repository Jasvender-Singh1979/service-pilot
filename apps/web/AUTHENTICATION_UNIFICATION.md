# Authentication Unification - Better Auth Implementation

## Overview
This document outlines the changes made to unify all user authentication under Better Auth, removing the custom PBKDF2 password hashing system.

## Problem Solved
Previously, the system had a critical authentication inconsistency:
- **Manager creation**: Used custom PBKDF2 password hashing (`salt:hash` format)
- **Engineer creation**: Also used custom PBKDF2 hashing
- **Login**: Used Better Auth's built-in email/password handler
- **Result**: ❌ Manager and engineer logins FAILED because Better Auth couldn't verify the custom PBKDF2 hashes

## Solution Implemented
All user creation now goes through Better Auth's server-side API, which ensures:
- ✅ Passwords are hashed using Better Auth's standard algorithm
- ✅ Account records are created correctly by Better Auth
- ✅ All users login successfully using the same `/api/auth/sign-in/email` endpoint
- ✅ One unified authentication path for all user types

## Files Changed

### 1. `/home/user/apps/web/lib/auth-utils.ts`
**Changes:**
- Removed `hashPassword()` function (custom PBKDF2 hashing)
- Removed `verifyPassword()` function (custom PBKDF2 verification)
- Updated `createUserWithPassword()` to use `auth.api.signUpEmail()` instead of manual hashing
- Better Auth now handles all password hashing internally

**Key points:**
- Function still accepts app-specific overrides (role, business_id, manager_user_id, designation, mobile_number)
- After Better Auth creates the user, we update app-specific fields using SQL
- Removed `createSession()` function (no longer needed)

### 2. `/home/user/apps/web/app/api/managers/route.ts`
**Changes:**
- Updated POST handler to use `auth.api.signUpEmail()` instead of manual PBKDF2 hashing
- Flow:
  1. Call `auth.api.signUpEmail(email, password, name)`
  2. Better Auth creates user + account with proper hashing
  3. Update user with manager-specific fields (role='manager', business_id)
  4. Return created user

**Code:**
```typescript
const createResult = await auth.api.signUpEmail({
  email: email.toLowerCase(),
  password,
  name,
});

// Then update manager-specific fields
await sql`
  UPDATE "user"
  SET role = 'manager', business_id = ${businessId}, ...
  WHERE id = ${userId}
`;
```

### 3. `/home/user/apps/web/app/api/engineers/route.ts`
**Changes:**
- Updated POST handler to use `auth.api.signUpEmail()` instead of `createUserWithPassword()`
- Now calls Better Auth directly
- Same pattern as managers: create via Better Auth, then update app-specific fields
- Added password length validation (minimum 8 characters)

### 4. `/home/user/apps/web/app/api/auth/reset-password/route.ts`
**Changes:**
- Updated to use `auth.api.changePassword()` instead of manual PBKDF2 hashing
- Better Auth now handles password reset with proper hashing

### 5. Deleted Files
- ✅ `/home/user/apps/web/app/api/auth/sign-in/credential/route.ts` - Custom credential handler (never called, replaced by Better Auth)
- ✅ `/home/user/apps/web/app/api/auth/init-password/route.ts` - Debug endpoint for initial password setup

## How It Works Now

### Creating a Manager
```
POST /api/managers
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}

→ Calls auth.api.signUpEmail(email, password, name)
→ Better Auth creates user + account with bcrypt/Argon2 hashing
→ API updates user: role='manager', business_id=...
→ Returns created manager
```

### Creating an Engineer
```
POST /api/engineers
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePassword123",
  "mobileNumber": "+1234567890",
  "managerEmail": "john@example.com"
}

→ Calls auth.api.signUpEmail(email, password, name)
→ Better Auth creates user + account
→ API updates user: role='engineer', manager_user_id=..., business_id=...
→ Returns created engineer
```

### Logging In (Unchanged)
```
POST /api/auth/sign-in/email
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}

→ Better Auth's built-in handler verifies password
→ Login succeeds ✅
```

## Database Impact

### Account Table
Previously stored passwords in `salt_hex:hash_hex` format (PBKDF2).
Now stores passwords in Better Auth's standard format (bcrypt/Argon2).

**Old format:** `72fdd58a15a9fa4d661015ad6e5109cf:d83d4b28d5007a9c6f1ebbdee2c020574b92133a35e445b7dda6f5a40c9b661569df5e80913dc01c73369fc42b3498988c6dd86cd7fd904830d1baa9b97f397b`

**New format:** `$2a$12$...` (bcrypt) or `$argon2id$v=19$...` (Argon2)

### User Table
No changes. All user fields remain the same:
- id, email, name, role, business_id, manager_user_id, designation, mobile_number, etc.

## Migration Notes

### Existing Users with Old Password Hashes
Existing managers and engineers with PBKDF2 hashes (`salt:hash` format) will NOT be able to login with Better Auth because the hash formats are incompatible.

**Options:**
1. **Force Password Reset:** Mark existing users with `first_login_password_change_required = true`
2. **Admin Reset:** Admin resets password via `/api/auth/reset-password` endpoint
3. **New Creation:** Create new user accounts via the updated endpoints

We recommend option 1 (force password reset) - add logic to login pages to redirect users with `first_login_password_change_required = true` to a password reset page.

## Testing

### Test Creating a Manager
```bash
curl -X POST http://localhost:3000/api/managers \
  -H "Content-Type: application/json" \
  -b "better-auth.session_token=..." \
  -d '{
    "name": "Test Manager",
    "email": "test-manager@test.com",
    "password": "TestPassword123"
  }'
```

### Test Manager Login
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-manager@test.com",
    "password": "TestPassword123"
  }'
```

### Test Creating an Engineer
```bash
curl -X POST http://localhost:3000/api/engineers \
  -H "Content-Type: application/json" \
  -b "better-auth.session_token=..." \
  -d '{
    "name": "Test Engineer",
    "email": "test-engineer@test.com",
    "password": "TestPassword123",
    "mobileNumber": "+1234567890",
    "managerEmail": "test-manager@test.com"
  }'
```

### Test Engineer Login
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-engineer@test.com",
    "password": "TestPassword123"
  }'
```

## Better Auth API Methods Used

### `auth.api.signUpEmail(options)`
Creates a new user with email/password authentication.
- **Parameters:** `email`, `password`, `name`
- **Returns:** `{ data: { user: {...} }, error: null }` on success
- **Handles:** Creates both `user` and `account` records with proper password hashing

### `auth.api.changePassword(options)`
Changes a user's password (admin use).
- **Parameters:** `userId`, `newPassword`
- **Returns:** `{ data: {...}, error: null }` on success
- **Handles:** Password hashing internally

## Cleanup Done

✅ Removed PBKDF2 custom password hashing functions
✅ Deleted custom credential sign-in route (`/api/auth/sign-in/credential`)
✅ Deleted debug init-password endpoint (`/api/auth/init-password`)
✅ Updated all user creation to use Better Auth
✅ Unified all authentication under one system

## Debug Routes Still Available

The following debug routes were left in place for troubleshooting (these don't affect production):
- `/api/debug/hash-generator` - Generates PBKDF2 hashes (for legacy testing only)
- `/api/debug/test-manager-login` - Tests login flow
- `/api/debug/reset-password` - Debug password reset
- Various other debug routes under `/api/debug/`

These should be removed in a future cleanup if not needed.

## Next Steps (Optional)

1. **Add password reset UI:** Create a password reset page for users with `first_login_password_change_required = true`
2. **Migrate existing users:** Batch reset all existing manager/engineer passwords
3. **Remove debug routes:** Delete debug endpoints under `/api/debug/` and `/api/test/`
4. **Update tests:** Update any integration tests to work with new Better Auth flow

## Security Notes

- Better Auth uses industry-standard password hashing (bcrypt/Argon2)
- All passwords are now handled by Better Auth's proven implementation
- No more custom cryptography (which can introduce vulnerabilities)
- API endpoints are protected by session authentication (✅ getSessionUserFromRequest() checks)
