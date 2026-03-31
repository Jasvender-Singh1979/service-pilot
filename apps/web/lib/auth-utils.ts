/**
 * REUSABLE AUTH UTILITIES
 * 
 * This module provides centralized, reusable authentication functions.
 * 
 * IMPORTANT: This uses Better Auth server-side API for user creation.
 * Functions:
 * - createUserWithPassword(): Create a new user with password (via Better Auth)
 * - getSessionUserFromRequest(): Get authenticated user from request
 * - normalizeEmail(): Normalize email to lowercase
 */

import sql from "@/app/api/utils/sql";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Normalize email to lowercase for consistency
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Create a new user with password using Better Auth's server-side API
 *
 * This is the ONLY correct way to create users with passwords in Better Auth.
 * It ensures passwords are hashed using Better Auth's standard algorithm.
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

    // Validate inputs
    if (!normalizedEmail || !password || !name) {
      throw new Error("Email, password, and name are required");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Check if user already exists (case-insensitive)
    const existingUsers = await sql`
      SELECT id FROM "user"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    if (existingUsers.length > 0) {
      throw new Error("User with this email already exists");
    }

    console.log('[Auth Utils] Creating user via Better Auth API:', normalizedEmail);

    // Use Better Auth's server-side signUpEmail API
    // This automatically creates both user and account with proper password hashing
    const result = await auth.api.signUpEmail({
      email: normalizedEmail,
      password: password,
      name: name,
    });

    if (!result.data?.user) {
      console.error('[Auth Utils] Better Auth signUpEmail failed:', result.error);
      throw new Error(result.error?.message || "Failed to create user via Better Auth");
    }

    const userId = result.data.user.id;
    console.log('[Auth Utils] Better Auth created user:', userId);

    // Update user with app-specific fields (role, business_id, etc.)
    if (overrides && Object.keys(overrides).length > 0) {
      console.log('[Auth Utils] Updating user with app-specific fields...');
      const now = new Date().toISOString();
      
      const updateResult = await sql`
        UPDATE "user"
        SET 
          role = COALESCE(${overrides.role || null}, role),
          business_id = COALESCE(${overrides.business_id || null}, business_id),
          manager_user_id = COALESCE(${overrides.manager_user_id || null}, manager_user_id),
          designation = COALESCE(${overrides.designation || null}, designation),
          mobile_number = COALESCE(${overrides.mobile_number || null}, mobile_number),
          first_login_password_change_required = COALESCE(${overrides.first_login_password_change_required ?? null}, first_login_password_change_required),
          "updatedAt" = ${now}
        WHERE id = ${userId}
        RETURNING id, email, name, role, business_id, manager_user_id
      `;

      if (updateResult.length === 0) {
        throw new Error("Failed to update user with app-specific fields");
      }

      const user = updateResult[0];
      console.log('[Auth Utils] User created successfully:', { id: userId, email: normalizedEmail, role: user.role });

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
    } else {
      // No app-specific overrides, just return the Better Auth result
      return {
        success: true,
        user: {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name,
          role: "engineer",
          business_id: null,
          manager_user_id: null,
        },
      };
    }
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

    // Get session token from Better Auth cookie
    const cookieStore = await cookies();
    let sessionToken =
      cookieStore.get("__Secure-better-auth.session_token")?.value ||
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("auth.session")?.value;

    if (!sessionToken) {
      return null;
    }

    // CRITICAL FIX: Better Auth cookie format is "sessionId.signature"
    // Extract ONLY the sessionId part (before the dot)
    let extractedToken = sessionToken;
    if (sessionToken.includes(".")) {
      extractedToken = sessionToken.split(".")[0];
    }

    // Better Auth stores the cookie token value in the 'token' field (NOT 'id')
    const sessions = await sql`
      SELECT "userId", "expiresAt"
      FROM session
      WHERE token = ${extractedToken}
      AND "expiresAt" > NOW()
    `;

    if (sessions.length === 0) {
      return null;
    }

    const userId = sessions[0].userId;

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
      return null;
    }

    const user = userData[0];
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
