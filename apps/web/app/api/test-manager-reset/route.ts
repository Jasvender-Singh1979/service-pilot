import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

/**
 * SINGLE-CALL MANAGER PASSWORD RESET ENDPOINT
 * Resets bani@bani.com password to Test@12345
 * 
 * Call: GET /api/test-manager-reset
 */
export async function GET() {
  try {
    const targetEmail = "bani@bani.com";
    const newPassword = "Test@12345";

    console.log(`[RESET] Starting password reset for ${targetEmail}`);

    // Step 1: Find the user
    console.log(`[RESET] Step 1: Finding user...`);
    const userResult = await sql`
      SELECT id, email, role FROM "user"
      WHERE LOWER(email) = LOWER(${targetEmail})
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = userResult[0].id;
    console.log(`[RESET] ✓ User found: ${userId}`);

    // Step 2: Find the account
    console.log(`[RESET] Step 2: Finding credential account...`);
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
    const oldHash = accountResult[0].password;
    console.log(`[RESET] ✓ Account found: ${accountId}`);
    console.log(`[RESET]   Old hash: ${oldHash.substring(0, 50)}...`);

    // Step 3: Generate new hash
    console.log(`[RESET] Step 3: Generating new password hash...`);
    const newHash = hashPassword(newPassword);
    const [salt, hashPart] = newHash.split(":");
    console.log(`[RESET] ✓ Hash generated`);
    console.log(`[RESET]   Salt length: ${salt.length} chars`);
    console.log(`[RESET]   Hash length: ${hashPart.length} chars`);

    // Step 4: Update database
    console.log(`[RESET] Step 4: Updating database...`);
    const updateResult = await sql`
      UPDATE account
      SET password = ${newHash}, "updatedAt" = NOW()
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
    const [storedSalt, storedHashPart] = storedHash.split(":");
    console.log(`[RESET] ✓ Database updated`);
    console.log(`[RESET]   Stored hash: ${storedHash.substring(0, 50)}...`);

    // Step 5: Verify with verifyPassword function
    console.log(`[RESET] Step 5: Verifying with verifyPassword()...`);
    const verifyResult = verifyPassword(newPassword, storedHash);
    console.log(`[RESET] ✓ verifyPassword() returned: ${verifyResult}`);

    return NextResponse.json({
      success: true,
      message: "Password reset completed successfully",
      details: {
        targetEmail,
        userId,
        accountId,
        newPassword,
        storedHash: {
          full: storedHash,
          salt: storedSalt,
          hashPart: storedHashPart,
        },
        verification: {
          plainPassword: newPassword,
          verifyPasswordReturns: verifyResult,
          verified: verifyResult === true,
        },
      },
    });
  } catch (error: any) {
    console.error("[RESET] Error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
