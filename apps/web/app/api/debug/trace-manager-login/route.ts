import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Verify password using same logic as verifyPassword
function verifyPassword(password: string, hash: string): boolean {
  try {
    const [saltHex, hashHex] = hash.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");

    const derivedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256");

    return crypto.timingSafeEqual(derivedHash, storedHash);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const trace = {
      email,
      passwordProvided: !!password,
      passwordLength: password?.length || 0,
      steps: [] as any[],
      result: {} as any,
    };

    // Step 1: Find user by email
    trace.steps.push({ step: 1, action: "lookup user by email", email });

    const users = await sql`
      SELECT id, email, "emailVerified", role, business_id, "createdAt"
      FROM "user"
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      trace.steps.push({
        step: 1,
        result: "FAILED",
        reason: "User not found in database",
      });
      trace.result = {
        status: "FAILED_AT_USER_LOOKUP",
        message: "User not found",
      };
      return NextResponse.json(trace);
    }

    const user = users[0];
    trace.steps.push({
      step: 1,
      result: "SUCCESS",
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });

    // Step 2: Find account for user
    trace.steps.push({ step: 2, action: "lookup account by userId", userId: user.id });

    const accounts = await sql`
      SELECT id, "userId", "accountId", "providerId", password, "createdAt"
      FROM account
      WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;

    if (accounts.length === 0) {
      trace.steps.push({
        step: 2,
        result: "FAILED",
        reason: "No credential account found for this user",
      });
      trace.result = {
        status: "FAILED_AT_ACCOUNT_LOOKUP",
        message: "No credential account found",
      };
      return NextResponse.json(trace);
    }

    const account = accounts[0];
    trace.steps.push({
      step: 2,
      result: "SUCCESS",
      accountId: account.id,
      providerId: account.providerId,
      passwordPresent: !!account.password,
      passwordLength: account.password?.length || 0,
    });

    // Step 3: Verify password
    trace.steps.push({
      step: 3,
      action: "verify password",
      providedPassword: password ? `${password.length} chars` : "MISSING",
      storedHashFormat: account.password ? account.password.split(":").length + " parts" : "MISSING",
    });

    if (!password) {
      trace.steps.push({
        step: 3,
        result: "FAILED",
        reason: "No password provided",
      });
      trace.result = {
        status: "FAILED_AT_PASSWORD_VERIFICATION",
        message: "No password provided",
      };
      return NextResponse.json(trace);
    }

    if (!account.password) {
      trace.steps.push({
        step: 3,
        result: "FAILED",
        reason: "No password hash stored in account",
      });
      trace.result = {
        status: "FAILED_AT_PASSWORD_VERIFICATION",
        message: "No password hash in database",
      };
      return NextResponse.json(trace);
    }

    // Analyze the hash
    const hashParts = account.password.split(":");
    trace.steps.push({
      step: 3,
      hashAnalysis: {
        parts: hashParts.length,
        saltHexLength: hashParts[0]?.length,
        hashHexLength: hashParts[1]?.length,
        saltBytes: (hashParts[0]?.length || 0) / 2,
        hashBytes: (hashParts[1]?.length || 0) / 2,
      },
    });

    const passwordMatches = verifyPassword(password, account.password);

    trace.steps.push({
      step: 3,
      result: passwordMatches ? "SUCCESS" : "FAILED",
      passwordMatches,
      message: passwordMatches ? "Password verified" : "Password does not match",
    });

    // Step 4: Check session
    trace.steps.push({ step: 4, action: "check for existing session", userId: user.id });

    const sessions = await sql`
      SELECT id, token, "expiresAt"
      FROM session
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    trace.steps.push({
      step: 4,
      result: sessions.length > 0 ? "EXISTS" : "NONE",
      sessionCount: sessions.length,
    });

    // Final result
    trace.result = {
      status: passwordMatches ? "SUCCESS" : "FAILED",
      message: passwordMatches
        ? "Manager credentials are valid. Better Auth should authenticate this account."
        : "Password verification failed. This is why login fails.",
      passwordVerified: passwordMatches,
      userFound: true,
      accountFound: true,
      sessionExists: sessions.length > 0,
    };

    return NextResponse.json(trace);
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
