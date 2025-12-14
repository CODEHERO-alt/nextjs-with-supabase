import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Protect /chat and anything under it
  if (!req.nextUrl.pathname.startsWith("/chat")) {
    return NextResponse.next();
  }

  // Important: create a response we can attach cookies to
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 1) Must be logged in
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/start");
    return NextResponse.redirect(url);
  }

  // 2) Must be paid (profiles table)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.is_paid) {
    const url = req.nextUrl.clone();
    url.pathname = "/pricing"; // or /paywall
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/chat/:path*"],
};
