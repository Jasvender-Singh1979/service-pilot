import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 });
    }

    // Check role
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can view their assigned service calls" },
        { status: 403 }
      );
    }

    // Get service call - verify it's assigned to this engineer
    const call = await sql`
      SELECT * FROM service_call 
      WHERE id = ${callId}
      AND assigned_engineer_user_id = ${userId}
      AND business_id = ${user.business_id}
    `;

    if (!call || call.length === 0) {
      return NextResponse.json(
        { error: "Service call not found or is not assigned to you" },
        { status: 404 }
      );
    }

    return NextResponse.json(call[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching service call detail:", errorMessage);
    return NextResponse.json(
      { error: `Failed to fetch service call: ${errorMessage}` },
      { status: 500 }
    );
  }
}
