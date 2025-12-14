import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams } = url;

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/start";

  const supabase = await createClient();

  // ✅ New-style links: ?code=...
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }

    redirect(`/verified?next=${encodeURIComponent(next)}`);
  }

  // ✅ Old-style links: ?token_hash=...&type=...
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }

    redirect(`/verified?next=${encodeURIComponent(next)}`);
  }

  // If neither format is present
  redirect(`/auth/error?error=${encodeURIComponent("No code, token hash, or type")}`);
}
