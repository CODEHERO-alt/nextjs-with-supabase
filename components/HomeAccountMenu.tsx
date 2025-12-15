"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  profileHref?: string;
  accountHref?: string;
  loginHref?: string;
  signupHref?: string;
};

export default function HomeAccountMenu({
  profileHref = "/profile",
  accountHref = "/account",
  loginHref = "/login",
  signupHref = "/signup",
}: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  // close on outside click / esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setOpen(false);
    setLoading(false);
    // optional: hard refresh to update any server-rendered areas
    window.location.href = "/";
  }

  // Logged out
  if (!loading && !email) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={loginHref}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs md:text-sm font-medium text-slate-100 hover:bg-white/[0.06] hover:border-white/16 transition-all"
        >
          Log in
        </a>
        <a
          href={signupHref}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-500 to-sky-400 px-4 md:px-5 py-2.5 text-xs md:text-sm font-medium text-white shadow-xl shadow-purple-500/35 hover:shadow-purple-400/55 transition-all"
        >
          Sign up
        </a>
      </div>
    );
  }

  // Loading state (optional minimal)
  if (loading) {
    return (
      <div className="h-9 w-[140px] rounded-2xl border border-white/10 bg-white/[0.03]" />
    );
  }

  // Logged in
  const initials =
    (email?.split("@")[0]?.slice(0, 2) ?? "U").toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs md:text-sm font-medium text-slate-100 hover:bg-white/[0.06] hover:border-white/16 transition-all"
        aria-label="Open account menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold ring-1 ring-white/10">
          {initials}
        </span>
        <span className="hidden md:inline max-w-[180px] truncate text-slate-200">
          {email}
        </span>
        <span className="text-slate-300">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-xl shadow-xl">
          <a
            href={profileHref}
            className="block px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
          >
            Profile
          </a>
          <a
            href={accountHref}
            className="block px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
          >
            Account
          </a>
          <div className="h-px bg-white/10" />
          <button
            onClick={signOut}
            className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
