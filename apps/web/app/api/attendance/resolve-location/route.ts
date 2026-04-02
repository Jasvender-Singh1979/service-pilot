import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { normalizeCoordinate } from "@/lib/formatters";

/**
 * API: Resolve a location to its friendly name if a named location matches
 * 
 * Uses SHARED normalization (normalizeCoordinate from lib/formatters):
 * - Attendance coordinates normalized to 3 decimals
 * - Named location coordinates also normalized to 3 decimals
 * - Compared as strings to avoid numeric precision issues
 * 
 * Matching priority:
 * 1. Named location (if normalized coords match saved location)
 * 2. Raw coordinates (full 6-decimal precision)
 * 3. Address string
 * 4. N/A
 * 
 * Example: 
 * - Saved location: 29.936400, 77.540500 → "Home"
 * - Check-in 1:     29.936394, 77.540477 → "29.936", "77.540" → matches "Home"
 * - Check-in 2:     29.936393, 77.540487 → "29.936", "77.540" → matches "Home"
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

    // Convert coordinates to numbers
    const lat = latitude !== null && latitude !== undefined ? Number(latitude) : null;
    const lng = longitude !== null && longitude !== undefined ? Number(longitude) : null;

    // Try to match against named locations using SHARED normalization
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      // Use shared normalizer: converts to string like "29.936" (3 decimal places)
      const normalizedLat = normalizeCoordinate(lat);
      const normalizedLng = normalizeCoordinate(lng);

      if (normalizedLat && normalizedLng) {
        // Query named locations: round their coords to 3 decimals and compare
        // CRITICAL: Cast to text to match JavaScript toFixed(3) format exactly
        const matchedLocation = await sql`
          SELECT location_name
          FROM named_location
          WHERE business_id = ${businessId}
            AND ROUND(latitude::numeric, 3)::text = ${normalizedLat}
            AND ROUND(longitude::numeric, 3)::text = ${normalizedLng}
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
      }

      // No named location match found, return full-precision coordinates
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
