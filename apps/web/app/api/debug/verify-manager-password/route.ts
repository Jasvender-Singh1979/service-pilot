import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";

/**
 * DEBUG ENDPOINT: Verify if a password works for a manager
 * POST /api/debug/verify-manager-password
 * 
 * Body: { email: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password required" },
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

    const storedHash = accountResult[0].password;

    // Test verification
    const verifyResult = verifyPassword(password, storedHash);

    return NextResponse.json({
      email,
      userId,
      plainPassword: password,
      storedHash,
      verifyResult,
      verified: verifyResult,
    });
  } catch (error: any) {
    console.error("Verify password error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
