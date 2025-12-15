import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔒 Protect route
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-[720px] px-6 py-12 text-slate-100">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-medium">Plan</div>
          <div className="mt-1 text-sm text-slate-300">
            Active subscription
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-medium">Usage</div>
          <div className="mt-1 text-sm text-slate-300">
            Daily AI usage limits apply
          </div>
        </div>

        <div className="rounded-xl border borde
