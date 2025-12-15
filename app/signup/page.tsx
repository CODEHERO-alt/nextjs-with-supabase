"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/start`,
      },
    });

    setLoading(false);
    if (error) return setMsg(error.message);

    setMsg("Check your email to confirm your account.");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* subtle background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(56,189,248,0.12),transparent_70%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-4 py-10">
        {/* brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.04] grid place-items-center text-sm font-semibold shadow-lg shadow-black/30">
            BG
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Start training your mental game with focused routines.
          </p>
        </div>

        {/* card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/30">
          <form onSubmit={signUp} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300">
                Email address
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">
                  8+ characters recommended
                </span>
              </div>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>

            {msg && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-200">
                {msg}
              </div>
            )}

            <button
              disabled={loading || !email || !password}
              className="w-full rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            <p className="text-center text-xs text-slate-400">
              By continuing, you agree to our Terms & Privacy Policy.
            </p>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link className="text-sky-300 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
