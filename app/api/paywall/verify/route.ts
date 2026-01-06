import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const sessionId = String(body?.session_id || "");

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ ok: false, error: "invalid_session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Basic sanity checks
    if (session.mode !== "subscription") {
      return NextResponse.json({ ok: false, error: "invalid_mode" }, { status: 400 });
    }

    // Verify this session belongs to the logged-in user
    const metaUserId = session.metadata?.supabase_user_id;
    const sessionEmail = session.customer_details?.email || session.customer_email || null;

    const matchesUser =
      (metaUserId && metaUserId === user.id) ||
      (sessionEmail && user.email && sessionEmail.toLowerCase() === user.email.toLowerCase());

    if (!matchesUser) {
      return NextResponse.json({ ok: false, error: "session_user_mismatch" }, { status: 403 });
    }

    // Payment verification
    // For subscriptions: payment_status is usually "paid" after successful payment
    const paymentOk = session.payment_status === "paid" || session.payment_status === "no_payment_required";

    // Subscription status check (expanded)
    let subStatusOk = false;
    let subscriptionId: string | null = null;

    const subscription = session.subscription;
    if (typeof subscription === "string") {
      subscriptionId = subscription;
      // If not expanded for some reason, retrieve it
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      subStatusOk = sub.status === "active" || sub.status === "trialing";
    } else if (subscription && typeof subscription === "object") {
      subscriptionId = subscription.id;
      subStatusOk = subscription.status === "active" || subscription.status === "trialing";
    }

    if (!paymentOk || !subStatusOk) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_paid_or_inactive",
          payment_status: session.payment_status,
          subscription_status:
            typeof session.subscription === "object" ? session.subscription?.status : "unknown",
        },
        { status: 402 }
      );
    }

    const plan = session.metadata?.plan || null;

    // Update Supabase profile as "paid"
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("profiles").upsert({
      id: user.id,
      is_paid: true,
      plan,
      updated_at: new Date().toISOString(),
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_subscription_id: subscriptionId,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: "supabase_update_failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      plan,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_subscription_id: subscriptionId,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
