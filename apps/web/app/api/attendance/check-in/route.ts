import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";
import { v4 as uuidv4 } from "uuid";

interface CheckInRequest {
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

    // Only engineers can check in
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can check in" },
        { status: 403 }
      );
    }

    const engineerId = user.id;
    const businessId = user.business_id;
    const managerId = user.manager_user_id;

    if (!managerId) {
      return NextResponse.json(
        { error: "Engineer must have a manager assigned" },
        { status: 400 }
      );
    }

    const body = await request.json() as CheckInRequest;
    const { latitude, longitude, accuracy, address } = body;

    // Get today's date in IST
    const todayDate = getTodayIST();
    const nowIST = new Date().toISOString();

    // DEBUG: Log timezone and date calculation
    console.log('[ATTENDANCE_CHECKIN_DEBUG] Date calculation:', {
      nowIST,
      todayDate,
      engineerId,
      businessId,
    });

    // Guard: Validate date string before SQL
    if (todayDate === "NaN-NaN-NaN" || !todayDate || !/^\\d{4}-\\d{2}-\\d{2}$/.test(todayDate)) {
      console.error("[ATTENDANCE_CHECKIN_API] Invalid date string:", { todayDate });
      return NextResponse.json(
        { error: "Invalid date calculation", details: { todayDate } },
        { status: 500 }
      );
    }

    // Step 1: SELECT existing attendance record for today
    const existingRecords = await sql`
      SELECT * FROM attendance
      WHERE business_id = ${businessId}
        AND engineer_user_id = ${engineerId}
        AND attendance_date = ${todayDate}
    `;

    // DEBUG: Log existing records
    console.log('[ATTENDANCE_CHECKIN_DEBUG] Query for existing records:', {
      todayDate,
      engineerId,
      businessId,
      foundRecords: existingRecords.length,
      firstRecord: existingRecords.length > 0 ? existingRecords[0] : null,
    });

    // RULE: Prevent duplicate check-in
    if (existingRecords.length > 0 && existingRecords[0].check_in_time) {
      return NextResponse.json(
        { error: "Already checked in today. Please check out first." },
        { status: 400 }
      );
    }

    let attendance;

    if (existingRecords.length > 0) {
      // Step 2: Record exists - UPDATE it
      const existingId = existingRecords[0].id;
      const updateResult = await sql`
        UPDATE attendance
        SET
          check_in_time = ${nowIST},
          check_in_latitude = ${latitude || null},
          check_in_longitude = ${longitude || null},
          check_in_accuracy = ${accuracy || null},
          check_in_address = ${address || null},
          status = 'checked_in',
          last_activity_time = ${nowIST},
          attendance_status = 'incomplete',
          updated_at = NOW()
        WHERE id = ${existingId}
        RETURNING *
      `;
      attendance = updateResult;
    } else {
      // Step 3: No record exists - INSERT new one
      const insertResult = await sql`
        INSERT INTO attendance (
          id,
          business_id,
          engineer_user_id,
          manager_user_id,
          attendance_date,
          check_in_time,
          check_in_latitude,
          check_in_longitude,
          check_in_accuracy,
          check_in_address,
          status,
          last_activity_time,
          attendance_status
        )
        VALUES (
          ${uuidv4()},
          ${businessId},
          ${engineerId},
          ${managerId},
          ${todayDate},
          ${nowIST},
          ${latitude || null},
          ${longitude || null},
          ${accuracy || null},
          ${address || null},
          'checked_in',
          ${nowIST},
          'incomplete'
        )
        RETURNING *
      `;
      attendance = insertResult;
    }

    return NextResponse.json({
      success: true,
      message: "Checked in successfully",
      attendance: attendance[0],
    });
  } catch (error) {
    console.error("[ATTENDANCE_CHECKIN_API FULL ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to check in",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
