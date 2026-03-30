import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";
import * as crypto from "crypto";

/**
 * DEBUG: Test ALL managers and their passwords
 * 
 * Lists all managers and tests password verification for each
 */
export async function GET(request: Request) {
  try {
    console.log("\n========== TESTING ALL MANAGERS ==========\n");

    // Get all managers
    const managers = await sql`
      SELECT id, email, role, business_id FROM "user" WHERE role = 'manager' ORDER BY "createdAt" DESC
    `;

    console.log(`Found ${managers.length} managers\n`);

    const results = [];

    for (const manager of managers) {
      console.log(`\n--- Testing Manager: ${manager.email} ---`);

      // Get account
      const accounts = await sql`
        SELECT id, password, "providerId" FROM account WHERE "userId" = ${manager.id} AND "providerId" = 'credential'
      `;

      if (accounts.length === 0) {
        console.log(`  ✗ No credential account found`);
        results.push({
          email: manager.email,
          userId: manager.id,
          hasAccount: false,
          accountFoundAt: null,
          passwordHash: null,
          passwordVerified: false,
          reason: "No credential account found",
        });
        continue;
      }

      const account = accounts[0];
      const storedHash = account.password;

      console.log(`  ✓ Account found: ${account.id}`);
      console.log(`  - Hash: ${storedHash?.substring(0, 60)}...`);

      if (!storedHash || !storedHash.includes(":")) {
        console.log(`  ✗ Invalid hash format (missing ':')`);
        results.push({
          email: manager.email,
          userId: manager.id,
          hasAccount: true,
          accountFoundAt: account.id,
          passwordHash: storedHash?.substring(0, 60),
          passwordVerified: false,
          reason: "Invalid hash format",
        });
        continue;
      }

      // Try common test passwords
      const testPasswords = [
        "password123",
        "test123456",
        "testpass123",
        "manager123",
        "12345678",
        "admin123",
      ];

      let foundValidPassword = false;
      let verifiedPassword = null;

      for (const testPwd of testPasswords) {
        const verified = verifyPassword(testPwd, storedHash);
        if (verified) {
          console.log(`  ✓ Password verified: ${testPwd}`);
          foundValidPassword = true;
          verifiedPassword = testPwd;
          break;
        }
      }

      if (!foundValidPassword) {
        console.log(`  ✗ None of the test passwords matched`);
        console.log(`    Tested: ${testPasswords.join(", ")}`);
      }

      results.push({
        email: manager.email,
        userId: manager.id,
        hasAccount: true,
        accountFoundAt: account.id,
        passwordHash: storedHash.substring(0, 80),
        passwordVerified: foundValidPassword,
        verifiedPassword: verifiedPassword,
        testedPasswords: testPasswords,
      });
    }

    console.log("\n========== RESULTS ==========\n");

    return NextResponse.json({
      summary: {
        total: managers.length,
        withAccounts: results.filter((r) => r.hasAccount).length,
        withVerifiedPasswords: results.filter((r) => r.passwordVerified).length,
      },
      managers: results,
    });
  } catch (error: any) {
    console.error("[DEBUG] Error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
