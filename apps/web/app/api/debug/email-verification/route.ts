import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

/**
 * STEP 1 DIAGNOSTIC: Exact email matching and character analysis
 * 
 * Usage: GET /api/debug/email-verification?email=ravi@ravi.com
 * 
 * Returns:
 * - Raw stored email (with hidden characters visible)
 * - Email length
 * - Character-by-character analysis
 * - Whether duplicates exist
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inputEmail = searchParams.get("email") || "ravi@ravi.com";

    console.log("\n========== EMAIL VERIFICATION DIAGNOSTIC ==========");
    
    // STEP 1: Get stored email for manager
    console.log(`\n[STEP 1] Querying database for email: ${inputEmail}`);
    
    const storedUsers = await sql`
      SELECT id, email, role, business_id, name
      FROM "user"
      WHERE LOWER(email) = LOWER(${inputEmail.toLowerCase().trim()})
    `;

    console.log(`[STEP 1] Found ${storedUsers.length} user(s)`);

    let result: any = {
      input_email: inputEmail,
      input_email_length: inputEmail.length,
      input_email_hex: Buffer.from(inputEmail).toString("hex"),
      input_has_leading_space: inputEmail.startsWith(" "),
      input_has_trailing_space: inputEmail.endsWith(" "),
      query_found_count: storedUsers.length,
      stored_users: [],
      duplicates: null,
      step_1_complete: true,
    };

    if (storedUsers.length > 0) {
      for (const user of storedUsers) {
        const storedEmail = user.email;
        
        console.log(`\n[STEP 1] User found:`);
        console.log(`  Email (raw): ${JSON.stringify(storedEmail)}`);
        console.log(`  Email length: ${storedEmail.length}`);
        console.log(`  Email (hex): ${Buffer.from(storedEmail).toString("hex")}`);
        console.log(`  Has leading space: ${storedEmail.startsWith(" ")}`);
        console.log(`  Has trailing space: ${storedEmail.endsWith(" ")}`);
        console.log(`  User ID: ${user.id}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Business ID: ${user.business_id}`);

        result.stored_users.push({
          id: user.id,
          stored_email: storedEmail,
          stored_email_length: storedEmail.length,
          stored_email_hex: Buffer.from(storedEmail).toString("hex"),
          has_leading_space: storedEmail.startsWith(" "),
          has_trailing_space: storedEmail.endsWith(" "),
          role: user.role,
          business_id: user.business_id,
          email_match: inputEmail === storedEmail,
          email_match_lowercased: inputEmail.toLowerCase() === storedEmail.toLowerCase(),
          character_by_character: {
            input: inputEmail.split("").map((c, i) => ({
              index: i,
              char: c,
              code: c.charCodeAt(0),
              hex: c.charCodeAt(0).toString(16),
            })),
            stored: storedEmail.split("").map((c, i) => ({
              index: i,
              char: c,
              code: c.charCodeAt(0),
              hex: c.charCodeAt(0).toString(16),
            })),
          },
        });
      }
    }

    // STEP 2: Check for duplicates
    console.log(`\n[STEP 2] Checking for duplicate emails...`);
    const duplicates = await sql`
      SELECT email, COUNT(*) as count
      FROM "user"
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    console.log(`[STEP 2] Found ${duplicates.length} duplicate email groups`);
    result.duplicates = duplicates.length > 0 ? duplicates : null;

    if (duplicates.length > 0) {
      duplicates.forEach((dup: any) => {
        console.log(`  Duplicate: "${dup.email}" appears ${dup.count} times`);
      });
    }

    // STEP 3: For each found user, check account lookup
    if (storedUsers.length > 0) {
      console.log(`\n[STEP 3] Checking account records...`);
      result.accounts = [];

      for (const user of storedUsers) {
        const accounts = await sql`
          SELECT id, "userId", "providerId", password
          FROM account
          WHERE "userId" = ${user.id}
        `;

        console.log(`  User ${user.id}: Found ${accounts.length} account(s)`);

        result.accounts.push({
          user_id: user.id,
          accounts_found: accounts.length,
          accounts: accounts.map((acc: any) => ({
            id: acc.id,
            provider_id: acc.providerId,
            has_password: !!acc.password,
            password_hash_length: acc.password?.length || 0,
          })),
        });
      }
    }

    console.log("\n========== EMAIL VERIFICATION COMPLETE ==========\n");

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[Email Verification] Error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
