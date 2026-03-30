import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, mobileNumber, designation, isActive, managerEmail } = body;

    // Get manager - prefer session, fall back to email param
    let manager;
    const user = await getSessionUserFromRequest();
    
    if (user && user.role === 'manager') {
      manager = { id: user.id, business_id: user.business_id };
    } else if (managerEmail) {
      // Legacy support: get manager by email
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify engineer belongs to this manager
    const engineerCheck = await sql`
      SELECT id FROM "user" 
      WHERE id = ${id} 
      AND role = 'engineer' 
      AND business_id = ${manager.business_id}
      AND manager_user_id = ${manager.id}
    `;

    if (engineerCheck.length === 0) {
      return NextResponse.json(
        { error: 'Engineer not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update engineer
    const result = await sql`
      UPDATE "user"
      SET 
        name = ${name},
        email = ${email},
        mobile_number = ${mobileNumber},
        designation = ${designation || null},
        is_active = ${isActive},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, name, email, mobile_number, designation, is_active, "createdAt"
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating engineer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update engineer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const managerEmail = searchParams.get('managerEmail');

    // Get manager - prefer session, fall back to email param
    let manager;
    const user = await getSessionUserFromRequest();
    
    if (user && user.role === 'manager') {
      manager = { id: user.id, business_id: user.business_id };
    } else if (managerEmail) {
      // Legacy support: get manager by email
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify engineer belongs to this manager
    const engineerCheck = await sql`
      SELECT id FROM "user" 
      WHERE id = ${id} 
      AND role = 'engineer' 
      AND business_id = ${manager.business_id}
      AND manager_user_id = ${manager.id}
    `;

    if (engineerCheck.length === 0) {
      return NextResponse.json(
        { error: 'Engineer not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete associated account first
    await sql`DELETE FROM account WHERE "userId" = ${id}`;
    
    // Delete engineer
    await sql`DELETE FROM "user" WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting engineer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete engineer' },
      { status: 500 }
    );
  }
}
