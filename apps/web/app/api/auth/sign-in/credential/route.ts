import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as crypto from "crypto";
import { verifyPassword, normalizeEmail } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = normalizeEmail(email);

    // DIAGNOSTIC LOGGING
    console.log("\n========== CREDENTIAL SIGN-IN ROUTE ==========");
    console.log("[STEP 1] Email input from request:", JSON.stringify(email));
    console.log("[STEP 1] Email length:", email?.length);
    console.log("[STEP 1] Email bytes:", Buffer.from(email || "").toString("hex"));
    console.log("[STEP 1] Email after normalize:", JSON.stringify(normalizedEmail));
    console.log("[STEP 1] Normalized length:", normalizedEmail.length);
    console.log("[STEP 1] Has leading space:", email?.startsWith(" "));
    console.log("[STEP 1] Has trailing space:", email?.endsWith(" "));

    if (!normalizedEmail || !password) {
      console.log("[Auth Sign-In] Missing email or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email (case-insensitive)
    console.log("[STEP 2] Running query: SELECT ... FROM user WHERE LOWER(email) = LOWER(?)", normalizedEmail);
    const users = await sql`
      SELECT id, email, name, "createdAt", role, business_id
      FROM "user"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    console.log("[STEP 2] Query result - users found:", users.length);
    if (users.length > 0) {
      const foundUser = users[0];\n      console.log("[STEP 2] Found user email (exact):", JSON.stringify(foundUser.email));
      console.log("[STEP 2] Found user email length:", foundUser.email.length);
      console.log("[STEP 2] Found user email bytes:", Buffer.from(foundUser.email).toString("hex"));
      console.log("[STEP 2] Found user ID:", foundUser.id);
      console.log("[STEP 2] Found user role:", foundUser.role);
      console.log("[STEP 2] Found user business_id:", foundUser.business_id);
    }

    if (users.length === 0) {
      console.log("[Auth Sign-In] User not found with normalized email:", normalizedEmail);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = users[0];

    // Find account with password for this user
    console.log("[STEP 3] Finding credential account for user ID:", user.id);
    const accounts = await sql`
      SELECT id, password, "providerId"
      FROM account
      WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;

    console.log("[STEP 3] Credential accounts found:", accounts.length);
    if (accounts.length > 0) {
      const account = accounts[0];
      console.log("[STEP 3] Account ID:", account.id);
      console.log("[STEP 3] Has password:", !!account.password);
      console.log("[STEP 3] Password hash length:", account.password?.length);
      console.log("[STEP 3] Password hash first 60 chars:", account.password?.substring(0, 60));
    }

    if (accounts.length === 0 || !accounts[0].password) {
      console.log("[Auth Sign-In] No password account found for user:", user.id);
      return NextResponse.json(
        { error: \"Invalid email or password\" },
        { status: 401 }
      );
    }

    // Verify password using utility
    console.log("[STEP 4] Verifying password...");
    const verified = verifyPassword(password, accounts[0].password);
    console.log("[STEP 4] Password verification result:", verified ? "✓ PASS" : "✗ FAIL");
    
    if (!verified) {
      console.log("[Auth Sign-In] Password verification failed for:", user.email);
      return NextResponse.json(
        { error: \"Invalid email or password\" },
        { status: 401 }
      );
    }

    // Create session
    console.log("[STEP 5] Creating session...");
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sql`
      INSERT INTO session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${user.id}, ${sessionToken}, ${expiresAt.toISOString()}, NOW(), NOW())
    `;

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth.session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    console.log("[Auth Sign-In] ✓ SUCCESS - Session created for user:", user.email);
    console.log("========== END CREDENTIAL SIGN-IN ROUTE ==========\n");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      session: {
        token: sessionToken,
      },
    });
  } catch (error: any) {
    console.error("[Auth Sign-In] ✗ ERROR:", error.message);
    console.error("[Auth Sign-In] Stack:", error.stack);
    return NextResponse.json(
      { error: \"Authentication failed\" },
      { status: 500 }
    );
  }
}
