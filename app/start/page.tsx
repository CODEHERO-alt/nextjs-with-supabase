import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function StartGate() {
  // This makes the route dynamic without using `export const dynamic`
  cookies();

  const supabase = await createSupabaseServerClient();

  // 1) Must be logged in
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    redirect("/login");
  }

  // 2) Must be paid (example: profiles table)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  // If profile missing OR not paid -> pricing/paywall
  if (error || !profile?.is_paid) {
    redirect("/pricing"); // or /paywall
  }

  // 3) Paid -> go to chatbot
  redirect("/chat");
}
