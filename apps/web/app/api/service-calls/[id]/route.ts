import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Verify user is a manager
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can delete service calls" },
        { status: 403 }
      );
    }

    // Get service call
    const call = await sql`
      SELECT id, call_status, assigned_engineer_user_id FROM service_call 
      WHERE id = ${id}
      AND manager_user_id = ${userId}
      AND business_id = ${user.business_id || ''}
    `;

    if (!call || call.length === 0) {
      return NextResponse.json(
        { error: "Service call not found or does not belong to you" },
        { status: 404 }
      );
    }

    const serviceCall = call[0];

    // Can only delete unassigned calls
    if (serviceCall.assigned_engineer_user_id) {
      return NextResponse.json(
        { error: "Cannot delete an assigned service call. Please cancel it instead." },
        { status: 400 }
      );
    }

    // Delete the service call
    await sql`
      DELETE FROM service_call WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting service call:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to delete service call: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Verify user is a manager
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can view service calls" },
        { status: 403 }
      );
    }

    // Get service call - supports all statuses including pending_action_required
    const call = await sql`
      SELECT * FROM service_call 
      WHERE id = ${id}
      AND manager_user_id = ${userId}
      AND business_id = ${user.business_id || ''}
    `;

    if (!call || call.length === 0) {
      console.error('[ServiceCallDetail GET] Call not found:', { id, userId, businessId: user.business_id });
      return NextResponse.json(
        { error: "Service call not found or does not belong to you" },
        { status: 404 }
      );
    }

    return NextResponse.json(call[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching service call:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to fetch service call: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Verify user is a manager
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can update service calls" },
        { status: 403 }
      );
    }

    // Verify service call exists and belongs to this manager
    const existingCall = await sql`
      SELECT id FROM service_call 
      WHERE id = ${id}
      AND manager_user_id = ${userId}
      AND business_id = ${user.business_id || ''}
    `;

    if (!existingCall || existingCall.length === 0) {
      console.error('[ServiceCallDetail PUT] Call not found:', { id, userId, businessId: user.business_id });
      return NextResponse.json(
        { error: "Service call not found or does not belong to you" },
        { status: 404 }
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
      AND manager_user_id = ${userId}
      AND business_id = ${user.business_id || ''}
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
        AND manager_user_id = ${userId}
        AND business_id = ${user.business_id || ''}
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

    // Check if engineer is being assigned (and wasn't assigned before)
    const previousCall = await sql`
      SELECT assigned_engineer_user_id FROM service_call WHERE id = ${id}
    `;
    const wasAssigned = previousCall && previousCall.length > 0 && previousCall[0].assigned_engineer_user_id;

    // Determine call status based on engineer assignment
    const call_status = assigned_engineer_user_id ? "assigned" : "unassigned";

    // Update service call
    const result = await sql`
      UPDATE service_call SET
        customer_name = ${customer_name.trim()},
        customer_address = ${customer_address.trim()},
        phone_country_code = ${phone_country_code},
        customer_phone = ${customer_phone.trim()},
        whatsapp_country_code = ${whatsapp_country_code},
        customer_whatsapp = ${customer_whatsapp.trim()},
        whatsapp_same_as_phone = ${whatsapp_same_as_phone},
        category_id = ${category_id},
        category_name_snapshot = ${category.category_name},
        problem_reported = ${problem_reported.trim()},
        service_image_url = ${service_image_url || null},
        priority_level = ${priority_level},
        purchase_source = ${purchase_source},
        seller_name_if_other = ${seller_name_if_other ? seller_name_if_other.trim() : null},
        warranty_status = ${warranty_status},
        purchase_date = ${purchase_date || null},
        charge_type = ${charge_type},
        custom_amount = ${custom_amount || null},
        assigned_engineer_user_id = ${assigned_engineer_user_id || null},
        call_status = ${call_status},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Create history entry if engineer is being assigned for the first time
    if (assigned_engineer_user_id && !wasAssigned) {
      const engineerName = await sql`
        SELECT name FROM "user" WHERE id = ${assigned_engineer_user_id}
      `;
      const note = engineerName && engineerName.length > 0 
        ? `Engineer ${engineerName[0].name} assigned`
        : 'Engineer assigned';
      
      await sql`
        INSERT INTO service_call_history (
          id,
          service_call_id,
          business_id,
          manager_user_id,
          actor_user_id,
          actor_role,
          event_type,
          note_text,
          event_timestamp
        ) VALUES (
          ${crypto.randomUUID()},
          ${id},
          ${user.business_id},
          ${userId},
          ${userId},
          'manager',
          'engineer_assigned',
          ${note},
          NOW()
        )
      `;
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating service call:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to update service call: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Verify user is a manager
    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can cancel service calls" },
        { status: 403 }
      );
    }

    const { cancellation_reason } = await request.json();

    if (!cancellation_reason || !cancellation_reason.trim()) {
      return NextResponse.json(
        { error: "Cancellation reason is required" },
        { status: 400 }
      );
    }

    // Get service call
    const call = await sql`
      SELECT id, call_status FROM service_call 
      WHERE id = ${id}
      AND manager_user_id = ${userId}
      AND business_id = ${user.business_id || ''}
    `;

    if (!call || call.length === 0) {
      return NextResponse.json(
        { error: "Service call not found or does not belong to you" },
        { status: 404 }
      );
    }

    // Cancel the service call
    const result = await sql`
      UPDATE service_call SET
        call_status = 'cancelled',
        cancellation_reason = ${cancellation_reason.trim()},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Create history entry for cancellation
    await sql`
      INSERT INTO service_call_history (
        id,
        service_call_id,
        business_id,
        manager_user_id,
        actor_user_id,
        actor_role,
        event_type,
        note_text,
        event_timestamp
      ) VALUES (
        ${crypto.randomUUID()},
        ${id},
        ${user.business_id},
        ${userId},
        ${userId},
        'manager',
        'call_cancelled',
        ${cancellation_reason.trim()},
        NOW()
      )
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error cancelling service call:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to cancel service call: ${errorMessage}` },
      { status: 500 }
    );
  }
}
