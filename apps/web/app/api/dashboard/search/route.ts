import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    let user;
    try {
      user = await getSessionUserFromRequest();
    } catch (authError) {
      console.error("Session error:", authError instanceof Error ? authError.message : String(authError));
      return NextResponse.json([]);
    }

    if (!user) {
      return NextResponse.json([]);
    }

    if (user.role !== "manager") {
      return NextResponse.json([]);
    }

    const businessId = user.business_id!;
    const managerId = user.id;
    const searchTerm = `%${query}%`;

    // Search by Call ID, Customer Name, or Phone Number
    let results: any[] = [];
    try {
      results = await sql`
        SELECT 
          id,
          call_id,
          customer_name,
          customer_phone,
          customer_whatsapp,
          call_status,
          created_at
        FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND (
          call_id ILIKE ${searchTerm}
          OR customer_name ILIKE ${searchTerm}
          OR customer_phone ILIKE ${searchTerm}
          OR customer_whatsapp ILIKE ${searchTerm}
        )
        ORDER BY created_at DESC
        LIMIT 10
      `;
    } catch (e) {
      console.error("Error searching calls:", e instanceof Error ? e.message : String(e));
      return NextResponse.json([]);
    }

    return NextResponse.json(results || []);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in dashboard search:", errorMessage);
    return NextResponse.json([]);
  }
}
