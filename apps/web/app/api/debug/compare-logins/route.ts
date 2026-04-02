import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";

/**
 * Compare super_admin login vs manager login
 * Shows exactly where and why manager login fails
 */
export async function GET(request: Request) {
  const results: any = {
    timestamp: new Date().toISOString(),
    super_admin: {},
    manager: {},
    analysis: {},
  };

  // TEST 1: Find super_admin user
  try {
    const superAdminUsers = await sql`
      SELECT id, email, role, business_id, is_active
      FROM "user"
      WHERE role = 'super_admin'
      LIMIT 1
    `;

    if (superAdminUsers.length > 0) {
      const superAdminUser = superAdminUsers[0];
      results.super_admin.user_found = true;
      results.super_admin.user_id = superAdminUser.id;
      results.super_admin.email = superAdminUser.email;
      results.super_admin.role = superAdminUser.role;
      results.super_admin.is_active = superAdminUser.is_active;

      // Find account for super_admin
      const superAdminAccounts = await sql`
        SELECT id, password, "providerId"
        FROM account
        WHERE "userId" = ${superAdminUser.id}
        AND "providerId" = 'credential'
      `;

      if (superAdminAccounts.length > 0) {
        results.super_admin.account_found = true;
        results.super_admin.account_id = superAdminAccounts[0].id;
        results.super_admin.has_password_hash = !!superAdminAccounts[0].password;
        results.super_admin.password_hash_format = superAdminAccounts[0].password
          ? superAdminAccounts[0].password.split(":")[0].length === 32
            ? "VALID (32-char salt)"
            : "INVALID"
          : "NONE";

        // Test password verification
        const verifyResult = verifyPassword(
          "Admin@12345",
          superAdminAccounts[0].password
        );
        results.super_admin.test_password = "Admin@12345";
        results.super_admin.password_matches = verifyResult;
      } else {
        results.super_admin.account_found = false;
        results.super_admin.password_matches = false;
      }
    } else {
      results.super_admin.user_found = false;
    }
  } catch (e: any) {
    results.super_admin.error = e.message;
  }

  // TEST 2: Find manager user (bani@bani.com)
  try {
    const managerUsers = await sql`
      SELECT id, email, role, business_id, is_active
      FROM "user"
      WHERE LOWER(email) = LOWER('bani@bani.com')
    `;

    if (managerUsers.length > 0) {
      const managerUser = managerUsers[0];
      results.manager.user_found = true;
      results.manager.user_id = managerUser.id;
      results.manager.email = managerUser.email;
      results.manager.role = managerUser.role;
      results.manager.is_active = managerUser.is_active;

      // Find account for manager
      const managerAccounts = await sql`
        SELECT id, password, "providerId"
        FROM account
        WHERE "userId" = ${managerUser.id}
        AND "providerId" = 'credential'
      `;

      if (managerAccounts.length > 0) {
        results.manager.account_found = true;
        results.manager.account_id = managerAccounts[0].id;
        results.manager.has_password_hash = !!managerAccounts[0].password;
        results.manager.password_hash_format = managerAccounts[0].password
          ? managerAccounts[0].password.split(":")[0].length === 32
            ? "VALID (32-char salt)"
            : "INVALID"
          : "NONE";

        // Test password verification
        const verifyResult = verifyPassword(
          "Test@12345",
          managerAccounts[0].password
        );
        results.manager.test_password = "Test@12345";
        results.manager.password_matches = verifyResult;
      } else {
        results.manager.account_found = false;
        results.manager.password_matches = false;
      }
    } else {
      results.manager.user_found = false;
    }
  } catch (e: any) {
    results.manager.error = e.message;
  }

  // ANALYSIS
  results.analysis.both_users_found =
    results.super_admin.user_found && results.manager.user_found;
  results.analysis.both_accounts_found =
    results.super_admin.account_found && results.manager.account_found;
  results.analysis.super_admin_password_ok =
    results.super_admin.password_matches;
  results.analysis.manager_password_ok = results.manager.password_matches;

  // Identify the exact failure point
  if (!results.manager.user_found) {
    results.analysis.failure_point =
      "Manager user not found in database";
  } else if (!results.manager.account_found) {
    results.analysis.failure_point =
      "Manager credential account not found";
  } else if (!results.manager.has_password_hash) {
    results.analysis.failure_point = "Manager account has no password hash";
  } else if (!results.manager.password_matches) {
    results.analysis.failure_point =
      "Password verification failed (hash mismatch or wrong format)";
  } else {
    results.analysis.failure_point = "UNKNOWN - password verification passed";
  }

  results.analysis.next_step =
    "Compare with super_admin credentials flow to identify the middleware or Better Auth issue";

  return NextResponse.json(results, { status: 200 });
}
