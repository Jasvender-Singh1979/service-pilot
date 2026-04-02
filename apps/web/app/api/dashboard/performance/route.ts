import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getTodayRangeIST } from "@/lib/dateUtils";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

const defaultResponse = {
  todaysPerformance: {
    callsCreatedToday: 0,
    callsClosedToday: 0,
    pendingCallsToday: 0,
    callsCancelledToday: 0,
  },
  criticalAlerts: {
    pendingMoreThan48Hours: 0,
    pendingActionRequired: 0,
    pendingUnderServices: 0,
  },
  engineerPerformance: [],
  categoryPerformance: [],
};

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      console.error("[DASHBOARD_PERFORMANCE] No user session found");
      return NextResponse.json(defaultResponse, { status: 401 });
    }

    if (user.role !== "manager") {
      console.error("[DASHBOARD_PERFORMANCE] User is not a manager:", { userId: user.id, role: user.role });
      return NextResponse.json(defaultResponse, { status: 403 });
    }

    const businessId = user.business_id;
    const managerId = user.id;

    // Get today's date range in IST (Asia/Kolkata) - using same helper as /api/reports
    const todayRange = getTodayRangeIST();
    const todayStartUTC = todayRange.start;
    const todayEndUTC = todayRange.end;

    // 1. Calls Created Today
    let callsCreatedToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND created_at >= ${todayStartUTC}
        AND created_at <= ${todayEndUTC}
      `;
      if (result && result[0]) {
        callsCreatedToday = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error("Error fetching calls created today:", e instanceof Error ? e.message : String(e));
    }

    // 2. Calls Closed Today
    let callsClosedToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND call_status = 'closed'
        AND closure_timestamp >= ${todayStartUTC}
        AND closure_timestamp <= ${todayEndUTC}
      `;
      if (result && result[0]) {
        callsClosedToday = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error("Error fetching calls closed today:", e instanceof Error ? e.message : String(e));
    }

    // 3. Pending Calls Today (open/pending calls as of today)
    let pendingCallsToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND call_status NOT IN ('closed', 'cancelled')
      `;
      if (result && result[0]) {
        pendingCallsToday = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error("Error fetching pending calls today:", e instanceof Error ? e.message : String(e));
    }

    // 4. Calls Cancelled Today (use cancellation date, not created date)
    let callsCancelledToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND call_status = 'cancelled'
        AND updated_at >= ${todayStartUTC}
        AND updated_at <= ${todayEndUTC}
      `;
      if (result && result[0]) {
        callsCancelledToday = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error("Error fetching calls cancelled today:", e instanceof Error ? e.message : String(e));
    }

    // 5. Critical Alerts
    let pendingMoreThan48Hours = 0;
    let pendingActionRequired = 0;
    let pendingUnderServices = 0;

    try {
      // Calls needing immediate action (>48 hrs):
      // A. unassigned calls older than 48 hours
      // B. assigned calls that have NOT moved to in_progress and are older than 48 hours
      // C. in_progress calls with no further action for more than 24 hours
      const result48h = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND call_status NOT IN ('closed', 'cancelled')
        AND (
          (assigned_engineer_user_id IS NULL AND created_at < NOW() - INTERVAL '48 hours')
          OR (assigned_engineer_user_id IS NOT NULL AND call_status = 'assigned' AND created_at < NOW() - INTERVAL '48 hours')
          OR (call_status = 'in_progress' AND updated_at < NOW() - INTERVAL '24 hours')
        )
      `;
      if (result48h && result48h[0]) {
        pendingMoreThan48Hours = parseInt(String(result48h[0].count)) || 0;
      }

      // Pending action required
      const resultAction = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND call_status = 'pending_action_required'
      `;
      if (resultAction && resultAction[0]) {
        pendingActionRequired = parseInt(String(resultAction[0].count)) || 0;
      }

      // Pending under services - only older than 7 days
      const resultServices = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE manager_user_id = ${managerId}
        AND business_id = ${businessId}
        AND call_status = 'pending_under_services'
        AND created_at < NOW() - INTERVAL '7 days'
      `;
      if (resultServices && resultServices[0]) {
        pendingUnderServices = parseInt(String(resultServices[0].count)) || 0;
      }
    } catch (e) {
      console.error("Error fetching critical alerts:", e instanceof Error ? e.message : String(e));
    }

    // 6. Engineer Performance
    let engineerPerformance: any[] = [];
    try {
      const engineers = await sql`
        SELECT id, name FROM "user"
        WHERE role = 'engineer'
        AND business_id = ${businessId}
        AND manager_user_id = ${managerId}
        ORDER BY name ASC
      `;

      if (engineers && Array.isArray(engineers)) {
        for (const engineer of engineers) {
          let totalAssigned = 0;
          let totalClosed = 0;
          let totalPending = 0;

          try {
            // Exclude cancelled calls from all metrics
            const assignedResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE assigned_engineer_user_id = ${engineer.id}
              AND call_status != 'cancelled'
            `;
            if (assignedResult && assignedResult[0]) {
              totalAssigned = parseInt(String(assignedResult[0].count)) || 0;
            }

            const closedResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE assigned_engineer_user_id = ${engineer.id}
              AND call_status = 'closed'
            `;
            if (closedResult && closedResult[0]) {
              totalClosed = parseInt(String(closedResult[0].count)) || 0;
            }

            const pendingResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE assigned_engineer_user_id = ${engineer.id}
              AND call_status NOT IN ('closed', 'cancelled')
            `;
            if (pendingResult && pendingResult[0]) {
              totalPending = parseInt(String(pendingResult[0].count)) || 0;
            }
          } catch (e) {
            console.error(`Error fetching engineer ${engineer.id} stats:`, e instanceof Error ? e.message : String(e));
          }

          const efficiency = totalAssigned > 0 ? (totalClosed / totalAssigned) * 100 : 0;

          engineerPerformance.push({
            engineerId: engineer.id,
            engineerName: engineer.name,
            totalAssigned,
            totalClosed,
            totalPending,
            efficiency: Math.round(efficiency),
          });
        }
      }
    } catch (e) {
      console.error("Error fetching engineer performance:", e instanceof Error ? e.message : String(e));
    }

    // 7. Category Performance
    let categoryPerformance: any[] = [];
    try {
      const categories = await sql`
        SELECT id, category_name FROM service_category
        WHERE business_id = ${businessId}
        AND manager_user_id = ${managerId}
        AND active_status = true
        ORDER BY category_name ASC
      `;

      if (categories && Array.isArray(categories)) {
        for (const category of categories) {
          let totalCalls = 0;
          let closedCalls = 0;
          let pendingCalls = 0;
          let cancelledCalls = 0;

          try {
            const totalResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE category_id = ${category.id}
              AND manager_user_id = ${managerId}
            `;
            if (totalResult && totalResult[0]) {
              totalCalls = parseInt(String(totalResult[0].count)) || 0;
            }

            const closedResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE category_id = ${category.id}
              AND manager_user_id = ${managerId}
              AND call_status = 'closed'
            `;
            if (closedResult && closedResult[0]) {
              closedCalls = parseInt(String(closedResult[0].count)) || 0;
            }

            const pendingResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE category_id = ${category.id}
              AND manager_user_id = ${managerId}
              AND call_status NOT IN ('closed', 'cancelled')
            `;
            if (pendingResult && pendingResult[0]) {
              pendingCalls = parseInt(String(pendingResult[0].count)) || 0;
            }

            const cancelledResult = await sql`
              SELECT COUNT(*) as count FROM service_call
              WHERE category_id = ${category.id}
              AND manager_user_id = ${managerId}
              AND call_status = 'cancelled'
            `;
            if (cancelledResult && cancelledResult[0]) {
              cancelledCalls = parseInt(String(cancelledResult[0].count)) || 0;
            }
          } catch (e) {
            console.error(`Error fetching category ${category.id} stats:`, e instanceof Error ? e.message : String(e));
          }

          categoryPerformance.push({
            categoryId: category.id,
            categoryName: category.category_name,
            totalCalls,
            closedCalls,
            pendingCalls,
            cancelledCalls,
          });
        }
      }
    } catch (e) {
      console.error("Error fetching category performance:", e instanceof Error ? e.message : String(e));
    }

    return NextResponse.json({
      todaysPerformance: {
        callsCreatedToday,
        callsClosedToday,
        pendingCallsToday,
        callsCancelledToday,
      },
      criticalAlerts: {
        pendingMoreThan48Hours,
        pendingActionRequired,
        pendingUnderServices,
      },
      engineerPerformance,
      categoryPerformance,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DASHBOARD_PERFORMANCE] Error:", {
      errorMessage,
      stack: error instanceof Error ? error.stack : 'N/A',
    });
    return NextResponse.json(defaultResponse);
  }
}
