import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  if (!user) redirect("/login");

  const joined =
    // Supabase user usually has created_at
    // If it’s missing in your typings, this fallback keeps TS happy.
    typeof (user as any).created_at === "string"
      ? new Date((user as any).created_at).toLocaleDateString()
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(56,189,248,0.18),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_10%_10%,rgba(99,102,241,0.12),rgba(0,0,0,0))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 text-sm text-slate-300">
              Your identity + account basics (editing can come next).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
            >
              Back to Account
            </Link>
            <Link
              href="/start"
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400"
            >
              Go to App
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/30">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-sm font-semibold">
                BG
              </div>
              <div className="min-w-0">
                <div className="text-sm text-slate-300">Signed in as</div>
                <div className="mt-1 text-lg font-semibold break-all">
                  {user.email}
                </div>
                {joined && (
                  <div className="mt-1 text-sm text-slate-300">
                    Joined {joined}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-slate-400">Focus</div>
                <div className="mt-1 text-sm">
                  Consistent reps under pressure
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-slate-400">Next improvement</div>
                <div className="mt-1 text-sm">Profile editing (name/avatar)</div>
              </div>
            </div>

            <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <summary className="cursor-pointer text-sm text-slate-200">
                Technical details
              </summary>
              <div className="mt-3 text-xs text-slate-300 break-all">
                <div className="text-slate-400">User ID</div>
                <div className="mt-1">{user.id}</div>
              </div>
            </details>
          </div>

          {/* Sidebar */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/30">
            <div className="text-sm font-medium">Quick actions</div>
            <p className="mt-1 text-sm text-slate-300">
              Shortcuts that feel like a real product.
            </p>

            <div className="mt-4 grid gap-2">
              <Link
                href="/account"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
              >
                Manage plan
              </Link>
              <Link
                href="/start"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
              >
                Start a session
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
              >
                Pricing
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Next step if you want: we can add a “Profile editor” card that writes
          to a `profiles` table (display name, sport, role, timezone) — still
          clean and minimal.
        </p>
      </div>
    </div>
  );
}
