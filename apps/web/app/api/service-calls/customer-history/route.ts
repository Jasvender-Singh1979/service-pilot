import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth-utils';

/**
 * Normalize phone numbers for matching:
 * - Remove spaces, dashes, parens
 * - Keep country code if present
 * - Ensure consistent format
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except leading +
  return phone.replace(/[\s\-()]+/g, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode') || '';
    const phoneNumber = searchParams.get('phoneNumber') || '';

    console.log('[Customer History API] Request params:', { countryCode, phoneNumber });

    if (!phoneNumber) {
      console.log('[Customer History API] Phone number missing');
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get session with proper auth helper
    const user = await getSessionUserFromRequest();
    
    console.log('[Customer History API] User ID:', user?.id);

    if (!user || !user.id) {
      console.log('[Customer History API] No valid session');
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }

    if (!user.business_id) {
      console.log('[Customer History API] User has no business_id');
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }

    const businessId = user.business_id;

    // Normalize the search phone number
    const normalizedSearchPhone = normalizePhoneNumber(
      countryCode && !phoneNumber.startsWith('+') ? `${countryCode}${phoneNumber}` : phoneNumber
    );

    console.log('[Customer History API] Normalized search phone:', normalizedSearchPhone);

    // Get all calls for this business
    const allCalls = await sql`
      SELECT 
        sc.id,
        sc.call_id,
        sc.customer_name,
        sc.phone_country_code,
        sc.customer_phone,
        sc.category_name_snapshot,
        sc.problem_reported,
        sc.call_status,
        sc.created_at,
        sc.closure_timestamp,
        sc.grand_total,
        sc.paid_amount,
        sc.service_payment_status,
        sc.material_payment_status,
        u.name as assigned_engineer_name
      FROM service_call sc
      LEFT JOIN "user" u ON u.id = sc.assigned_engineer_user_id
      WHERE sc.business_id = ${businessId}
      ORDER BY sc.created_at DESC
    `;

    console.log('[Customer History API] Total calls in business:', allCalls.length);

    // Filter calls by normalized phone number on the client side
    const matchedCalls = allCalls.filter((call: any) => {
      const callNormalizedPhone = normalizePhoneNumber(
        call.phone_country_code && !call.customer_phone.startsWith('+')
          ? `${call.phone_country_code}${call.customer_phone}`
          : call.customer_phone
      );
      return callNormalizedPhone === normalizedSearchPhone;
    });

    console.log('[Customer History API] Matched calls for phone:', matchedCalls.length);

    const summary = {
      previous_calls: matchedCalls.length,
      open_calls: matchedCalls.filter(
        (call: any) =>
          call.call_status !== 'closed' && call.call_status !== 'cancelled'
      ).length,
      closed_calls: matchedCalls.filter((call: any) => call.call_status === 'closed').length,
      cancelled_calls: matchedCalls.filter(
        (call: any) => call.call_status === 'cancelled'
      ).length,
      last_call_date:
        matchedCalls.length > 0 ? matchedCalls[0].created_at : null,
    };

    // Get all previous calls (no limit - for full history view)
    const previousCallsList = matchedCalls.map((call: any) => ({
      id: call.id,
      call_id: call.call_id,
      created_at: call.created_at,
      category_name_snapshot: call.category_name_snapshot,
      problem_reported: call.problem_reported,
      call_status: call.call_status,
      assigned_engineer_name: call.assigned_engineer_name || null,
      grand_total: parseFloat(call.grand_total || 0),
      paid_amount: parseFloat(call.paid_amount || 0),
    }));

    console.log('[Customer History API] SUCCESS - returning data');
    return NextResponse.json({
      summary,
      previous_calls: previousCallsList,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Customer History API] Error:', errorMsg);
    if (error instanceof Error) {
      console.error('[Customer History API] Stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: errorMsg || 'Failed to fetch customer history',
      },
      { status: 500 }
    );
  }
}
