import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

/**
 * DEBUG ENDPOINT: Reset manager password to a known value
 * GET /api/debug/reset-manager-password?email=bani@bani.com&password=Test@12345
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const newPassword = searchParams.get("password");

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "email and password query params required" },
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await sql`
      SELECT id, email, role FROM "user"
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = userResult[0].id;

    // Find credential account
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

    // Hash the new password using the app's method
    const newHash = hashPassword(newPassword);

    // Update the password
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

    // Test verification
    const verifyResult = verifyPassword(newPassword, storedHash);

    return NextResponse.json({
      success: true,
      userId,
      accountId,
      email,
      newPassword,
      storedHash,
      verifyPasswordTest: verifyResult,
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
