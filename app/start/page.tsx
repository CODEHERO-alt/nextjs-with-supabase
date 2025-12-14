import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StartGate() {
  const supabase = await createClient();

  // 1) Must be logged in
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    redirect("/login");
  }

  // 2) Must be paid (example: profiles table)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.is_paid) {
    redirect("/pricing"); // or /paywall
  }

  // 3) All good → go to chatbot
  redirect("/chat");
}
