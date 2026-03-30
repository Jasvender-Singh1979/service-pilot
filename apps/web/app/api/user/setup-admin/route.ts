import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, business_id, role, first_login_password_change_required } = await request.json();

    console.log('[Setup-Admin API] Received request:', { email, business_id, role });

    // First, check if user exists (case-insensitive)
    const existingUser = await sql`
      SELECT id, email, name, role, business_id FROM "user"
      WHERE LOWER(email) = LOWER(${email})
    `;

    console.log('[Setup-Admin API] Existing user check:', { found: existingUser.length > 0, user: existingUser[0] });

    if (existingUser.length === 0) {
      console.error('[Setup-Admin API] User not found for email:', email);
      return NextResponse.json(
        { error: `User not found for email: ${email}` },
        { status: 404 }
      );
    }

    // Update user with business_id, role, and password change requirement (case-insensitive)
    console.log('[Setup-Admin API] Updating user with business_id and role...');
    const result = await sql`
      UPDATE "user"
      SET 
        business_id = ${business_id},
        role = ${role},
        first_login_password_change_required = ${first_login_password_change_required},
        "updatedAt" = NOW()
      WHERE LOWER(email) = LOWER(${email})
      RETURNING id, email, name, role, business_id
    `;

    console.log('[Setup-Admin API] Update result:', result[0]);

    if (result.length === 0) {
      console.error('[Setup-Admin API] Update failed - no rows returned');
      return NextResponse.json(
        { error: 'Failed to update user with business role' },
        { status: 500 }
      );
    }

    console.log('[Setup-Admin API] SUCCESS - User setup as', role);
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('[Setup-Admin API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup admin user' },
      { status: 500 }
    );
  }
}
