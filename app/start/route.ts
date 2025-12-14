import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  // 1) Must be logged in
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2) Must be paid (example: profiles table)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.is_paid) {
    return NextResponse.redirect(new URL("/pricing", request.url)); // or /paywall
  }

  // 3) All good → go to chatbot
  return NextResponse.redirect(new URL("/chat", request.url));
}
