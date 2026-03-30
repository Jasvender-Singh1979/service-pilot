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

    // Verify user is an engineer
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can view their assigned service calls" },
        { status: 403 }
      );
    }

    // Get filter parameter (status)
    const statusFilter = searchParams.get('status');

    let calls;

    if (statusFilter && statusFilter !== 'all') {
      // Filter by specific status with smart sorting
      if (statusFilter === 'closed') {
        // Closed calls: newest first
        calls = await sql`
          SELECT 
            sc.id,
            sc.call_id,
            sc.customer_name,
            sc.customer_phone,
            sc.phone_country_code,
            sc.customer_whatsapp,
            sc.whatsapp_country_code,
            sc.category_name_snapshot,
            sc.problem_reported,
            sc.priority_level,
            sc.call_status,
            sc.created_at,
            sc.charge_type,
            sc.custom_amount,
            sc.special_note_to_engineer
          FROM service_call sc
          WHERE sc.assigned_engineer_user_id = ${userId}
          AND sc.call_status = ${statusFilter}
          ORDER BY sc.closure_timestamp DESC NULLS LAST, sc.created_at DESC
        `;
      } else {
        // Open calls: priority first (critical > high > medium > low), then older first
        calls = await sql`
          SELECT 
            sc.id,
            sc.call_id,
            sc.customer_name,
            sc.customer_phone,
            sc.phone_country_code,
            sc.customer_whatsapp,
            sc.whatsapp_country_code,
            sc.category_name_snapshot,
            sc.problem_reported,
            sc.priority_level,
            sc.call_status,
            sc.created_at,
            sc.charge_type,
            sc.custom_amount,
            sc.special_note_to_engineer
          FROM service_call sc
          WHERE sc.assigned_engineer_user_id = ${userId}
          AND sc.call_status = ${statusFilter}
          ORDER BY 
            CASE sc.priority_level
              WHEN 'critical' THEN 0
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              WHEN 'low' THEN 3
              ELSE 4
            END,
            sc.created_at ASC
        `;
      }
    } else {
      // Get all assigned calls - latest on top (acceptable per requirements)
      calls = await sql`
        SELECT 
          sc.id,
          sc.call_id,
          sc.customer_name,
          sc.customer_phone,
          sc.phone_country_code,
          sc.customer_whatsapp,
          sc.whatsapp_country_code,
          sc.category_name_snapshot,
          sc.problem_reported,
          sc.priority_level,
          sc.call_status,
          sc.created_at,
          sc.charge_type,
          sc.custom_amount,
          sc.special_note_to_engineer
        FROM service_call sc
        WHERE sc.assigned_engineer_user_id = ${userId}
        ORDER BY sc.created_at DESC
      `;
    }

    return NextResponse.json(calls || []);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ENGINEER_SERVICE_CALLS_API] Error:", {
      errorMessage,
      userId,
      statusFilter: request.url,
    });
    return NextResponse.json(
      { error: "Failed to fetch service calls", details: errorMessage },
      { status: 500 }
    );
  }
}
