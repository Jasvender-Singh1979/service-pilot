import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";
import { getTodayIST } from "@/lib/dateUtils";

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    // Check role
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can view service calls" },
        { status: 403 }
      );
    }

    // Get filter parameters
    const month = searchParams.get('month');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    let calls;
    
    if (month) {
      // Month filter: YYYY-MM format
      const [year, monthNum] = month.split('-');
      const yearNum = parseInt(year);
      const monthInt = parseInt(monthNum);
      
      calls = await sql`
        SELECT 
          sc.id,
          sc.call_id,
          sc.customer_name,
          sc.customer_phone,
          sc.phone_country_code,
          sc.customer_whatsapp,
          sc.whatsapp_country_code,
          sc.category_name_snapshot,
          sc.problem_reported,
          sc.priority_level,
          sc.call_status,
          sc.created_at,
          sc.charge_type,
          sc.custom_amount,
          sc.warranty_status,
          sc.purchase_source,
          sc.seller_name_if_other,
          sc.assigned_engineer_user_id,
          u.name as assigned_engineer_name,
          u.mobile_number as assigned_engineer_phone
        FROM service_call sc
        LEFT JOIN "user" u ON sc.assigned_engineer_user_id = u.id
        WHERE sc.manager_user_id = ${user.id}
        AND sc.business_id = ${user.business_id}
        AND EXTRACT(YEAR FROM sc.created_at) = ${yearNum}
        AND EXTRACT(MONTH FROM sc.created_at) = ${monthInt}
        ORDER BY sc.created_at DESC
      `;
    } else if (fromDate && toDate) {
      // Date range filter
      calls = await sql`
        SELECT 
          sc.id,
          sc.call_id,
          sc.customer_name,
          sc.customer_phone,
          sc.phone_country_code,
          sc.customer_whatsapp,
          sc.whatsapp_country_code,
          sc.category_name_snapshot,
          sc.problem_reported,
          sc.priority_level,
          sc.call_status,
          sc.created_at,
          sc.charge_type,
          sc.custom_amount,
          sc.warranty_status,
          sc.purchase_source,
          sc.seller_name_if_other,
          sc.assigned_engineer_user_id,
          u.name as assigned_engineer_name,
          u.mobile_number as assigned_engineer_phone
        FROM service_call sc
        LEFT JOIN "user" u ON sc.assigned_engineer_user_id = u.id
        WHERE sc.manager_user_id = ${user.id}
        AND sc.business_id = ${user.business_id}
        AND sc.created_at::date >= ${fromDate}::date
        AND sc.created_at::date <= ${toDate}::date
        ORDER BY sc.created_at DESC
      `;
    } else {
      // No filters: get all calls for manager
      calls = await sql`
        SELECT 
          sc.id,
          sc.call_id,
          sc.customer_name,
          sc.customer_phone,
          sc.phone_country_code,
          sc.customer_whatsapp,
          sc.whatsapp_country_code,
          sc.category_name_snapshot,
          sc.problem_reported,
          sc.priority_level,
          sc.call_status,
          sc.created_at,
          sc.charge_type,
          sc.custom_amount,
          sc.warranty_status,
          sc.purchase_source,
          sc.seller_name_if_other,
          sc.assigned_engineer_user_id,
          u.name as assigned_engineer_name,
          u.mobile_number as assigned_engineer_phone
        FROM service_call sc
        LEFT JOIN "user" u ON sc.assigned_engineer_user_id = u.id
        WHERE sc.manager_user_id = ${user.id}
        AND sc.business_id = ${user.business_id}
        ORDER BY sc.created_at DESC
      `;
    }

    return NextResponse.json(calls);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching service calls:", errorMessage);
    return NextResponse.json(
      { error: `Failed to fetch service calls: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can create service calls" },
        { status: 403 }
      );
    }

    const {
      customer_name,
      customer_address,
      phone_country_code,
      customer_phone,
      whatsapp_country_code,
      customer_whatsapp,
      whatsapp_same_as_phone,
      category_id,
      problem_reported,
      service_image_url,
      priority_level,
      purchase_source,
      seller_name_if_other,
      warranty_status,
      purchase_date,
      charge_type,
      custom_amount,
      selected_whatsapp_template = null,
      assigned_engineer_user_id,
    } = await request.json();

    // Validate required fields
    if (
      !customer_name ||
      !customer_address ||
      !phone_country_code ||
      !customer_phone ||
      !whatsapp_country_code ||
      !customer_whatsapp ||
      !category_id ||
      !problem_reported ||
      !priority_level ||
      !purchase_source ||
      !warranty_status ||
      !charge_type
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate conditional required fields
    if (purchase_source === "other" && !seller_name_if_other) {
      return NextResponse.json(
        { error: "Seller name required when purchase source is 'other'" },
        { status: 400 }
      );
    }

    if (warranty_status === "in_warranty" && !purchase_date) {
      return NextResponse.json(
        { error: "Purchase date required when warranty status is 'in_warranty'" },
        { status: 400 }
      );
    }

    if (charge_type === "custom" && !custom_amount) {
      return NextResponse.json(
        { error: "Custom amount required when charge type is 'custom'" },
        { status: 400 }
      );
    }

    // Verify category belongs to this manager
    const categoryResult = await sql`
      SELECT id, category_name FROM service_category 
      WHERE id = ${category_id}
      AND manager_user_id = ${user.id}
      AND business_id = ${user.business_id}
    `;

    if (!categoryResult || categoryResult.length === 0) {
      return NextResponse.json(
        { error: "Selected category not found or does not belong to you" },
        { status: 403 }
      );
    }

    const category = categoryResult[0];

    // Verify engineer belongs to this manager if assigned
    if (assigned_engineer_user_id) {
      const engineerResult = await sql`
        SELECT id FROM "user"
        WHERE id = ${assigned_engineer_user_id}
        AND manager_user_id = ${user.id}
        AND business_id = ${user.business_id}
        AND role = 'engineer'
        AND is_active = true
      `;

      if (!engineerResult || engineerResult.length === 0) {
        return NextResponse.json(
          { error: "Selected engineer not found or does not belong to you" },
          { status: 403 }
        );
      }
    }

    // Determine call status based on engineer assignment
    const call_status = assigned_engineer_user_id ? "assigned" : "unassigned";

    // Get manager's name for Call ID generation
    const managerName = user.name;
    const managerInitials = managerName
      .split(' ')[0]
      .substring(0, 3)
      .toUpperCase();

    // Generate Call ID using IST timezone (Asia/Kolkata)
    // CRITICAL: Must use IST date/month for call ID, not UTC or server timezone
    const todayIST = getTodayIST(); // Returns YYYY-MM-DD in IST
    const [istYear, istMonth, istDay] = todayIST.split('-');
    
    const day = istDay;
    const year = istYear.slice(-2);
    const monthNum = parseInt(istMonth);
    
    // Convert month number to 3-letter abbreviation
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[monthNum - 1];
    const currentYear = parseInt(istYear);
    const currentMonth = monthNum;

    console.log('[SERVICE_CALL_CREATE] Call ID Generation - IST Details:', {
      todayIST,
      year,
      month,
      day,
      currentYear,
      currentMonth,
    });

    // Get the MAX monthly_sequence_number for this manager in the current IST month
    // CRITICAL: Use IST-converted month/year, not UTC
    const maxSequenceResult = await sql`
      SELECT COALESCE(MAX(monthly_sequence_number), 0) as max_sequence
      FROM service_call
      WHERE manager_user_id = ${user.id}
      AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= ${istYear}-${istMonth}-01
      AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date < (${istYear}-${istMonth}-01::date + interval '1 month')
    `;

    const maxSequenceNumber = maxSequenceResult[0]?.max_sequence || 0;
    // Integer arithmetic: next = max + 1
    const nextSequenceNumber = maxSequenceNumber + 1;
    // Format as zero-padded 2-digit string for display
    const sequenceStr = String(nextSequenceNumber).padStart(2, '0');
    const call_id = `${managerInitials}-${day}${year}-${month}-${sequenceStr}`;

    // Create service call
    const result = await sql`
      INSERT INTO service_call (
        business_id,
        manager_user_id,
        assigned_engineer_user_id,
        call_id,
        monthly_sequence_number,
        customer_name,
        customer_address,
        phone_country_code,
        customer_phone,
        whatsapp_country_code,
        customer_whatsapp,
        whatsapp_same_as_phone,
        category_id,
        category_name_snapshot,
        problem_reported,
        service_image_url,
        priority_level,
        purchase_source,
        seller_name_if_other,
        warranty_status,
        purchase_date,
        charge_type,
        custom_amount,
        selected_whatsapp_template,
        call_status,
        created_by_user_id
      ) VALUES (
        ${user.business_id},
        ${user.id},
        ${assigned_engineer_user_id || null},
        ${call_id},
        ${nextSequenceNumber},
        ${customer_name.trim()},
        ${customer_address.trim()},
        ${phone_country_code},
        ${customer_phone.trim()},
        ${whatsapp_country_code},
        ${customer_whatsapp.trim()},
        ${whatsapp_same_as_phone},
        ${category_id},
        ${category.category_name},
        ${problem_reported.trim()},
        ${service_image_url || null},
        ${priority_level},
        ${purchase_source},
        ${seller_name_if_other ? seller_name_if_other.trim() : null},
        ${warranty_status},
        ${purchase_date || null},
        ${charge_type},
        ${custom_amount || null},
        ${selected_whatsapp_template},
        ${call_status},
        ${user.id}
      )
      RETURNING *
    `;

    // Create history entry for call creation
    const newCall = result[0];
    await sql`
      INSERT INTO service_call_history (
        service_call_id,
        business_id,
        manager_user_id,
        actor_user_id,
        actor_role,
        event_type,
        event_timestamp
      ) VALUES (
        ${newCall.id},
        ${user.business_id},
        ${user.id},
        ${user.id},
        'manager',
        'call_created',
        NOW()
      )
    `;

    return NextResponse.json(newCall, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating service call:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to create service call: ${errorMessage}` },
      { status: 500 }
    );
  }
}
