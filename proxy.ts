import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

/**
 * This proxy runs ONLY on protected routes.
 * Public routes (/, /test-chat, /api/chat, /auth/*) remain accessible.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Only protect routes that require authentication.
 * Add more paths here when needed.
 */
export const config = {
  matcher: ["/protected/:path*"],
};
