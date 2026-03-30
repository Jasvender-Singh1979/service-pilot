/**
 * This module runs when the app loads and resets the manager password
 * ONLY USED FOR TESTING - DELETE THIS FILE AFTER USE
 */

import sql from "@/app/api/utils/sql";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

let hasRun = false;

export async function initPasswordReset() {
  if (hasRun) return;
  hasRun = true;

  try {
    const email = "bani@bani.com";
    const newPassword = "Test@12345";

    console.log("[INIT RESET] Starting...");

    // Get user
    const users = await sql`SELECT id FROM "user" WHERE LOWER(email) = LOWER(${email})`;
    if (users.length === 0) {
      console.log("[INIT RESET] User not found");
      return;
    }

    const userId = users[0].id;
    console.log(`[INIT RESET] User found: ${userId}`);

    // Get account
    const accounts = await sql`SELECT id FROM account WHERE "userId" = ${userId}`;
    if (accounts.length === 0) {
      console.log("[INIT RESET] Account not found");
      return;
    }

    const accountId = accounts[0].id;
    console.log(`[INIT RESET] Account found: ${accountId}`);

    // Hash password
    const newHash = hashPassword(newPassword);
    console.log(`[INIT RESET] Generated hash: ${newHash.substring(0, 50)}...`);

    // Update database
    const result = await sql`UPDATE account SET password = ${newHash}, "updatedAt" = NOW() WHERE id = ${accountId} RETURNING password`;
    const storedHash = result[0].password;
    console.log(`[INIT RESET] Updated. Stored hash: ${storedHash.substring(0, 50)}...`);

    // Verify
    const verified = verifyPassword(newPassword, storedHash);
    console.log(`[INIT RESET] Verification result: ${verified}`);

    if (verified) {
      console.log("[INIT RESET] ✓ SUCCESS - Password reset complete");
      console.log(`[INIT RESET] Email: ${email}`);
      console.log(`[INIT RESET] New password: ${newPassword}`);
      console.log(`[INIT RESET] Hash: ${storedHash}`);
    } else {
      console.log("[INIT RESET] ✗ FAILED - Verification failed");
    }
  } catch (error) {
    console.error("[INIT RESET] Error:", error);
  }
}

// Trigger on module load
initPasswordReset().catch(console.error);
