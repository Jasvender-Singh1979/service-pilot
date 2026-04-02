import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

/**
 * Resolve a location to its friendly name if a named location matches
 * Uses normalized 3-decimal coordinate matching (approximately 100m tolerance)
 * Example: 29.950286 and 29.950500 both normalize to 29.950 and will match
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

    // REQUIRED PRIORITY: named location → coordinates → address → N/A
    // Check if coordinates match any named location using normalized 3-decimal coordinates
    // Note: latitude and longitude might come as strings from the database, so convert to numbers
    const lat = latitude !== null && latitude !== undefined ? Number(latitude) : null;
    const lng = longitude !== null && longitude !== undefined ? Number(longitude) : null;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      // Normalize coordinates to 3 decimal places for matching
      const normalizedLat = Number(lat.toFixed(3));
      const normalizedLng = Number(lng.toFixed(3));

      const matchedLocation = await sql`
        SELECT location_name
        FROM named_location
        WHERE business_id = ${businessId}
          AND ROUND(latitude::numeric, 3) = ${normalizedLat}
          AND ROUND(longitude::numeric, 3) = ${normalizedLng}
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

      // No named location match found, return coordinates
      const coordValue = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      return NextResponse.json({
        type: 'coordinates',
        value: coordValue,
        matched: false,
        coordinates: { latitude: lat, longitude: lng },
      });
    }

    // If coordinates not available but address exists, return address
    if (address && typeof address === 'string' && address.trim().length > 0) {
      return NextResponse.json({
        type: 'address',
        value: address,
        matched: false,
      });
    }

    // Nothing available
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
