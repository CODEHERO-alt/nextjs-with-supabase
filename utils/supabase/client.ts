import { createBrowserClient } from "@supabase/ssr";

/**
 * Compatibility wrapper.
 * The repo uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in /lib.
 * Fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY for older deployments.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(url, key);
}
