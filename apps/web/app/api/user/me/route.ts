import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth-utils";

export async function GET() {
  try {
    console.log("[API /user/me] Fetching authenticated user...");

    // Use centralized session resolution from auth-utils
    const user = await getSessionUserFromRequest();

    if (!user) {
      console.log("[API /user/me] No authenticated user found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[API /user/me] SUCCESS - User data returned:", user.email);

    return NextResponse.json(user);
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
