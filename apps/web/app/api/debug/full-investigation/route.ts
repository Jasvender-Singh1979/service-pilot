import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword, normalizeEmail } from "@/lib/auth-utils";
import * as crypto from "crypto";

/**
 * COMPREHENSIVE INVESTIGATION
 * 
 * Compares:
 * 1. Super admin login (known working)
 * 2. Manager login (failing)
 * 3. Identifies the exact difference
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get("email");
    const testPassword = searchParams.get("password");

    console.log("\n========== FULL INVESTIGATION ==========");
    console.log("[TEST] Email:", testEmail);
    console.log("[TEST] Password: (hidden)");

    if (!testEmail || !testPassword) {
      return NextResponse.json(
        {
          error:
            "Email and password required. Usage: ?email=user@example.com&password=yourpassword",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(testEmail);

    // ===== PHASE 1: USER LOOKUP =====
    console.log("\n[PHASE 1] User Lookup");
    const users = await sql`
      SELECT id, email, name, role, business_id, "createdAt"
      FROM "user"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    console.log(`  Found: ${users.length} user(s)`);

    if (users.length === 0) {
      return NextResponse.json(
        {
          phase: 1,
          status: "FAIL",
          reason: "user_not_found",
          email: normalizedEmail,
        },
        { status: 401 }
      );
    }

    const user = users[0];
    console.log(`  ✓ User: ${user.email} (${user.role})`);
    console.log(`  ✓ ID: ${user.id}`);
    console.log(`  ✓ Business ID: ${user.business_id}`);

    // ===== PHASE 2: ACCOUNT LOOKUP =====
    console.log("\n[PHASE 2] Account Lookup");
    const accounts = await sql`
      SELECT id, password, "providerId", "createdAt"
      FROM account
      WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;

    console.log(`  Found: ${accounts.length} credential account(s)`);

    if (accounts.length === 0) {
      return NextResponse.json(
        {
          phase: 2,
          status: "FAIL",
          reason: "no_credential_account",
          userId: user.id,
        },
        { status: 401 }
      );
    }

    const account = accounts[0];
    const storedHash = account.password;

    console.log(`  ✓ Account: ${account.id}`);
    console.log(`  ✓ Has password: ${!!storedHash}`);
    if (storedHash) {
      console.log(`  ✓ Hash (first 60 chars): ${storedHash.substring(0, 60)}...`);
      console.log(`  ✓ Hash format valid: ${storedHash.includes(":")}`);
    }

    // ===== PHASE 3: PASSWORD VERIFICATION =====
    console.log("\n[PHASE 3] Password Verification");

    if (!storedHash || !storedHash.includes(":")) {
      return NextResponse.json(
        {
          phase: 3,
          status: "FAIL",
          reason: "invalid_hash_format",
          storedHash: storedHash?.substring(0, 60),
        },
        { status: 401 }
      );
    }

    // Manual computation
    const [salt, storedHashPart] = storedHash.split(":");
    console.log(`  Salt: ${salt}`);
    console.log(`  Stored hash part: ${storedHashPart?.substring(0, 60)}...`);

    console.log(`  Computing PBKDF2...");
    const computed = crypto
      .pbkdf2Sync(testPassword, salt, 100000, 64, "sha256")
      .toString("hex");
    console.log(`  Computed hash: ${computed.substring(0, 60)}...`);

    const manualMatch = computed === storedHashPart;
    console.log(`  Manual comparison: ${manualMatch ? "MATCH ✓" : "MISMATCH ✗"}`);

    // Utility function comparison
    const utilityMatch = verifyPassword(testPassword, storedHash);
    console.log(`  Utility function: ${utilityMatch ? "MATCH ✓" : "MISMATCH ✗"}`);

    if (!utilityMatch) {
      // Try to find if ANY common password works
      console.log(`\n[EXTRA] Testing common passwords...`);
      const commonPasswords = [
        "password123",
        "test123456",
        "manager123",
        "engineer123",
        "12345678",
        "password",
        "admin123",
        testPassword, // Also try the exact one provided
      ];

      for (const pwd of commonPasswords) {
        if (verifyPassword(pwd, storedHash)) {
          console.log(`  ✓ PASSWORD FOUND: ${pwd}`);
          return NextResponse.json(
            {
              phase: 3,
              status: "FAIL",
              reason: "wrong_password_provided",
              testPassword: testPassword,
              actualPassword: pwd,
              note: "The password you provided is wrong. The correct password is shown above.",
            },
            { status: 401 }
          );
        }
      }

      console.log(`  ✗ Could not find matching password in common test set`);

      return NextResponse.json(
        {
          phase: 3,
          status: "FAIL",
          reason: "password_mismatch",
          testPassword: testPassword,
          storedHashPreview: storedHash.substring(0, 80) + "...",
          manualVerifyResult: manualMatch,
          utilityVerifyResult: utilityMatch,
          testedPasswords: commonPasswords,
        },
        { status: 401 }
      );
    }

    // ===== PHASE 4: SESSION WOULD BE CREATED =====
    console.log("\n[PHASE 4] Session Creation");
    console.log("  Would create session token and set cookie");

    console.log("\n========== RESULT: LOGIN WOULD SUCCEED ✓ ==========\n");

    return NextResponse.json({
      status: "SUCCESS",
      email: user.email,
      role: user.role,
      userId: user.id,
      businessId: user.business_id,
      phases: {
        userFound: true,
        accountFound: true,
        passwordVerified: true,
        sessionWouldBeCreated: true,
      },
    });
  } catch (error: any) {
    console.error("[DEBUG] Error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
        errorType: error.constructor.name,
      },
      { status: 500 }
    );
  }
}
