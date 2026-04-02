import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";
import { checkTimeliness } from "@/lib/istDateHelper";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can access team attendance
    if (user.role !== "manager" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only managers can access team attendance" },
        { status: 403 }
      );
    }

    const managerId = user.role === "super_admin" ? null : user.id;
    const businessId = user.business_id;
    const todayDate = getTodayIST();

    // Guard: Validate business_id exists
    if (!businessId) {
      console.error("[ATTENDANCE_TEAM_API] No business_id on user:", { userId: user.id, role: user.role });
      return NextResponse.json(
        { error: "User has no business assigned" },
        { status: 400 }
      );
    }

    // Guard: Validate date string before SQL
    if (todayDate === "NaN-NaN-NaN" || !todayDate || !/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) {
      console.error("[ATTENDANCE_TEAM_API] Invalid date string:", { todayDate });
      return NextResponse.json(
        { error: "Invalid date calculation", details: { todayDate } },
        { status: 500 }
      );
    }

    // Fetch cutoff time for this business
    const settingsResult = await sql`
      SELECT checkin_cutoff_time
      FROM manager_attendance_settings
      WHERE business_id = ${businessId}
      LIMIT 1
    `;
    const cutoffTime = settingsResult.length > 0 ? settingsResult[0].checkin_cutoff_time : null;

    // Get all engineers under this manager/business
    let engineers: any[];
    if (managerId) {
      engineers = await sql`
        SELECT 
          id,
          name,
          email,
          mobile_number
        FROM "user"
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND role = 'engineer'
        AND is_active = true
        ORDER BY name ASC
      `;
    } else {
      // For super_admin, get all engineers in the business
      engineers = await sql`
        SELECT 
          id,
          name,
          email,
          mobile_number
        FROM "user"
        WHERE business_id = ${businessId}
        AND role = 'engineer'
        AND is_active = true
        ORDER BY name ASC
      `;
    }

    // Get attendance records for today
    let attendanceRecords: any[];
    if (managerId) {
      attendanceRecords = await sql`
        SELECT 
          id,
          engineer_user_id,
          attendance_date,
          check_in_time,
          check_out_time,
          attendance_status,
          notes
        FROM attendance
        WHERE business_id = ${businessId}
        AND manager_user_id = ${managerId}
        AND attendance_date = ${todayDate}
      `;
    } else {
      // For super_admin, get all attendance records for the business
      attendanceRecords = await sql`
        SELECT 
          id,
          engineer_user_id,
          attendance_date,
          check_in_time,
          check_out_time,
          attendance_status,
          notes
        FROM attendance
        WHERE business_id = ${businessId}
        AND attendance_date = ${todayDate}
      `;
    }

    // Create a map of attendance by engineer ID for quick lookup
    const attendanceMap = new Map();
    attendanceRecords.forEach((record: any) => {
      attendanceMap.set(record.engineer_user_id, record);
    });

    // Build team attendance list
    const teamAttendance = engineers.map((engineer: any) => {
      const attendance = attendanceMap.get(engineer.id);
      
      // Determine status: absent, on_time, or late (only if checked in)
      let timeliness: string | null = null;
      let status = "not_checked_in";
      
      if (attendance?.check_in_time) {
        // Has check-in, so either on_time or late depending on cutoff
        timeliness = checkTimeliness(attendance.check_in_time, cutoffTime);
        status = attendance?.check_out_time ? "checked_out" : "checked_in";
      }
      
      return {
        engineerId: engineer.id,
        engineerName: engineer.name,
        engineerEmail: engineer.email,
        engineerMobile: engineer.mobile_number,
        status, // "checked_in", "checked_out", or "not_checked_in"
        timeliness, // "on_time", "late", or null (only meaningful if status != "not_checked_in")
        checkInTime: attendance?.check_in_time || null,
        checkOutTime: attendance?.check_out_time || null,
        notes: attendance?.notes || null,
      };
    });

    // Calculate summary (include timeliness in counts)
    const checkedIn = teamAttendance.filter((a) => a.status === "checked_in").length;
    const checkedOut = teamAttendance.filter((a) => a.status === "checked_out").length;
    const notCheckedIn = teamAttendance.filter((a) => a.status === "not_checked_in").length;
    const onTime = teamAttendance.filter((a) => a.timeliness === "on_time").length;
    const late = teamAttendance.filter((a) => a.timeliness === "late").length;

    return NextResponse.json({
      date: todayDate,
      summary: {
        total: teamAttendance.length,
        checkedIn,
        checkedOut,
        notCheckedIn,
        onTime,      // NEW: count of engineers who checked in on time
        late,        // NEW: count of engineers who checked in late
      },
      team: teamAttendance,
      cutoffTime,  // Return cutoff time so frontend can display it if needed
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("[ATTENDANCE_TEAM_API] ERROR:", { errorMessage, errorStack, error });
    return NextResponse.json(
      { error: "Failed to fetch team attendance", details: errorMessage },
      { status: 500 }
    );
  }
}
