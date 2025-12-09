// app/page.tsx
import React from "react";

const navItems = ["How it works", "Benefits", "Pricing", "FAQ"];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050712] text-slate-50">
      {/* Top gradient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-[#5A4FF6]/40 via-[#3AA6FF]/25 to-transparent blur-3xl" />

      {/* Page shell */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* NAVBAR */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5A4FF6] to-[#3AA6FF] text-xs font-semibold tracking-tight shadow-lg shadow-[#5A4FF6]/40">
              BG
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                Dr. Brett GPT
              </span>
              <span className="text-[11px] text-slate-400">
                Mental Game Coach for Athletes
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-300 md:flex">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="transition-colors hover:text-slate-50"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden text-xs font-medium text-slate-300 hover:text-slate-50 md:inline">
              Sign in
            </button>
            <button className="rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm shadow-slate-50/30 transition hover:-translate-y-0.5 hover:bg-slate-100">
              Start free trial
            </button>
          </div>
        </header>

        {/* HERO */}
        <main className="mt-6 flex flex-1 flex-col gap-16 md:mt-10 md:flex-row md:items-center">
          {/* Left column */}
          <section className="md:w-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live AI mental game coaching for athletes
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Build an{" "}
              <span className="bg-gradient-to-r from-[#F4C542] via-[#5A4FF6] to-[#3AA6FF] bg-clip-text text-transparent">
                unshakeable mindset
              </span>
              .
            </h1>

            <p className="mt-4 max-w-md text-sm text-slate-300 sm:text-[15px]">
              Dr. Brett GPT is your always-on mental performance coach —
              helping you stay calm, confident, and composed before, during, and
              after competition.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-[#5A4FF6]" />
                Personalized coaching grounded in the 5 Fundamentals of the
                Mental Game.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-[#3AA6FF]" />
                Pre-game routines, in-game reset tools, and post-game reviews.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-[#F4C542]" />
                Designed for driven athletes — from high school to pro.
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="rounded-full bg-gradient-to-r from-[#5A4FF6] to-[#3AA6FF] px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#5A4FF6]/40 transition hover:-translate-y-0.5 hover:shadow-[#3AA6FF]/50">
                Start 7-day free trial
              </button>
              <button className="rounded-full border border-slate-600/70 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-slate-400">
                Watch how it works
              </button>
              <p className="text-[11px] text-slate-400">
                No risk. Cancel anytime.
              </p>
            </div>
          </section>

          {/* Right column – device mockups / chat preview */}
          <section className="mt-10 flex flex-1 justify-center md:mt-0 md:w-1/2">
            <div className="relative h-[360px] w-full max-w-sm">
              {/* Background card */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl shadow-black/40" />

              {/* Soft glow */}
              <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-tr from-[#5A4FF6]/40 via-[#3AA6FF]/40 to-transparent opacity-70 blur-2xl" />

              {/* Phone card */}
              <div className="relative z-10 mx-auto mt-6 flex h-[330px] w-[210px] flex-col rounded-3xl bg-slate-900/90 p-3 shadow-lg shadow-black/60 backdrop-blur">
                <div className="mx-auto mb-2 h-1 w-16 rounded-full bg-slate-700" />

                <div className="mb-2 flex items-center justify-between text-[10px] text-slate-300">
                  <span>Dr. Brett GPT</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-hidden rounded-2xl bg-slate-950/60 p-2">
                  {/* Simulated messages */}
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-800/80 px-3 py-2 text-[10px] text-slate-50">
                    Coach, I keep choking in the 4th quarter. My legs get heavy
                    and my mind races.
                  </div>
                  <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#5A4FF6] to-[#3AA6FF] px-3 py-2 text-[10px] text-slate-50 shadow-md shadow-[#5A4FF6]/40">
                    Got it. Let’s slow things down. This is a mix of{" "}
                    <span className="font-semibold">Presence</span> and{" "}
                    <span className="font-semibold">Poise</span>. We’ll build a
                    3-step reset routine you can use every time the game gets
                    tight.
                  </div>
                  <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-slate-800/80 px-3 py-2 text-[10px] text-slate-50">
                    First, rate your current anxiety 1–10. Then tell me when
                    your next game is.
                  </div>
                </div>

                {/* Input bar mock */}
                <div className="mt-2 flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-1.5 text-[10px] text-slate-400">
                  <span>Type your challenge…</span>
                  <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#5A4FF6] to-[#3AA6FF] text-[9px] text-white">
                    ↗
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* PROBLEM SECTION */}
        <section
          id="how-it-works"
          className="mt-20 rounded-3xl border border-slate-800 bg-slate-950/60 px-5 py-8 sm:px-8"
        >
          <div className="grid gap-8 md:grid-cols-[1.3fr,1fr] md:items-center">
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Most athletes train their bodies. Few train their minds.
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                Nerves before big games. Overthinking during key moments. Being
                stuck in a slump and losing trust in yourself. Dr. Brett GPT
                gives you practical mental tools, not just motivation quotes.
              </p>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <ProblemPoint text="You replay mistakes for days after a game." />
              <ProblemPoint text="You feel great in practice but tight and hesitant in competition." />
              <ProblemPoint text="You struggle to bounce back quickly when things go wrong." />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          id="benefits"
          className="mt-16 grid gap-6 md:grid-cols-3 md:gap-7"
        >
          <FeatureCard
            title="Pre-game routines"
            body="Lock in with breathing, visualization, and simple cues tailored to your sport, position, and level."
            tag="Presence & Poise"
          />
          <FeatureCard
            title="In-game reset tools"
            body="3-step mental resets to use after mistakes, bad calls, or momentum swings."
            tag="Poise"
          />
          <FeatureCard
            title="Post-game reviews & plans"
            body="Turn every game into growth with guided reflection and 2- to 4-week programs."
            tag="Perspective & Perseverance"
          />
        </section>

        {/* PRICING */}
        <section
          id="pricing"
          className="mt-20 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 px-6 py-9 sm:px-10"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Simple, athlete-friendly pricing.
              </h2>
              <p className="mt-2 max-w-md text-sm text-slate-300">
                Get unlimited mental game coaching whenever you need it. No
                long-term contracts. Cancel anytime.
              </p>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <PricingBullet text="Unlimited chat with Dr. Brett GPT" />
                <PricingBullet text="Access to all mental game programs" />
                <PricingBullet text="New tools and prompts added regularly" />
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-950/70 p-6 shadow-lg shadow-black/40 md:min-w-[260px]">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                Monthly
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">$19</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Or $9 / week for short seasons and tournaments.
              </p>

              <button className="mt-4 w-full rounded-full bg-gradient-to-r from-[#5A4FF6] to-[#3AA6FF] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#5A4FF6]/40 transition hover:-translate-y-0.5 hover:shadow-[#3AA6FF]/50">
                Start 7-day free trial
              </button>

              <p className="mt-3 text-[11px] text-slate-400">
                7-day free trial, then billed monthly. Cancel anytime in one
                click.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mt-16 grid gap-8 border-t border-slate-800 pt-10 md:grid-cols-2"
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Straight answers for athletes, parents, and coaches.
            </p>
          </div>
          <div className="space-y-4 text-xs text-slate-300">
            <FAQItem
              q="Is this a replacement for a sports psychologist or therapist?"
              a="No. Dr. Brett GPT is a mental performance coaching tool, not therapy or medical treatment. It focuses on mindset, habits, and performance routines, and will always encourage you to seek professional help when appropriate."
            />
            <FAQItem
              q="What sports is this best for?"
              a="Any sport where the mental game matters: basketball, soccer, tennis, golf, combat sports, track, swimming, esports, and more. The coaching adapts to your sport, level, and situation."
            />
            <FAQItem
              q="Can parents and coaches use this with their athletes?"
              a="Yes. Many parents and coaches use Dr. Brett GPT to frame better conversations about confidence, focus, and handling pressure."
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 text-[11px] text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Dr. Brett GPT. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <button className="hover:text-slate-300">Terms & Disclaimer</button>
            <button className="hover:text-slate-300">Privacy</button>
            <button className="hover:text-slate-300">Contact</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* Helper components */

function ProblemPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-500" />
      <p>{text}</p>
    </div>
  );
}

function FeatureCard({
  title,
  body,
  tag,
}: {
  title: string;
  body: string;
  tag: string;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm shadow-black/40 transition hover:-translate-y-1 hover:border-[#5A4FF6]/70 hover:bg-slate-950">
      <span className="inline-flex w-fit rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-medium text-slate-300">
        {tag}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-xs text-slate-300">{body}</p>
    </div>
  );
}

function PricingBullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-[#5A4FF6]" />
      <span>{text}</span>
    </li>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[11px] font-semibold text-slate-100">{q}</p>
      <p className="mt-2 text-[11px] text-slate-300">{a}</p>
    </div>
  );
}
