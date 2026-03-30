import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword, normalizeEmail } from "@/lib/auth-utils";
import * as crypto from "crypto";

/**
 * DEBUG: Test manager login flow
 * 
 * This endpoint tests the exact credential sign-in logic step-by-step
 * for a specific manager email and password.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    console.log("\n========== DEBUG MANAGER LOGIN TEST ==========");
    console.log("[DEBUG] Testing email:", normalizedEmail);
    console.log("[DEBUG] Plain password:", password);

    // STEP 1: Find user
    console.log("\n[STEP 1] Finding user by email...");
    const users = await sql`
      SELECT id, email, name, role, "createdAt"
      FROM "user"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    console.log(`[STEP 1] User found: ${users.length > 0 ? "YES" : "NO"}`);
    if (users.length > 0) {
      const user = users[0];
      console.log(`  - User ID: ${user.id}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Role: ${user.role}`);
      console.log(`  - Created: ${user.createdAt}`);
    } else {
      return NextResponse.json({
        status: "user_not_found",
        email: normalizedEmail,
        message: "No user found with this email",
      });
    }

    const user = users[0];
    const userId = user.id;

    // STEP 2: Find account with credential provider
    console.log("\n[STEP 2] Finding credential account...");
    const accounts = await sql`
      SELECT id, password, "providerId", "userId"
      FROM account
      WHERE "userId" = ${userId} AND "providerId" = 'credential'
    `;

    console.log(`[STEP 2] Credential account found: ${accounts.length > 0 ? "YES" : "NO"}`);
    if (accounts.length === 0) {
      return NextResponse.json({
        status: "no_credential_account",
        userId: userId,
        message: "No credential account found for this user",
      });
    }

    const account = accounts[0];
    console.log(`  - Account ID: ${account.id}`);
    console.log(`  - Has password: ${!!account.password}`);
    console.log(`  - Password format: ${account.password?.substring(0, 50)}...`);

    if (!account.password) {
      return NextResponse.json({
        status: "no_password",
        userId: userId,
        message: "Account has no password stored",
      });
    }

    // STEP 3: Verify password
    console.log("\n[STEP 3] Verifying password...");
    const storedHash = account.password;

    // Manual verification for debugging
    const hashValid = !storedHash || !storedHash.includes(":");
    console.log(`  - Hash format valid (has ':'): ${!hashValid}`);

    if (hashValid) {
      return NextResponse.json({
        status: "invalid_hash_format",
        userId: userId,
        storedHash: storedHash?.substring(0, 50) + "...",
        message: "Stored hash is malformed (missing ':')",
      });
    }

    const [salt, storedHashPart] = storedHash.split(":");
    console.log(`  - Salt: ${salt}`);
    console.log(`  - Stored hash part: ${storedHashPart?.substring(0, 50)}...`);

    // Compute the hash the same way
    console.log(`  - Computing PBKDF2 with salt: ${salt}`);
    const computed = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha256")
      .toString("hex");
    console.log(`  - Computed hash: ${computed.substring(0, 50)}...`);

    // Compare
    const match = computed === storedHashPart;
    console.log(`  - Match: ${match ? "YES ✓" : "NO ✗"}`);

    // Also use the utility function
    console.log("\n[STEP 3B] Using verifyPassword utility...");
    const utilResult = verifyPassword(password, storedHash);
    console.log(`  - verifyPassword result: ${utilResult ? "PASS ✓" : "FAIL ✗"}`);

    if (!match || !utilResult) {
      return NextResponse.json({
        status: "password_mismatch",
        userId: userId,
        manualVerifyResult: match,
        utilityVerifyResult: utilResult,
        storedHash: storedHash.substring(0, 50) + "...",
        message: "Password verification failed",
      });
    }

    // STEP 4: Session creation
    console.log("\n[STEP 4] Would create session...");
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    console.log(`  - Session token: ${sessionToken.substring(0, 50)}...`);
    console.log(`  - Expires at: ${expiresAt}`);

    console.log("\n========== RESULT: LOGIN WOULD SUCCEED ✓ ==========\n");

    return NextResponse.json({
      status: "success",
      email: user.email,
      userId: user.id,
      role: user.role,
      steps: {
        userFound: true,
        accountFound: true,
        passwordVerified: true,
      },
      message: "Login verification passed - this user CAN log in",
    });
  } catch (error: any) {
    console.error("[DEBUG] Error:", error.message);
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
