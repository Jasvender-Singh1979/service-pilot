import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only engineers can access their own attendance
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can access their attendance" },
        { status: 403 }
      );
    }

    const engineerId = user.id;
    const businessId = user.business_id;
    const todayDate = getTodayIST();

    // Get today's attendance record
    const attendance = await sql`
      SELECT 
        id,
        business_id,
        engineer_user_id,
        manager_user_id,
        attendance_date,
        check_in_time,
        check_out_time,
        status,
        notes,
        check_in_latitude,
        check_in_longitude,
        check_in_address,
        check_out_latitude,
        check_out_longitude,
        check_out_address,
        created_at,
        updated_at
      FROM attendance
      WHERE business_id = ${businessId}
      AND engineer_user_id = ${engineerId}
      AND attendance_date = ${todayDate}
    `;

    if (!attendance || attendance.length === 0) {
      // Return default "not checked in" status
      return NextResponse.json({
        status: "not_checked_in",
        checkInTime: null,
        checkOutTime: null,
        message: "Not checked in yet",
      });
    }

    const record = attendance[0];

    return NextResponse.json({
      id: record.id,
      status: record.status,
      checkInTime: record.check_in_time,
      checkOutTime: record.check_out_time,
      attendanceDate: record.attendance_date,
      notes: record.notes,
      checkInLatitude: record.check_in_latitude,
      checkInLongitude: record.check_in_longitude,
      checkInAddress: record.check_in_address,
      checkOutLatitude: record.check_out_latitude,
      checkOutLongitude: record.check_out_longitude,
      checkOutAddress: record.check_out_address,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  } catch (error) {
    console.error("[ATTENDANCE_TODAY_API FULL ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch attendance status",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
