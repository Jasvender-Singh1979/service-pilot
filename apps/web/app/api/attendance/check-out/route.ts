import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";
import { isSameDayIST } from "@/lib/istDateHelper";

interface CheckOutRequest {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
}

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

    // Guard: Validate date string before SQL
    if (todayDate === "NaN-NaN-NaN" || !todayDate || !/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) {
      console.error("[ATTENDANCE_CHECKOUT_API] Invalid date string:", { todayDate });
      return NextResponse.json(
        { error: "Invalid date calculation", details: { todayDate } },
        { status: 500 }
      );
    }

    const body = await request.json() as CheckOutRequest;
    const { latitude, longitude, accuracy, address } = body;

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

    // RULE: Prevent check-out without check-in
    if (!record.check_in_time) {
      return NextResponse.json(
        { error: "Cannot check out without checking in first" },
        { status: 400 }
      );
    }

    // RULE: Enforce same-day check-out (using safe IST date comparison)
    const checkInTime = new Date(record.check_in_time);
    const checkOutTime = new Date(nowIST);

    // Validate check-in and check-out are on the same calendar day (IST)
    if (!isSameDayIST(checkInTime, checkOutTime)) {
      return NextResponse.json(
        { error: "Cannot check out on a different day. Check out must be on the same day as check-in." },
        { status: 400 }
      );
    }

    // Validate check-out is after check-in
    if (checkOutTime <= checkInTime) {
      return NextResponse.json(
        { error: "Check-out time must be after check-in time" },
        { status: 400 }
      );
    }

    // Calculate worked duration in minutes
    const workedMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));

    // Update attendance record
    const updated = await sql`
      UPDATE attendance
      SET
        check_out_time = ${nowIST},
        check_out_latitude = ${latitude || null},
        check_out_longitude = ${longitude || null},
        check_out_accuracy = ${accuracy || null},
        check_out_address = ${address || null},
        status = 'checked_out',
        last_activity_time = ${nowIST},
        worked_duration_minutes = ${workedMinutes},
        attendance_status = 'complete',
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
