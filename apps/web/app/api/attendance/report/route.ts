import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { checkTimeliness } from "@/lib/attendanceUtils";
import { getCustomRangeIST } from "@/lib/dateUtils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can fetch reports
    if (!["manager", "super_admin"].includes(user.role || "")) {
      return NextResponse.json(
        { error: "Only managers can fetch reports" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const engineerId = url.searchParams.get("engineer_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!engineerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: engineer_id, start_date, end_date" },
        { status: 400 }
      );
    }

    // CRITICAL: startDate and endDate MUST be in IST calendar date format (YYYY-MM-DD)
    // They should come from the frontend using getTodayIST() or getISTDateNDaysAgo()
    // NOT from browser's local date picker
    console.log('[ATTENDANCE_REPORT_API] Received date range:', {
      startDate,
      endDate,
      engineerId,
    });

    const businessId = user.business_id;

    // DEBUG: Log input parameters
    console.log('[ATTENDANCE_REPORT_DEBUG] Input parameters:', {
      engineerId,
      startDate,
      endDate,
      businessId,
      userRole: user.role,
    });

    // CRITICAL: The report receives startDate and endDate as YYYY-MM-DD strings
    // from the browser date picker. These are supposed to be IST calendar dates.
    // We filter attendance_date (which is a DATE column storing IST dates) using direct comparison.
    // This works because attendance_date stores IST calendar dates (e.g., "2026-04-02")
    // and the browser sends IST calendar dates (e.g., "2026-04-02").
    // They match directly - no conversion needed for DATE column comparison.
    
    // However, if the dates come from a browser in a different timezone,
    // we should ideally convert them. For now, we assume the business operates in IST.
    // TODO: If supporting multiple timezones, add business timezone config and convert accordingly.

    // Fetch cutoff time for this business
    const settingsResult = await sql`
      SELECT checkin_cutoff_time
      FROM manager_attendance_settings
      WHERE business_id = ${businessId}
      LIMIT 1
    `;
    const cutoffTime = settingsResult.length > 0 ? settingsResult[0].checkin_cutoff_time : null;

    // Fetch engineer details
    const engineer = await sql`
      SELECT id, name, email, mobile_number
      FROM "user"
      WHERE id = ${engineerId} AND business_id = ${businessId}
    `;

    if (!engineer || engineer.length === 0) {
      return NextResponse.json(
        { error: "Engineer not found" },
        { status: 404 }
      );
    }

    const engineerData = engineer[0];

    // DEBUG: Check all attendance records for this engineer (regardless of date)
    const allRecords = await sql`
      SELECT
        id,
        attendance_date,
        check_in_time,
        check_out_time,
        created_at
      FROM attendance
      WHERE
        business_id = ${businessId}
        AND engineer_user_id = ${engineerId}
      ORDER BY attendance_date DESC
      LIMIT 10
    `;
    console.log('[ATTENDANCE_REPORT_DEBUG] All attendance records for engineer (last 10):', allRecords);

    // Fetch attendance records for the date range
    // attendance_date is an IST calendar date (DATE type)
    // Direct comparison works: WHERE attendance_date >= '2026-04-02' matches IST Apr 2
    const records = await sql`
      SELECT
        attendance_date,
        check_in_time,
        check_out_time,
        check_in_latitude,
        check_in_longitude,
        check_in_address,
        check_out_latitude,
        check_out_longitude,
        check_out_address,
        worked_duration_minutes,
        attendance_status
      FROM attendance
      WHERE
        business_id = ${businessId}
        AND engineer_user_id = ${engineerId}
        AND attendance_date >= ${startDate}::date
        AND attendance_date <= ${endDate}::date
      ORDER BY attendance_date DESC
    `;
    
    console.log('[ATTENDANCE_REPORT_DEBUG] Filtered records for range:', {
      startDate,
      endDate,
      recordCount: records.length,
      records: records,
    });"

    // Derive attendance status from check-in/check-out
    // RULES for status (from selected date range):
    // 1. No check-in for a day => ABSENT
    // 2. Check-in exists but no check-out => INVALID (incomplete)
    // 3. Both check-in & check-out on same day => PRESENT
    // On Time / Late applies only to PRESENT records, based on cutoff time
    const recordsWithStatus = records.map((r: any) => {
      const status = !r.check_in_time
        ? "Absent"
        : !r.check_out_time
          ? "Invalid"
          : "Present";

      // Calculate timeliness for PRESENT records only
      let timeliness: string | null = null;
      if (status === "Present" && r.check_in_time) {
        timeliness = checkTimeliness(r.check_in_time, cutoffTime);
      }

      return {
        ...r,
        status,
        timeliness, // "on_time", "late", or null if no cutoff
      };
    });

    // Calculate summary from selected date range
    const presentCount = recordsWithStatus.filter(
      (r: any) => r.status === "Present"
    ).length;
    const absentCount = recordsWithStatus.filter(
      (r: any) => r.status === "Absent"
    ).length;
    const invalidCount = recordsWithStatus.filter(
      (r: any) => r.status === "Invalid"
    ).length;
    const onTimeCount = recordsWithStatus.filter(
      (r: any) => r.timeliness === "on_time"
    ).length;
    const lateCount = recordsWithStatus.filter(
      (r: any) => r.timeliness === "late"
    ).length;
    const totalWorkedMinutes = recordsWithStatus.reduce(
      (sum: number, r: any) => sum + (r.worked_duration_minutes || 0),
      0
    );

    // Total days = actual number of days in the selected date range (not just records with entries)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dayDiffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const totalDaysInRange = Math.ceil(dayDiffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

    const summary = {
      total_days: totalDaysInRange, // Total days in the selected range
      present_count: presentCount, // Days with check-in AND check-out
      absent_count: absentCount,   // Days with NO check-in
      invalid_count: invalidCount, // Days with check-in but NO check-out
      on_time_count: onTimeCount,  // Present days where check-in was on or before cutoff
      late_count: lateCount,       // Present days where check-in was after cutoff
      total_worked_minutes: totalWorkedMinutes, // Sum of worked_duration_minutes for all Present days
    };

    return NextResponse.json({
      engineer: engineerData,
      records: recordsWithStatus,
      summary,
      date_range: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ATTENDANCE_REPORT_API]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch attendance report" },
      { status: 500 }
    );
  }
}
