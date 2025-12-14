import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/start";

  if (!token_hash || !type) {
    redirect(`/auth/error?error=No token hash or type`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  // ✅ Send user to a celebratory verification page first
  // then that page will redirect them to `next`
  const verifiedUrl = `${origin}/verified?next=${encodeURIComponent(next)}`;
  redirect(verifiedUrl);
}
