import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  // Not logged in → send to login
  if (error || !data?.user) {
    redirect("/login");
  }

  // Logged in → allow access to all /app pages
  return <>{children}</>;
}
