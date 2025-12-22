import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Choose your mental game plan
        </h1>
        <p className="mt-3 text-slate-300 max-w-2xl text-sm md:text-base">
          All plans are built on Dr. Brett&apos;s Mental Game Fundamentals and give you
          access to the BGPT coach. Upgrade as your season, stakes, and team grow.
        </p>

        {/* Global benefits */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4 text-xs md:text-sm text-slate-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-slate-50">
              Every plan includes:
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] md:text-xs text-slate-300">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Private-by-default sessions
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Mental game frameworks & prompts
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Multi-device access (desktop & mobile)
              </li>
            </ul>
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 md:text-right">
            Cancel anytime. No long-term contracts. Upgrade or downgrade between plans
            as your needs change.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PlanCard
            title="Starter"
            price="$13/mo"
            tagline="For individual athletes testing BGPT"
            audience="Ideal if you want a focused mental reset tool for this season."
            points={[
              "Up to 60 chat sessions per month",
              "Core routines: Reset, Clutch, Post-game review",
              "Save and revisit last 5 sessions",
              "Email support within 48 hours",
            ]}
            actionText="Start with Starter"
            plan="starter"
          />

          <PlanCard
            title="Pro"
            price="$22/mo"
            tagline="For serious competitors & high performers"
            audience="Best if you rely on your mental game across practices, games, and big moments."
            highlight
            badgeText="Most popular"
            points={[
              "Unlimited chat sessions",
              "Full Fundamentals library + deep-dive prompts",
              "Session history & notes you can search",
              "Game-day & pressure-moment scripts",
              "Priority support & early feature access",
            ]}
            actionText="Start Pro"
            plan="pro"
          />

          <PlanCard
            title="Team"
            price="$59/mo"
            tagline="For coaches, squads, and small teams"
            audience="Built for coaches and leaders who want a shared mental game language."
            points={[
              "Up to 8 athlete seats",
              "Shared routines & team-level prompts",
              "Unified team session history (coach view, later)",
              "Team check-ins & review templates",
              "Priority onboarding guidance (via email)",
            ]}
            actionText="Start Team"
            plan="team"
          />
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Back home
          </Link>
          <Link
            href="/start"
            className="rounded-xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            Re-check access
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400 max-w-xl">
          Note: Payment flow is currently a placeholder. Next step is connecting Stripe (optional later: PayPal).
          Pricing and inclusions may be adjusted as BGPT evolves, but you&apos;ll always see changes before you pay.
        </p>
      </div>
    </main>
  );
}

function PlanCard({
  title,
  price,
  tagline,
  audience,
  points,
  actionText,
  plan,
  highlight,
  badgeText,
}: {
  title: string;
  price: string;
  tagline: string;
  audience: string;
  points: string[];
  actionText: string;
  plan: string;
  highlight?: boolean;
  badgeText?: string;
}) {
  const baseClasses =
    "rounded-2xl border p-6 flex flex-col h-full bg-gradient-to-b";
  const styleClasses = highlight
    ? "border-purple-400/40 from-purple-500/15 to-slate-950 shadow-[0_0_30px_rgba(168,85,247,0.35)]"
    : "border-white/10 from-white/5 to-slate-950/60";

  return (
    <article className={`${baseClasses} ${styleClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {tagline}
          </div>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-semibold">{price}</span>
            <span className="text-xs text-slate-400">USD, billed monthly</span>
          </div>
        </div>

        {highlight && (
          <span className="rounded-full border border-purple-300/30 bg-purple-500/20 px-2 py-1 text-[10px] text-purple-100">
            {badgeText || "Recommended"}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-300">{audience}</p>

      <ul className="mt-5 space-y-2 text-sm text-slate-200">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <form
        action="/api/paywall/checkout"
        method="POST"
        className="mt-6 pt-4 border-t border-white/10"
      >
        <input type="hidden" name="plan" value={plan} />
        <button className="w-full rounded-xl bg-white text-slate-950 py-2.5 text-sm font-semibold hover:opacity-90 transition">
          {actionText}
        </button>
      </form>

      {!highlight && (
        <p className="mt-3 text-[11px] text-slate-400">
          You can upgrade to Pro anytime in under 30 seconds.
        </p>
      )}
    </article>
  );
}
