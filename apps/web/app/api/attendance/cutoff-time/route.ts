import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/attendance/cutoff-time
 * Get the cutoff time setting for manager/business
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = user.business_id;
    if (!businessId) {
      return NextResponse.json({ error: "No business assigned" }, { status: 400 });
    }

    // Get cutoff time for this business
    const settings = await sql`
      SELECT checkin_cutoff_time
      FROM manager_attendance_settings
      WHERE business_id = ${businessId}
      LIMIT 1
    `;

    const cutoffTime = settings.length > 0 ? settings[0].checkin_cutoff_time : null;

    return NextResponse.json({
      cutoff_time: cutoffTime, // Format: "HH:MM" in 24-hour, IST timezone
    });
  } catch (error) {
    console.error("Error getting cutoff time:", error);
    return NextResponse.json({ error: "Failed to get cutoff time" }, { status: 500 });
  }
}

/**
 * POST /api/attendance/cutoff-time
 * Set the cutoff time for manager/business
 *
 * Body: { cutoff_time: "09:30" } (24-hour format, IST)
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can set cutoff
    if (!["manager", "super_admin"].includes(user.role || "")) {
      return NextResponse.json(
        { error: "Only managers can set cutoff time" },
        { status: 403 }
      );
    }

    const businessId = user.business_id;
    if (!businessId) {
      return NextResponse.json({ error: "No business assigned" }, { status: 400 });
    }

    const { cutoff_time } = await request.json();

    // Validate time format (HH:MM)
    if (!cutoff_time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutoff_time)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM (24-hour)" },
        { status: 400 }
      );
    }

    // Check if settings exist
    const existing = await sql`
      SELECT id FROM manager_attendance_settings
      WHERE business_id = ${businessId}
      LIMIT 1
    `;

    try {
      if (existing.length > 0) {
        // Update existing
        const updateResult = await sql`
          UPDATE manager_attendance_settings
          SET checkin_cutoff_time = ${cutoff_time}, updated_at = NOW()
          WHERE business_id = ${businessId}
          RETURNING id, checkin_cutoff_time, updated_at
        `;
        console.log("[CUTOFF_TIME_UPDATE_SUCCESS]", {
          businessId,
          cutoff_time,
          updated_at: updateResult[0]?.updated_at,
        });
      } else {
        // Create new with explicit timestamps and manager_user_id
        const insertResult = await sql`
          INSERT INTO manager_attendance_settings (
            id,
            business_id,
            manager_user_id,
            checkin_cutoff_time,
            created_at,
            updated_at
          ) VALUES (
            ${uuidv4()},
            ${businessId},
            ${user.id},
            ${cutoff_time},
            NOW(),
            NOW()
          )
          RETURNING id, checkin_cutoff_time, created_at, updated_at
        `;
        console.log("[CUTOFF_TIME_INSERT_SUCCESS]", {
          id: insertResult[0]?.id,
          businessId,
          cutoff_time,
          created_at: insertResult[0]?.created_at,
          updated_at: insertResult[0]?.updated_at,
        });
      }
    } catch (dbError) {
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      console.error("[CUTOFF_TIME_DB_ERROR]", {
        businessId,
        cutoff_time,
        error: dbErrorMessage,
        stack: dbError instanceof Error ? dbError.stack : undefined,
      });
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: dbErrorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cutoff_time,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CUTOFF_TIME_API_ERROR]", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to set cutoff time", details: errorMessage },
      { status: 500 }
    );
  }
}
