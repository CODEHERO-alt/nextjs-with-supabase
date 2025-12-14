// app/chat/page.tsx
export const dynamic = "force-dynamic";
// (optional but helpful)
// export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  // If profile row missing or query errors, treat as not paid
  if (error || !profile?.is_paid) redirect("/pricing");

  return <ChatClient />;
}
