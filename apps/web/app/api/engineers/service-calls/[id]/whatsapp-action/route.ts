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
    const body = await request.json();
    const { action_type } = body; // 'invoice_sent_to_customer', 'invoice_sent_to_accountant', 'closure_message_sent_to_customer'

    // Validate action type
    const validActions = ['invoice_sent_to_customer', 'invoice_sent_to_accountant', 'closure_message_sent_to_customer'];
    if (!validActions.includes(action_type)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // Fetch the service call to verify ownership and get business_id
    const calls = await sql`
      SELECT id, business_id, manager_user_id, call_status FROM service_call
      WHERE id = ${callId} AND assigned_engineer_user_id = ${engineerId}
    `;

    if (calls.length === 0) {
      return NextResponse.json(
        { error: 'Service call not found or not assigned to you' },
        { status: 404 }
      );
    }

    const serviceCall = calls[0];

    // Verify call is closed
    if (serviceCall.call_status !== 'closed') {
      return NextResponse.json(
        { error: 'WhatsApp actions are only available for closed calls' },
        { status: 400 }
      );
    }

    const actionTimestamp = new Date();
    const historyId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create history entry for this action
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
        ${action_type},
        ${`WhatsApp message sent via: ${action_type.replace(/_/g, ' ')}`},
        ${actionTimestamp},
        ${actionTimestamp}
      )
    `;

    // Update the service_call table to mark this action as sent
    if (action_type === 'invoice_sent_to_customer') {
      await sql`UPDATE service_call SET invoice_sent_to_customer = true WHERE id = ${callId}`;
    } else if (action_type === 'invoice_sent_to_accountant') {
      await sql`UPDATE service_call SET invoice_sent_to_accountant = true WHERE id = ${callId}`;
    } else if (action_type === 'closure_message_sent_to_customer') {
      await sql`UPDATE service_call SET closure_message_sent_to_customer = true WHERE id = ${callId}`;
    }

    return NextResponse.json({
      success: true,
      historyId,
      message: 'WhatsApp action logged successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error logging WhatsApp action:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
