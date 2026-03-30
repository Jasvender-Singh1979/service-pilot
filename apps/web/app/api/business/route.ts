import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, owner_name, email, mobile_number, whatsapp_number, address } = await request.json();

    console.log('[Business API] POST received:', { name, owner_name, email });

    // Validation
    if (!name || !owner_name || !email || !mobile_number || !address) {
      console.error('[Business API] Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Business name, owner name, email, mobile number, and address are required' },
        { status: 400 }
      );
    }

    // Check if business email already exists (case-insensitive)
    console.log('[Business API] Checking if business already exists...');
    const existingBusiness = await sql`SELECT id FROM business WHERE LOWER(email) = LOWER(${email})`;
    if (existingBusiness.length > 0) {
      console.error('[Business API] Business already exists for email:', email);
      return NextResponse.json(
        { error: 'A business with this email already exists' },
        { status: 400 }
      );
    }

    // Create business - allow multiple businesses to be created
    console.log('[Business API] Creating new business...');
    const result = await sql`
      INSERT INTO business (name, owner_name, email, mobile_number, whatsapp_number, address)
      VALUES (${name}, ${owner_name}, ${email}, ${mobile_number}, ${whatsapp_number}, ${address})
      RETURNING *
    `;

    console.log('[Business API] SUCCESS - Business created:', result[0]);
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('[Business API] ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create business' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('[Business API] GET - Checking business count...');
    // Return count of businesses (for checking if any exist)
    const result = await sql`SELECT COUNT(*) as count FROM business`;
    const count = parseInt(result[0]?.count || '0');
    
    console.log('[Business API] Business count:', count);
    return NextResponse.json({ 
      exists: count > 0,
      count: count
    });
  } catch (error: any) {
    console.error('[Business API] GET Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        exists: false,
        count: 0,
        error: 'Unable to fetch business count' 
      },
      { status: 200 }
    );
  }
}
