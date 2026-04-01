import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

/**
 * Resolve a location to its friendly name if a named location matches
 * Uses GPS tolerance of ±0.0005 (approximately 50 meters)
 */
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

    const { latitude, longitude, address } = await request.json();

    // If address is already available, return it
    if (address && typeof address === 'string' && address.trim().length > 0) {
      return NextResponse.json({
        type: 'address',
        value: address,
        matched: false,
      });
    }

    // Check if coordinates match any named location
    // Using tolerance of ±0.0005 (approximately 50 meters)
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const tolerance = 0.0005;

        const matchedLocation = await sql`
          SELECT location_name
          FROM named_location
          WHERE business_id = ${businessId}
            AND ABS(latitude - ${lat}) <= ${tolerance}
            AND ABS(longitude - ${lng}) <= ${tolerance}
          LIMIT 1
        `;

        if (matchedLocation && matchedLocation.length > 0) {
          return NextResponse.json({
            type: 'named_location',
            value: matchedLocation[0].location_name,
            matched: true,
            coordinates: { latitude: lat, longitude: lng },
          });
        }

        // No match found, return coordinates
        return NextResponse.json({
          type: 'coordinates',
          value: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          matched: false,
          coordinates: { latitude: lat, longitude: lng },
        });
      }
    }

    // Invalid or missing coordinates
    return NextResponse.json({
      type: 'unknown',
      value: 'N/A',
      matched: false,
    });
  } catch (error: any) {
    console.error('Error resolving location:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resolve location' },
      { status: 500 }
    );
  }
}
