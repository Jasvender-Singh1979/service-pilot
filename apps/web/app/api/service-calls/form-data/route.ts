import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can access this" },
        { status: 403 }
      );
    }

    // Get business details
    const businessResult = await sql`
      SELECT id, name FROM business WHERE id = ${user.business_id}
    `;

    const business = businessResult?.[0] || { name: "Our Business" };

    // Get active categories for this manager
    const categories = await sql`
      SELECT id, category_name, description, active_status
      FROM service_category
      WHERE manager_user_id = ${user.id}
      AND business_id = ${user.business_id}
      AND active_status = true
      ORDER BY category_name ASC
    `;

    // Get active engineers for this manager
    const engineers = await sql`
      SELECT id, name, mobile_number, designation
      FROM "user"
      WHERE manager_user_id = ${user.id}
      AND business_id = ${user.business_id}
      AND role = 'engineer'
      AND is_active = true
      ORDER BY name ASC
    `;

    // Get only custom (user-created) WhatsApp templates
    const templates = await sql`
      SELECT 
        id,
        template_name,
        template_message,
        template_type,
        is_active
      FROM whatsapp_template
      WHERE template_type = 'custom' AND business_id = ${user.business_id} AND manager_user_id = ${user.id}
      AND is_active = true
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      business,
      categories,
      engineers,
      templates,
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json(
      { error: "Failed to fetch form data" },
      { status: 500 }
    );
  }
}
