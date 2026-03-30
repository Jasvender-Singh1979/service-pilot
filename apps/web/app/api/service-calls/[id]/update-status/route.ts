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
    const { newStatus } = await request.json();

    if (!newStatus) {
      return NextResponse.json({ error: "newStatus is required" }, { status: 400 });
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

    // Engineer can only update from 'assigned' to 'in_progress'
    if (serviceCall.call_status !== 'assigned' || newStatus !== 'in_progress') {
      return NextResponse.json(
        { error: "Engineers can only mark assigned calls as in_progress" },
        { status: 400 }
      );
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
        service_call_id,
        business_id,
        manager_user_id,
        actor_user_id,
        actor_role,
        event_type,
        event_timestamp
      ) VALUES (
        ${id},
        ${user.business_id},
        (SELECT manager_user_id FROM service_call WHERE id = ${id}),
        ${userId},
        'engineer',
        'status_changed',
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
