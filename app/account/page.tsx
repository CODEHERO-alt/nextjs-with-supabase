import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function signOut() {
    "use server";
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    await supabase.auth.signOut();
    redirect("/login");
  }

  // Placeholder numbers (swap later when you have real usage/plan data)
  const planName = "Starter";
  const usageUsed = 12;
  const usageLimit = 30;
  const usagePct = Math.min(100, Math.round((usageUsed / usageLimit) * 100));

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
            <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
            <p className="mt-1 text-sm text-slate-300">
              Manage your plan, usage, and session shortcuts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/start"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
            >
              Go to App
            </Link>

            <form action={signOut}>
              <button className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {/* Plan */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Plan</div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-200">
                Active
              </span>
            </div>

            <div className="mt-3 text-lg font-semibold">{planName}</div>
            <p className="mt-1 text-sm text-slate-300">
              Built for consistent reps and daily progress.
            </p>

            <div className="mt-4 flex gap-2">
              <Link
                href="/pricing"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
              >
                View pricing
              </Link>
              <Link
                href="/profile"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.06]"
              >
                Profile
              </Link>
            </div>
          </div>

          {/* Usage */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/30">
            <div className="text-sm font-medium">Usage</div>
            <p className="mt-1 text-sm text-slate-300">
              Today’s reps (placeholder until real tracking).
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  {usageUsed} / {usageLimit} sessions
                </span>
                <span>{usagePct}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-sky-400"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-slate-300">Next suggested rep</div>
              <div className="mt-1 text-sm">
                60-second reset + 1 clarity question
              </div>
            </div>
          </div>

          {/* Signed in */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg shadow-black/30">
            <div className="text-sm font-medium">Signed in</div>
            <p className="mt-1 text-sm text-slate-300">
              Account details for support & access.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-slate-400">Email</div>
              <div className="mt-1 text-sm break-all">{user.email}</div>
            </div>

            <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-xs text-slate-300">
                Technical details
              </summary>
              <div className="mt-2 text-xs text-slate-300 break-all">
                <div className="text-slate-400">User ID</div>
                <div className="mt-1">{user.id}</div>
              </div>
            </details>
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-xs text-slate-400">
          Tip: when you add real usage tracking + plan metadata, this page will
          instantly feel “real product” instead of placeholder.
        </p>
      </div>
    </div>
  );
}
