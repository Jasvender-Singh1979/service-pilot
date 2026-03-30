import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

/**
 * TRIGGER ENDPOINT - Resets bani@bani.com password and returns verification
 */
export async function GET() {
  const email = "bani@bani.com";
  const newPassword = "Test@12345";

  // Get user
  const users = await sql`SELECT id FROM "user" WHERE LOWER(email) = LOWER(${email})`;
  if (users.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = users[0].id;

  // Get account
  const accounts = await sql`SELECT id FROM account WHERE "userId" = ${userId} AND "providerId" = 'credential'`;
  if (accounts.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const accountId = accounts[0].id;

  // Create new hash
  const newHash = hashPassword(newPassword);

  // Update database
  const result = await sql`UPDATE account SET password = ${newHash}, "updatedAt" = NOW() WHERE id = ${accountId} RETURNING password`;
  const storedHash = result[0].password;

  // Verify
  const verified = verifyPassword(newPassword, storedHash);

  return NextResponse.json({
    success: verified,
    managerEmail: email,
    managerUserId: userId,
    accountId,
    newPassword,
    storedHash,
    passwordVerifyResult: verified,
  });
}
