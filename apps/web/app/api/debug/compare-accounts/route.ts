import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    // Get working super_admin
    const superAdminUser = await sql`
      SELECT id, email, "emailVerified", name, role, "createdAt", "updatedAt" 
      FROM "user" 
      WHERE role = 'super_admin' 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;

    // Get failing manager
    const managerUser = await sql`
      SELECT id, email, "emailVerified", name, role, "createdAt", "updatedAt" 
      FROM "user" 
      WHERE role = 'manager' 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;

    // Get super_admin account
    const superAdminAccount = await sql`
      SELECT id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt" 
      FROM account 
      WHERE "userId" = ${superAdminUser[0].id}
    `;

    // Get manager account
    const managerAccount = await sql`
      SELECT id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt" 
      FROM account 
      WHERE "userId" = ${managerUser[0].id}
    `;

    // Analyze password hashes
    const saPassword = superAdminAccount[0].password || "";
    const mgPassword = managerAccount[0].password || "";

    const saParts = saPassword.split(":");
    const mgParts = mgPassword.split(":");

    const comparison = {
      superAdmin: {
        user: superAdminUser[0],
        account: superAdminAccount[0],
        passwordAnalysis: {
          full: saPassword,
          saltHex: saParts[0],
          saltBytes: saParts[0].length / 2,
          hashHex: saParts[1],
          hashBytes: saParts[1] ? saParts[1].length / 2 : 0,
        },
      },
      manager: {
        user: managerUser[0],
        account: managerAccount[0],
        passwordAnalysis: {
          full: mgPassword,
          saltHex: mgParts[0],
          saltBytes: mgParts[0].length / 2,
          hashHex: mgParts[1],
          hashBytes: mgParts[1] ? mgParts[1].length / 2 : 0,
        },
      },
      fieldComparison: {
        user: {
          idMatch: superAdminUser[0].id === managerUser[0].id ? "MATCH" : "DIFFERENT",
          emailVerifiedMatch:
            superAdminUser[0].emailVerified === managerUser[0].emailVerified
              ? "MATCH"
              : "DIFFERENT",
          roleMatch:
            superAdminUser[0].role === managerUser[0].role ? "MATCH" : "DIFFERENT",
          createdAtFormat:
            typeof superAdminUser[0].createdAt === typeof managerUser[0].createdAt
              ? "MATCH"
              : "DIFFERENT",
        },
        account: {
          userIdMatch: superAdminAccount[0].userId === managerAccount[0].userId ? "MATCH" : "DIFFERENT",
          accountIdMatch:
            superAdminAccount[0].accountId === managerAccount[0].accountId
              ? "MATCH"
              : "DIFFERENT",
          providerIdMatch:
            superAdminAccount[0].providerId === managerAccount[0].providerId
              ? "MATCH"
              : "DIFFERENT",
          passwordFormatMatch:
            saParts.length === 2 && mgParts.length === 2
              ? "BOTH_SALT:HASH"
              : `SA: ${saParts.length} parts, MG: ${mgParts.length} parts`,
          saltLengthMatch: saParts[0].length === mgParts[0].length ? "MATCH" : "DIFFERENT",
          hashLengthMatch:
            saParts[1]?.length === mgParts[1]?.length ? "MATCH" : "DIFFERENT",
        },
      },
      differences: {
        userTable: [] as string[],
        accountTable: [] as string[],
        critical: [] as string[],
      },
    };

    // Find differences
    if (superAdminUser[0].emailVerified !== managerUser[0].emailVerified) {
      comparison.differences.userTable.push(
        `emailVerified: super_admin=${superAdminUser[0].emailVerified}, manager=${managerUser[0].emailVerified}`
      );
    }

    if (superAdminAccount[0].providerId !== managerAccount[0].providerId) {
      comparison.differences.accountTable.push(
        `providerId: super_admin=${superAdminAccount[0].providerId}, manager=${managerAccount[0].providerId}`
      );
      comparison.differences.critical.push("providerId mismatch - CRITICAL");
    }

    if (superAdminAccount[0].userId !== superAdminAccount[0].accountId) {
      comparison.differences.critical.push("Super admin: userId !== accountId");
    }

    if (managerAccount[0].userId !== managerAccount[0].accountId) {
      comparison.differences.critical.push("Manager: userId !== accountId");
    }

    if (saParts[0].length !== mgParts[0].length) {
      comparison.differences.accountTable.push(
        `Salt length: super_admin=${saParts[0].length} chars, manager=${mgParts[0].length} chars`
      );
      comparison.differences.critical.push("Salt length mismatch - Better Auth may expect fixed length");
    }

    if (saParts[1]?.length !== mgParts[1]?.length) {
      comparison.differences.accountTable.push(
        `Hash length: super_admin=${saParts[1]?.length} chars, manager=${mgParts[1]?.length} chars`
      );
      comparison.differences.critical.push("Hash length mismatch - Better Auth may expect fixed length");
    }

    if (!managerAccount[0].password) {
      comparison.differences.critical.push("Manager has NO password - this is why login fails");
    }

    return NextResponse.json(comparison);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
