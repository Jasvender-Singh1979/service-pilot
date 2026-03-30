import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

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

    const businessId = user.business_id;

    // Fetch category - ensure it belongs to current user and business
    const category = await sql`
      SELECT * FROM service_category
      WHERE id = ${id}
        AND business_id = ${businessId}
        AND manager_user_id = ${user.id}
    `;

    if (category.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category[0]);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
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

    const { categoryName, description, activeStatus } = await request.json();

    // Validate input
    if (!categoryName || categoryName.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const businessId = user.business_id;

    // Verify category belongs to current user and business
    const existing = await sql`
      SELECT id FROM service_category
      WHERE id = ${id}
        AND business_id = ${businessId}
        AND manager_user_id = ${user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Update category
    const result = await sql`
      UPDATE service_category
      SET
        category_name = ${categoryName.trim()},
        description = ${description ? description.trim() : null},
        active_status = ${activeStatus !== undefined ? activeStatus : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating category:", error);

    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "A category with this name already exists for you" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}
