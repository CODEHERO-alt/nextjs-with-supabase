import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const form = await req.formData();
  const plan = String(form.get("plan") || "");

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ✅ Placeholder for payment:
  // Mark as paid immediately. Replace this with Stripe/PayPal webhook later.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, is_paid: true, plan, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.redirect(new URL("/pricing?error=1", req.url));
  }

  return NextResponse.redirect(new URL("/start", req.url));
}
