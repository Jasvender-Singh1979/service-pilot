import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { createUserWithPassword, getSessionUserFromRequest } from "@/lib/auth-utils";

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
  try {
    const body = await request.json();
    const { name, email, mobileNumber, password, designation, managerEmail } = body;

    // Validation
    if (!name || !email || !mobileNumber || !password || !managerEmail) {
      return NextResponse.json(
        { error: 'Name, email, mobile number, password, and manager email are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM "user" WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Get manager details
    const managerResult = await sql`
      SELECT id, business_id FROM "user" WHERE email = ${managerEmail} AND role = 'manager'
    `;

    if (managerResult.length === 0) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    const manager = managerResult[0];

    // Create engineer using the auth utility
    console.log('[Engineers API] Creating engineer with utility...')
    const createResult = await createUserWithPassword(
      email,
      password,
      name,
      {
        role: 'engineer',
        business_id: manager.business_id,
        manager_user_id: manager.id,
        mobile_number: mobileNumber,
        designation: designation || undefined,
        first_login_password_change_required: true,
      }
    );

    if (!createResult.success || !createResult.user) {
      console.error('[Engineers API] Failed to create engineer:', createResult.error);
      return NextResponse.json(
        { error: createResult.error || 'Failed to create engineer account' },
        { status: 400 }
      );
    }

    console.log('[Engineers API] Engineer created:', createResult.user.id);

    // Return the created engineer
    const result = await sql`
      SELECT id, name, email, mobile_number, designation, is_active, "createdAt"
      FROM "user"
      WHERE id = ${createResult.user.id}
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating engineer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create engineer' },
      { status: 500 }
    );
  }
}
