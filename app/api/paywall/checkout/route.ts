import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

function getBaseUrl(req: Request) {
  // Prefer env var, fallback to request origin
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  return new URL(req.url).origin;
}

function priceIdForPlan(plan: string) {
  // Keep your existing `plan` field.
  // Map it to Stripe Price IDs via env vars.
  if (plan === "monthly") return process.env.STRIPE_PRICE_MONTHLY;
  if (plan === "yearly") return process.env.STRIPE_PRICE_YEARLY;
  return undefined;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const form = await req.formData();
  const plan = String(form.get("plan") || "").toLowerCase();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  }

  const priceId = priceIdForPlan(plan);

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=invalid_plan", req.url), {
      status: 303,
    });
  }

  const baseUrl = getBaseUrl(req);

  // Create Stripe Checkout Session (test mode works automatically with sk_test_)
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,

    line_items: [{ price: priceId, quantity: 1 }],

    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing?canceled=1`,

    // Optional: pass user id so you can link back later (webhook or success verify)
    metadata: {
      supabase_user_id: user.id,
      plan,
    },
  });

  // Stripe hosted checkout URL
  return NextResponse.redirect(session.url!, { status: 303 });
}
