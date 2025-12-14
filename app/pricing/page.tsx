import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Choose your plan
        </h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          You’ll get access to BGPT chat once your plan is active.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PlanCard
            title="Starter"
            price="$13/mo"
            points={["Unlimited sessions", "Core routines", "Private by default"]}
            actionText="Start Starter"
            plan="starter"
          />
          <PlanCard
            title="Pro"
            price="$22/mo"
            highlight
            points={["Everything in Starter", "Advanced pressure plans", "Priority updates"]}
            actionText="Start Pro"
            plan="pro"
          />
          <PlanCard
            title="Team"
            price="$59/mo"
            points={["Multi-user access", "Team routines", "Admin controls (later)"]}
            actionText="Start Team"
            plan="team"
          />
        </div>

        <div className="mt-10 flex gap-3">
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

        <p className="mt-8 text-xs text-slate-400">
          Note: Payment flow is currently a placeholder. Next step is connecting Stripe/PayPal.
        </p>
      </div>
    </main>
  );
}

function PlanCard({
  title,
  price,
  points,
  actionText,
  plan,
  highlight,
}: {
  title: string;
  price: string;
  points: string[];
  actionText: string;
  plan: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-6",
        highlight
          ? "border-purple-400/40 bg-purple-500/10"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="mt-1 text-3xl font-semibold">{price}</div>
        </div>
        {highlight && (
          <span className="rounded-full border border-purple-300/30 bg-purple-500/20 px-2 py-1 text-[10px] text-purple-200">
            Most popular
          </span>
        )}
      </div>

      <ul className="mt-5 space-y-2 text-sm text-slate-200">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <form action="/api/paywall/checkout" method="POST" className="mt-6">
        <input type="hidden" name="plan" value={plan} />
        <button className="w-full rounded-xl bg-white text-slate-950 py-2 text-sm font-semibold hover:opacity-90">
          {actionText}
        </button>
      </form>
    </div>
  );
}
