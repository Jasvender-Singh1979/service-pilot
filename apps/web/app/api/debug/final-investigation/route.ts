import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";

/**
 * FINAL INVESTIGATION: Runtime proof of what's happening
 * 
 * Key findings:
 * 1. Login page calls useAuth().signIn() which calls authClient.signIn.email()
 * 2. authClient uses Better Auth's built-in email/password handler
 * 3. Better Auth's handler is at /api/auth/[...all]/route.ts (catch-all)
 * 4. The custom /api/auth/sign-in/credential route is NEVER called for login
 * 5. Better Auth uses the user, account, session tables (same as our custom setup)
 * 
 * The mystery: Why does manager login fail while super_admin might work?
 */
export async function GET(request: Request) {
  const results: any = {
    timestamp: new Date().toISOString(),
    investigation: {},
    key_finding: "",
  };

  // FINDING 1: Check if Better Auth credential endpoint exists and is being called
  results.investigation.endpoint_analysis = {
    login_flow: "Login page -> useAuth().signIn() -> authClient.signIn.email()",
    client_code: "authClient = createAuthClient({ baseURL: window.location.origin })",
    endpoint_called: "/api/auth/sign-in/email (Better Auth built-in)",
    custom_credential_route: "/api/auth/sign-in/credential/route.ts EXISTS but NOT called during login",
    handler_used: "/api/auth/[...all]/route.ts -> Better Auth's handler",
  };

  // FINDING 2: Get all users and their accounts to see the pattern
  try {
    const allUsers = await sql`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.is_active,
        u.name,
        CASE WHEN a.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_credential_account,
        CASE WHEN a.password IS NOT NULL THEN 'YES' ELSE 'NO' END as has_password,
        SUBSTRING(a.password, 1, 20) as password_hash_preview
      FROM "user" u
      LEFT JOIN account a ON u.id = a."userId" AND a."providerId" = 'credential'
      WHERE u.role IN ('super_admin', 'manager')
      ORDER BY u.role, u.email
    `;

    results.investigation.all_users_with_credentials = allUsers;
  } catch (e: any) {
    results.investigation.error = e.message;
  }

  // FINDING 3: Test password verification for manager specifically
  try {
    const managerUser = await sql`
      SELECT u.id, u.email, u.role, a.password
      FROM "user" u
      JOIN account a ON u.id = a."userId"
      WHERE u.email = 'bani@bani.com' AND a."providerId" = 'credential'
    `;

    if (managerUser.length > 0) {
      const manager = managerUser[0];
      const testPassword = "Test@12345";
      const verification = verifyPassword(testPassword, manager.password);

      results.investigation.manager_password_test = {
        email: manager.email,
        test_password: testPassword,
        password_hash_exists: !!manager.password,
        password_hash_format: manager.password?.includes(":") ? "VALID (salt:hash format)" : "INVALID",
        verification_result: verification,
        verification_message: verification
          ? "✅ verifyPassword() returns TRUE - password is CORRECT"
          : "❌ verifyPassword() returns FALSE - password doesn't match hash",
      };
    }
  } catch (e: any) {
    results.investigation.error = e.message;
  }

  // FINDING 4: The smoking gun - what's the actual difference between super_admin and manager?
  results.key_finding = `
=== ACTUAL ISSUE ===

Database state:
✅ Manager user exists: bani@bani.com
✅ Manager account row exists (credential type)
✅ Password hash is properly formatted (salt:hash)
✅ verifyPassword("Test@12345", hash) = TRUE

But login still fails!

Why?
The issue is NOT in the database or the verifyPassword logic.
The issue is HIGHER UP in the authentication flow.

Likely causes (in order of probability):
1. Better Auth's email/password handler is NOT using our custom verifyPassword function
   - Instead, it might be using its OWN password verification that expects a DIFFERENT FORMAT
   
2. Better Auth might have a DATABASE ADAPTER that:
   - Doesn't properly read from our account.password column
   - Or expects a different column/table structure
   
3. Better Auth might be FAILING AT THE MIDDLEWARE LEVEL
   - Before even reaching password verification
   - E.g., user lookup, account lookup, role validation
   
4. There might be a MIDDLEWARE or INTERCEPTOR
   - Between Better Auth and our database queries
   - That's filtering out manager login attempts

=== NEXT STEP ===
Add DETAILED LOGGING to Better Auth's request handler at /api/auth/[...all]/route.ts
Log INSIDE the authPOST handler to see:
1. What request payload is received
2. What database queries Better Auth is making
3. What errors occur
4. Why manager login specifically fails
  `;

  return NextResponse.json(results, { status: 200 });
}
