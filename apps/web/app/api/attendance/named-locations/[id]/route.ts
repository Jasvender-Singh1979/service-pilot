import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = user.business_id;
    if (!businessId) {
      return NextResponse.json({ error: "No business assigned" }, { status: 400 });
    }

    const { location_name } = await request.json();
    if (!location_name) {
      return NextResponse.json(
        { error: "location_name is required" },
        { status: 400 }
      );
    }

    // Verify the location belongs to this business
    const location = await sql`
      SELECT id FROM named_location 
      WHERE id = ${id} AND business_id = ${businessId}
    `;

    if (!location || location.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Update location name
    const result = await sql`
      UPDATE named_location
      SET location_name = ${location_name}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, latitude, longitude, location_name, created_at, updated_at
    `;

    if (!result || result.length === 0) {
      throw new Error("Failed to update named location");
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating named location:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update named location' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = user.business_id;
    if (!businessId) {
      return NextResponse.json({ error: "No business assigned" }, { status: 400 });
    }

    // Verify the location belongs to this business
    const location = await sql`
      SELECT id FROM named_location 
      WHERE id = ${id} AND business_id = ${businessId}
    `;

    if (!location || location.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Delete location
    await sql`
      DELETE FROM named_location
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting named location:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete named location' },
      { status: 500 }
    );
  }
}
