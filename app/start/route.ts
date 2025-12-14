import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();

  // 1) Must be logged in
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2) Must be paid
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.is_paid) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  // 3) Paid → Chat
  return NextResponse.redirect(new URL("/chat", req.url));
}
