import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      console.log('[Categories API] No authenticated user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[Categories API] User:', user.email);

    // Check if user has business assigned
    const businessId = user.business_id;

    if (!businessId) {
      console.log('[Categories API] User has no business_id assigned');
      return NextResponse.json({ error: "User has no business assigned" }, { status: 400 });
    }

    console.log('[Categories API] Fetching categories for business:', businessId, 'manager:', user.id);

    // Manager can only see their own categories
    const categories = await sql`
      SELECT 
        id,
        category_name,
        description,
        active_status,
        created_at,
        updated_at
      FROM service_category
      WHERE business_id = ${businessId}
        AND manager_user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    console.log('[Categories API] Found', categories.length, 'categories');
    return NextResponse.json(Array.isArray(categories) ? categories : []);
  } catch (error) {
    console.error("[Categories API] Error fetching categories:", error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      console.error('[Categories API] Stack:', error.stack);
    }
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      console.log('[Categories API] No authenticated user for POST');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryName, description, activeStatus } = await request.json();

    // Validate required fields
    if (!categoryName || categoryName.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const businessId = user.business_id;

    if (!businessId) {
      console.log('[Categories API] No business_id for POST');
      return NextResponse.json({ error: "User has no business assigned" }, { status: 400 });
    }

    console.log('[Categories API] Creating category:', categoryName, 'for business:', businessId);

    // Create category
    const result = await sql`
      INSERT INTO service_category (
        business_id,
        manager_user_id,
        category_name,
        description,
        active_status,
        created_by_user_id
      )
      VALUES (
        ${businessId},
        ${user.id},
        ${categoryName.trim()},
        ${description || null},
        ${activeStatus !== false},
        ${user.id}
      )
      RETURNING *
    `;

    console.log('[Categories API] Category created:', result[0].id);
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("[Categories API] Error creating category:", error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      console.error('[Categories API] Stack:', error.stack);
    }

    // Check if it's a unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "A category with this name already exists for you" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
