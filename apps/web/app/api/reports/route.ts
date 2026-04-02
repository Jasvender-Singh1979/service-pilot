import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import {
  getTodayRangeIST,
  getThisWeekRangeIST,
  getThisMonthRangeIST,
  getCustomRangeIST,
  getTimezoneDebugInfo
} from "@/lib/dateUtils";

// Helper to get date range based on filter (timezone-aware)
function getDateRange(filter: string) {
  switch (filter) {
    case "today": {
      const range = getTodayRangeIST();
      const start = range.start.toISOString().split('T')[0];
      const end = range.end.toISOString().split('T')[0];
      return { startDate: start, endDate: end };
    }
    case "this_week": {
      const range = getThisWeekRangeIST();
      const start = range.start.toISOString().split('T')[0];
      const end = range.end.toISOString().split('T')[0];
      return { startDate: start, endDate: end };
    }
    case "this_month": {
      const range = getThisMonthRangeIST();
      const start = range.start.toISOString().split('T')[0];
      const end = range.end.toISOString().split('T')[0];
      return { startDate: start, endDate: end };
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
    let filterType = searchParams.get("filter") || "all_time"; // Get filter type
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    let selectedManagerId = searchParams.get("managerId"); // For Super Admin manager-split mode
    
    console.log("REPORTS_PARAMS_RECEIVED:", { filterType, startDate, endDate, selectedManagerId });
    
    // If a preset filter is selected, calculate dates using timezone
    if (filterType !== "custom" && filterType !== "all_time") {
      const dateRange = getDateRange(filterType);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
      console.log("REPORTS_FILTER_PRESET_APPLIED:", { filterType, calculated_startDate: startDate, calculated_endDate: endDate });
    }
    
    // For Super Admin manager-split mode, use the selected manager instead of all data
    let effectiveManagerId = null;
    let reportMode = "combined"; // combined or individual
    
    if (userRole === "super_admin" && selectedManagerId) {
      // Super Admin chose to view a specific manager's data
      effectiveManagerId = selectedManagerId;
      reportMode = "individual";
      console.log("REPORTS_SUPER_ADMIN_MANAGER_SPLIT_MODE: manager mode selected", { selectedManagerId });
    }

    // Safely parse and validate dates
    let hasDateFilter = false;
    try {
      if (startDate && endDate) {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
          console.log("REPORTS_INVALID_DATE_FORMAT", { startDate, endDate });
          startDate = null;
          endDate = null;
          hasDateFilter = false;
        } else {
          // Verify dates can be parsed
          const start = new Date(startDate + "T00:00:00Z");
          const end = new Date(endDate + "T23:59:59Z");
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.log("REPORTS_INVALID_DATE_VALUES", { startDate, endDate });
            startDate = null;
            endDate = null;
            hasDateFilter = false;
          } else if (start > end) {
            console.log("REPORTS_SWAPPING_DATES", { original_start: startDate, original_end: endDate });
            [startDate, endDate] = [endDate, startDate];
            hasDateFilter = true;
          } else {
            hasDateFilter = true;
          }
        }
      }
    } catch (err) {
      console.log("REPORTS_DATE_PARSE_ERROR:", err);
      startDate = null;
      endDate = null;
      hasDateFilter = false;
    }
    
    console.log("REPORTS_DATE_FILTER_READY:", { hasDateFilter, startDate, endDate });
    
    // CRITICAL FIX: Do NOT fall back to all-time data if date range has no matches
    // Instead, return zeros/empty sections to respect the user's filter selection
    // The queries below will naturally return empty/zero results if no data matches the date range

    // Get summary metrics with NEW business logic:
    // - Created/Cancelled/Closed = event counts during range
    // - Unassigned/Assigned/In Progress/Action Required/Under Services = snapshot counts at end of range
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
      
      // Determine which manager to filter by
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      // 1. EVENT COUNTS (created, cancelled, closed during range)
      // CRITICAL: Use SAME logic as Dashboard
      // - Created: count calls where created_at (in local TZ) falls in range
      // - Cancelled: count calls where call_status = 'cancelled' AND updated_at (in local TZ) falls in range
      // - Closed: count calls where call_status = 'closed' AND closure_timestamp (in local TZ) falls in range
      try {
        let eventCountQuery;
        if (hasDateFilter && managerFilterId) {
          eventCountQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as created_during_range,
              COUNT(*) FILTER (WHERE call_status = 'cancelled' AND (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as cancelled_during_range,
              COUNT(*) FILTER (WHERE call_status = 'closed' AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as closed_during_range
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
          `;
        } else if (hasDateFilter) {
          eventCountQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as created_during_range,
              COUNT(*) FILTER (WHERE call_status = 'cancelled' AND (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as cancelled_during_range,
              COUNT(*) FILTER (WHERE call_status = 'closed' AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as closed_during_range
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
        console.log("REPORTS_EVENT_COUNTS (FIXED LOGIC)", { created: summaryData.created_count, cancelled: summaryData.cancelled_count, closed: summaryData.closed_count });
      } catch (err) {
        console.error("REPORTS_EVENT_COUNT_FAILED:", err);
      }
      
      // 2. SNAPSHOT COUNTS (as of END of range)
      // These are current statuses for calls that were created by end-of-range date
      try {
        let snapshotQuery;
        if (hasDateFilter && managerFilterId) {
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
            AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
          `;
        } else if (hasDateFilter) {
          snapshotQuery = await sql`
            SELECT
              COUNT(*) FILTER (WHERE call_status = 'unassigned') as unassigned_count,
              COUNT(*) FILTER (WHERE call_status = 'assigned') as assigned_count,
              COUNT(*) FILTER (WHERE call_status = 'in_progress') as in_progress_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_action_required') as action_required_count,
              COUNT(*) FILTER (WHERE call_status = 'pending_under_services') as under_services_count
            FROM service_call
            WHERE business_id = ${businessId}
            AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
        console.log("REPORTS_SNAPSHOT_COUNTS (LOCAL_TZ_AWARE)", { unassigned: summaryData.unassigned_snapshot, assigned: summaryData.assigned_snapshot, in_progress: summaryData.in_progress_snapshot, action_required: summaryData.action_required_snapshot, under_services: summaryData.under_services_snapshot });
      } catch (err) {
        console.error("REPORTS_SNAPSHOT_COUNT_FAILED:", err);
      }
      
      // 3. TOTAL REVENUE (from closed calls during range)
      try {
        let revenueQuery;
        if (hasDateFilter && managerFilterId) {
          revenueQuery = await sql`
            SELECT COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
            AND call_status = 'closed'
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
          `;
        } else if (hasDateFilter) {
          revenueQuery = await sql`
            SELECT COALESCE(SUM(COALESCE(final_service_amount, 0) + COALESCE(final_material_amount, 0) - COALESCE(final_discount_amount, 0)), 0)::numeric as total_revenue
            FROM service_call
            WHERE business_id = ${businessId}
            AND call_status = 'closed'
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
        // Scoped to a specific manager's engineers
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
              AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
              AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
        // Super Admin: all engineers in business (combined mode)
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
              AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
              AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
      console.log("REPORTS_ENGINEER_QUERY_SUCCESS", { rows: engineerCount, engineer_linked_call_count: engineerPerformanceQuery?.reduce((sum, e) => sum + Number(e.total_assigned || 0), 0) || 0 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_ENGINEER_QUERY_FAILED:", errMsg);
      if (err instanceof Error) console.error("Stack:", err.stack);
      engineerPerformanceQuery = [];
    }

    // Get category performance
    let categoryPerformanceQuery;
    try {
      console.log("REPORTS_CATEGORY_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        // Scoped to a specific manager's calls
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
            AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
        // Super Admin: all calls' categories (combined mode)
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
            AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (sc.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
      console.log("REPORTS_CATEGORY_QUERY_SUCCESS", { rows: categoryCount, category_linked_call_count: categoryPerformanceQuery?.reduce((sum, c) => sum + Number(c.total_calls || 0), 0) || 0 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_CATEGORY_QUERY_FAILED:", errMsg);
      if (err instanceof Error) console.error("Stack:", err.stack);
      categoryPerformanceQuery = [];
    }

    // Get revenue breakdown (only closed calls)
    // Using final_service_amount, final_material_amount, final_discount_amount from closure
    let revenueBreakdownQuery;
    try {
      console.log("REPORTS_REVENUE_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        // Scoped to a specific manager's closed calls
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
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
        // Super Admin: all closed calls (combined mode)
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
            AND (closure_timestamp AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (closure_timestamp AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
      
      const closedCallCount = revenueBreakdownQuery && revenueBreakdownQuery[0] ? 1 : 0; // One row with aggregates
      console.log("REPORTS_REVENUE_QUERY_SUCCESS", { rows: revenueBreakdownQuery?.length || 0, closed_call_count: closedCallCount });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_REVENUE_QUERY_FAILED:", errMsg);
      if (err instanceof Error) console.error("Stack:", err.stack);
      revenueBreakdownQuery = [];
    }
      // Get monthly trend - revenue based on when calls CLOSED
      let monthlyTrendQuery;
      try {
        console.log("REPORTS_MONTHLY_QUERY_START");
        
        const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
        
        if (managerFilterId) {
          // Scoped to a specific manager's monthly trend
          if (hasDateFilter) {
            monthlyTrendQuery = await sql`
              SELECT
                DATE_TRUNC('month', sc.created_at)::date as month,
                COUNT(DISTINCT sc.id) as total_calls,
                COALESCE(
                  SUM(
                    CASE WHEN sc.call_status = 'closed' AND (sc.closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (sc.closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
                    THEN COALESCE(sc.final_service_amount, 0) + COALESCE(sc.final_material_amount, 0) - COALESCE(sc.final_discount_amount, 0)
                    ELSE 0
                    END
                  ),
                  0
                )::numeric as total_revenue
              FROM service_call sc
              WHERE sc.business_id = ${businessId}
              AND sc.manager_user_id = ${managerFilterId}
              AND DATE(sc.created_at) >= ${startDate}::date
              AND DATE(sc.created_at) <= ${endDate}::date
              GROUP BY DATE_TRUNC('month', sc.created_at)
              ORDER BY month DESC
            `;
        } else {
          monthlyTrendQuery = await sql`
            SELECT
              DATE_TRUNC('month', sc.created_at)::date as month,
              COUNT(DISTINCT sc.id) as total_calls,
              COALESCE(
                SUM(
                  CASE WHEN sc.call_status = 'closed'
                  THEN COALESCE(sc.final_service_amount, 0) + COALESCE(sc.final_material_amount, 0) - COALESCE(sc.final_discount_amount, 0)
                  ELSE 0
                  END
                ),
                0
              )::numeric as total_revenue
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            AND sc.manager_user_id = ${managerFilterId}
            GROUP BY DATE_TRUNC('month', sc.created_at)
            ORDER BY month DESC
          `;
        }
        } else {
          // Super Admin: all calls' monthly trend (combined mode)
          if (hasDateFilter) {
            monthlyTrendQuery = await sql`
            SELECT
              DATE_TRUNC('month', sc.created_at)::date as month,
              COUNT(DISTINCT sc.id) as total_calls,
              COALESCE(
                SUM(
                  CASE WHEN sc.call_status = 'closed' AND (sc.closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (sc.closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
                  THEN COALESCE(sc.final_service_amount, 0) + COALESCE(sc.final_material_amount, 0) - COALESCE(sc.final_discount_amount, 0)
                  ELSE 0
                  END
                ),
                0
              )::numeric as total_revenue
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            AND DATE(sc.created_at) >= ${startDate}::date
            AND DATE(sc.created_at) <= ${endDate}::date
            GROUP BY DATE_TRUNC('month', sc.created_at)
            ORDER BY month DESC
            `;
        } else {
          monthlyTrendQuery = await sql`
            SELECT
              DATE_TRUNC('month', sc.created_at)::date as month,
              COUNT(DISTINCT sc.id) as total_calls,
              COALESCE(
                SUM(
                  CASE WHEN sc.call_status = 'closed'
                  THEN COALESCE(sc.final_service_amount, 0) + COALESCE(sc.final_material_amount, 0) - COALESCE(sc.final_discount_amount, 0)
                  ELSE 0
                  END
                ),
                0
              )::numeric as total_revenue
            FROM service_call sc
            WHERE sc.business_id = ${businessId}
            GROUP BY DATE_TRUNC('month', sc.created_at)
            ORDER BY month DESC
          `;
        }
      }
      
      console.log("REPORTS_MONTHLY_QUERY_SUCCESS", { rows: monthlyTrendQuery?.length || 0 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_MONTHLY_QUERY_FAILED:", errMsg);
      if (err instanceof Error) console.error("Stack:", err.stack);
      monthlyTrendQuery = [];
    }

    // Get Trend section data (based on selected period, only closed calls)
    // Shows: Total Closed Calls, Total Revenue, Payment Received, Payment Pending
    let trendQuery;
    try {
      console.log("REPORTS_TREND_QUERY_START");
      
      const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
      
      if (managerFilterId) {
        // Scoped to a specific manager's closed calls
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
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
        // Super Admin: all closed calls (combined mode)
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
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date
            AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date
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
      if (err instanceof Error) console.error("Stack:", err.stack);
      trendQuery = [];
    }

    // Get Manager Performance (Super Admin only, for individual/combined modes)
    let managerPerformanceQuery;
    try {
      console.log("REPORTS_MANAGER_QUERY_START");
      
      if (userRole === "super_admin") {
        if (effectiveManagerId) {
          // In individual mode, just show that specific manager's performance
          if (hasDateFilter) {
            managerPerformanceQuery = await sql`
              SELECT
                u.id as manager_id,
                u.name as manager_name,
                COUNT(DISTINCT sc.id) FILTER (WHERE DATE(sc.created_at) >= ${startDate}::date AND DATE(sc.created_at) <= ${endDate}::date) as created_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'cancelled' AND DATE(sc.updated_at) >= ${startDate}::date AND DATE(sc.updated_at) <= ${endDate}::date) as cancelled_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'closed' AND (sc.closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (sc.closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as closed_during_range
              FROM "user" u
              LEFT JOIN service_call sc ON u.id = sc.manager_user_id AND sc.business_id = ${businessId}
              WHERE u.business_id = ${businessId} AND u.id = ${effectiveManagerId} AND u.role = 'manager'
              GROUP BY u.id, u.name
            `;
          } else {
            managerPerformanceQuery = await sql`
              SELECT
                u.id as manager_id,
                u.name as manager_name,
                COUNT(DISTINCT sc.id) as created_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'cancelled') as cancelled_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'closed') as closed_during_range
              FROM "user" u
              LEFT JOIN service_call sc ON u.id = sc.manager_user_id AND sc.business_id = ${businessId}
              WHERE u.business_id = ${businessId} AND u.id = ${effectiveManagerId} AND u.role = 'manager'
              GROUP BY u.id, u.name
            `;
          }
        } else {
          // In combined mode, show all managers
          if (hasDateFilter) {
            managerPerformanceQuery = await sql`
              SELECT
                u.id as manager_id,
                u.name as manager_name,
                COUNT(DISTINCT sc.id) FILTER (WHERE DATE(sc.created_at) >= ${startDate}::date AND DATE(sc.created_at) <= ${endDate}::date) as created_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'cancelled' AND DATE(sc.updated_at) >= ${startDate}::date AND DATE(sc.updated_at) <= ${endDate}::date) as cancelled_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'closed' AND (sc.closure_timestamp AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (sc.closure_timestamp AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as closed_during_range
              FROM "user" u
              LEFT JOIN service_call sc ON u.id = sc.manager_user_id AND sc.business_id = ${businessId}
              WHERE u.business_id = ${businessId} AND u.role = 'manager'
              GROUP BY u.id, u.name
              ORDER BY created_during_range DESC
            `;
          } else {
            managerPerformanceQuery = await sql`
              SELECT
                u.id as manager_id,
                u.name as manager_name,
                COUNT(DISTINCT sc.id) as created_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'cancelled') as cancelled_during_range,
                COUNT(DISTINCT sc.id) FILTER (WHERE sc.call_status = 'closed') as closed_during_range
              FROM "user" u
              LEFT JOIN service_call sc ON u.id = sc.manager_user_id AND sc.business_id = ${businessId}
              WHERE u.business_id = ${businessId} AND u.role = 'manager'
              GROUP BY u.id, u.name
              ORDER BY created_during_range DESC
            `;
          }
        }
      }
      
      const managerCount = Array.isArray(managerPerformanceQuery) ? managerPerformanceQuery.length : 0;
      console.log("REPORTS_MANAGER_QUERY_SUCCESS", { rows: managerCount });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("REPORTS_MANAGER_QUERY_FAILED:", errMsg);
      if (err instanceof Error) console.error("Stack:", err.stack);
      managerPerformanceQuery = [];
    }
    
    console.log("REPORTS_BUILDING_RESPONSE");

    // Ensure safe defaults for all sections - use NEW business logic
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
    console.log("REPORTS_SUMMARY_SAFE_DEFAULTS", safeSummary);

    const safeEngineers = Array.isArray(engineerPerformanceQuery) ? engineerPerformanceQuery.map(e => ({
      engineer_id: e.engineer_id || '',
      engineer_name: e.engineer_name || '',
      total_assigned: Number(e.total_assigned) || 0,
      total_closed: Number(e.total_closed) || 0,
      total_pending: Number(e.total_pending) || 0,
    })) : [];
    console.log("REPORTS_ENGINEERS_SAFE_DEFAULTS", { count: safeEngineers.length });

    const safeCategories = Array.isArray(categoryPerformanceQuery) ? categoryPerformanceQuery.map(c => ({
      category_id: c.category_id || '',
      category_name: c.category_name || '',
      total_calls: Number(c.total_calls) || 0,
      closed_calls: Number(c.closed_calls) || 0,
      pending_calls: Number(c.pending_calls) || 0,
      cancelled_calls: Number(c.cancelled_calls) || 0,
    })) : [];
    console.log("REPORTS_CATEGORIES_SAFE_DEFAULTS", { count: safeCategories.length });

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
    
    // Calculate payment_pending using correct formula: net_revenue - payment_received
    // CRITICAL: net_revenue already has discount subtracted, so we do NOT subtract discount again
    // Formula: Total Revenue (service + material - discount) - Payment Received
    // Clamp to 0 if negative
    safeRevenue.payment_pending = Math.max(0, safeRevenue.net_revenue - safeRevenue.payment_received);
    console.log("REPORTS_REVENUE_SAFE_DEFAULTS", safeRevenue);

    const safeMonthlyTrend = Array.isArray(monthlyTrendQuery) ? monthlyTrendQuery.map(m => ({
      month: m.month || '',
      total_calls: Number(m.total_calls) || 0,
      total_revenue: Number(m.total_revenue) || 0,
    })) : [];
    console.log("REPORTS_MONTHLY_SAFE_DEFAULTS", { count: safeMonthlyTrend.length });

    // Safe Trend section data
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
    console.log("REPORTS_TREND_SAFE_DEFAULTS", safeTrend);

    // Safe Manager Performance data (Super Admin only)
    const safeManagers = Array.isArray(managerPerformanceQuery) ? managerPerformanceQuery.map(m => ({
      manager_id: m.manager_id || '',
      manager_name: m.manager_name || '',
      created: Number(m.created_during_range) || 0,
      cancelled: Number(m.cancelled_during_range) || 0,
      closed: Number(m.closed_during_range) || 0,
    })) : [];
    console.log("REPORTS_MANAGERS_SAFE_DEFAULTS", { count: safeManagers.length });

    // Get counts for debugging
    let dateFilteredCallCount = 0;
    let closedCallCount = 0;
    if (hasDateFilter) {
      try {
        const managerFilterId = effectiveManagerId || (userRole === "manager" ? userId : null);
        let countQuery;
        
        if (managerFilterId) {
          countQuery = await sql`
            SELECT 
              COUNT(*) as all_calls,
              COUNT(*) FILTER (WHERE call_status = 'closed' AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as closed_calls
            FROM service_call
            WHERE business_id = ${businessId}
            AND manager_user_id = ${managerFilterId}
            AND DATE(created_at) >= ${startDate}::date
            AND DATE(created_at) <= ${endDate}::date
          `;
        } else {
          countQuery = await sql`
            SELECT 
              COUNT(*) as all_calls,
              COUNT(*) FILTER (WHERE call_status = 'closed' AND (closure_timestamp AT TIME ZONE 'Asia/Kolkata')::date >= ${startDate}::date AND (closure_timestamp AT TIME ZONE 'Asia/Kolkata')::date <= ${endDate}::date) as closed_calls
            FROM service_call
            WHERE business_id = ${businessId}
            AND DATE(created_at) >= ${startDate}::date
            AND DATE(created_at) <= ${endDate}::date
          `;
        }
        
        if (countQuery && countQuery[0]) {
          dateFilteredCallCount = Number(countQuery[0].all_calls) || 0;
          closedCallCount = Number(countQuery[0].closed_calls) || 0;
        }
      } catch (err) {
        console.error("REPORTS_DEBUG_COUNT_ERROR:", err);
      }
    } else {
      dateFilteredCallCount = safeSummary.created + safeSummary.unassigned + safeSummary.assigned + safeSummary.in_progress + safeSummary.action_required + safeSummary.under_services + safeSummary.closed + safeSummary.cancelled;
      closedCallCount = safeSummary.closed;
    }

    const finalResponse = {
      summary: safeSummary,
      engineerPerformance: safeEngineers,
      managerPerformance: safeManagers,
      categoryPerformance: safeCategories,
      revenueBreakdown: safeRevenue,
      trend: safeTrend,
      trendPeriodLabel: filterType === 'today' ? 'Today' : filterType === 'this_week' ? 'This Week' : filterType === 'this_month' ? 'This Month' : `${startDate} to ${endDate}`,
      monthlyTrend: safeMonthlyTrend,
      // Temporary debug info for diagnosis
      debug: {
        timezone: tzInfo.timezone,
        current_time: tzInfo.localDateInTz,
        role: userRole,
        business_id: businessId,
        manager_id: userRole === "manager" ? userId : (effectiveManagerId || null),
        report_mode: reportMode,
        filter_type: hasDateFilter ? "date_range" : "all_time",
        selected_filter: filterType,
        start_date: startDate,
        end_date: endDate,
        // Event counts
        created_event_count: safeSummary.created,
        created_count: safeSummary.created,
        cancelled_event_count: safeSummary.cancelled,
        cancelled_count: safeSummary.cancelled,
        closed_event_count: safeSummary.closed,
        closed_count: safeSummary.closed,
        // Snapshot counts
        unassigned_snapshot_count: safeSummary.unassigned,
        assigned_snapshot_count: safeSummary.assigned,
        in_progress_snapshot_count: safeSummary.in_progress,
        action_required_snapshot_count: safeSummary.action_required,
        under_services_snapshot_count: safeSummary.under_services,
        
        snapshot_status_note: "Snapshot counts are as of end of selected date range",
        // Other debug
        date_filtered_call_count: dateFilteredCallCount,
        engineer_linked_call_count: safeEngineers.reduce((sum, e) => sum + e.total_assigned, 0),
        category_linked_call_count: safeCategories.reduce((sum, c) => sum + c.total_calls, 0),
        // Revenue debug info
        service_amount: safeRevenue.total_service_charges,
        material_amount: safeRevenue.total_material_charges,
        total_discounts: safeRevenue.total_discounts,
        payment_pending: safeRevenue.payment_pending,
        payment_received: safeRevenue.payment_received,
        total_revenue: safeRevenue.net_revenue,
      }
    };

    console.log("REPORTS_API_SUCCESS", {
      summary: safeSummary,
      engineers: safeEngineers.length,
      categories: safeCategories.length,
      monthlyTrends: safeMonthlyTrend.length,
    });

    return NextResponse.json(finalResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("=== REPORTS_API_FATAL_ERROR ===");
    console.error("Error message:", errorMessage);
    if (error instanceof Error) console.error("Stack:", error.stack);
    
    // Return safe defaults even on error
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
      monthlyTrend: [],
    }, { status: 200 });
  }
}
