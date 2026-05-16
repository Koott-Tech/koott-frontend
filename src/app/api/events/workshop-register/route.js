import { NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE_URL = "http://localhost:5000/api";

export async function POST(request) {
  try {
    const body = await request.json();
    const baseUrl = String(process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/events/workshop-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        payload || { success: false, error: "Registration failed. Please try again." },
        { status: response.status }
      );
    }

    return NextResponse.json(payload || { success: true, message: "Thank you — we've received your registration." });
  } catch (error) {
    console.error("[frontend workshop-register proxy] failed:", error);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
