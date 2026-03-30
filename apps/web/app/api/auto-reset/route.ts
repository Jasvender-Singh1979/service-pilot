import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

/**
 * AUTO RESET - Gets called automatically via a request
 * This endpoint resets bani@bani.com password and logs everything
 */
let resetAttempted = false;

export async function GET() {
  if (resetAttempted) {
    return NextResponse.json({ message: "Reset already attempted in this session" });
  }

  resetAttempted = true;

  console.log("\n\n========== MANAGER PASSWORD RESET INITIATED ==========");

  const email = "bani@bani.com";
  const newPassword = "Test@12345";

  try {
    console.log(`[1/5] Finding user: ${email}`);
    const users = await sql`SELECT id, email, role FROM "user" WHERE LOWER(email) = LOWER(${email})`;

    if (users.length === 0) {
      console.log("[FAIL] User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = users[0].id;
    console.log(`[2/5] User found: ${userId}`);

    console.log(`[3/5] Finding credential account for user`);
    const accounts = await sql`SELECT id, password FROM account WHERE "userId" = ${userId} AND "providerId" = 'credential'`;

    if (accounts.length === 0) {
      console.log("[FAIL] Account not found");
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const accountId = accounts[0].id;
    const oldHash = accounts[0].password;
    console.log(`[4/5] Account found: ${accountId}`);
    console.log(`      Old hash: ${oldHash.substring(0, 60)}...`);

    console.log(`[5/5] Generating new password hash...`);
    const newHash = hashPassword(newPassword);
    const [salt, hashPart] = newHash.split(":");

    console.log(`      New hash: ${newHash.substring(0, 60)}...`);
    console.log(`      Salt: ${salt}`);
    console.log(`      Hash: ${hashPart.substring(0, 60)}...`);

    console.log(`[UPDATE] Writing new hash to database...`);
    const result = await sql`UPDATE account SET password = ${newHash}, "updatedAt" = NOW() WHERE id = ${accountId} RETURNING password`;

    const storedHash = result[0].password;
    console.log(`[VERIFY] Testing with verifyPassword function...`);

    const verifyResult = verifyPassword(newPassword, storedHash);
    console.log(`      verifyPassword("${newPassword}", hash) = ${verifyResult}`);

    console.log("\n========== RESET COMPLETE ==========");
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`Stored Hash: ${storedHash}`);
    console.log(`Verification Result: ${verifyResult}`);
    console.log("========== YOU CAN NOW LOGIN WITH THESE CREDENTIALS ==========\n");

    return NextResponse.json({
      success: true,
      message: "✓ Password reset successful and verified",
      email,
      userId,
      accountId,
      newPassword,
      storedHash,
      verifyPasswordResult: verifyResult,
    });
  } catch (error: any) {
    console.error("[ERROR] Password reset failed:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
