import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Get session token from cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("auth.session")?.value;

    if (!sessionToken) {
      console.log("[API /user/me] No session token found");
      return NextResponse.json(
        { error: "Unauthorized - no session" },
        { status: 401 }
      );
    }

    console.log("[API /user/me] Looking up session token...");

    // Look up session in database
    const sessions = await sql`
      SELECT id, "userId", token, "expiresAt"
      FROM session
      WHERE token = ${sessionToken}
    `;

    if (sessions.length === 0) {
      console.log("[API /user/me] Session token not found in DB");
      return NextResponse.json(
        { error: "Unauthorized - invalid session" },
        { status: 401 }
      );
    }

    const session = sessions[0];

    // Check if session is expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      console.log("[API /user/me] Session expired");
      return NextResponse.json(
        { error: "Unauthorized - session expired" },
        { status: 401 }
      );
    }

    // Fetch complete user data
    const userData = await sql`
      SELECT 
        id, 
        name, 
        email, 
        role,
        business_id,
        mobile_number,
        designation,
        manager_user_id,
        is_active,
        first_login_password_change_required,
        "createdAt"
      FROM "user"
      WHERE id = ${session.userId}
    `;

    if (userData.length === 0) {
      console.log("[API /user/me] User not found for session userId:", session.userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("[API /user/me] SUCCESS - User data fetched:", userData[0].email);

    return NextResponse.json(userData[0]);
  } catch (error: any) {
    console.error("[API /user/me] ERROR:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
