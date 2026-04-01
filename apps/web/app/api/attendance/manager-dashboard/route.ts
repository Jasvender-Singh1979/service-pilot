import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";
import { checkTimeliness } from "@/lib/attendanceUtils";

/**
 * GET /api/attendance/manager-dashboard
 * Manager API to view real-time attendance status of all assigned engineers.
 *
 * Returns:
 * - engineers: list of engineers with today's attendance info, including timeliness
 * - summary: count of checked-in, checked-out, not-checked-in, on_time, late
 * - cutoffTime: the configured cutoff time for punctuality
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

    // Guard: Validate date string before SQL
    if (todayDate === "NaN-NaN-NaN" || !todayDate || !/^\\d{4}-\\d{2}-\\d{2}$/.test(todayDate)) {
      console.error("[ATTENDANCE_MANAGER_DASHBOARD_API] Invalid date string:", { todayDate });
      return NextResponse.json(
        { error: "Invalid date calculation", details: { todayDate } },
        { status: 500 }
      );
    }

    // Fetch cutoff time for this business (CRITICAL for timeliness calculation)
    const settingsResult = await sql`
      SELECT checkin_cutoff_time
      FROM manager_attendance_settings
      WHERE business_id = ${businessId}
      LIMIT 1
    `;
    const cutoffTime = settingsResult.length > 0 ? settingsResult[0].checkin_cutoff_time : null;

    // Fetch all engineers for this manager/business
    let engineers: any[];

    if (managerId) {
      engineers = await sql`
        SELECT
          u.id,
          u.name,
          u.email,
          u.mobile_number,
          a.attendance_status,
          a.check_in_time,
          a.check_out_time,
          a.worked_duration_minutes,
          a.check_in_latitude,
          a.check_in_longitude,
          a.check_in_address,
          a.check_out_latitude,
          a.check_out_longitude,
          a.check_out_address,
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
          a.attendance_status,
          a.check_in_time,
          a.check_out_time,
          a.worked_duration_minutes,
          a.check_in_latitude,
          a.check_in_longitude,
          a.check_in_address,
          a.check_out_latitude,
          a.check_out_longitude,
          a.check_out_address,
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

    // Compute timeliness for each engineer using shared utility
    const engineersWithTimeliness = engineers.map((eng: any) => {
      let timeliness: string | null = null;
      if (eng.check_in_time) {
        timeliness = checkTimeliness(eng.check_in_time, cutoffTime);
      }
      return {
        ...eng,
        timeliness, // "on_time", "late", or null
      };
    });

    // Calculate summary including timeliness counts
    const checkedInCount = engineersWithTimeliness.filter((e: any) => e.attendance_status === 'checked_in').length;
    const checkedOutCount = engineersWithTimeliness.filter((e: any) => e.attendance_status === 'checked_out').length;
    const notCheckedInCount = engineersWithTimeliness.filter((e: any) => !e.attendance_status).length;
    const onTimeCount = engineersWithTimeliness.filter((e: any) => e.timeliness === 'on_time').length;
    const lateCount = engineersWithTimeliness.filter((e: any) => e.timeliness === 'late').length;

    const summary = {
      checked_in_count: checkedInCount,
      checked_out_count: checkedOutCount,
      not_checked_in_count: notCheckedInCount,
      total_engineers: engineersWithTimeliness.length,
      on_time_count: onTimeCount,  // NEW: count of on-time check-ins
      late_count: lateCount,        // NEW: count of late check-ins
    };

    return NextResponse.json({
      success: true,
      engineers: engineersWithTimeliness,
      summary,
      cutoffTime,  // Return cutoff time so frontend can display it if needed
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
