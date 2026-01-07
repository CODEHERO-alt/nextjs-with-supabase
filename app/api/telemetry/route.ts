import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const sessionId = String(body.sessionId || "").trim();
    const signals = body.signals ?? null;
    const summary = typeof body.summary === "string" ? body.summary.slice(0, 240) : "";
    const sample = body.sample && typeof body.sample === "object" ? body.sample : null;
    const source = typeof body.source === "string" ? body.source.slice(0, 64) : "chat_client";

    if (!sessionId || !signals) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("telemetry_events").insert({
      user_id: user.id,
      session_id: sessionId,
      summary,
      signals,
      sample,
      source,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ ok: false, error: "telemetry_insert_failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
