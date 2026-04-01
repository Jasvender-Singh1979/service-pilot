import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = user.business_id;
    if (!businessId) {
      return NextResponse.json({ error: "No business assigned" }, { status: 400 });
    }

    // Get all named locations for this business
    const locations = await sql`
      SELECT id, latitude, longitude, location_name, created_at, updated_at
      FROM named_location
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(locations);
  } catch (error: any) {
    console.error('Error fetching named locations:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch named locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = user.business_id;
    if (!businessId) {
      return NextResponse.json({ error: "No business assigned" }, { status: 400 });
    }

    const { latitude, longitude, location_name } = await request.json();

    if (!latitude || !longitude || !location_name) {
      return NextResponse.json(
        { error: "latitude, longitude, and location_name are required" },
        { status: 400 }
      );
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 }
      );
    }

    // Create new named location
    const result = await sql`
      INSERT INTO named_location (business_id, latitude, longitude, location_name, created_by)
      VALUES (${businessId}, ${latNum}, ${lngNum}, ${location_name}, ${user.id})
      RETURNING id, latitude, longitude, location_name, created_at, updated_at
    `;

    if (!result || result.length === 0) {
      throw new Error("Failed to create named location");
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating named location:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create named location' },
      { status: 500 }
    );
  }
}
