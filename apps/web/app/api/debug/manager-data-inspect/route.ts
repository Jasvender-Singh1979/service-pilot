import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

/**
 * DEBUG: Inspect exact stored manager data
 */
export async function GET(request: Request) {
  try {
    console.log("\n========== MANAGER DATA INSPECTION ==========\n");

    // Get all managers with their accounts
    const managers = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.business_id,
        u."createdAt",
        a.id as account_id,
        a."providerId",
        a.password,
        a."createdAt" as account_created
      FROM "user" u
      LEFT JOIN account a ON u.id = a."userId" AND a."providerId" = 'credential'
      WHERE u.role = 'manager'
      ORDER BY u."createdAt" DESC
    `;

    console.log(`Found ${managers.length} managers:\n`);

    const details = managers.map((m) => {
      const info = {
        email: m.email,
        userId: m.id,
        name: m.name,
        userCreated: m.createdAt,
        hasCredentialAccount: !!m.account_id,
        accountId: m.account_id || null,
        accountCreated: m.account_created || null,
        passwordHash: m.password ? m.password.substring(0, 100) + "..." : null,
        passwordHashFull: m.password || null,
        hashIsValid: m.password ? m.password.includes(":") : false,
      };

      console.log(`\nManager: ${m.email}`);
      console.log(`  User ID: ${m.id}`);
      console.log(`  User Created: ${m.createdAt}`);
      console.log(`  Has Credential Account: ${!!m.account_id}`);
      console.log(
        `  Password Hash: ${m.password ? m.password.substring(0, 80) + "..." : "NONE"}`
      );
      console.log(`  Hash Format Valid: ${m.password ? m.password.includes(":") : "N/A"}`);

      return info;
    });

    console.log("\n========== END INSPECTION ==========\n");

    return NextResponse.json({
      summary: {
        totalManagers: managers.length,
        withAccounts: managers.filter((m) => m.account_id).length,
        withValidHashFormat: managers.filter((m) => m.password?.includes(":")).length,
      },
      managers: details,
      rawData: managers, // Include full data for inspection
    });
  } catch (error: any) {
    console.error("[DEBUG] Error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
