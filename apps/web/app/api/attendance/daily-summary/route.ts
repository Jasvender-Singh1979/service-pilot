import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

/**
 * GET /api/attendance/daily-summary
 * Fetch daily attendance summary for an engineer within a date range.
 * Legacy endpoint - kept for backward compatibility.
 * Use /api/attendance/report instead for new code.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can view
    if (!["manager", "super_admin"].includes(user.role || "")) {
      return NextResponse.json(
        { error: "Only managers can view summary" },
        { status: 403 }
      );
    }

    const businessId = user.business_id;
    const managerId = user.role === "super_admin" ? null : user.id;

    const { searchParams } = new URL(request.url);
    const engineer_id = searchParams.get("engineer_id");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");

    if (!engineer_id || !from_date || !to_date) {
      return NextResponse.json(
        { error: "Missing required parameters: engineer_id, from_date, to_date" },
        { status: 400 }
      );
    }

    // Fetch records
    const records = await sql`
      SELECT
        attendance_date,
        engineer_user_id,
        check_in_time,
        check_out_time,
        worked_duration_minutes,
        attendance_status,
        missed_checkout,
        status
      FROM attendance
      WHERE business_id = ${businessId}
        AND engineer_user_id = ${engineer_id}
        AND attendance_date >= ${from_date}::date
        AND attendance_date <= ${to_date}::date
      ORDER BY attendance_date DESC
    `;

    // Calculate summary stats
    const summary = {
      total_days: records.length,
      complete_days: records.filter((r: any) => r.attendance_status === "complete").length,
      incomplete_days: records.filter((r: any) => r.attendance_status === "incomplete").length,
      missed_checkout_count: records.filter((r: any) => r.missed_checkout).length,
      total_worked_hours: records.reduce((sum: number, r: any) => sum + (r.worked_duration_minutes || 0), 0) / 60,
      average_daily_hours: 0,
    };

    if (summary.complete_days > 0) {
      const hoursOnCompleteDays = records
        .filter((r: any) => r.attendance_status === "complete")
        .reduce((sum: number, r: any) => sum + (r.worked_duration_minutes || 0), 0) / 60;
      summary.average_daily_hours = Math.round((hoursOnCompleteDays / summary.complete_days) * 10) / 10;
    }

    return NextResponse.json({
      success: true,
      records,
      summary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ATTENDANCE_DAILY_SUMMARY_API]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch daily summary" },
      { status: 500 }
    );
  }
}
