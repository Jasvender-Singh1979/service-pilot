import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerEmail = searchParams.get('managerEmail');
    const businessId = searchParams.get('businessId');
    
    console.log('[API /stats] GET request received');
    console.log('[API /stats] URL:', request.url);
    console.log('[API /stats] managerEmail:', managerEmail);
    console.log('[API /stats] businessId:', businessId);

    if (managerEmail) {
      // Manager-specific stats
      try {
        const managerResult = await sql`
          SELECT id, business_id FROM "user" WHERE email = ${managerEmail} AND role = 'manager'
        `;

        if (!managerResult || managerResult.length === 0) {
          return NextResponse.json({
            totalEngineers: 0,
            totalActiveTasks: 0,
          });
        }

        const manager = managerResult[0];

        // Get engineers count for this manager
        let totalEngineers = 0;
        try {
          const engineersResult = await sql`
            SELECT COUNT(*) as count FROM "user" 
            WHERE role = 'engineer' 
            AND business_id = ${manager.business_id}
            AND manager_user_id = ${manager.id}
          `;
          if (engineersResult && engineersResult[0]) {
            totalEngineers = parseInt(String(engineersResult[0].count)) || 0;
          }
        } catch (e) {
          console.error('Error counting engineers:', e instanceof Error ? e.message : String(e));
        }

        // Get ALL calls (all statuses - unassigned, assigned, in_progress, pending, closed, cancelled)
        let totalActiveTasks = 0;
        try {
          const allCallsResult = await sql`
            SELECT COUNT(*) as count FROM service_call
            WHERE manager_user_id = ${manager.id}
            AND business_id = ${manager.business_id}
          `;
          if (allCallsResult && allCallsResult[0]) {
            totalActiveTasks = parseInt(String(allCallsResult[0].count)) || 0;
          }
        } catch (e) {
          console.error('Error counting all calls:', e instanceof Error ? e.message : String(e));
        }

        return NextResponse.json({
          totalEngineers,
          totalActiveTasks,
        });
      } catch (e) {
        console.error('Error in manager stats:', e instanceof Error ? e.message : String(e));
        return NextResponse.json({
          totalEngineers: 0,
          totalActiveTasks: 0,
        });
      }
    } else {
      // Super Admin stats - need businessId from query param
      const businessId = searchParams.get('businessId');

      if (!businessId) {
        return NextResponse.json({
          totalUsers: 0,
          totalManagers: 0,
          totalEngineers: 0,
          totalServiceCalls: 0,
        });
      }

      try {
        // Get counts from database filtered by business_id
        let totalUsers = 0;
        let totalManagers = 0;
        let totalEngineers = 0;

        try {
          console.log('[API /stats] Querying users with businessId:', businessId);
          const usersResult = await sql`
            SELECT COUNT(*) as count FROM "user" WHERE business_id = ${businessId}
          `;
          console.log('[API /stats] Users query result:', usersResult);
          if (usersResult && usersResult[0]) {
            totalUsers = parseInt(String(usersResult[0].count)) || 0;
          }
          console.log('[API /stats] Total users count:', totalUsers);
        } catch (e) {
          console.error('Error counting users:', e instanceof Error ? e.message : String(e));
        }

        try {
          const managersResult = await sql`
            SELECT COUNT(*) as count FROM "user" WHERE role = 'manager' AND business_id = ${businessId}
          `;
          if (managersResult && managersResult[0]) {
            totalManagers = parseInt(String(managersResult[0].count)) || 0;
          }
        } catch (e) {
          console.error('Error counting managers:', e instanceof Error ? e.message : String(e));
        }

        try {
          const engineersResult = await sql`
            SELECT COUNT(*) as count FROM "user" WHERE role = 'engineer' AND business_id = ${businessId}
          `;
          if (engineersResult && engineersResult[0]) {
            totalEngineers = parseInt(String(engineersResult[0].count)) || 0;
          }
        } catch (e) {
          console.error('Error counting engineers:', e instanceof Error ? e.message : String(e));
        }

        return NextResponse.json({
          totalUsers,
          totalManagers,
          totalEngineers,
          totalServiceCalls: 0,
        });
      } catch (e) {
        console.error('Error in super admin stats:', e instanceof Error ? e.message : String(e));
        return NextResponse.json({
          totalUsers: 0,
          totalManagers: 0,
          totalEngineers: 0,
          totalServiceCalls: 0,
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching stats:', errorMessage);
    return NextResponse.json({
      totalEngineers: 0,
      totalActiveTasks: 0,
    });
  }
}
