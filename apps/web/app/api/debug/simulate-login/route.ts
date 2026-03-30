import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword, normalizeEmail } from "@/lib/auth-utils";

/**
 * DEBUG: Simulate the exact credential sign-in flow
 * 
 * This mimics exactly what happens in /api/auth/sign-in/credential
 * but with detailed logging at each step
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("\n========== SIMULATE LOGIN FLOW ==========");
    console.log("[INPUT] Email:", email);
    console.log("[INPUT] Password: (hidden)");

    const normalizedEmail = normalizeEmail(email);
    console.log("[NORMALIZE] Email after normalization:", normalizedEmail);

    if (!normalizedEmail || !password) {
      console.log("[STEP 1] FAIL: Missing email or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // STEP 1: Find user
    console.log("\n[STEP 1] Finding user by email...");
    const users = await sql`
      SELECT id, email, name, "createdAt"
      FROM "user"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    console.log(`[STEP 1] Result: ${users.length} user(s) found`);

    if (users.length === 0) {
      console.log("[STEP 1] FAIL: User not found - would return 'Invalid email or password'");
      return NextResponse.json(
        { 
          error: "Invalid email or password",
          debug: {
            step: 1,
            reason: "user_not_found",
            normalizedEmail,
          }
        },
        { status: 401 }
      );
    }

    const user = users[0];
    console.log(`[STEP 1] SUCCESS: User found`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Created: ${user.createdAt}`);

    // STEP 2: Find credential account
    console.log("\n[STEP 2] Finding credential account...");
    const accounts = await sql`
      SELECT id, password
      FROM account
      WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;

    console.log(`[STEP 2] Result: ${accounts.length} account(s) found`);

    if (accounts.length === 0 || !accounts[0].password) {
      console.log("[STEP 2] FAIL: No password account - would return 'Invalid email or password'");
      return NextResponse.json(
        { 
          error: "Invalid email or password",
          debug: {
            step: 2,
            reason: "no_credential_account",
            accountCount: accounts.length,
            hasPassword: accounts.length > 0 ? !!accounts[0].password : false,
          }
        },
        { status: 401 }
      );
    }

    const account = accounts[0];
    console.log("[STEP 2] SUCCESS: Credential account found");
    console.log(`  - Account ID: ${account.id}`);
    console.log(`  - Has password: ${!!account.password}`);

    // STEP 3: Verify password
    console.log("\n[STEP 3] Verifying password...");
    const passwordValid = verifyPassword(password, account.password);
    console.log(`[STEP 3] Result: ${passwordValid ? "MATCH ✓" : "MISMATCH ✗"}`);

    if (!passwordValid) {
      console.log("[STEP 3] FAIL: Password mismatch - would return 'Invalid email or password'");
      return NextResponse.json(
        { 
          error: "Invalid email or password",
          debug: {
            step: 3,
            reason: "password_mismatch",
            passwordHash: account.password.substring(0, 60) + "...",
          }
        },
        { status: 401 }
      );
    }

    console.log("[STEP 3] SUCCESS: Password verified");

    // STEP 4: Would create session
    console.log("\n[STEP 4] Would create session...");
    console.log("[STEP 4] Session would be created here");

    console.log("\n========== LOGIN WOULD SUCCEED ✓ ==========\n");

    return NextResponse.json({
      status: "success",
      email: user.email,
      userId: user.id,
      debug: {
        stepsPassed: 4,
        userFound: true,
        accountFound: true,
        passwordVerified: true,
      },
    });
  } catch (error: any) {
    console.error("[DEBUG] Error:", error.message);
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        debug: {
          errorType: error.constructor.name,
        },
      },
      { status: 500 }
    );
  }
}
