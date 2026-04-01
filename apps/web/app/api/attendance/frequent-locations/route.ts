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

    // Get most frequently captured attendance locations
    // Group by approximately the same coordinates (within 0.0005 tolerance)
    const frequentLocations = await sql`
      SELECT
        ROUND(check_in_latitude::numeric, 4)::float as latitude,
        ROUND(check_in_longitude::numeric, 4)::float as longitude,
        COUNT(*) as count,
        MIN(attendance_date) as first_seen,
        MAX(attendance_date) as last_seen,
        STRING_AGG(DISTINCT check_in_address, ', ') FILTER (WHERE check_in_address IS NOT NULL AND check_in_address != '') as addresses
      FROM attendance
      WHERE business_id = ${businessId}
        AND check_in_latitude IS NOT NULL
        AND check_in_longitude IS NOT NULL
      GROUP BY 
        ROUND(check_in_latitude::numeric, 4),
        ROUND(check_in_longitude::numeric, 4)
      HAVING COUNT(*) >= 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `;

    return NextResponse.json(frequentLocations);
  } catch (error: any) {
    console.error('Error fetching frequent locations:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch frequent locations' },
      { status: 500 }
    );
  }
}
