"use client";

import { createBrowserClient } from "@supabase/ssr";

export function SignOutButton() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
      className="w-full px-3 py-2 text-left text-[12px] text-slate-300 hover:bg-white/5"
    >
      Sign out
    </button>
  );
}
