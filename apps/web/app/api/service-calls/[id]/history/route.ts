import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET(
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

    // Both managers and engineers can view history
    if (user.role !== "manager" && user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only managers and engineers can view service call history" },
        { status: 403 }
      );
    }

    // Verify service call exists and belongs to this user
    let call;
    if (user.role === "manager") {
      call = await sql`
        SELECT id FROM service_call 
        WHERE id = ${id}
        AND manager_user_id = ${userId}
        AND business_id = ${user.business_id}
      `;
    } else {
      // Engineer can only view history for calls assigned to them
      call = await sql`
        SELECT id FROM service_call 
        WHERE id = ${id}
        AND assigned_engineer_user_id = ${userId}
        AND business_id = ${user.business_id}
      `;
    }

    if (!call || call.length === 0) {
      return NextResponse.json(
        { error: "Service call not found or does not belong to you" },
        { status: 404 }
      );
    }

    // Get history entries in reverse chronological order
    const history = await sql`
      SELECT 
        id,
        service_call_id,
        actor_user_id,
        actor_role,
        event_type,
        note_text,
        event_timestamp
      FROM service_call_history
      WHERE service_call_id = ${id}
      ORDER BY event_timestamp DESC
    `;

    return NextResponse.json(history);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching service call history:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to fetch service call history: ${errorMessage}` },
      { status: 500 }
    );
  }
}
