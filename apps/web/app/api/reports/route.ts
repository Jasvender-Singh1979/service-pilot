import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import {
  getTodayRangeIST,
  getThisWeekRangeIST,
  getThisMonthRangeIST,
  getCustomRangeIST,
  getTimezoneDebugInfo,
  getTodayDateStringIST,
  getThisWeekRangeISTDateStrings,
  getThisMonthRangeISTDateStrings
} from "@/lib/dateUtils";

// Helper to get date range based on filter (timezone-aware)
function getDateRange(filter: string) {
  switch (filter) {
    case "today": {
      const today = getTodayDateStringIST();
      return { startDate: today, endDate: today };
    }
    case "this_week": {
      const range = getThisWeekRangeISTDateStrings();
      return { startDate: range.startDate, endDate: range.endDate };
    }
    case "this_month": {
      const range = getThisMonthRangeISTDateStrings();
      return { startDate: range.startDate, endDate: range.endDate };
    }
    case "all_time":
    default:
      return { startDate: null, endDate: null };
  }
}

export async function GET(request: Request) {
  try {
    const tzInfo = getTimezoneDebugInfo();
    console.log("=== REPORTS_API_START ===", { timezone: tzInfo.timezone, currentTime: tzInfo.localDateInTz });
    
    // Get authenticated user from session
    const user = await getSessionUserFromRequest();
    
    console.log("REPORTS_AUTH_CHECK:", user ? "VALID" : "INVALID");
    if (!user) {
      console.log("REPORTS_AUTH_FAILED: No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    console.log("REPORTS_USER_ID_FROM_SESSION:", userId);
    
    if (!userId) {
      console.log("REPORTS_ERROR_NO_USER_ID");
      return NextResponse.json({ error: "User ID missing from session" }, { status: 401 });
    }

    // Get user role and business_id from the user object returned by getSessionUserFromRequest
    const userRole = user.role || "unknown";
    const userBusinessId = user.business_id || "";
    const userManagerId = user.manager_user_id || "";
    
    console.log("REPORTS_USER_SCOPE:", { userId, userRole, userBusinessId, userManagerId });

    // businessId MUST come from the logged-in user's database record, not from query params
    const businessId = userBusinessId;
    
    if (!businessId) {
      console.log("REPORTS_ERROR_NO_BUSINESS_ID_ON_USER");
      return NextResponse.json({ error: "User has no business assigned" }, { status: 400 });
    }
    
    console.log("REPORTS_BUSINESS_ID_FROM_USER:", businessId);

    const { searchParams } = new URL(request.url);
    let filterType = searchParams.get("filter") || "all_time";
    let startDateString = searchParams.get("startDate");
    let endDateString = searchParams.get("endDate");
    let selectedManagerId = searchParams.get("managerId");
    
    console.log("REPORTS_PARAMS_RECEIVED:", { filterType, startDateString, endDateString, selectedManagerId });
    
    // CRITICAL FIX: Convert IST date strings to UTC timestamp ranges for querying
    let startUTC: Date | null = null;
    let endUTC: Date | null = null;
    
    if (!startDateString || !endDateString) {
      const dateRange = getDateRange(filterType);
      startDateString = dateRange.startDate || startDateString;
      endDateString = dateRange.endDate || endDateString;
      console.log("REPORTS_DATES_MISSING_FALLBACK:", { filterType, fallback_startDate: startDateString, fallback_endDate: endDateString });
    } else {
      console.log("REPORTS_USING_FRONTEND_DATES:", { filterType, startDateString, endDateString });
    }
    
    // Convert date strings to UTC ranges using the same method as dashboard
    if (startDateString && endDateString) {
      const utcRange = getCustomRangeIST(startDateString, endDateString);
      startUTC = utcRange.start;
      endUTC = utcRange.end;
      console.log("REPORTS_DATE_CONVERSION:", { dateStrings: { start: startDateString, end: endDateString }, utcRange: { start: startUTC.toISOString(), end: endUTC.toISOString() } });
    }
    
    // For Super Admin manager-split mode, use the selected manager instead of all data
    let effectiveManagerId = null;
    let reportMode = "combined";
    
    if (userRole === "super_admin" && selectedManagerId) {
      effectiveManagerId = selectedManagerId;
      reportMode = "individual";
      console.log("REPORTS_SUPER_ADMIN_MANAGER_SPLIT_MODE: manager mode selected", { selectedManagerId });
    }

    // Safely validate UTC dates
    let hasDateFilter = false;
    try {
      if (startUTC && endUTC) {
        if (isNaN(startUTC.getTime()) || isNaN(endUTC.getTime())) {
          console.log("REPORTS_INVALID_UTC_DATES", { startUTC, endUTC });
          startUTC = null;
          endUTC = null;
          hasDateFilter = false;
        } else if (startUTC > endUTC) {
          console.log("REPORTS_SWAPPING_DATES", { original_start: startUTC.toISOString(), original_end: endUTC.toISOString() });
          [startUTC, endUTC] = [endUTC, startUTC];
          hasDateFilter = true;
        } else {
          hasDateFilter = true;
        }
      }
    } catch (err) {
      console.log("REPORTS_DATE_PARSE_ERROR:", err);
      startUTC = null;
      endUTC = null;
      hasDateFilter = false;
    }
    
    console.log("REPORTS_DATE_FILTER_READY:", { hasDateFilter, startUTC: startUTC?.toISOString(), endUTC: endUTC?.toISOString() });

    // Get summary metrics
    let summaryQuery;
    let summaryData = {
      created_count: 0,
      cancelled_count: 0,
      closed_count: 0,
      unassigned_snapshot: 0,
      assigned_snapshot: 0,
      in_progress_snapshot: 0,
      action_required_snapshot: 0,
      under_services_snapshot: 0,
      total_revenue: 0,
    };
    
    try {
      console.log("REPORTS_SUMMARY_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      // 1. EVENT COUNTS - direct UTC timestamp comparison
      try {
        let eventCountQuery;
        if (hasDateFilter && managerFilterId) {
          eventCountQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE created_at >= ${startUTC} AND created_at <= ${endUTC}) as created_during_range,
              COUNT(*) FILTER (WHERE call_status = 'cancelled' AND updated_at >= ${startUTC} AND updated_at <= ${endUTC}) as cancelled_during_range,
              COUNT(*) FILTER (WHERE call_status = 'closed' AND closure_timestamp >= ${startUTC} AND closure_timestamp <= ${endUTC}) as closed_during_range
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
          `;
        } else if (hasDateFilter) {
          eventCountQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE created_at >= ${startUTC} AND created_at <= ${endUTC}) as created_during_range,
              COUNT(*) FILTER (WHERE call_status = 'cancelled' AND updated_at >= ${startUTC} AND updated_at <= ${endUTC}) as cancelled_during_range,
              COUNT(*) FILTER (WHERE call_status = 'closed' AND closure_timestamp >= ${startUTC} AND closure_timestamp <= ${endUTC}) as closed_during_range
            FROM service_call
            WHERE business_id = ${businessId}
          `;
        } else if (managerFilterId) {
          eventCountQuery = await sql`
            SELECT
              COUNT(*) as created_during_range,
              COUNT(*) FILTER (WHERE call_status = 'cancelled') as cancelled_during_range,
              COUNT(*) FILTER (WHERE call_status = 'closed') as closed_during_range
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
          `;
        } else {
          eventCountQuery = await sql`
            SELECT
              COUNT(*) as created_during_range,
              COUNT(*) FILTER (WHERE call_status = 'cancelled') as cancelled_during_range,
              COUNT(*) FILTER (WHERE call_status = 'closed') as closed_during_range
            FROM service_call
            WHERE business_id = ${businessId}
          `;
        }
        
        if (eventCountQuery && eventCountQuery[0]) {
          summaryData.created_count = Number(eventCountQuery[0].created_during_range || 0);
          summaryData.cancelled_count = Number(eventCountQuery[0].cancelled_during_range || 0);
          summaryData.closed_count = Number(eventCountQuery[0].closed_during_range || 0);
        }
        console.log("REPORTS_EVENT_COUNTS", { created: summaryData.created_count, cancelled: summaryData.cancelled_count, closed: summaryData.closed_count });
      } catch (err) {
        console.error("REPORTS_EVENT_COUNT_FAILED:", err);
      }
      
      // 2. SNAPSHOT COUNTS - Assigned metric now counts calls assigned during the period
      try {
        let snapshotQuery;
        if (hasDateFilter && managerFilterId) {
          snapshotQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE call_status = 'unassigned' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as unassigned_count,
              COUNT(*) FILTER (WHERE call_status = 'assigned' AND updated_at >= ${startUTC} AND updated_at <= ${endUTC}) as assigned_count,
              COUNT(*) FILTER (WHERE call_status = 'in_progress' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as in_progress_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_action_required' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as action_required_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_under_services' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as under_services_count
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
          `;
        } else if (hasDateFilter) {
          snapshotQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE call_status = 'unassigned' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as unassigned_count,
              COUNT(*) FILTER (WHERE call_status = 'assigned' AND updated_at >= ${startUTC} AND updated_at <= ${endUTC}) as assigned_count,
              COUNT(*) FILTER (WHERE call_status = 'in_progress' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as in_progress_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_action_required' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as action_required_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_under_services' AND created_at >= ${startUTC} AND created_at <= ${endUTC}) as under_services_count
            FROM service_call
            WHERE business_id = ${businessId}
          `;
        } else if (managerFilterId) {
          snapshotQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE call_status = 'unassigned') as unassigned_count,
              COUNT(*) FILTER (WHERE call_status = 'assigned') as assigned_count,
              COUNT(*) FILTER (WHERE call_status = 'in_progress') as in_progress_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_action_required') as action_required_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_under_services') as under_services_count
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
          `;
        } else {
          snapshotQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE call_status = 'unassigned') as unassigned_count,
              COUNT(*) FILTER (WHERE call_status = 'assigned') as assigned_count,
              COUNT(*) FILTER (WHERE call_status = 'in_progress') as in_progress_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_action_required') as action_required_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_under_services') as under_services_count
            FROM service_call
            WHERE business_id = ${businessId}
          `;
        }
        
        if (snapshotQuery && snapshotQuery[0]) {
          summaryData.unassigned_snapshot = Number(snapshotQuery[0].unassigned_count || 0);
          summaryData.assigned_snapshot = Number(snapshotQuery[0].assigned_count || 0);
          summaryData.in_progress_snapshot = Number(snapshotQuery[0].in_progress_count || 0);
          summaryData.action_required_snapshot = Number(snapshotQuery[0].action_required_count || 0);
          summaryData.under_services_snapshot = Number(snapshotQuery[0].under_services_count || 0);
        }
        console.log("REPORTS_SNAPSHOT_COUNTS", { unassigned: summaryData.unassigned_snapshot, assigned: summaryData.assigned_snapshot, in_progress: summaryData.in_progress_snapshot, action_required: summaryData.action_required_snapshot, under_services: summaryData.under_services_snapshot });
      } catch (err) {
        console.error("REPORTS_SNAPSHOT_COUNT_FAILED:", err);
      }
      
      // 3. TOTAL REVENUE
      try {
        let revenueQuery;
        if (hasDateFilter && managerFilterId) {
          revenueQuery = await sql`
            SELECT COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
            AND closure_timestamp >= ${startUTC}
            AND closure_timestamp <= ${endUTC}
          `;
        } else if (hasDateFilter) {
          revenueQuery = await sql`
            SELECT COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue
            FROM service_call
            WHERE business_id = ${businessId}
            AND call_status = 'closed'
            AND closure_timestamp >= ${startUTC}
            AND closure_timestamp <= ${endUTC}
          `;
        } else if (managerFilterId) {
          revenueQuery = await sql`
            SELECT COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
          `;
        } else {
          revenueQuery = await sql`
            SELECT COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue
            FROM service_call
            WHERE business_id = ${businessId}
            AND call_status = 'closed'
          `;
        }
        
        if (revenueQuery && revenueQuery[0]) {
          summaryData.total_revenue = Number(revenueQuery[0].total_revenue || 0);
        }
        console.log("REPORTS_REVENUE", { total_revenue: summaryData.total_revenue });
      } catch (err) {
        console.error("REPORTS_REVENUE_FAILED:", err);
      }
      
      summaryQuery = [summaryData];
      console.log("REPORTS_SUMMARY_QUERY_SUCCESS", { summary: summaryData });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_SUMMARY_QUERY_FAILED:", errMsg);
      if (err instanceof Error) console.error("Stack:", err.stack);
      summaryQuery = [summaryData];
    }

    // Get engineer performance
    let engineerPerformanceQuery;
    try {
      console.log("REPORTS_ENGINEER_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        if (hasDateFilter) {
          engineerPerformanceQuery = await sql`
            SELECT
              u.id as engineer_id,
              u.name as engineer_name,
              COUNT(sc.id) as total_assigned,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as total_closed,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as total_pending
            FROM "user" u
            LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id 
              AND sc.business_id = ${businessId}
              AND sc.manager_user_id = ${managerFilterId}
              AND sc.created_at >= ${startUTC}
              AND sc.created_at <= ${endUTC}
            WHERE u.business_id = ${businessId} AND u.manager_user_id = ${managerFilterId} AND u.role = 'engineer'
            GROUP BY u.id, u.name
            ORDER BY total_assigned DESC
          `;
        } else {
          engineerPerformanceQuery = await sql`
            SELECT
              u.id as engineer_id,
              u.name as engineer_name,
              COUNT(sc.id) as total_assigned,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as total_closed,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as total_pending
            FROM "user" u
            LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id 
              AND sc.business_id = ${businessId}
              AND sc.manager_user_id = ${managerFilterId}
            WHERE u.business_id = ${businessId} AND u.manager_user_id = ${managerFilterId} AND u.role = 'engineer'
            GROUP BY u.id, u.name
            ORDER BY total_assigned DESC
          `;
        }
      } else {
        if (hasDateFilter) {
          engineerPerformanceQuery = await sql`
            SELECT
              u.id as engineer_id,
              u.name as engineer_name,
              COUNT(sc.id) as total_assigned,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as total_closed,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as total_pending
            FROM "user" u
            LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id 
              AND sc.business_id = ${businessId} 
              AND sc.created_at >= ${startUTC}
              AND sc.created_at <= ${endUTC}
            WHERE u.business_id = ${businessId} AND u.role = 'engineer'
            GROUP BY u.id, u.name
            ORDER BY total_assigned DESC
          `;
        } else {
          engineerPerformanceQuery = await sql`
            SELECT
              u.id as engineer_id,
              u.name as engineer_name,
              COUNT(sc.id) as total_assigned,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as total_closed,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as total_pending
            FROM "user" u
            LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id AND sc.business_id = ${businessId}
            WHERE u.business_id = ${businessId} AND u.role = 'engineer'
            GROUP BY u.id, u.name
            ORDER BY total_assigned DESC
          `;
        }
      }
      
      const engineerCount = Array.isArray(engineerPerformanceQuery) ? engineerPerformanceQuery.length : 0;
      console.log("REPORTS_ENGINEER_QUERY_SUCCESS", { rows: engineerCount });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_ENGINEER_QUERY_FAILED:", errMsg);
      engineerPerformanceQuery = [];
    }

    // Get category performance
    let categoryPerformanceQuery;
    try {
      console.log("REPORTS_CATEGORY_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        if (hasDateFilter) {
          categoryPerformanceQuery = await sql`
            SELECT
              sc.category_id,
              sc.category_name_snapshot as category_name,
              COUNT(*) as total_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as closed_calls,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as pending_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'cancelled') as cancelled_calls
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            AND sc.manager_user_id = ${managerFilterId}
            AND sc.created_at >= ${startUTC}
            AND sc.created_at <= ${endUTC}
            GROUP BY sc.category_id, sc.category_name_snapshot
            ORDER BY total_calls DESC
          `;
        } else {
          categoryPerformanceQuery = await sql`
            SELECT
              sc.category_id,
              sc.category_name_snapshot as category_name,
              COUNT(*) as total_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as closed_calls,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as pending_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'cancelled') as cancelled_calls
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            AND sc.manager_user_id = ${managerFilterId}
            GROUP BY sc.category_id, sc.category_name_snapshot
            ORDER BY total_calls DESC
          `;
        }
      } else {
        if (hasDateFilter) {
          categoryPerformanceQuery = await sql`
            SELECT
              sc.category_id,
              sc.category_name_snapshot as category_name,
              COUNT(*) as total_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as closed_calls,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as pending_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'cancelled') as cancelled_calls
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            AND sc.created_at >= ${startUTC}
            AND sc.created_at <= ${endUTC}
            GROUP BY sc.category_id, sc.category_name_snapshot
            ORDER BY total_calls DESC
          `;
        } else {
          categoryPerformanceQuery = await sql`
            SELECT
              sc.category_id,
              sc.category_name_snapshot as category_name,
              COUNT(*) as total_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'closed') as closed_calls,
              COUNT(*) FILTER (WHERE sc.call_status NOT IN ('closed', 'cancelled')) as pending_calls,
              COUNT(*) FILTER (WHERE sc.call_status = 'cancelled') as cancelled_calls
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            GROUP BY sc.category_id, sc.category_name_snapshot
            ORDER BY total_calls DESC
          `;
        }
      }
      
      const categoryCount = Array.isArray(categoryPerformanceQuery) ? categoryPerformanceQuery.length : 0;
      console.log("REPORTS_CATEGORY_QUERY_SUCCESS", { rows: categoryCount });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_CATEGORY_QUERY_FAILED:", errMsg);
      categoryPerformanceQuery = [];
    }

    // Get revenue breakdown
    let revenueBreakdownQuery;
    try {
      console.log("REPORTS_REVENUE_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        if (hasDateFilter) {
          revenueBreakdownQuery = await sql`
            SELECT
              COALESCE(SUM(COALESCE(final_service_amount, 0)), 0)::numeric as total_service_charges,
              COALESCE(SUM(COALESCE(final_material_amount, 0)), 0)::numeric as total_material_charges,
              COALESCE(SUM(COALESCE(final_discount_amount, 0)), 0)::numeric as total_discounts,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0)) + SUM(COALESCE(final_material_amount, 0)) - SUM(COALESCE(final_discount_amount, 0)),
                0
              )::numeric as net_revenue
            FROM service_call
            WHERE business_id = ${businessId} 
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
            AND closure_timestamp >= ${startUTC}
            AND closure_timestamp <= ${endUTC}
          `;
        } else {
          revenueBreakdownQuery = await sql`
            SELECT
              COALESCE(SUM(COALESCE(final_service_amount, 0)), 0)::numeric as total_service_charges,
              COALESCE(SUM(COALESCE(final_material_amount, 0)), 0)::numeric as total_material_charges,
              COALESCE(SUM(COALESCE(final_discount_amount, 0)), 0)::numeric as total_discounts,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0)) + SUM(COALESCE(final_material_amount, 0)) - SUM(COALESCE(final_discount_amount, 0)),
                0
              )::numeric as net_revenue
            FROM service_call
            WHERE business_id = ${businessId} 
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
          `;
        }
      } else {
        if (hasDateFilter) {
          revenueBreakdownQuery = await sql`
            SELECT
              COALESCE(SUM(COALESCE(final_service_amount, 0)), 0)::numeric as total_service_charges,
              COALESCE(SUM(COALESCE(final_material_amount, 0)), 0)::numeric as total_material_charges,
              COALESCE(SUM(COALESCE(final_discount_amount, 0)), 0)::numeric as total_discounts,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0)) + SUM(COALESCE(final_material_amount, 0)) - SUM(COALESCE(final_discount_amount, 0)),
                0
              )::numeric as net_revenue
            FROM service_call
            WHERE business_id = ${businessId} AND call_status = 'closed'
            AND closure_timestamp >= ${startUTC}
            AND closure_timestamp <= ${endUTC}
          `;
        } else {
          revenueBreakdownQuery = await sql`
            SELECT
              COALESCE(SUM(COALESCE(final_service_amount, 0)), 0)::numeric as total_service_charges,
              COALESCE(SUM(COALESCE(final_material_amount, 0)), 0)::numeric as total_material_charges,
              COALESCE(SUM(COALESCE(final_discount_amount, 0)), 0)::numeric as total_discounts,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0)) + SUM(COALESCE(final_material_amount, 0)) - SUM(COALESCE(final_discount_amount, 0)),
                0
              )::numeric as net_revenue
            FROM service_call
            WHERE business_id = ${businessId} AND call_status = 'closed'
          `;
        }
      }
      
      console.log("REPORTS_REVENUE_QUERY_SUCCESS", { rows: revenueBreakdownQuery?.length || 0 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_REVENUE_QUERY_FAILED:", errMsg);
      revenueBreakdownQuery = [];
    }

    // Get Trend section data
    let trendQuery;
    try {
      console.log("REPORTS_TREND_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        if (hasDateFilter) {
          trendQuery = await sql`
            SELECT
              COUNT(*) as total_closed_calls,
              COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue_from_closed,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as total_payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0))
                - SUM(COALESCE(paid_amount, 0)),
                0
              )::numeric as total_payment_pending
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
            AND closure_timestamp >= ${startUTC}
            AND closure_timestamp <= ${endUTC}
          `;
        } else {
          trendQuery = await sql`
            SELECT
              COUNT(*) as total_closed_calls,
              COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue_from_closed,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as total_payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0))
                - SUM(COALESCE(paid_amount, 0)),
                0
              )::numeric as total_payment_pending
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
          `;
        }
      } else {
        if (hasDateFilter) {
          trendQuery = await sql`
            SELECT
              COUNT(*) as total_closed_calls,
              COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue_from_closed,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as total_payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0))
                - SUM(COALESCE(paid_amount, 0)),
                0
              )::numeric as total_payment_pending
            FROM service_call
            WHERE business_id = ${businessId}
            AND call_status = 'closed'
            AND closure_timestamp >= ${startUTC}
            AND closure_timestamp <= ${endUTC}
          `;
        } else {
          trendQuery = await sql`
            SELECT
              COUNT(*) as total_closed_calls,
              COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue_from_closed,
              COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric as total_payment_received,
              COALESCE(
                SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0))
                - SUM(COALESCE(paid_amount, 0)),
                0
              )::numeric as total_payment_pending
            FROM service_call
            WHERE business_id = ${businessId}
            AND call_status = 'closed'
          `;
        }
      }
      
      console.log("REPORTS_TREND_QUERY_SUCCESS", { rows: trendQuery?.length || 0 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_TREND_QUERY_FAILED:", errMsg);
      trendQuery = [];
    }
    
    console.log("REPORTS_BUILDING_RESPONSE");

    // Safe defaults
    const safeSummary = summaryQuery && summaryQuery[0] ? {
      created: Number(summaryQuery[0].created_count) || 0,
      cancelled: Number(summaryQuery[0].cancelled_count) || 0,
      closed: Number(summaryQuery[0].closed_count) || 0,
      unassigned: Number(summaryQuery[0].unassigned_snapshot) || 0,
      assigned: Number(summaryQuery[0].assigned_snapshot) || 0,
      in_progress: Number(summaryQuery[0].in_progress_snapshot) || 0,
      action_required: Number(summaryQuery[0].action_required_snapshot) || 0,
      under_services: Number(summaryQuery[0].under_services_snapshot) || 0,
      total_revenue: Number(summaryQuery[0].total_revenue) || 0,
    } : {
      created: 0,
      cancelled: 0,
      closed: 0,
      unassigned: 0,
      assigned: 0,
      in_progress: 0,
      action_required: 0,
      under_services: 0,
      total_revenue: 0,
    };

    const safeEngineers = Array.isArray(engineerPerformanceQuery) ? engineerPerformanceQuery.map(e => ({
      engineer_id: e.engineer_id || '',
      engineer_name: e.engineer_name || '',
      total_assigned: Number(e.total_assigned) || 0,
      total_closed: Number(e.total_closed) || 0,
      total_pending: Number(e.total_pending) || 0,
    })) : [];

    const safeCategories = Array.isArray(categoryPerformanceQuery) ? categoryPerformanceQuery.map(c => ({
      category_id: c.category_id || '',
      category_name: c.category_name || '',
      total_calls: Number(c.total_calls) || 0,
      closed_calls: Number(c.closed_calls) || 0,
      pending_calls: Number(c.pending_calls) || 0,
      cancelled_calls: Number(c.cancelled_calls) || 0,
    })) : [];

    const safeRevenue = revenueBreakdownQuery && revenueBreakdownQuery[0] ? {
      total_service_charges: Number(revenueBreakdownQuery[0].total_service_charges) || 0,
      total_material_charges: Number(revenueBreakdownQuery[0].total_material_charges) || 0,
      total_discounts: Number(revenueBreakdownQuery[0].total_discounts) || 0,
      payment_received: Number(revenueBreakdownQuery[0].payment_received) || 0,
      net_revenue: Number(revenueBreakdownQuery[0].net_revenue) || 0,
    } : {
      total_service_charges: 0,
      total_material_charges: 0,
      total_discounts: 0,
      payment_received: 0,
      net_revenue: 0,
    };
    
    safeRevenue.payment_pending = Math.max(0, safeRevenue.net_revenue - safeRevenue.payment_received);

    const safeTrend = trendQuery && trendQuery[0] ? {
      total_closed_calls: Number(trendQuery[0].total_closed_calls) || 0,
      total_revenue_from_closed: Number(trendQuery[0].total_revenue_from_closed) || 0,
      total_payment_received: Number(trendQuery[0].total_payment_received) || 0,
      total_payment_pending: Math.max(0, Number(trendQuery[0].total_payment_pending) || 0),
    } : {
      total_closed_calls: 0,
      total_revenue_from_closed: 0,
      total_payment_received: 0,
      total_payment_pending: 0,
    };

    const finalResponse = {
      summary: safeSummary,
      engineerPerformance: safeEngineers,
      categoryPerformance: safeCategories,
      revenueBreakdown: safeRevenue,
      trend: safeTrend,
      trendPeriodLabel: filterType === 'today' ? 'Today' : filterType === 'this_week' ? 'This Week' : filterType === 'this_month' ? 'This Month' : `${startDateString} to ${endDateString}`,
      debug: {
        timezone: tzInfo.timezone,
        current_time: tzInfo.localDateInTz,
        role: userRole,
        business_id: businessId,
        manager_id: userRole === "manager" ? userId : (effectiveManagerId || null),
        report_mode: reportMode,
        filter_type: hasDateFilter ? "date_range" : "all_time",
        selected_filter: filterType,
        start_date: startDateString,
        end_date: endDateString,
      }
    };

    console.log("REPORTS_API_SUCCESS", {
      summary: safeSummary,
      engineers: safeEngineers.length,
      categories: safeCategories.length,
    });

    return NextResponse.json(finalResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("=== REPORTS_API_FATAL_ERROR ===");
    console.error("Error message:", errorMessage);
    if (error instanceof Error) console.error("Stack:", error.stack);
    
    return NextResponse.json({
      summary: {
        created: 0,
        cancelled: 0,
        closed: 0,
        unassigned: 0,
        assigned: 0,
        in_progress: 0,
        action_required: 0,
        under_services: 0,
        total_revenue: 0,
      },
      engineerPerformance: [],
      categoryPerformance: [],
      revenueBreakdown: {
        total_service_charges: 0,
        total_material_charges: 0,
        total_discounts: 0,
        payment_pending: 0,
        payment_received: 0,
        net_revenue: 0,
      },
    }, { status: 200 });
  }
}
