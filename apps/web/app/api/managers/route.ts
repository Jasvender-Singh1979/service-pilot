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
  const startTime = Date.now();
  console.log('[API /managers POST] ========== REQUEST STARTED ==========');
  
  try {
    console.log('[API /managers POST] [STEP 1] Validating session...');
    const user = await getSessionUserFromRequest();

    if (!user) {
      console.log('[API /managers POST] [ERROR] No session user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[API /managers POST] [STEP 1] Session user found:', { id: user.id, email: user.email, role: user.role });

    // Only super admin can create managers
    if (user.role !== "super_admin") {
      console.log('[API /managers POST] [ERROR] User role is', user.role, '- not super_admin');
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.log('[API /managers POST] [STEP 1] ✅ User authorized as super_admin');

    const businessId = user.business_id;
    console.log('[API /managers POST] [STEP 2] businessId:', businessId);

    console.log('[API /managers POST] [STEP 2] Parsing request body...');
    const body = await request.json();
    console.log('[API /managers POST] [STEP 2] Request body received:', { 
      name: body.name, 
      email: body.email, 
      passwordLength: body.password?.length || 0 
    });

    const { name, email, password } = body;

    // Validation
    if (!name || !email || !password) {
      console.log('[API /managers POST] [ERROR] Missing required fields:', { 
        hasName: !!name, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      console.log('[API /managers POST] [ERROR] Password too short:', password.length);
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    console.log('[API /managers POST] [STEP 3] Checking for existing email...');
    // Check if email already exists (case-insensitive)
    const existingUser = await sql`
      SELECT id FROM "user" WHERE LOWER(email) = LOWER(${email})
    `;

    if (existingUser.length > 0) {
      console.log('[API /managers POST] [ERROR] Email already exists:', email);
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }
    console.log('[API /managers POST] [STEP 3] ✅ Email is unique:', email);

    // Create manager using Better Auth
    console.log('[API /managers POST] [STEP 4] Calling auth.api.signUpEmail() with correct API format...');
    
    let createResult: any;
    try {
      // Better Auth API signature requires 'body' parameter and optionally 'headers'
      // Returns: { user: {...}, session: {...} } (not wrapped in { data })
      // See: https://better-auth.com/docs/concepts/api
      createResult = await auth.api.signUpEmail({
        body: {
          email: email.toLowerCase(),
          password: password,
          name: name,
        },
        headers: new Headers(request.headers),
      });
      
      // Log the actual return structure for debugging
      console.log('[API /managers POST] [STEP 4] auth.api.signUpEmail() returned:');
      console.log('[API /managers POST] [DEBUG] Return value type:', typeof createResult);
      console.log('[API /managers POST] [DEBUG] Return value keys:', Object.keys(createResult || {}));
      console.log('[API /managers POST] [DEBUG] createResult.user exists:', !!createResult?.user);
      console.log('[API /managers POST] [DEBUG] createResult.user.id:', createResult?.user?.id);
      console.log('[API /managers POST] [DEBUG] createResult.user.email:', createResult?.user?.email);
      
    } catch (authApiError: any) {
      console.error('[API /managers POST] [STEP 4] EXCEPTION during auth.api.signUpEmail():', {
        message: authApiError?.message,
        code: authApiError?.code,
        status: authApiError?.status,
        name: authApiError?.name,
        stack: authApiError?.stack,
      });
      throw authApiError;
    }

    // Check if user was created successfully
    // Better Auth returns { user: {...}, session: {...} } on success
    // It throws an error on failure (not a return value with error field)
    if (!createResult?.user || !createResult.user.id) {
      console.error('[API /managers POST] [ERROR] Better Auth did not return user object:', {
        returnedKeys: Object.keys(createResult || {}),
        hasUser: !!createResult?.user,
        returnValue: JSON.stringify(createResult),
      });
      
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        { 
          error: "Failed to create manager account - user creation returned no user ID",
          details: isDev ? { 
            returnedKeys: Object.keys(createResult || {}),
            returnValue: createResult
          } : undefined
        },
        { status: 400 }
      );
    }

    const userId = createResult.user.id;
    console.log('[API /managers POST] [STEP 4] ✅ Manager created via Better Auth:', { 
      userId, 
      email: createResult.user.email 
    });

    console.log('[API /managers POST] [STEP 5] Updating user with manager-specific fields...');
    // Update user with manager-specific fields
    const now = new Date().toISOString();
    const updateQueryResult = await sql`
      UPDATE "user"
      SET 
        role = 'manager',
        business_id = ${businessId},
        first_login_password_change_required = true,
        "updatedAt" = ${now}
      WHERE id = ${userId}
      RETURNING id, name, email, role, business_id, "createdAt"
    `;

    if (updateQueryResult.length === 0) {
      console.error('[API /managers POST] [ERROR] DB update returned no rows. User may not have been created by Better Auth.');
      // Check if user actually exists in DB
      const checkUser = await sql`SELECT id FROM "user" WHERE id = ${userId}`;
      console.log('[API /managers POST] [DEBUG] User exists in DB:', checkUser.length > 0);
      
      throw new Error("Failed to update user with manager fields - user may not exist in database");
    }

    const updatedUser = updateQueryResult[0];
    console.log('[API /managers POST] [STEP 5] ✅ User updated with manager fields:', { 
      id: updatedUser.id, 
      role: updatedUser.role, 
      business_id: updatedUser.business_id 
    });

    const duration = Date.now() - startTime;
    console.log('[API /managers POST] ========== SUCCESS (${duration}ms) ==========');

    return NextResponse.json(updatedUser, { status: 201 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[API /managers POST] ========== FAILED (${duration}ms) ==========');
    console.error('[API /managers POST] [EXCEPTION] Error details:', {
      message: error?.message,
      code: error?.code,
      constraint: error?.constraint,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
      fullError: JSON.stringify(error, null, 2),
    });

    // Return detailed error in development
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: error?.message || "Failed to create manager",
        details: isDev ? {
          code: error?.code,
          constraint: error?.constraint,
          name: error?.name,
        } : undefined
      },
      { status: 500 }
    );
  }
}
