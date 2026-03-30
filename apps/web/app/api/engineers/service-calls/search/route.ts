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
    const query = searchParams.get('q')?.trim() || '';

    // Check role
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can search their assigned service calls" },
        { status: 403 }
      );
    }

    // If no query, return empty
    if (!query) {
      return NextResponse.json([]);
    }

    // Search for calls by call_id, customer_name, or customer_phone
    // Engineer can only see their own calls
    const calls = await sql`
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
      AND sc.business_id = ${user.business_id}
      AND (
        LOWER(sc.call_id) LIKE LOWER(${`%${query}%`})
        OR LOWER(sc.customer_name) LIKE LOWER(${`%${query}%`})
        OR LOWER(sc.customer_phone) LIKE LOWER(${`%${query}%`})
      )
      ORDER BY sc.created_at DESC
    `;

    return NextResponse.json(calls);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error searching engineer service calls:", errorMessage);
    return NextResponse.json(
      { error: `Failed to search service calls: ${errorMessage}` },
      { status: 500 }
    );
  }
}
