import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

/**
 * GET /api/attendance/report
 * Manager API to fetch attendance report for a specific engineer within a date range.
 *
 * Query params:
 * - engineer_id: required
 * - start_date: YYYY-MM-DD (IST date)
 * - end_date: YYYY-MM-DD (IST date)
 */
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

    const businessId = user.business_id;

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

    // Fetch attendance records for the date range
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

    // Calculate summary
    const summary = {
      total_days: records.length,
      complete_days: records.filter(
        (r: any) => r.attendance_status === "complete"
      ).length,
      incomplete_days: records.filter(
        (r: any) => r.attendance_status === "incomplete"
      ).length,
      total_worked_minutes: records.reduce(
        (sum: number, r: any) => sum + (r.worked_duration_minutes || 0),
        0
      ),
    };

    return NextResponse.json({
      engineer: engineerData,
      records,
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
