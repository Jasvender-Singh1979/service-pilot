import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";

/**
 * GET /api/attendance/manager-dashboard
 * Manager API to view real-time attendance status of all assigned engineers.
 *
 * Returns:
 * - engineers: list of engineers with today's attendance info
 * - summary: count of checked-in, checked-out, not-checked-in
 */
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
    const managerId = user.role === "super_admin" ? null : user.id;
    const todayDate = getTodayIST();

    // Fetch all engineers for this manager/business
    let engineers: any[];

    if (managerId) {
      engineers = await sql`
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
          COALESCE(
            (SELECT COUNT(*) FROM service_call 
              WHERE assigned_engineer_user_id = u.id 
                AND business_id = ${businessId}
                AND call_status IN ('assigned', 'in_progress')),
            0
          ) as assigned_calls_count
        FROM "user" u
        LEFT JOIN attendance a ON u.id = a.engineer_user_id
          AND a.business_id = ${businessId}
          AND a.attendance_date = ${todayDate}
        WHERE u.business_id = ${businessId}
          AND u.role = 'engineer'
          AND u.manager_user_id = ${managerId}
        ORDER BY u.name ASC
      `;
    } else {
      engineers = await sql`
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
          COALESCE(
            (SELECT COUNT(*) FROM service_call 
              WHERE assigned_engineer_user_id = u.id 
                AND business_id = ${businessId}
                AND call_status IN ('assigned', 'in_progress')),
            0
          ) as assigned_calls_count
        FROM "user" u
        LEFT JOIN attendance a ON u.id = a.engineer_user_id
          AND a.business_id = ${businessId}
          AND a.attendance_date = ${todayDate}
        WHERE u.business_id = ${businessId}
          AND u.role = 'engineer'
        ORDER BY u.name ASC
      `;
    }

    // Get summary
    let summary;

    if (managerId) {
      const stats = await sql`
        SELECT
          COUNT(DISTINCT CASE WHEN a.status = 'checked_in' THEN u.id END) as checked_in_count,
          COUNT(DISTINCT CASE WHEN a.status = 'checked_out' THEN u.id END) as checked_out_count,
          COUNT(DISTINCT CASE WHEN a.status IS NULL THEN u.id END) as not_checked_in_count,
          COUNT(DISTINCT u.id) as total_engineers
        FROM "user" u
        LEFT JOIN attendance a ON u.id = a.engineer_user_id
          AND a.business_id = ${businessId}
          AND a.attendance_date = ${todayDate}
        WHERE u.business_id = ${businessId}
          AND u.role = 'engineer'
          AND u.manager_user_id = ${managerId}
      `;
      summary = stats[0] || {
        checked_in_count: 0,
        checked_out_count: 0,
        not_checked_in_count: 0,
        total_engineers: 0,
      };
    } else {
      const stats = await sql`
        SELECT
          COUNT(DISTINCT CASE WHEN a.status = 'checked_in' THEN u.id END) as checked_in_count,
          COUNT(DISTINCT CASE WHEN a.status = 'checked_out' THEN u.id END) as checked_out_count,
          COUNT(DISTINCT CASE WHEN a.status IS NULL THEN u.id END) as not_checked_in_count,
          COUNT(DISTINCT u.id) as total_engineers
        FROM "user" u
        LEFT JOIN attendance a ON u.id = a.engineer_user_id
          AND a.business_id = ${businessId}
          AND a.attendance_date = ${todayDate}
        WHERE u.business_id = ${businessId}
          AND u.role = 'engineer'
      `;
      summary = stats[0] || {
        checked_in_count: 0,
        checked_out_count: 0,
        not_checked_in_count: 0,
        total_engineers: 0,
      };
    }

    return NextResponse.json({
      success: true,
      engineers,
      summary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ATTENDANCE_MANAGER_DASHBOARD_API]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch attendance dashboard" },
      { status: 500 }
    );
  }
}
