import Link from "next/link";
import PlanCard from "./plan-card";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
              For athletes & high performers
            </p>
            <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
              Choose your mental game plan
            </h1>
            <p className="mt-3 text-slate-300 max-w-2xl">
              Unlock Dr. Brett GPT as your always-on mental game coach. Plans are
              built around realistic usage caps so you stay focused, not
              overwhelmed.
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-slate-300">
            <p className="font-medium">No contracts. Cancel anytime.</p>
            <p className="text-xs text-slate-400 mt-1">
              Prices in USD. One seat = one athlete or high performer.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PlanCard
            title="Starter"
            subtitle="Build your foundation"
            price="$13/mo"
            usage="Up to 60 coach messages / month"
            bestFor="Athletes testing BGPT or using it a few times per week."
            points={[
              "Core 5 Fundamentals routines",
              "Pre-game & post-game check-ins",
              "Save up to 5 favorite sessions",
              "Private by default — your data stays yours",
            ]}
            actionText="Start with Starter"
            plan="starter"
          />

          <PlanCard
            title="Pro"
            subtitle="For serious competitors"
            price="$22/mo"
            usage="Up to 250 coach messages / month"
            bestFor="Athletes & performers who want BGPT as a true daily coach."
            points={[
              "Everything in Starter",
              "Advanced pressure & clutch protocols",
              "Deep-dive post-game breakdowns",
              "Unlimited saved sessions & notes",
              "Priority in-product support",
            ]}
            highlight
            badgeText="Most popular"
            actionText="Unlock Pro coaching"
            plan="pro"
          />

          <PlanCard
            title="Team"
            subtitle="For coaches & small squads"
            price="$59/mo"
            usage="Up to 800 pooled messages / month"
            bestFor="Coaches, academies, and small teams wanting shared structure."
            points={[
              "Up to 5 athletes included",
              "Shared routines & templates for the squad",
              "Pooled message usage across the team",
              "Coach overview of sessions (beta)",
              "Priority roadmap input for new features",
            ]}
            actionText="Get Team access"
            plan="team"
          />
        </div>

        {/* All plans include */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">
            All plans include
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-slate-200">
            <FeatureItem title="Real mental game structure">
              Sessions grounded in the 5 Fundamentals: Presence, Patience,
              Perspective, Poise, Perseverance.
            </FeatureItem>
            <FeatureItem title="Performance-ready sessions">
              Designed for real moments: before games, after mistakes, late in
              the 4th quarter, or after tough losses.
            </FeatureItem>
            <FeatureItem title="Secure & private by design">
              Conversations are private to your account. No public feed, no
              social layer — just you and your coach.
            </FeatureItem>
          </div>
        </section>

        {/* Actions */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back home
          </Link>
          <Link
            href="/start"
            className="rounded-xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            Re-check access
          </Link>
        </div>

        {/* Footnote / roadmap */}
        <p className="mt-8 text-xs text-slate-400">
          Payment flow is currently a placeholder. Next step is connecting Stripe
          checkout (and optionally PayPal) to securely activate your plan.
        </p>
      </div>
    </main>
  );
}

function FeatureItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}
