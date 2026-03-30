import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can add notes to service calls" },
        { status: 403 }
      );
    }

    const { special_note_to_engineer } = await request.json();

    if (!special_note_to_engineer || !special_note_to_engineer.trim()) {
      return NextResponse.json(
        { error: "Note text is required" },
        { status: 400 }
      );
    }

    // Get service call to verify ownership and status
    const call = await sql`
      SELECT id, call_status FROM service_call 
      WHERE id = ${id}
      AND manager_user_id = ${userId}
      AND business_id = ${user.business_id}
    `;

    if (!call || call.length === 0) {
      return NextResponse.json(
        { error: "Service call not found or does not belong to you" },
        { status: 404 }
      );
    }

    const serviceCall = call[0];

    // Do not allow editing notes on closed or cancelled calls
    if (serviceCall.call_status === "closed" || serviceCall.call_status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot edit notes on closed or cancelled calls" },
        { status: 400 }
      );
    }

    // Update service call with note
    const result = await sql`
      UPDATE service_call SET
        special_note_to_engineer = ${special_note_to_engineer.trim()},
        special_note_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, special_note_to_engineer, special_note_updated_at
    `;

    // Create history entry
    await sql`
      INSERT INTO service_call_history (
        service_call_id,
        business_id,
        manager_user_id,
        actor_user_id,
        actor_role,
        event_type,
        note_text,
        event_timestamp
      ) VALUES (
        ${id},
        ${user.business_id},
        ${userId},
        ${userId},
        'manager',
        'special_note_updated',
        ${special_note_to_engineer.trim()},
        NOW()
      )
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[NOTE_UPDATE_ERROR]", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : "N/A",
    });
    return NextResponse.json(
      { error: `Failed to update special note: ${errorMessage}` },
      { status: 500 }
    );
  }
}
