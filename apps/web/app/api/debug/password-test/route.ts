import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";
import sql from "@/app/api/utils/sql";
import * as crypto from "crypto";

/**
 * STEP 2 & 3: Test password verification and find the working password
 * 
 * Usage: GET /api/debug/password-test?email=ravi@ravi.com&password=Test@12345
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || "ravi@ravi.com";
    const testPassword = searchParams.get("password") || "Test@12345";

    console.log("\n========== PASSWORD VERIFICATION TEST ==========");
    console.log(`[TEST] Email: ${email}`);
    console.log(`[TEST] Password to verify: ${testPassword}`);

    // Find the user
    const users = await sql`
      SELECT id, email
      FROM "user"
      WHERE LOWER(email) = LOWER(${email.toLowerCase().trim()})
    `;

    if (users.length === 0) {
      return NextResponse.json({
        email: email,
        found: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Get the stored password hash
    const accounts = await sql`
      SELECT password
      FROM account
      WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;

    if (accounts.length === 0 || !accounts[0].password) {
      return NextResponse.json({
        email: email,
        found: true,
        account_found: false,
        message: "No credential account",
      });
    }

    const storedHash = accounts[0].password;

    // Parse the hash
    const [salt, hashPart] = storedHash.split(":");

    console.log(`\n[PARSING] Stored hash: ${storedHash.substring(0, 80)}...`);
    console.log(`[PARSING] Salt: ${salt}`);
    console.log(`[PARSING] Hash part length: ${hashPart?.length}`);

    // Manual verification
    console.log(`\n[VERIFYING] Computing PBKDF2 for password: ${testPassword}`);
    const computed = crypto
      .pbkdf2Sync(testPassword, salt, 100000, 64, "sha256")
      .toString("hex");

    const manualMatch = computed === hashPart;
    console.log(`[VERIFYING] Computed: ${computed.substring(0, 80)}...`);
    console.log(`[VERIFYING] Stored:   ${hashPart?.substring(0, 80)}...`);
    console.log(`[VERIFYING] Manual match: ${manualMatch ? "✓ YES" : "✗ NO"}`);

    // Use utility function
    console.log(`\n[UTILITY] Using verifyPassword utility...`);
    const utilityResult = verifyPassword(testPassword, storedHash);
    console.log(`[UTILITY] Result: ${utilityResult ? "✓ YES" : "✗ NO"}`);

    const result: any = {
      email: email,
      found: true,
      account_found: true,
      test_password: testPassword,
      manual_verification: manualMatch,
      utility_verification: utilityResult,
      hash_analysis: {
        stored_hash_length: storedHash.length,
        salt: salt,
        hash_part_length: hashPart?.length,
        hash_part_first_60: hashPart?.substring(0, 60),
      },
    };

    // Try common passwords if the test password fails
    if (!manualMatch) {
      console.log(`\n[BRUTEFORCE] Testing common passwords...`);
      const commonPasswords = [
        "admin@123",
        "password123",
        "123456",
        "manager@123",
        "ravi@123",
        "admin123",
        "test123",
        "123456789",
        "password@123",
        "admin@12345",
      ];

      const matching = [];

      for (const pwd of commonPasswords) {
        const testComputed = crypto
          .pbkdf2Sync(pwd, salt, 100000, 64, "sha256")
          .toString("hex");

        if (testComputed === hashPart) {
          console.log(`[BRUTEFORCE] ✓ FOUND MATCH: ${pwd}`);
          matching.push(pwd);
        }
      }

      result.matching_passwords = matching.length > 0 ? matching : null;

      if (matching.length === 0) {
        console.log(`[BRUTEFORCE] No common password matched`);
        result.message = `Password "${testPassword}" does NOT match the stored hash. No common passwords matched either.`;
      }
    } else {
      result.message = `✓ Password "${testPassword}" matches the stored hash!`;
    }

    console.log("\n========== PASSWORD TEST COMPLETE ==========\n");

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Password Test] Error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
