import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { verifyPassword } from "@/lib/auth-utils";

/**
 * FINAL DIAGNOSIS: Complete email and password check
 * This provides 100% of the required information
 */
export async function GET() {
  try {
    const REPORT = {
      timestamp: new Date().toISOString(),
      STEP_1_RAW_EMAIL_CHECK: {},
      STEP_2_RUNTIME_LOOKUP: {},
      STEP_3_DUPLICATES: {},
      STEP_4_ACCOUNT_MATCH: {},
      STEP_5_FINAL_ANSWER: {},
    };

    // ============ STEP 1: RAW EMAIL CHECK ============
    console.log("\n=== STEP 1: RAW EMAIL CHECK ===");

    const managerUser = await sql`
      SELECT id, email, name, role, business_id, is_active
      FROM "user"
      WHERE email ILIKE 'ravi@ravi.com'
    `;

    if (managerUser.length > 0) {
      const user = managerUser[0];
      const email = user.email;

      REPORT.STEP_1_RAW_EMAIL_CHECK = {
        found: true,
        stored_email_raw: email,
        stored_email_length: email.length,
        stored_email_hex: Buffer.from(email).toString("hex"),
        has_leading_space: email.startsWith(" "),
        has_trailing_space: email.endsWith(" "),
        has_newline: email.includes("\n"),
        has_tab: email.includes("\t"),
        character_analysis: email.split("").map((c, i) => ({
          index: i,
          char: c,
          code: c.charCodeAt(0),
        })),
      };

      console.log("Stored email:", JSON.stringify(email));
      console.log("Email length:", email.length);
      console.log("Email hex:", Buffer.from(email).toString("hex"));
      console.log("Leading space:", email.startsWith(" "));
      console.log("Trailing space:", email.endsWith(" "));
    }

    // ============ STEP 2: RUNTIME EMAIL LOOKUP ============
    console.log("\n=== STEP 2: RUNTIME EMAIL LOOKUP ===");

    const inputEmail = "ravi@ravi.com";
    console.log("Input email:", inputEmail);
    console.log("Input length:", inputEmail.length);

    const queryResult = await sql`
      SELECT id, email, role, name
      FROM "user"
      WHERE LOWER(email) = LOWER(${inputEmail.toLowerCase().trim()})
    `;

    REPORT.STEP_2_RUNTIME_LOOKUP = {
      input_email: inputEmail,
      query_used: "SELECT ... FROM user WHERE LOWER(email) = LOWER(?)",
      result_count: queryResult.length,
      found: queryResult.length > 0,
    };

    if (queryResult.length > 0) {
      REPORT.STEP_2_RUNTIME_LOOKUP.found_user = {
        id: queryResult[0].id,
        email: queryResult[0].email,
        role: queryResult[0].role,
        name: queryResult[0].name,
      };

      console.log("✓ User found:", queryResult[0].email);
      console.log("✓ User ID:", queryResult[0].id);
      console.log("✓ User role:", queryResult[0].role);
    } else {
      console.log("✗ User NOT found");
    }

    // ============ STEP 3: CHECK DUPLICATES ============
    console.log("\n=== STEP 3: CHECK DUPLICATES ===");

    const duplicates = await sql`
      SELECT email, COUNT(*) as count
      FROM "user"
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    REPORT.STEP_3_DUPLICATES = {
      duplicate_emails_exist: duplicates.length > 0,
      duplicate_count: duplicates.length,
      duplicates: duplicates.length > 0 ? duplicates : null,
    };

    if (duplicates.length === 0) {
      console.log("✓ No duplicate emails found");
    } else {
      console.log("✗ Duplicate emails found:");
      duplicates.forEach((dup: any) => {
        console.log(`  ${dup.email} appears ${dup.count} times`);
      });
    }

    // ============ STEP 4: ACCOUNT MATCH ============
    console.log("\n=== STEP 4: ACCOUNT MATCH ===");

    if (queryResult.length > 0) {
      const userId = queryResult[0].id;

      const accountResult = await sql`
        SELECT id, "userId", "providerId", password
        FROM account
        WHERE "userId" = ${userId} AND "providerId" = 'credential'
      `;

      REPORT.STEP_4_ACCOUNT_MATCH = {
        user_id: userId,
        account_found: accountResult.length > 0,
        account_count: accountResult.length,
      };

      if (accountResult.length > 0) {
        const account = accountResult[0];
        const storedHash = account.password;

        REPORT.STEP_4_ACCOUNT_MATCH.account = {
          id: account.id,
          provider_id: account.providerId,
          has_password: !!storedHash,
          password_hash_length: storedHash?.length || 0,
          password_hash_format_valid: storedHash?.includes(":") || false,
          password_hash_first_60: storedHash?.substring(0, 60),
        };

        console.log("✓ Credential account found");
        console.log("✓ Account ID:", account.id);
        console.log("✓ Provider:", account.providerId);
        console.log("✓ Has password hash:", !!storedHash);
        console.log("✓ Hash length:", storedHash?.length);
        console.log("✓ Hash format valid (has ':'):", storedHash?.includes(":"));

        // Test password verification
        if (storedHash && storedHash.includes(":")) {
          const testPassword = "Test@12345";
          const isValid = verifyPassword(testPassword, storedHash);

          REPORT.STEP_4_ACCOUNT_MATCH.password_test = {
            test_password: testPassword,
            verification_result: isValid,
            verification_status: isValid ? "PASS ✓" : "FAIL ✗",
          };

          console.log(`✓ Password test with "${testPassword}": ${isValid ? "PASS" : "FAIL"}`);
        }
      } else {
        console.log("✗ No credential account found");
      }
    }

    // ============ STEP 5: FINAL ANSWER ============
    console.log("\n=== STEP 5: FINAL ANSWER ===");

    const finalData = {
      stored_manager_email: managerUser.length > 0 ? managerUser[0].email : "NOT FOUND",
      stored_manager_email_length: managerUser.length > 0 ? managerUser[0].email.length : null,
      login_input_email: "ravi@ravi.com",
      db_lookup_matches: queryResult.length > 0,
      duplicate_emails_exist: duplicates.length > 0,
      account_found: REPORT.STEP_4_ACCOUNT_MATCH.account_found,
      password_verification_passes: REPORT.STEP_4_ACCOUNT_MATCH.password_test?.verification_result || false,
    };

    REPORT.STEP_5_FINAL_ANSWER = finalData;

    console.log("\n" + "=".repeat(60));
    console.log("FINAL REPORT:");
    console.log("1. Stored email:", finalData.stored_manager_email);
    console.log("2. Stored email length:", finalData.stored_manager_email_length);
    console.log("3. Login input email:", finalData.login_input_email);
    console.log("4. DB lookup matches:", finalData.db_lookup_matches ? "YES ✓" : "NO ✗");
    console.log("5. Duplicate emails:", finalData.duplicate_emails_exist ? "YES (PROBLEM)" : "NO ✓");
    console.log("6. Account found:", finalData.account_found ? "YES ✓" : "NO ✗");
    console.log("7. Password verification:", finalData.password_verification_passes ? "PASS ✓" : "FAIL ✗");
    console.log("=".repeat(60) + "\n");

    return NextResponse.json(REPORT);
  } catch (error: any) {
    console.error("[Final Email Check] Error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
