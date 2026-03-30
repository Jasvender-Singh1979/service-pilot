/**
 * REUSABLE AUTH UTILITIES
 * 
 * This module provides centralized, reusable authentication functions.
 * It extracts the working logic from sign-up/sign-in flows into utilities
 * that can be used across the entire app.
 * 
 * Functions:
 * - createUserWithPassword(): Create a new user with password hash
 * - getSessionUserFromRequest(): Get authenticated user from request
 * - normalizeEmail(): Normalize email to lowercase
 */

import sql from "@/app/api/utils/sql";
import * as crypto from "crypto";
import { cookies, headers } from "next/headers";

/**
 * Hash password using PBKDF2 with salt (compatible with existing passwords)
 * Format: "salt:hash"
 */
export function hashPassword(password: string, salt?: string): string {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, useSalt, 100000, 64, "sha256")
    .toString("hex");
  return `${useSalt}:${hash}`;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  const computed = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha256")
    .toString("hex");
  return computed === hash;
}

/**
 * Normalize email to lowercase for consistency
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Create a new user with password
 *
 * @param email - User email (will be normalized to lowercase)
 * @param password - Plain text password
 * @param name - User full name
 * @param overrides - Additional user fields (role, business_id, manager_user_id, designation, etc.)
 * @returns Created user object or error details
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string,
  overrides?: {
    role?: string;
    business_id?: string;
    manager_user_id?: string;
    designation?: string;
    mobile_number?: string;
    first_login_password_change_required?: boolean;
  }
) {
  try {
    // Normalize email
    const normalizedEmail = normalizeEmail(email);

    console.log("[Auth Utils] Creating user:", { email: normalizedEmail, name });

    // Validate inputs
    if (!normalizedEmail || !password || !name) {
      throw new Error("Email, password, and name are required");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Check if user already exists (case-insensitive)
    console.log("[Auth Utils] Checking for existing user...");
    const existingUsers = await sql`
      SELECT id FROM "user"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    if (existingUsers.length > 0) {
      console.log("[Auth Utils] User already exists:", normalizedEmail);
      throw new Error("User with this email already exists");
    }

    // Create user record
    console.log("[Auth Utils] Creating user record...");
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const userResult = await sql`
      INSERT INTO "user" (
        id,
        email,
        name,
        "createdAt",
        "updatedAt",
        "emailVerified",
        is_active,
        role,
        business_id,
        manager_user_id,
        designation,
        mobile_number,
        first_login_password_change_required
      )
      VALUES (
        ${userId},
        ${normalizedEmail},
        ${name},
        ${now},
        ${now},
        false,
        true,
        ${overrides?.role || "engineer"},
        ${overrides?.business_id || null},
        ${overrides?.manager_user_id || null},
        ${overrides?.designation || null},
        ${overrides?.mobile_number || null},
        ${overrides?.first_login_password_change_required ?? false}
      )
      RETURNING id, email, name, role, business_id, manager_user_id
    `;

    if (userResult.length === 0) {
      throw new Error("Failed to create user - no rows returned");
    }

    const user = userResult[0];
    console.log("[Auth Utils] User record created:", user.id);

    // Create account with password
    console.log("[Auth Utils] Creating password account...");
    const accountId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);

    await sql`
      INSERT INTO account (
        id,
        "userId",
        "accountId",
        "providerId",
        password,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${accountId},
        ${userId},
        ${userId},
        'credential',
        ${hashedPassword},
        ${now},
        ${now}
      )
    `;

    console.log("[Auth Utils] Password account created");

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        business_id: user.business_id,
        manager_user_id: user.manager_user_id,
      },
    };
  } catch (error: any) {
    const errorMsg = error?.message || "Failed to create user";
    console.error("[Auth Utils] createUserWithPassword error:", {
      message: errorMsg,
      code: error?.code,
      constraint: error?.constraint,
    });

    return {
      success: false,
      error: errorMsg,
      code: error?.code,
    };
  }
}

/**
 * Create a session token for a user
 */
