import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Fetch business by ID
    const business = await sql`
      SELECT id, name, owner_name, email, mobile_number, whatsapp_number, address, created_at, updated_at
      FROM business
      WHERE id = ${businessId}
    `;

    if (!business || business.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(business[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching business:", errorMessage);
    return NextResponse.json(
      { error: `Failed to fetch business: ${errorMessage}` },
      { status: 500 }
    );
  }
}
