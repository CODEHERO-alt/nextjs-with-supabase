import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  // normal client: to read the currently logged in user (cookie session)
  const supabase = await createSupabaseServerClient();

  const form = await req.formData();
  const plan = String(form.get("plan") || "");

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  }

  // admin client: can update profiles regardless of RLS (server-only secret)
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .upsert({
      id: user.id,
      is_paid: true, // placeholder “paid”
      plan,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.redirect(new URL("/pricing?error=1", req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL("/start", req.url), { status: 303 });
}
