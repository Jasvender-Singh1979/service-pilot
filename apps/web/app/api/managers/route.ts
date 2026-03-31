import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can access
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const businessId = user.business_id;

    // Get all managers for this business
    const managers = await sql`
      SELECT 
        id, 
        name, 
        email, 
        "createdAt",
        business_id,
        role
      FROM "user"
      WHERE business_id = ${businessId} AND role = 'manager'
      ORDER BY "createdAt" DESC
    `;

    return NextResponse.json(managers);
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json({ error: "Failed to fetch managers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API /managers POST] Request received');
    
    const user = await getSessionUserFromRequest();

    if (!user) {
      console.log('[API /managers POST] REJECTING: No session user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can create managers
    if (user.role !== "super_admin") {
      console.log('[API /managers POST] REJECTING: User role is', user.role, 'not super_admin');
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.log('[API /managers POST] User authorized as super_admin');

    const businessId = user.business_id;

    const body = await request.json();
    const { name, email, password } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists (case-insensitive)
    const existingUser = await sql`
      SELECT id FROM "user" WHERE LOWER(email) = LOWER(${email})
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Create manager using createUserWithPassword utility which uses Better Auth
    console.log('[API /managers POST] Creating manager via Better Auth...');
    
    const createResult = await auth.api.signUpEmail({
      email: email.toLowerCase(),
      password,
      name,
    });

    if (!createResult.data?.user) {
      console.error('[API /managers POST] Failed to create user via Better Auth:', createResult.error);
      return NextResponse.json(
        { error: createResult.error?.message || "Failed to create manager account" },
        { status: 400 }
      );
    }

    const userId = createResult.data.user.id;
    console.log('[API /managers POST] Manager created via Better Auth, now adding manager metadata...');

    // Update user with manager-specific fields
    const now = new Date().toISOString();
    await sql`
      UPDATE "user"
      SET 
        role = 'manager',
        business_id = ${businessId},
        first_login_password_change_required = true,
        "updatedAt" = ${now}
      WHERE id = ${userId}
    `;

    console.log('[API /managers POST] SUCCESS: Manager created with id:', userId);

    // Return the created user
    const createdUser = await sql`
      SELECT id, name, email, role, business_id, "createdAt"
      FROM "user"
      WHERE id = ${userId}
    `;

    return NextResponse.json(createdUser[0], { status: 201 });
  } catch (error) {
    console.error("Error creating manager:", error);
    return NextResponse.json(
      { error: "Failed to create manager" },
      { status: 500 }
    );
  }
}
