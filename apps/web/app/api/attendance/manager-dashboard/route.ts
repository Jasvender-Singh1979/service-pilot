import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST, getTodayRangeIST } from "@/lib/dateUtils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and super-admins can view
    if (!["manager", "super_admin"].includes(user.role || "")) {
      return NextResponse.json(
        { error: "Only managers can view attendance dashboard" },
        { status: 403 }
      );
    }

    const businessId = user.business_id;
    const managerId = user.role === "super_admin" ? undefined : user.id;
    const todayDate = getTodayIST();
    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    let engineersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.mobile_number,
        a.status as attendance_status,
        a.check_in_time,
        a.check_out_time,
        a.worked_duration_minutes,
        a.check_in_latitude,
        a.check_in_longitude,
        a.check_in_address,
        a.check_out_latitude,
        a.check_out_longitude,
        a.check_out_address,
        a.last_activity_time,
        a.attendance_status as completion_status,
        COALESCE(COUNT(sc.id), 0) as assigned_calls_count
      FROM "user" u
      LEFT JOIN attendance a ON u.id = a.engineer_user_id 
        AND a.business_id = $1 
        AND a.attendance_date = $2
      LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id 
        AND sc.business_id = $1
        AND sc.call_status IN ('assigned', 'in_progress')
      WHERE u.business_id = $1 
        AND u.role = 'engineer'
    `;

    const params: any[] = [businessId, todayDate];

    if (managerId) {
      engineersQuery += ` AND u.manager_user_id = $3`;
      params.push(managerId);
    }

    engineersQuery += ` GROUP BY u.id, u.name, u.email, u.mobile_number, a.status, a.check_in_time, a.check_out_time, a.worked_duration_minutes, a.check_in_latitude, a.check_in_longitude, a.check_in_address, a.check_out_latitude, a.check_out_longitude, a.check_out_address, a.last_activity_time, a.attendance_status
      ORDER BY u.name ASC`;

    const engineers = await sql.raw(engineersQuery, params);

    // Get summary stats
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN a.status = 'checked_in' THEN u.id END) as checked_in_count,
        COUNT(DISTINCT CASE WHEN a.status = 'checked_out' THEN u.id END) as checked_out_count,
        COUNT(DISTINCT CASE WHEN a.status IS NULL THEN u.id END) as not_checked_in_count,
        COUNT(DISTINCT u.id) as total_engineers
      FROM "user" u
      LEFT JOIN attendance a ON u.id = a.engineer_user_id 
        AND a.business_id = $1 
        AND a.attendance_date = $2
      WHERE u.business_id = $1 
        AND u.role = 'engineer'
    `;

    const summaryParams: any[] = [businessId, todayDate];
    if (managerId) {
      summaryParams.push(managerId);
    }

    const summaryQuery2 = managerId 
      ? summaryQuery + ` AND u.manager_user_id = $3`
      : summaryQuery;

    const summary = await sql.raw(summaryQuery2, summaryParams);

    return NextResponse.json({
      success: true,
      engineers: engineers,
      summary: summary[0] || {
        checked_in_count: 0,
        checked_out_count: 0,
        not_checked_in_count: 0,
        total_engineers: 0,
      },
    });
  } catch (error) {
    console.error("[ATTENDANCE_MANAGER_DASHBOARD_API]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch attendance dashboard",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
