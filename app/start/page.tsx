export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function StartGate() {
  const supabase = await createSupabaseServerClient();

  // 1️⃣ Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2️⃣ Paid check
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.is_paid) {
    redirect("/pricing"); // paywall page
  }

  // 3️⃣ Access granted
  redirect("/chat");
}