export async function createSession(userId: string) {
  try {
    console.log("[Auth Utils] Creating session for user:", userId);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sql`
      INSERT INTO session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${sessionToken},
        ${expiresAt.toISOString()},
        NOW(),
        NOW()
      )
    `;

    console.log("[Auth Utils] Session created successfully");

    return {
      success: true,
      sessionToken,
    };
  } catch (error: any) {
    const errorMsg = error?.message || "Failed to create session";
    console.error("[Auth Utils] createSession error:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Get authenticated user from request by reading session cookie
 *
 * Better Auth stores sessions with:
 * - Cookie: __Secure-better-auth.session_token = sessionId.signature (signed format)
 * - Database: session table with id = sessionId (raw ID without signature)
 * - User data: Foreign key to user table via userId
 * 
 * CRITICAL: The cookie includes a signature for security (format: ID.SIGNATURE)
 * We must extract ONLY the session ID part (before the dot) for database lookup.
 * 
 * @returns User object with all fields or null if unauthorized
 */
export async function getSessionUserFromRequest() {
  try {
    console.log("[Auth Utils] Getting session user from Better Auth...");

    // Get session token from Better Auth cookie
    const cookieStore = await cookies();
    let sessionToken =
      cookieStore.get("__Secure-better-auth.session_token")?.value ||
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("auth.session")?.value;

    if (!sessionToken) {
      console.log("[Auth Utils] No session token found in cookies");
      return null;
    }

    // TEMPORARY LOGGING: Log raw cookie value
    console.log("[TEMP_LOG_RAW_COOKIE]", sessionToken);

    // CRITICAL FIX: Better Auth cookie format is "sessionId.signature"
    // Extract ONLY the sessionId part (before the dot)
    let sessionId = sessionToken;
    if (sessionToken.includes(".")) {
      sessionId = sessionToken.split(".")[0];
      console.log("[Auth Utils] Extracted session ID from signed token");
    }

    // TEMPORARY LOGGING: Log extracted session ID
    console.log("[TEMP_LOG_EXTRACTED_ID]", sessionId);
    
    // TEMPORARY LOGGING: Log the exact lookup key
    console.log("[TEMP_LOG_LOOKUP_KEY]", sessionId);

    console.log("[Auth Utils] Looking up session with ID:", sessionId);

    // Better Auth stores the session ID in the 'id' field
    // Use ONLY session.id, not session.token (which is for manual tokens)
    const sessions = await sql`
      SELECT "userId", "expiresAt"
      FROM session
      WHERE id = ${sessionId}
      AND "expiresAt" > NOW()
    `;

    // TEMPORARY LOGGING: Log session lookup row count
    console.log("[TEMP_LOG_SESSION_ROW_COUNT]", sessions.length);

    if (sessions.length === 0) {
      console.log("[Auth Utils] Session not found or expired");
      return null;
    }

    const userId = sessions[0].userId;
    console.log("[Auth Utils] User ID from session:", userId);

    // Fetch complete user data
    const userData = await sql`
      SELECT
        id,
        name,
        email,
        role,
        business_id,
        mobile_number,
        designation,
        manager_user_id,
        is_active,
        first_login_password_change_required,
        "createdAt"
      FROM "user"
      WHERE id = ${userId}
    `;

    if (userData.length === 0) {
      console.log("[Auth Utils] User not found for ID:", userId);
      return null;
    }

    const user = userData[0];
    console.log("[Auth Utils] Session user found:", user.email);

    return user;
  } catch (error: any) {
    const errorMsg = error?.message || "Failed to get session user";
    console.error("[Auth Utils] getSessionUserFromRequest error:", errorMsg);
    return null;
  }
}

/**
 * Require authenticated user or return error response
 * Used in API routes for authorization checks
 *
 * @returns User object or null if not authenticated
 */
export async function requireAuthenticatedUser() {
  const user = await getSessionUserFromRequest();
  return user;
}

/**
 * Require user with specific role
 */
export async function requireRole(requiredRole: string) {
  const user = await getSessionUserFromRequest();

  if (!user) {
    return { authenticated: false, user: null };
  }

  if (user.role !== requiredRole) {
    return {
      authenticated: true,
      authorized: false,
      user: null,
      error: `This action requires ${requiredRole} role`,
    };
  }

  return { authenticated: true, authorized: true, user };
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin() {
  return requireRole("super_admin");
}

/**
 * Require manager role
 */
export async function requireManager() {
  return requireRole("manager");
}

/**
 * Require engineer role
 */
export async function requireEngineer() {
  return requireRole("engineer");
}
