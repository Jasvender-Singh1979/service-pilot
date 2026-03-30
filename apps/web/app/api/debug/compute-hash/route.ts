import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-utils";

/**
 * DEBUG ENDPOINT: Compute password hash
 * GET /api/debug/compute-hash?password=Test@12345
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");

    if (!password) {
      return NextResponse.json(
        { error: "password query param required" },
        { status: 400 }
      );
    }

    const hash = hashPassword(password);

    return NextResponse.json({
      password,
      hash,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
