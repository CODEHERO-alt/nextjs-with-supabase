import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
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
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
        <div className="text-sm text-slate-400">Email</div>
        <div className="mt-1 text-sm">{user.email}</div>

        <div className="mt-4 text-sm text-slate-400">User ID</div>
        <div className="mt-1 text-xs break-all text-slate-300">
          {user.id}
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Profile editing will be added here later.
      </p>
    </div>
  );
}
