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

    const { templateId, sentTo } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Verify the call exists and user has access
    const callResult = await sql`
      SELECT id, business_id FROM service_call WHERE id = ${id}
    `;

    if (!callResult || callResult.length === 0) {
      return NextResponse.json(
        { error: "Service call not found" },
        { status: 404 }
      );
    }

    const call = callResult[0];

    // Verify user has access to this call's business
    if (call.business_id !== user.business_id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Log the template send
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await sql`
      INSERT INTO template_send_log (id, business_id, call_id, template_id, sent_at, sent_to)
      VALUES (${logId}, ${user.business_id}, ${id}, ${templateId}, CURRENT_TIMESTAMP, ${sentTo || 'customer'})
    `;

    return NextResponse.json({ success: true, logId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error logging template send:", errorMessage);
    return NextResponse.json(
      { error: "Failed to log template send" },
      { status: 500 }
    );
  }
}

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

    // Verify the call exists and user has access
    const callResult = await sql`
      SELECT business_id FROM service_call WHERE id = ${id}
    `;

    if (!callResult || callResult.length === 0) {
      return NextResponse.json(
        { error: "Service call not found" },
        { status: 404 }
      );
    }

    const call = callResult[0];

    if (call.business_id !== user.business_id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get all templates sent for this call
    const sentTemplates = await sql`
      SELECT DISTINCT template_id FROM template_send_log
      WHERE call_id = ${id}
      ORDER BY sent_at DESC
    `;

    const templateIds = sentTemplates.map((row: any) => row.template_id);

    return NextResponse.json({ sentTemplates: templateIds });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching template send logs:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch template send logs" },
      { status: 500 }
    );
  }
}
