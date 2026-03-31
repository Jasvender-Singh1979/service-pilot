import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";

interface ConsistencyFlag {
  engineer_id: string;
  engineer_name: string;
  flag_type: string;
  severity: "warning" | "critical";
  description: string;
  details?: {
    checked_in_since?: string;
    open_call_id?: string;
    open_call_count?: number;
  };
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can view
    if (!["manager", "super_admin"].includes(user.role || "")) {
      return NextResponse.json(
        { error: "Only managers can view consistency checks" },
        { status: 403 }
      );
    }

    const businessId = user.business_id;
    const managerId = user.role === "super_admin" ? undefined : user.id;
    const todayDate = getTodayIST();

    const flags: ConsistencyFlag[] = [];

    // Check 1: Checked in but no assigned work
    let query1 = `
      SELECT DISTINCT
        u.id,
        u.name,
        a.check_in_time
      FROM "user" u
      JOIN attendance a ON u.id = a.engineer_user_id
      LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id 
        AND sc.business_id = $1
        AND sc.call_status IN ('assigned', 'in_progress')
      WHERE u.business_id = $1
        AND u.role = 'engineer'
        AND a.attendance_date = $2
        AND a.status = 'checked_in'
        AND sc.id IS NULL
    `;

    let params1: any[] = [businessId, todayDate];

    if (managerId) {
      query1 += ` AND u.manager_user_id = $3`;
      params1.push(managerId);
    }

    const checkedInNoWork = await sql.raw(query1, params1);

    for (const record of checkedInNoWork) {
      flags.push({
        engineer_id: record.id,
        engineer_name: record.name,
        flag_type: "checked_in_no_work",
        severity: "warning",
        description: "Engineer checked in but has no assigned work",
        details: {
          checked_in_since: record.check_in_time,
        },
      });
    }

    // Check 2: Call in progress but engineer not checked in
    let query2 = `
      SELECT DISTINCT
        u.id,
        u.name,
        sc.call_id,
        sc.id as call_id_pk
      FROM "user" u
      JOIN service_call sc ON u.id = sc.assigned_engineer_user_id
      LEFT JOIN attendance a ON u.id = a.engineer_user_id 
        AND a.business_id = $1
        AND a.attendance_date = $2
      WHERE u.business_id = $1
        AND u.role = 'engineer'
        AND sc.call_status IN ('in_progress', 'assigned')
        AND a.status IS NULL
    `;

    let params2: any[] = [businessId, todayDate];

    if (managerId) {
      query2 += ` AND u.manager_user_id = $3`;
      params2.push(managerId);
    }

    const openCallNotCheckedIn = await sql.raw(query2, params2);

    for (const record of openCallNotCheckedIn) {
      flags.push({
        engineer_id: record.id,
        engineer_name: record.name,
        flag_type: "work_without_checkin",
        severity: "critical",
        description: "Engineer has active call but not checked in",
        details: {
          open_call_id: record.call_id,
        },
      });
    }

    // Check 3: Checked out while open calls exist
    let query3 = `
      SELECT DISTINCT
        u.id,
        u.name,
        a.check_out_time,
        COUNT(sc.id) as open_call_count
      FROM "user" u
      JOIN attendance a ON u.id = a.engineer_user_id
      LEFT JOIN service_call sc ON u.id = sc.assigned_engineer_user_id 
        AND sc.business_id = $1
        AND sc.call_status IN ('assigned', 'in_progress')
      WHERE u.business_id = $1
        AND u.role = 'engineer'
        AND a.attendance_date = $2
        AND a.status = 'checked_out'
        AND sc.id IS NOT NULL
      GROUP BY u.id, u.name, a.check_out_time
    `;

    let params3: any[] = [businessId, todayDate];

    if (managerId) {
      query3 += ` AND u.manager_user_id = $3`;
      params3.push(managerId);
    }

    const checkedOutOpenCalls = await sql.raw(query3, params3);

    for (const record of checkedOutOpenCalls) {
      flags.push({
        engineer_id: record.id,
        engineer_name: record.name,
        flag_type: "checked_out_with_open_calls",
        severity: "warning",
        description: "Engineer checked out but still has open calls",
        details: {
          open_call_count: record.open_call_count,
        },
      });
    }

    // Sort by severity (critical first)
    flags.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return NextResponse.json({
      success: true,
      flags: flags,
      total_issues: flags.length,
      critical_count: flags.filter((f) => f.severity === "critical").length,
      warning_count: flags.filter((f) => f.severity === "warning").length,
    });
  } catch (error) {
    console.error("[ATTENDANCE_CONSISTENCY_CHECK_API]", error);
    return NextResponse.json(
      {
        error: "Failed to run consistency checks",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
