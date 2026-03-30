import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only engineers can check out
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can check out" },
        { status: 403 }
      );
    }

    const engineerId = user.id;
    const businessId = user.business_id;
    const todayDate = getTodayIST();
    const nowIST = new Date().toISOString();

    // Get today's attendance record
    const existingAttendance = await sql`
      SELECT * FROM attendance
      WHERE business_id = ${businessId}
      AND engineer_user_id = ${engineerId}
      AND attendance_date = ${todayDate}
    `;

    if (!existingAttendance || existingAttendance.length === 0) {
      return NextResponse.json(
        { error: "No check-in found for today. Please check in first." },
        { status: 400 }
      );
    }

    const record = existingAttendance[0];

    // Validate check-in exists
    if (!record.check_in_time) {
      return NextResponse.json(
        { error: "Cannot check out without checking in first" },
        { status: 400 }
      );
    }

    // Validate check-out is after check-in
    const checkInTime = new Date(record.check_in_time);
    const checkOutTime = new Date(nowIST);

    if (checkOutTime <= checkInTime) {
      return NextResponse.json(
        { error: "Check-out time must be after check-in time" },
        { status: 400 }
      );
    }

    // Update attendance record
    const updated = await sql`
      UPDATE attendance
      SET
        check_out_time = ${nowIST},
        status = 'checked_out',
        updated_at = NOW()
      WHERE business_id = ${businessId}
      AND engineer_user_id = ${engineerId}
      AND attendance_date = ${todayDate}
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      message: "Checked out successfully",
      attendance: updated[0],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ATTENDANCE_CHECKOUT_API]", errorMessage);
    return NextResponse.json(
      { error: "Failed to check out" },
      { status: 500 }
    );
  }
}
