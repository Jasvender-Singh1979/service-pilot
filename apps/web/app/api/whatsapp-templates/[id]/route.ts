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

    // Get template (custom only)
    const templates = await sql`
      SELECT * FROM whatsapp_template
      WHERE id = ${id}
      AND template_type = 'custom'
      AND business_id = ${user.business_id} 
      AND manager_user_id = ${user.id}
    `;

    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(templates[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching template:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch template" },
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

    const { templateName, templateMessage } = await request.json();

    // Verify template exists and belongs to user (and is not system template)
    const templates = await sql`
      SELECT * FROM whatsapp_template
      WHERE id = ${id}
      AND business_id = ${user.business_id}
      AND manager_user_id = ${user.id}
      AND template_type = 'custom'
    `;

    if (templates.length === 0) {
      return NextResponse.json(
        { error: "Template not found or cannot be edited (system templates cannot be edited)" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!templateName || templateName.trim() === "") {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    if (!templateMessage || templateMessage.trim() === "") {
      return NextResponse.json(
        { error: "Template message is required" },
        { status: 400 }
      );
    }

    // Update template
    const result = await sql`
      UPDATE whatsapp_template
      SET 
        template_name = ${templateName.trim()},
        template_message = ${templateMessage.trim()},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating template:", errorMessage);

    // Check for unique constraint violation
    if (errorMessage.includes("unique")) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update template" },
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

    // Verify template exists and belongs to user (and is not system template)
    const templates = await sql`
      SELECT template_type FROM whatsapp_template
      WHERE id = ${id}
      AND business_id = ${user.business_id}
      AND manager_user_id = ${user.id}
    `;

    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (templates[0].template_type === "system") {
      return NextResponse.json(
        { error: "Cannot delete system templates" },
        { status: 400 }
      );
    }

    // Delete template
    await sql`DELETE FROM whatsapp_template WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting template:", errorMessage);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
