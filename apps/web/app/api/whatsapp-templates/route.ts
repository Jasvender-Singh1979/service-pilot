import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role
    if (user.role !== "manager" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only managers can view templates" },
        { status: 403 }
      );
    }

    // Get only custom (user-created) templates for this manager
    const templates = await sql`
      SELECT 
        id,
        template_name,
        template_message,
        template_type,
        is_active,
        created_at,
        updated_at
      FROM whatsapp_template
      WHERE template_type = 'custom' AND business_id = ${user.business_id} AND manager_user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(Array.isArray(templates) ? templates : []);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching templates:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
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
    if (user.role !== "manager" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only managers can create templates" },
        { status: 403 }
      );
    }

    const { templateName, templateMessage } = await request.json();

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

    // Check custom template limit (5-10 templates max)
    const customTemplateCount = await sql`
      SELECT COUNT(*) as count FROM whatsapp_template
      WHERE business_id = ${user.business_id}
      AND manager_user_id = ${user.id}
      AND template_type = 'custom'
    `;

    const currentCount = customTemplateCount[0]?.count || 0;
    const MAX_CUSTOM_TEMPLATES = 10;

    if (currentCount >= MAX_CUSTOM_TEMPLATES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CUSTOM_TEMPLATES} custom templates allowed` },
        { status: 400 }
      );
    }

    // Generate ID
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create template
    const result = await sql`
      INSERT INTO whatsapp_template (
        id,
        business_id,
        manager_user_id,
        template_name,
        template_message,
        template_type,
        is_active,
        created_by_user_id
      )
      VALUES (
        ${templateId},
        ${user.business_id},
        ${user.id},
        ${templateName.trim()},
        ${templateMessage.trim()},
        'custom',
        true,
        ${user.id}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating template:", errorMessage);

    // Check for unique constraint violation
    if (errorMessage.includes("unique")) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
