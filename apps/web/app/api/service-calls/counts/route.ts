import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET() {
  // Default response for all cases
  const defaultCounts: Record<string, number> = {
    unassigned: 0,
    assigned: 0,
    in_progress: 0,
    pending_action_required: 0,
    pending_under_services: 0,
    closed: 0,
    cancelled: 0,
  };

  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      console.error("[SERVICE_CALLS_COUNTS] No user session found");
      return NextResponse.json(defaultCounts);
    }

    const userId = user.id;
    const businessId = user.business_id;

    // Verify user is a manager
    if (user.role !== "manager") {
      console.error("[SERVICE_CALLS_COUNTS] User is not a manager:", { userId, role: user.role });
      return NextResponse.json(defaultCounts);
    }

    // Get counts for each status
    try {
      const counts = await sql`
        SELECT 
          COALESCE(call_status, 'unknown') as status,
          COUNT(*) as count
        FROM service_call
        WHERE manager_user_id = ${userId}
        AND business_id = ${businessId}
        GROUP BY call_status
      `;

      // Transform to a key-value object for easier use
      const countsByStatus: Record<string, number> = { ...defaultCounts };

      if (counts && Array.isArray(counts)) {
        counts.forEach((row: any) => {
          const status = String(row.status || 'unknown');
          if (countsByStatus.hasOwnProperty(status)) {
            countsByStatus[status] = parseInt(String(row.count)) || 0;
          }
        });
      }

      return NextResponse.json(countsByStatus);
    } catch (queryError) {
      const errorMsg = queryError instanceof Error ? queryError.message : String(queryError);
      console.error("[SERVICE_CALLS_COUNTS] Query error:", {
        errorMsg,
        userId,
        businessId,
      });
      return NextResponse.json(defaultCounts);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SERVICE_CALLS_COUNTS] Top-level error:", {
      errorMessage,
      stack: error instanceof Error ? error.stack : 'N/A',
    });
    return NextResponse.json(defaultCounts);
  }
}
