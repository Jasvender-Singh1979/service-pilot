import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";
import * as crypto from "crypto";

/**
 * CONTROLLED PASSWORD RESET ENDPOINT
 * GET /api/debug/manager-password-reset?action=reset&email=bani@bani.com&newPassword=Test@12345
 * GET /api/debug/manager-password-reset?action=verify&email=bani@bani.com&password=Test@12345
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "reset";
    const email = searchParams.get("email");
    const password = searchParams.get("password");
    const newPassword = searchParams.get("newPassword");

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // Get user
    const userResult = await sql`
      SELECT id, email, role FROM "user"
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult[0].id;

    // Get account
    const accountResult = await sql`
      SELECT id, password FROM account
      WHERE "userId" = ${userId} AND "providerId" = 'credential'
    `;

    if (accountResult.length === 0) {
      return NextResponse.json(
        { error: "Credential account not found" },
        { status: 404 }
      );
    }

    const accountId = accountResult[0].id;

    if (action === "reset" && newPassword) {
      // RESET ACTION
      // Generate new hash
      const generatedHash = hashPassword(newPassword);

      // Extract salt and hash from generated
      const [salt, hashPart] = generatedHash.split(":");

      // Update database
      const updateResult = await sql`
        UPDATE account
        SET password = ${generatedHash}, "updatedAt" = NOW()
        WHERE id = ${accountId}
        RETURNING id, "userId", password
      `;

      if (updateResult.length === 0) {
        return NextResponse.json(
          { error: "Failed to update password" },
          { status: 500 }
        );
      }

      const storedHash = updateResult[0].password;

      // Verify the stored hash works
      const verifyTest = verifyPassword(newPassword, storedHash);

      // Also manually compute to be 100% sure
      const [storedSalt, storedHashPart] = storedHash.split(":");
      const manualVerify = crypto
        .pbkdf2Sync(newPassword, storedSalt, 100000, 64, "sha256")
        .toString("hex");
      const manualMatches = manualVerify === storedHashPart;

      return NextResponse.json({
        action: "reset",
        success: true,
        userId,
        accountId,
        email,
        newPassword,
        storedHash,
        salt: storedSalt,
        hashPart: storedHashPart,
        verifyPasswordReturns: verifyTest,
        manualComputationMatches: manualMatches,
        allChecksPassed: verifyTest && manualMatches,
        message:
          verifyTest && manualMatches
            ? "✓ Password reset successful - VERIFIED"
            : "✗ Verification failed",
      });
    } else if (action === "verify" && password) {
      // VERIFY ACTION
      const storedHash = accountResult[0].password;
      const [salt, hashPart] = storedHash.split(":");

      // Test with verifyPassword function
      const verifyResult = verifyPassword(password, storedHash);

      // Manual computation for absolute certainty
      const manualComputed = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha256")
        .toString("hex");
      const manualMatches = manualComputed === hashPart;

      return NextResponse.json({
        action: "verify",
        email,
        password,
        storedHash,
        salt,
        verifyPasswordReturns: verifyResult,
        manualComputationMatches: manualMatches,
        passwordMatches: verifyResult && manualMatches,
        message: verifyResult && manualMatches
          ? "✓ Password matches - VERIFIED"
          : "✗ Password does not match",
      });
    } else {
      return NextResponse.json(
        {
          error: "Invalid action or missing params",
          usage:
            "?action=reset&email=X&newPassword=Y or ?action=verify&email=X&password=Y",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[manager-password-reset]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
