import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function PUT(
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
    const body = await request.json();
    // Support both 'status' (from quick actions) and 'newStatus' (from detail page actions)
    const newStatus = body.newStatus || body.status;
    const note = body.note;

    if (!newStatus) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Engineer role check
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can update call status" },
        { status: 403 }
      );
    }

    // Get service call - verify it's assigned to this engineer
    const call = await sql`
      SELECT id, call_status FROM service_call 
      WHERE id = ${id}
      AND assigned_engineer_user_id = ${userId}
      AND business_id = ${user.business_id}
    `;

    if (!call || call.length === 0) {
      return NextResponse.json(
        { error: "Service call not found or is not assigned to you" },
        { status: 404 }
      );
    }

    const serviceCall = call[0];
    const currentStatus = serviceCall.call_status;

    // Validate status transitions
    let isValidTransition = false;
    let eventType = "status_changed";
    let requiresNote = false;

    if (currentStatus === "assigned" && newStatus === "in_progress") {
      isValidTransition = true;
      eventType = "call_started";
    } else if (currentStatus === "in_progress" && newStatus === "pending_action_required") {
      isValidTransition = true;
      eventType = "marked_pending_action_required";
      requiresNote = true;
    } else if (currentStatus === "in_progress" && newStatus === "pending_under_services") {
      isValidTransition = true;
      eventType = "marked_pending_under_services";
      requiresNote = true;
    }

    if (!isValidTransition) {
      return NextResponse.json(
        { 
          error: `Invalid status transition from ${currentStatus} to ${newStatus}. Engineers can: 1) Mark 'assigned' as 'in_progress', 2) Mark 'in_progress' as 'pending_action_required', 3) Mark 'in_progress' as 'pending_under_services'` 
        },
        { status: 400 }
      );
    }

    // For quick actions without notes, auto-generate a note based on status
    let finalNote = note;
    if (requiresNote && (!note || !note.trim())) {
      // Auto-generate note for quick actions
      if (newStatus === "pending_action_required") {
        finalNote = "Waiting for customer action";
      } else if (newStatus === "pending_under_services") {
        finalNote = "Waiting for service materials or parts";
      }
    }

    // Update the service call status
    const result = await sql`
      UPDATE service_call
      SET call_status = ${newStatus},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Create history entry for status change
    await sql`
      INSERT INTO service_call_history (
        id,
        service_call_id,
        business_id,
        manager_user_id,
        actor_user_id,
        actor_role,
        event_type,
        note_text,
        event_timestamp
      ) VALUES (
        ${crypto.randomUUID()},
        ${id},
        ${user.business_id},
        (SELECT manager_user_id FROM service_call WHERE id = ${id}),
        ${userId},
        'engineer',
        ${eventType},
        ${finalNote ? finalNote.trim() : null},
        NOW()
      )
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating call status:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to update call status: ${errorMessage}` },
      { status: 500 }
    );
  }
}
