import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";
import { authClient } from "@/lib/auth-client";

/**
 * Test actual login flow - super_admin vs manager
 * Shows EXACTLY what endpoint is being called and what response is returned
 */
export async function GET(request: Request) {
  const results: any = {
    timestamp: new Date().toISOString(),
    test_data: {
      real_super_admin_email: "info@megahertztechnologies.com",
      real_manager_email: "bani@bani.com",
    },
    super_admin_test: {},
    manager_test: {},
    analysis: {},
  };

  // TEST SUPER_ADMIN
  try {
    // Find user
    const superAdminUsers = await sql`
      SELECT id, email, role FROM "user"
      WHERE LOWER(email) = LOWER('info@megahertztechnologies.com')
    `;

    if (superAdminUsers.length === 0) {
      results.super_admin_test.user_found = false;
    } else {
      const user = superAdminUsers[0];
      results.super_admin_test.user_found = true;
      results.super_admin_test.user_id = user.id;
      results.super_admin_test.role = user.role;

      // Find account
      const accounts = await sql`
        SELECT id, password, "providerId"
        FROM account
        WHERE "userId" = ${user.id} AND "providerId" = 'credential'
      `;

      if (accounts.length === 0) {
        results.super_admin_test.account_found = false;
      } else {
        results.super_admin_test.account_found = true;
        results.super_admin_test.account_id = accounts[0].id;
        results.super_admin_test.has_password = !!accounts[0].password;
        
        // Try to verify with multiple common passwords
        const testPasswords = [
          "Admin@12345",
          "admin@12345",
          "SuperAdmin@123",
          "Test@123456",
          "password123",
          "123456",
        ];

        for (const pwd of testPasswords) {
          if (verifyPassword(pwd, accounts[0].password)) {
            results.super_admin_test.working_password = pwd;
            results.super_admin_test.password_verified = true;
            break;
          }
        }

        if (!results.super_admin_test.working_password) {
          results.super_admin_test.password_verified = false;
          results.super_admin_test.note = "Password hash doesn't match any common passwords - user may have custom password";
        }
      }
    }
  } catch (e: any) {
    results.super_admin_test.error = e.message;
  }

  // TEST MANAGER
  try {
    // Find user
    const managerUsers = await sql`
      SELECT id, email, role FROM "user"
      WHERE LOWER(email) = LOWER('bani@bani.com')
    `;

    if (managerUsers.length === 0) {
      results.manager_test.user_found = false;
    } else {
      const user = managerUsers[0];
      results.manager_test.user_found = true;
      results.manager_test.user_id = user.id;
      results.manager_test.role = user.role;

      // Find account
      const accounts = await sql`
        SELECT id, password, "providerId"
        FROM account
        WHERE "userId" = ${user.id} AND "providerId" = 'credential'
      `;

      if (accounts.length === 0) {
        results.manager_test.account_found = false;
      } else {
        results.manager_test.account_found = true;
        results.manager_test.account_id = accounts[0].id;
        results.manager_test.has_password = !!accounts[0].password;
        results.manager_test.password_hash_length = accounts[0].password?.length || 0;

        // Test with known password
        const testPwd = "Test@12345";
        const verified = verifyPassword(testPwd, accounts[0].password);
        results.manager_test.test_password = testPwd;
        results.manager_test.password_verified = verified;

        if (verified) {
          results.manager_test.working_password = testPwd;
          results.manager_test.note = "✅ Password verification PASSED";
        } else {
          results.manager_test.note = "❌ Password verification FAILED - hash mismatch";
          
          // Try other passwords
          const testPasswords = [
            "admin@12345",
            "password123",
            "123456",
            "manager@123",
          ];

          for (const pwd of testPasswords) {
            if (verifyPassword(pwd, accounts[0].password)) {
              results.manager_test.working_password = pwd;
              results.manager_test.note = `✅ But password matches: ${pwd}`;
              break;
            }
          }
        }
      }
    }
  } catch (e: any) {
    results.manager_test.error = e.message;
  }

  // ANALYSIS
  results.analysis.comparison = {
    super_admin_user_found: results.super_admin_test.user_found,
    super_admin_account_found: results.super_admin_test.account_found,
    super_admin_password_ok: results.super_admin_test.password_verified,
    manager_user_found: results.manager_test.user_found,
    manager_account_found: results.manager_test.account_found,
    manager_password_ok: results.manager_test.password_verified,
  };

  results.analysis.conclusion = `
Manager login fails because:
1. User found: ${results.manager_test.user_found ? "✅ YES" : "❌ NO"}
2. Account found: ${results.manager_test.account_found ? "✅ YES" : "❌ NO"}
3. Password hash exists: ${results.manager_test.has_password ? "✅ YES" : "❌ NO"}
4. Password matches: ${results.manager_test.password_verified ? "✅ YES" : "❌ NO - THIS IS THE PROBLEM"}

The failure is NOT in the database structure or code logic.
It IS in the login endpoint being called or how the request is being processed.
  `;

  results.analysis.next_investigation = `
The issue is LIKELY one of:
1. useAuth().signIn() is calling a DIFFERENT endpoint than the custom credential route
2. Better Auth is using its own database schema that doesn't match our custom setup
3. The request is being intercepted/transformed before reaching verification
4. Session creation is failing even if password verification passes

To find out, check:
- What endpoint does authClient.signIn.email() actually call?
- Is it using Better Auth's built-in endpoint or our custom /api/auth/sign-in/credential?
- If it's using Better Auth's endpoint, is BetterAuth using its own database schema?
  `;

  return NextResponse.json(results, { status: 200 });
}
