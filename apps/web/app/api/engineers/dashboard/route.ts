import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import {
  getTodayIST,
  getTodayRangeIST,
  getThisWeekRangeIST,
  getThisMonthRangeIST,
  getCustomRangeIST
} from "@/lib/dateUtils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      console.log('[ENGINEER_DASHBOARD] Unauthorized: no user from session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    console.log('[ENGINEER_DASHBOARD_START] Engineer ID:', userId, 'Role:', user.role);
    
    // Get filter from query params
    const { searchParams } = new URL(request.url);
    let filter = searchParams.get('filter') || 'today';
    let customStartDate = '';
    let customEndDate = '';

    // Parse custom date range if provided (format: custom|YYYY-MM-DD|YYYY-MM-DD)
    if (filter.startsWith('custom|')) {
      const parts = filter.split('|');
      if (parts.length >= 3) {
        customStartDate = parts[1];
        customEndDate = parts[2];
        filter = 'custom';
      }
    }

    // Verify user is an engineer
    if (user.role !== "engineer") {
      return NextResponse.json(
        { error: "Only engineers can access engineer dashboard" },
        { status: 403 }
      );
    }

    const businessId = user.business_id;
    console.log('[ENGINEER_DASHBOARD_AUTH] User verified. Business ID:', businessId);

    // Get today's date in IST
    const todayDate = getTodayIST();
    console.log('[ENGINEER_DASHBOARD_TIME] Today (IST):', todayDate);
    
    // Get date range for selected filter (returns UTC timestamps for DB queries)
    let dateRange: { startDate: string; endDate: string };
    
    if (filter === 'today') {
      const range = getTodayRangeIST();
      dateRange = {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString()
      };
      console.log('[ENGINEER_DASHBOARD_FILTER] Filter: today', { startDate: dateRange.startDate, endDate: dateRange.endDate });
    } else if (filter === 'this_week') {
      const range = getThisWeekRangeIST();
      dateRange = {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString()
      };
      console.log('[ENGINEER_DASHBOARD_FILTER] Filter: this_week', { startDate: dateRange.startDate, endDate: dateRange.endDate });
    } else if (filter === 'this_month') {
      const range = getThisMonthRangeIST();
      dateRange = {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString()
      };
      console.log('[ENGINEER_DASHBOARD_FILTER] Filter: this_month', { startDate: dateRange.startDate, endDate: dateRange.endDate });
    } else if (filter === 'custom' && customStartDate && customEndDate) {
      const range = getCustomRangeIST(customStartDate, customEndDate);
      dateRange = {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString()
      };
      console.log('[ENGINEER_DASHBOARD_FILTER] Filter: custom', { requested: `${customStartDate} to ${customEndDate}`, actual: { startDate: dateRange.startDate, endDate: dateRange.endDate } });
    } else {
      // all_time
      dateRange = {
        startDate: new Date(0).toISOString(),
        endDate: new Date().toISOString()
      };
      console.log('[ENGINEER_DASHBOARD_FILTER] Filter: all_time');
    }

    // Count assigned calls in filter range
    let assignedCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'assigned'
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      if (result && result[0]) {
        assignedCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting assigned calls:', e instanceof Error ? e.message : String(e));
    }

    // Count in progress calls in filter range
    let inProgressCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'in_progress'
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      if (result && result[0]) {
        inProgressCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting in progress calls:', e instanceof Error ? e.message : String(e));
    }

    // Count pending action required calls in filter range
    let pendingActionCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'pending_action_required'
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      if (result && result[0]) {
        pendingActionCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting pending action calls:', e instanceof Error ? e.message : String(e));
    }

    // Count pending under services calls in filter range
    let pendingUnderServicesCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'pending_under_services'
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      if (result && result[0]) {
        pendingUnderServicesCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting pending under services calls:', e instanceof Error ? e.message : String(e));
    }

    // Count closed calls in filter range
    let closedCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'closed'
        AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      if (result && result[0]) {
        closedCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting closed calls:', e instanceof Error ? e.message : String(e));
    }

    // Count cancelled calls in filter range
    let cancelledCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'cancelled'
        AND (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      if (result && result[0]) {
        cancelledCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting cancelled calls:', e instanceof Error ? e.message : String(e));
    }

    // Today's Summary Stats - ALWAYS use today-only, independent of filter
    // Business Logic per requirements:
    // 1. Assigned Today = calls assigned to engineer TODAY (created_at = today, assigned_engineer_id = current engineer)
    // 2. Closed Today = calls closed TODAY by this engineer (closure_timestamp = today)
    // 3. Pending Today = ALL currently open calls assigned to engineer (NO date filter, snapshot of live work)
    
    console.log('[ENGINEER_DASHBOARD_SUMMARY] Engineer:', userId, 'Today Date:', todayDate);
    
    // Assigned Today = event count: calls assigned to this engineer created today
    let assignedToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = ${todayDate}::date
      `;
      if (result && result[0]) {
        assignedToday = parseInt(String(result[0].count)) || 0;
      }
      console.log('[ENGINEER_DASHBOARD_SUMMARY] Assigned Today:', assignedToday);
    } catch (e) {
      console.error('Error counting assigned today:', e instanceof Error ? e.message : String(e));
    }

    // Closed Today = event count: calls closed today by this engineer
    let completedToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'closed'
        AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = ${todayDate}::date
      `;
      if (result && result[0]) {
        completedToday = parseInt(String(result[0].count)) || 0;
      }
      console.log('[ENGINEER_DASHBOARD_SUMMARY] Closed Today:', completedToday);
    } catch (e) {
      console.error('Error counting completed today:', e instanceof Error ? e.message : String(e));
    }

    // Pending Today = snapshot count: ALL currently open calls assigned to this engineer (NO date filter)
    // This is live work, not historical. Includes calls assigned any time but still open.
    let pendingToday = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')
      `;
      if (result && result[0]) {
        pendingToday = parseInt(String(result[0].count)) || 0;
      }
      console.log('[ENGINEER_DASHBOARD_SUMMARY] Pending (Open Work):', pendingToday);
    } catch (e) {
      console.error('Error counting pending work:', e instanceof Error ? e.message : String(e));
    }
    
    // Get all-time assigned count for All My Calls widget
    let allTimeAssignedCount = 0;
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
      `;
      if (result && result[0]) {
        allTimeAssignedCount = parseInt(String(result[0].count)) || 0;
      }
    } catch (e) {
      console.error('Error counting all-time assigned calls:', e instanceof Error ? e.message : String(e));
    }
    
    // Engineer Performance data for filter range
    let engineerPerformance = { assigned: 0, closed: 0, pending: 0, percentage: 0 };
    try {
      // Count assigned calls in filter range
      const assignedResult = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      const assignedCnt = parseInt(String(assignedResult?.[0]?.count)) || 0;

      // Count closed calls in filter range
      const closedResult = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status = 'closed'
        AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (closure_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      const closedCnt = parseInt(String(closedResult?.[0]?.count)) || 0;

      // Count pending calls (open statuses) in filter range
      const pendingResult = await sql`
        SELECT COUNT(*) as count FROM service_call
        WHERE assigned_engineer_user_id = ${userId}
        AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${dateRange.startDate}::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= ${dateRange.endDate}::date
      `;
      const pendingCnt = parseInt(String(pendingResult?.[0]?.count)) || 0;

      const percentage = assignedCnt > 0 ? Math.round((closedCnt / assignedCnt) * 100) : 0;

      engineerPerformance = {
        assigned: assignedCnt,
        closed: closedCnt,
        pending: pendingCnt,
        percentage: percentage,
      };
    } catch (e) {
      console.error('Error getting engineer performance:', e instanceof Error ? e.message : String(e));
    }
    
    return NextResponse.json({
      filter,
      assignedCount,
      inProgressCount,
      pendingActionCount,
      pendingUnderServicesCount,
      closedCount,
      cancelledCount,
      allTimeAssignedCount,
      dailySummary: {
        totalAssigned: assignedToday,
        completedToday: completedToday,
        pendingToday: pendingToday,
      },
      engineerPerformance,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ENGINEER_DASHBOARD_API] Error:', {
      errorMessage,
      stack: error instanceof Error ? error.stack : 'N/A',
    });
    return NextResponse.json(
      {
        filter: 'today',
        assignedCount: 0,
        inProgressCount: 0,
        pendingActionCount: 0,
        pendingUnderServicesCount: 0,
        closedCount: 0,
        cancelledCount: 0,
        allTimeAssignedCount: 0,
        dailySummary: {
          totalAssigned: 0,
          completedToday: 0,
          pendingToday: 0,
        },
        engineerPerformance: { assigned: 0, closed: 0, pending: 0, percentage: 0 },
      }
    );
  }
}
