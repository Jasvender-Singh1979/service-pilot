import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";

// This endpoint logs all network activity for debugging
// Access at /api/debug/network-monitor

let loginAttempts: any[] = [];

export async function GET(request: Request) {
  const action = new URL(request.url).searchParams.get("action");

  if (action === "clear") {
    loginAttempts = [];
    return NextResponse.json({ cleared: true });
  }

  if (action === "get") {
    return NextResponse.json({
      totalAttempts: loginAttempts.length,
      attempts: loginAttempts,
    });
  }

  return NextResponse.json({
    status: "monitoring",
    attempts: loginAttempts.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const attempt = {
    timestamp: new Date().toISOString(),
    ...body,
  };

  loginAttempts.push(attempt);

  return NextResponse.json({ logged: true, totalAttempts: loginAttempts.length });
}

// Function to log login attempts
export async function logLoginAttempt(data: any) {
  loginAttempts.push({
    timestamp: new Date().toISOString(),
    ...data,
  });
}
