import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get one working super_admin (harmeet - has valid sessions)
    const workingAdmin = await sql`
      SELECT u.id, u.email, u."emailVerified", u.name, u.role, u.is_active,
             u."createdAt", u."updatedAt",
             a.id as account_id, a."userId", a."accountId", a."providerId", 
             a.password, a."createdAt" as account_createdAt
      FROM "user" u
      LEFT JOIN account a ON u.id = a."userId"
      WHERE u.email = 'harmeet@harmeet.com'
      LIMIT 1
    `;

    // Get one failing manager (ravi - no sessions, cannot login)
    const failingManager = await sql`
      SELECT u.id, u.email, u."emailVerified", u.name, u.role, u.is_active,
             u."createdAt", u."updatedAt",
             a.id as account_id, a."userId", a."accountId", a."providerId", 
             a.password, a."createdAt" as account_createdAt
      FROM "user" u
      LEFT JOIN account a ON u.id = a."userId"
      WHERE u.email = 'ravi@ravi.com'
      LIMIT 1
    `;

    // Get session counts
    const sessions = await sql`
      SELECT u.email, u.role, COUNT(s.id) as total_sessions,
             COUNT(CASE WHEN s."expiresAt" > NOW() THEN 1 END) as valid_sessions
      FROM "user" u
      LEFT JOIN session s ON u.id = s."userId"
      WHERE u.email IN ('harmeet@harmeet.com', 'ravi@ravi.com')
      GROUP BY u.email, u.role
    `;

    // Analyze password hashes
    const analyzeHash = (hash: string) => {
      if (!hash) return null;
      const parts = hash.split(":");
      return {
        format: "salt:hash",
        saltHex: parts[0],
        saltBytes: parts[0].length / 2,
        hashHex: parts[1],
        hashBytes: parts[1].length / 2,
        totalLength: hash.length,
        parts: parts.length,
      };
    };

    const report = {
      timestamp: new Date().toISOString(),
      workingAccount: {
        email: "harmeet@harmeet.com",
        status: "✅ CAN LOGIN (has valid sessions)",
        user: workingAdmin[0]
          ? {
              id: workingAdmin[0].id,
              email: workingAdmin[0].email,
              emailVerified: workingAdmin[0].emailVerified,
              name: workingAdmin[0].name,
              role: workingAdmin[0].role,
              is_active: workingAdmin[0].is_active,
              createdAt: workingAdmin[0].createdAt,
              updatedAt: workingAdmin[0].updatedAt,
            }
          : null,
        account: workingAdmin[0]
          ? {
              id: workingAdmin[0].account_id,
              userId: workingAdmin[0].userId,
              accountId: workingAdmin[0].accountId,
              providerId: workingAdmin[0].providerId,
              password: workingAdmin[0].password ? "PRESENT" : "MISSING",
              createdAt: workingAdmin[0].account_createdAt,
              passwordAnalysis: analyzeHash(workingAdmin[0].password),
            }
          : null,
      },

      failingAccount: {
        email: "ravi@ravi.com",
        status: "❌ CANNOT LOGIN (no sessions)",
        user: failingManager[0]
          ? {
              id: failingManager[0].id,
              email: failingManager[0].email,
              emailVerified: failingManager[0].emailVerified,
              name: failingManager[0].name,
              role: failingManager[0].role,
              is_active: failingManager[0].is_active,
              createdAt: failingManager[0].createdAt,
              updatedAt: failingManager[0].updatedAt,
            }
          : null,
        account: failingManager[0]
          ? {
              id: failingManager[0].account_id,
              userId: failingManager[0].userId,
              accountId: failingManager[0].accountId,
              providerId: failingManager[0].providerId,
              password: failingManager[0].password ? "PRESENT" : "MISSING",
              createdAt: failingManager[0].account_createdAt,
              passwordAnalysis: analyzeHash(failingManager[0].password),
            }
          : null,
      },

      sessionStatus: sessions,

      fieldByFieldComparison: {
        userTable: {
          idFormat: {
            harmeet: typeof workingAdmin[0]?.id,
            ravi: typeof failingManager[0]?.id,
            match: workingAdmin[0]?.id && failingManager[0]?.id ? "YES (both UUID)" : "UNKNOWN",
          },
          emailVerified: {
            harmeet: workingAdmin[0]?.emailVerified,
            ravi: failingManager[0]?.emailVerified,
            match: workingAdmin[0]?.emailVerified === failingManager[0]?.emailVerified ? "MATCH" : "DIFFERENT",
          },
          role: {
            harmeet: workingAdmin[0]?.role,
            ravi: failingManager[0]?.role,
            match: "DIFFERENT (harmeet=super_admin, ravi=manager)",
          },
          is_active: {
            harmeet: workingAdmin[0]?.is_active,
            ravi: failingManager[0]?.is_active,
            match: workingAdmin[0]?.is_active === failingManager[0]?.is_active ? "MATCH" : "DIFFERENT",
          },
        },
        accountTable: {
          providerId: {
            harmeet: workingAdmin[0]?.providerId,
            ravi: failingManager[0]?.providerId,
            match: workingAdmin[0]?.providerId === failingManager[0]?.providerId ? "MATCH" : "DIFFERENT",
          },
          passwordPresent: {
            harmeet: !!workingAdmin[0]?.password,
            ravi: !!failingManager[0]?.password,
            match: workingAdmin[0]?.password && failingManager[0]?.password ? "BOTH PRESENT" : "MISSING",
          },
          passwordFormat: {
            harmeet: workingAdmin[0]?.password ? "salt:hash" : "N/A",
            ravi: failingManager[0]?.password ? "salt:hash" : "N/A",
            saltBytesMatch:
              workingAdmin[0]?.passwordAnalysis?.saltBytes === failingManager[0]?.passwordAnalysis?.saltBytes
                ? `MATCH (${workingAdmin[0]?.passwordAnalysis?.saltBytes} bytes)`
                : `DIFFERENT`,
            hashBytesMatch:
              workingAdmin[0]?.passwordAnalysis?.hashBytes === failingManager[0]?.passwordAnalysis?.hashBytes
                ? `MATCH (${workingAdmin[0]?.passwordAnalysis?.hashBytes} bytes)`
                : `DIFFERENT`,
          },
          userIdLinkage: {
            harmeet: {
              userId: workingAdmin[0]?.userId,
              accountId: workingAdmin[0]?.accountId,
              match: workingAdmin[0]?.userId === workingAdmin[0]?.accountId ? "MATCH" : "DIFFERENT",
            },
            ravi: {
              userId: failingManager[0]?.userId,
              accountId: failingManager[0]?.accountId,
              match: failingManager[0]?.userId === failingManager[0]?.accountId ? "MATCH" : "DIFFERENT",
            },
          },
        },
      },

      criticalDifferences: [] as string[],
    };

    // Find critical differences
    if (workingAdmin[0]?.role === "super_admin" && failingManager[0]?.role === "manager") {
      report.criticalDifferences.push("ROLE DIFFERENCE: harmeet=super_admin, ravi=manager");
      report.criticalDifferences.push(
        "⚠️  HYPOTHESIS: Better Auth might have role-based filtering that rejects manager accounts during credential login"
      );
    }

    if (workingAdmin[0]?.providerId !== failingManager[0]?.providerId) {
      report.criticalDifferences.push(
        `PROVIDER MISMATCH: harmeet=${workingAdmin[0]?.providerId}, ravi=${failingManager[0]?.providerId}`
      );
    }

    if (!failingManager[0]?.password) {
      report.criticalDifferences.push("CRITICAL: Manager ravi has NO password hash - login will always fail");
    } else if (!workingAdmin[0]?.password) {
      report.criticalDifferences.push("CRITICAL: Working admin harmeet has NO password hash - paradox!");
    } else {
      report.criticalDifferences.push("✅ Both have password hashes in salt:hash format");
      report.criticalDifferences.push(
        `✅ Salt/hash byte lengths match (${workingAdmin[0]?.passwordAnalysis?.saltBytes} byte salt, ${workingAdmin[0]?.passwordAnalysis?.hashBytes} byte hash)`
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
