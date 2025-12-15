import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export default async function UserMenu() {
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

  // 🔒 Not logged in
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-white/10"
      >
        Sign in
      </Link>
    );
  }

  // 👤 Logged in
  const initials =
    user.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="relative group">
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold ring-1 ring-white/10">
        {initials}
      </button>

      {/* Dropdown */}
      <div className="invisible absolute right-0 z-50 mt-2 w-44 rounded-xl border border-white/10 bg-[#0b0f19] shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
        <Link
          href="/profile"
          className="block px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5"
        >
          Profile
        </Link>
        <Link
          href="/account"
          className="block px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5"
        >
          Account & Billing
        </Link>
        <div className="border-t border-white/10">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
