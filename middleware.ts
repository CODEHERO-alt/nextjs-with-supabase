import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect chat route
  if (pathname.startsWith("/chat")) {
    // If user manually opens /chat without passing /start
    // they’ll be sent back to /start
    return NextResponse.redirect(new URL("/start", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*"],
};
