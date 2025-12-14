"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) return setMsg(error.message);

    window.location.href = "/start";
  }

  async function signInWithGoogle() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) setMsg(error.message);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
            BG
          </div>
          <h1 className="text-xl font-semibold">Sign in to BGPT</h1>
          <p className="mt-1 text-sm text-slate-300">
            Welcome back. Run your next rep.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-lg shadow-black/30">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 text-sm hover:bg-white/[0.06] disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={signInWithEmail} className="space-y-3">
            <div>
              <label className="text-xs text-slate-300">Email address</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {msg && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                {msg}
              </div>
            )}

            <button
              disabled={loading || !email || !password}
              className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-300">
          New to BGPT?{" "}
          <Link className="text-sky-300 hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
