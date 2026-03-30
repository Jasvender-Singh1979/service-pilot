import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerEmail = searchParams.get('managerEmail');

    // Get manager - prefer session, fall back to email param for legacy support
    let manager;
    const user = await getSessionUserFromRequest();
    
    if (user && user.role === 'manager') {
      manager = { id: user.id, business_id: user.business_id };
    } else if (managerEmail) {
      // Legacy support: get manager by email
      const managerResult = await sql`
        SELECT id, business_id FROM "user" 
        WHERE email = ${managerEmail} AND role = 'manager'
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

    // Get all engineers for this manager
    const engineers = await sql`
      SELECT 
        id, name, email, mobile_number, designation, is_active
      FROM "user"
      WHERE role = 'engineer'
      AND business_id = ${manager.business_id}
      AND manager_user_id = ${manager.id}
      ORDER BY name ASC
    `;

    // Get call stats for each engineer
    const engineersWithStats = await Promise.all(
      engineers.map(async (engineer: any) => {
        // Total calls: ALL calls assigned to engineer, regardless of status
        const totalResult = await sql`
          SELECT COUNT(*) as count FROM service_call
          WHERE assigned_engineer_user_id = ${engineer.id}
          AND business_id = ${manager.business_id}
        `;

        // Pending calls: calls assigned to engineer that are NOT closed/cancelled
        const pendingResult = await sql`
          SELECT COUNT(*) as count FROM service_call
          WHERE assigned_engineer_user_id = ${engineer.id}
          AND business_id = ${manager.business_id}
          AND call_status NOT IN ('closed', 'cancelled')
        `;

        // Closed calls: calls with closed status
        const closedResult = await sql`
          SELECT COUNT(*) as count FROM service_call
          WHERE assigned_engineer_user_id = ${engineer.id}
          AND business_id = ${manager.business_id}
          AND call_status = 'closed'
        `;

        return {
          id: engineer.id,
          name: engineer.name,
          email: engineer.email,
          mobile_number: engineer.mobile_number,
          designation: engineer.designation,
          is_active: engineer.is_active,
          assigned_calls: parseInt(totalResult[0].count) || 0,
          pending_calls: parseInt(pendingResult[0].count) || 0,
          closed_calls: parseInt(closedResult[0].count) || 0,
        };
      })
    );

    return NextResponse.json(engineersWithStats);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching engineer stats:', errorMessage);
    return NextResponse.json(
      { error: `Failed to fetch engineer stats: ${errorMessage}` },
      { status: 500 }
    );
  }
}
