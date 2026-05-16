import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeEmail(s) {
  if (typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body?.email);
  const consent = body?.consent === true;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ ok: false, error: "Consent required" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Newsletter signup is not configured" },
      { status: 503 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      email,
      consent_at: now,
      source: "blog_newsletter",
      updated_at: now,
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("[newsletter/subscribe]", error);
    return NextResponse.json({ ok: false, error: "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
