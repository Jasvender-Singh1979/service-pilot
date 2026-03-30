import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

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

    // Only super admin can update managers
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const businessId = user.business_id;

    const body = await request.json();
    const { name, email } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if manager belongs to the same business
    const manager = await sql`
      SELECT id, business_id, role FROM "user" WHERE id = ${id}
    `;

    if (!manager[0] || manager[0].business_id !== businessId || manager[0].role !== "manager") {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Check if email already exists (excluding current user)
    const existingUser = await sql`
      SELECT id FROM "user" WHERE email = ${email} AND id != ${id}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Update manager
    const updatedManager = await sql`
      UPDATE "user"
      SET 
        name = ${name},
        email = ${email}
      WHERE id = ${id}
      RETURNING id, name, email, role, business_id, "createdAt"
    `;

    return NextResponse.json(updatedManager[0]);
  } catch (error) {
    console.error("Error updating manager:", error);
    return NextResponse.json(
      { error: "Failed to update manager" },
      { status: 500 }
    );
  }
}

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

    // Only super admin can delete managers
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const businessId = user.business_id;

    // Check if manager belongs to the same business
    const manager = await sql`
      SELECT id, business_id, role FROM "user" WHERE id = ${id}
    `;

    if (!manager[0] || manager[0].business_id !== businessId || manager[0].role !== "manager") {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Delete manager
    await sql`
      DELETE FROM "user" WHERE id = ${id}
    `;

    return NextResponse.json({ message: "Manager deleted successfully" });
  } catch (error) {
    console.error("Error deleting manager:", error);
    return NextResponse.json(
      { error: "Failed to delete manager" },
      { status: 500 }
    );
  }
}
