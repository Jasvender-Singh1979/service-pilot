# Better Auth Server-Side API Reference

## Overview

This document explains how Better Auth's server-side API works, specifically for `auth.api.signUpEmail()`.

## API Signature

### Correct Usage

```typescript
import { auth } from "@/lib/auth";

// Server-side API call
const result = await auth.api.signUpEmail({
  body: {
    email: "user@example.com",
    password: "securePassword123",
    name: "John Doe",
  },
  headers: new Headers(request.headers), // Pass incoming request headers
});

// result is: { user: {...}, session: {...} }
const userId = result.user.id;
const userEmail = result.user.email;
```

### Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `body.email` | string | ✅ | User's email (will be normalized to lowercase) |
| `body.password` | string | ✅ | Password (min 8 chars, max 128 chars) |
| `body.name` | string | ✅ | User's display name |
| `body.image` | string | ❌ | Optional profile image URL |
| `headers` | Headers | ❌ | Optional but recommended (for IP, user agent, etc.) |

### Return Value (Success)

```typescript
{
  user: {
    id: "user_uuid",
    email: "user@example.com",
    name: "John Doe",
    emailVerified: false,
    image: null,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    // Any additional fields from auth config
  },
  session: {
    // Session data
  }
}
```

### Return Value (Error)

Better Auth **throws an error** instead of returning an error object:

```typescript
try {
  const result = await auth.api.signUpEmail({
    body: { email: "test@example.com", password: "pass", name: "Test" },
    headers: new Headers(request.headers),
  });
} catch (error) {
  // error is an APIError instance
  console.log(error.message);  // "Email already exists"
  console.log(error.status);   // 422 or 400
  console.log(error.code);     // "EMAIL_ALREADY_EXISTS"
}
```

## Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `EMAIL_ALREADY_EXISTS` | 422 | Email is already registered |
| `INVALID_PASSWORD` | 400 | Password doesn't meet requirements |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `PROVIDER_NOT_ENABLED` | 400 | Auth provider not configured |

## Important Differences from Client-Side

### ❌ CLIENT-SIDE (from `useAuth()` or `authClient`)
```typescript
// This is the client-side API
const { data, error } = await authClient.signUp.email({
  name: "John",
  email: "john@example.com",
  password: "securePassword123",
});

// Returns { data, error } structure
if (!error) {
  const user = data?.user;
}
```

### ✅ SERVER-SIDE (from `auth.api`)
```typescript
// This is the server-side API
const result = await auth.api.signUpEmail({
  body: {
    name: "John",
    email: "john@example.com",
    password: "securePassword123",
  },
  headers: new Headers(request.headers),
});

// Returns { user, session } directly OR throws error
const user = result.user;  // Direct access, no data wrapper
```

## Response Options

### Getting Just the Data (Default)

```typescript
const result = await auth.api.signUpEmail({
  body: { ... },
  headers: ...,
});
// Returns: { user, session }
```

### Getting HTTP Headers

```typescript
const { headers, response } = await auth.api.signUpEmail({
  body: { ... },
  headers: ...,
  returnHeaders: true,  // Add this option
});

// headers is a Headers object
const cookies = headers.getSetCookie();
```

### Getting Response Object

```typescript
const response = await auth.api.signUpEmail({
  body: { ... },
  headers: ...,
  asResponse: true,  // Get a Response object instead
});

// response is a Response object
console.log(response.status);  // 200 or error status
const data = await response.json();
```

## Implementation in `/api/managers/route.ts`

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // ✅ Correct: Create user via Better Auth
    const createResult = await auth.api.signUpEmail({
      body: {
        email: email.toLowerCase(),
        password: password,
        name: name,
      },
      headers: new Headers(request.headers),
    });

    // ✅ Access user directly (not in .data field)
    const userId = createResult.user.id;

    // ✅ Update additional app-specific fields
    await sql`
      UPDATE "user"
      SET role = 'manager', business_id = ${businessId}
      WHERE id = ${userId}
    `;

    return NextResponse.json(createResult.user, { status: 201 });
    
  } catch (error: any) {
    // ✅ Better Auth throws errors, doesn't return them
    console.error('Signup failed:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

## Authentication Methods Available

### Email/Password
```typescript
// Sign up
const result = await auth.api.signUpEmail({ body: { ... }, headers });

// Sign in
const result = await auth.api.signInEmail({
  body: { email, password },
  headers,
});

// Change password
const result = await auth.api.changePassword({
  body: { newPassword, currentPassword },
  headers,
});

// Forgot password
const result = await auth.api.forgetPassword({
  body: { email },
  headers,
});
```

### Session Management
```typescript
// Get current session
const result = await auth.api.getSession({
  headers: new Headers(request.headers),
});

// Invalidate session (logout)
const result = await auth.api.signOut({
  headers: new Headers(request.headers),
});
```

## Documentation References

- **Main docs**: https://better-auth.com/docs/concepts/api
- **Email/Password**: https://better-auth.com/docs/authentication/email-password
- **Session Management**: https://better-auth.com/docs/concepts/session-management
- **Error Handling**: https://better-auth.com/docs/concepts/api#error-handling
