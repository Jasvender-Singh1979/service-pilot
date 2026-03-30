import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest, createUserWithPassword } from "@/lib/auth-utils";

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
    console.log('[API /managers POST] Request headers:', Object.fromEntries(request.headers));
    
    const user = await getSessionUserFromRequest();
    console.log('[API /managers POST] Session user:', user ? { id: user.id, role: user.role, email: user.email } : 'NULL');

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

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM "user" WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Create manager user with password
    const createUserResult = await createUserWithPassword(
      email,
      password,
      name,
      {
        role: 'manager',
        business_id: businessId,
        first_login_password_change_required: true,
      }
    );

    if (!createUserResult.success) {
      return NextResponse.json(
        { error: createUserResult.error || "Failed to create manager account" },
        { status: 500 }
      );
    }

    // Return the created user
    const createdUser = await sql`
      SELECT id, name, email, role, business_id, "createdAt"
      FROM "user"
      WHERE id = ${createUserResult.user?.id}
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
