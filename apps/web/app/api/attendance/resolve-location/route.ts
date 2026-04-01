import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

/**
 * Resolve a location to its friendly name if a named location matches
 * Uses normalized 2-decimal coordinate matching (approximately 50-1000 meter tolerance)
 * Example: 29.950300 and 29.951000 both normalize to 29.95 and will match
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

    // Check if coordinates match any named location using normalized 2-decimal coordinates
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        // Normalize coordinates to 2 decimal places for matching
        const normalizedLat = Number(lat.toFixed(2));
        const normalizedLng = Number(lng.toFixed(2));

        const matchedLocation = await sql`
          SELECT location_name
          FROM named_location
          WHERE business_id = ${businessId}
            AND ROUND(latitude::numeric, 2) = ${normalizedLat}
            AND ROUND(longitude::numeric, 2) = ${normalizedLng}
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
