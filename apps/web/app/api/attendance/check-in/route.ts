import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";
import { v4 as uuidv4 } from "uuid";

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

    // Get today's date in IST
    const todayDate = getTodayIST();
    const nowIST = new Date().toISOString();

    // Step 1: SELECT existing attendance record for today
    const existingRecords = await sql`
      SELECT * FROM attendance
      WHERE business_id = ${businessId}
        AND engineer_user_id = ${engineerId}
        AND attendance_date = ${todayDate}
    `;

    let attendance;

    if (existingRecords.length > 0) {
      // Step 2: Record exists - UPDATE it
      const existingId = existingRecords[0].id;
      const updateResult = await sql`
        UPDATE attendance
        SET
          check_in_time = ${nowIST},
          status = 'checked_in',
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
          status
        )
        VALUES (
          ${uuidv4()},
          ${businessId},
          ${engineerId},
          ${managerId},
          ${todayDate},
          ${nowIST},
          'checked_in'
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
