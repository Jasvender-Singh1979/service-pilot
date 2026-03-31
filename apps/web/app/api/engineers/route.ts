import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // First try session-based auth (new way)
    const user = await getSessionUserFromRequest();
    
    // Fall back to query param if no session (legacy support)
    let manager;
    
    if (user && user.role === 'manager') {
      manager = { id: user.id, business_id: user.business_id };
    } else if (!user) {
      const { searchParams } = new URL(request.url);
      const managerEmail = searchParams.get('managerEmail');
      
      if (!managerEmail) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get manager details by email
      const managerResult = await sql`
        SELECT id, business_id FROM "user" WHERE email = ${managerEmail} AND role = 'manager'
      `;

      if (managerResult.length === 0) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        );
      }

      manager = managerResult[0];
    } else {
      return NextResponse.json(
        { error: 'Only managers can access this' },
        { status: 403 }
      );
    }

    console.log('[Engineers API] Fetching engineers for manager:', manager.id, 'business:', manager.business_id);

    // Get engineers created by this manager
    const engineers = await sql`
      SELECT id, name, email, mobile_number, designation, is_active, "createdAt"
      FROM "user"
      WHERE role = 'engineer'
      AND business_id = ${manager.business_id}
      AND manager_user_id = ${manager.id}
      ORDER BY "createdAt" DESC
    `;

    console.log('[Engineers API] Found', engineers.length, 'engineers');
    return NextResponse.json(engineers);
  } catch (error: any) {
    console.error('Error fetching engineers:', error.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch engineers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('[API /engineers POST] ========== REQUEST STARTED ==========');
  
  try {
    console.log('[API /engineers POST] [STEP 1] Parsing request body...');
    const body = await request.json();
    const { name, email, mobileNumber, password, designation, managerEmail } = body;

    console.log('[API /engineers POST] [STEP 1] Request body received:', { 
      name, 
      email, 
      mobileNumber,
      passwordLength: password?.length || 0,
      designation,
      managerEmail
    });

    // Validation
    if (!name || !email || !mobileNumber || !password || !managerEmail) {
      console.log('[API /engineers POST] [ERROR] Missing required fields');
      return NextResponse.json(
        { error: 'Name, email, mobile number, password, and manager email are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      console.log('[API /engineers POST] [ERROR] Password too short:', password.length);
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    console.log('[API /engineers POST] [STEP 2] Checking for existing email...');
    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM "user" WHERE LOWER(email) = LOWER(${email})
    `;

    if (existingUser.length > 0) {
      console.log('[API /engineers POST] [ERROR] Email already exists:', email);
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    console.log('[API /engineers POST] [STEP 2] ✅ Email is unique');

    console.log('[API /engineers POST] [STEP 3] Getting manager details...');
    // Get manager details
    const managerResult = await sql`
      SELECT id, business_id FROM "user" WHERE email = ${managerEmail} AND role = 'manager'
    `;

    if (managerResult.length === 0) {
      console.log('[API /engineers POST] [ERROR] Manager not found:', managerEmail);
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    const manager = managerResult[0];
    console.log('[API /engineers POST] [STEP 3] ✅ Manager found:', { id: manager.id, business_id: manager.business_id });

    // Create engineer using Better Auth's server-side API
    console.log('[API /engineers POST] [STEP 4] Calling auth.api.signUpEmail() with correct API format...');
    
    let createResult;
    try {
      // Better Auth API signature requires 'body' parameter and optionally 'headers'
      createResult = await auth.api.signUpEmail({
        body: {
          email: email.toLowerCase(),
          password: password,
          name: name,
        },
        headers: new Headers(request.headers),
      });
      console.log('[API /engineers POST] [STEP 4] auth.api.signUpEmail() returned:', { 
        hasData: !!createResult.data,
        hasError: !!createResult.error,
        hasUser: !!createResult.data?.user
      });
    } catch (authApiError: any) {
      console.error('[API /engineers POST] [STEP 4] EXCEPTION during auth.api.signUpEmail():', {
        message: authApiError?.message,
        code: authApiError?.code,
        stack: authApiError?.stack,
      });
      throw authApiError;
    }

    if (!createResult.data?.user) {
      console.error('[API /engineers POST] [ERROR] Better Auth failed to create user:', {
        error: createResult.error,
        data: createResult.data,
      });
      const errorMsg = createResult.error?.message || 'Failed to create engineer account';
      
      // Return detailed error in development
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        { 
          error: errorMsg,
          details: isDev ? { betterAuthError: createResult.error } : undefined
        },
        { status: 400 }
      );
    }

    const userId = createResult.data.user.id;
    console.log('[API /engineers POST] [STEP 4] ✅ Engineer created via Better Auth:', { 
      userId, 
      email: createResult.data.user.email 
    });

    console.log('[API /engineers POST] [STEP 5] Updating user with engineer-specific fields...');
    // Update user with engineer-specific fields
    const now = new Date().toISOString();
    const updateResult = await sql`
      UPDATE "user"
      SET 
        role = 'engineer',
        business_id = ${manager.business_id},
        manager_user_id = ${manager.id},
        mobile_number = ${mobileNumber},
        designation = ${designation || null},
        first_login_password_change_required = true,
        "updatedAt" = ${now}
      WHERE id = ${userId}
      RETURNING id, name, email, mobile_number, designation, is_active, "createdAt"
    `;

    if (updateResult.length === 0) {
      console.error('[API /engineers POST] [ERROR] DB update returned no rows');
      throw new Error("Failed to update engineer with fields - user may not exist in database");
    }

    const createdEngineer = updateResult[0];
    console.log('[API /engineers POST] [STEP 5] ✅ Engineer updated with fields:', { 
      id: createdEngineer.id, 
      role: 'engineer',
      business_id: manager.business_id
    });

    const duration = Date.now() - startTime;
    console.log('[API /engineers POST] ========== SUCCESS (${duration}ms) ==========');

    return NextResponse.json(createdEngineer, { status: 201 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[API /engineers POST] ========== FAILED (${duration}ms) ==========');
    console.error('[API /engineers POST] [EXCEPTION] Error details:', {
      message: error?.message,
      code: error?.code,
      constraint: error?.constraint,
      stack: error?.stack,
      name: error?.name,
    });

    // Return detailed error in development
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to create engineer',
        details: isDev ? {
          code: error?.code,
          constraint: error?.constraint,
        } : undefined
      },
      { status: 500 }
    );
  }
}
