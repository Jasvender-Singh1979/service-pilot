import sql from '@/app/api/utils/sql';
import { getSessionUserFromRequest } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callId } = await params;
    const user = await getSessionUserFromRequest();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const engineerId = user.id;

    // Parse request body
    const body = await request.json();
    const {
      closure_note,
      closure_image_url,
      service_charge_amount,
      service_discount_amount,
      material_discount_amount,
      quotation_rows,
      grand_total,
      material_total,
      paid_amount,
      final_discount_amount,
    } = body;

    // Validate required fields
    if (!closure_note?.trim()) {
      return NextResponse.json(
        { error: 'Closure note is required' },
        { status: 400 }
      );
    }

    if (!service_charge_amount && service_charge_amount !== 0) {
      return NextResponse.json(
        { error: 'Service charge amount is required' },
        { status: 400 }
      );
    }

    // Fetch the service call to verify ownership and current status
    const calls = await sql`
      SELECT * FROM service_call
      WHERE id = ${callId} AND assigned_engineer_user_id = ${engineerId}
    `;

    if (calls.length === 0) {
      return NextResponse.json(
        { error: 'Service call not found or not assigned to you' },
        { status: 404 }
      );
    }

    const serviceCall = calls[0];

    // Verify call is in_progress
    if (serviceCall.call_status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Only in-progress calls can be closed' },
        { status: 400 }
      );
    }

    // Calculate discount amounts (default to 0 if not provided)
    const serviceDiscount = parseFloat(service_discount_amount) || 0;
    const materialDiscount = parseFloat(material_discount_amount) || 0;

    // Validate discounts
    if (serviceDiscount < 0) {
      return NextResponse.json(
        { error: 'Service discount cannot be negative' },
        { status: 400 }
      );
    }

    if (serviceDiscount > service_charge_amount) {
      return NextResponse.json(
        { error: 'Service discount cannot exceed service charges' },
        { status: 400 }
      );
    }

    if (materialDiscount < 0) {
      return NextResponse.json(
        { error: 'Material discount cannot be negative' },
        { status: 400 }
      );
    }

    if (materialDiscount > (material_total || 0)) {
      return NextResponse.json(
        { error: 'Material discount cannot exceed material total' },
        { status: 400 }
      );
    }

    // Calculate final amounts
    const finalServiceAmount = service_charge_amount - serviceDiscount;
    const finalMaterialAmount = (material_total || 0) - materialDiscount;
    const calculatedGrandTotal = finalServiceAmount + finalMaterialAmount;

    const closureTimestamp = new Date();

    // Calculate paid and pending amounts
    const paidAmt = parseFloat(paid_amount) || 0;
    const finalDiscount = parseFloat(final_discount_amount) || 0;
    const pendingAmountBeforeDiscount = Math.max(0, calculatedGrandTotal - paidAmt);
    const finalPendingAmt = Math.max(0, pendingAmountBeforeDiscount - finalDiscount);

    // Start transaction - update service call
    const updatedCall = await sql`
      UPDATE service_call
      SET
        call_status = 'closed',
        closure_note = ${closure_note},
        closure_image_url = ${closure_image_url || null},
        closure_timestamp = ${closureTimestamp},
        service_charge_amount = ${service_charge_amount},
        service_discount_amount = ${serviceDiscount},
        material_total = ${material_total || 0},
        material_discount_amount = ${materialDiscount},
        final_service_amount = ${finalServiceAmount},
        final_material_amount = ${finalMaterialAmount},
        grand_total = ${calculatedGrandTotal},
        paid_amount = ${paidAmt},
        final_discount_amount = ${finalDiscount},
        quotation_document_data = ${JSON.stringify({
          closure_note,
          service_charge_amount,
          service_discount_amount: serviceDiscount,
          material_total: material_total || 0,
          material_discount_amount: materialDiscount,
          quotation_rows: quotation_rows || [],
          grand_total: calculatedGrandTotal,
          paid_amount: paidAmt,
          final_discount_amount: finalDiscount,
          pending_amount_before_discount: pendingAmountBeforeDiscount,
          final_pending_amount: finalPendingAmt,
        })},
        updated_at = ${closureTimestamp}
      WHERE id = ${callId}
      RETURNING *
    `;

    // Insert quotation items if provided
    if (Array.isArray(quotation_rows) && quotation_rows.length > 0) {
      for (const row of quotation_rows) {
        const itemId = `quotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await sql`
          INSERT INTO quotation_item (
            id,
            service_call_id,
            business_id,
            product_name,
            quantity,
            price,
            row_total
          ) VALUES (
            ${itemId},
            ${callId},
            ${serviceCall.business_id},
            ${row.product_name},
            ${row.quantity},
            ${row.price},
            ${row.row_total}
          )
        `;
      }
    }

    // Create history entry
    const historyId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        event_timestamp,
        created_at
      ) VALUES (
        ${historyId},
        ${callId},
        ${serviceCall.business_id},
        ${serviceCall.manager_user_id},
        ${engineerId},
        'engineer',
        'call_closed',
        ${closure_note},
        ${closureTimestamp},
        ${closureTimestamp}
      )
    `;

    return NextResponse.json({
      success: true,
      call: updatedCall[0],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error closing service call:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
