"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const LINKS = {
  youtube: "https://www.youtube.com/user/drbrettdenkin",
  tiktok: "https://www.tiktok.com/@drbrettrodemodel_academy",
  linkedin:
    "https://www.linkedin.com/search/results/all/?keywords=Dr.%20Brett%20Denkin",
  x: "https://x.com/drbrettdenkin",
} as const;

// ✅ HD image you provided
const DR_BRETT_IMAGE_URL =
  "https://i.ibb.co/Pv3LrTY7/Chat-GPT-Image-Jan-6-2026-07-24-26-PM.png";

// ✅ SRU Hotline number (replace these two lines with the real forwarding number)
// Tip: use Twilio/OpenPhone/Google Voice, then put the public number here.
const SRU_PHONE_DISPLAY = "+1 (000) 000-0000";
const SRU_PHONE_TEL = "tel:+10000000000";
const SRU_PHONE_SMS = "sms:+10000000000";

function PlatformIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: "youtube" | "tiktok" | "linkedin" | "x";
  className?: string;
}) {
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="currentColor"
          d="M23.498 6.186a3.01 3.01 0 0 0-2.118-2.132C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.38.554A3.01 3.01 0 0 0 .502 6.186C0 8.08 0 12 0 12s0 3.92.502 5.814a3.01 3.01 0 0 0 2.118 2.132C4.495 20.5 12 20.5 12 20.5s7.505 0 9.38-.554a3.01 3.01 0 0 0 2.118-2.132C24 15.92 24 12 24 12s0-3.92-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z"
        />
      </svg>
    );
  }

  if (kind === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.5 3c.5 3.3 2.3 5.1 5.5 5.5v3.2c-1.8.1-3.4-.5-5.1-1.5v7c0 4-3.2 6.8-7.1 6.8-4.2 0-7.6-3.4-7.6-7.6 0-4.7 4.4-8.2 9-7.4v3.6c-2.6-.5-5 1.5-5 4 0 2.2 1.8 4 4 4 2.4 0 4-1.6 4-4.4V3h2.3z"
        />
      </svg>
    );
  }

  if (kind === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 23h5V7H0v16zM7.5 7H12v2.2h.1C12.8 7.9 14.4 6.7 16.8 6.7c5.1 0 6 3.4 6 7.8V23h-5v-7.3c0-1.7 0-3.9-2.4-3.9s-2.7 1.9-2.7 3.8V23h-5V7z"
        />
      </svg>
    );
  }

  // X
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 2H22l-6.8 7.8L23.3 22h-6.6l-5.2-6.7L5.7 22H2.6l7.3-8.4L1 2h6.8l4.7 6.1L18.9 2zm-1.2 18h1.8L7.1 3.9H5.2L17.7 20z"
      />
    </svg>
  );
}

function GlassCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 backdrop-blur-xl">
      <div className="text-[12px] font-semibold text-slate-200">{title}</div>
      <div className="mt-3 text-[13px] leading-6 text-slate-300">{children}</div>
    </div>
  );
}

function PlatformCard({
  kind,
  handle,
  href,
  intro,
  bullets,
  audience,
}: {
  kind: "youtube" | "tiktok" | "linkedin" | "x";
  handle: string;
  href: string;
  intro: string;
  bullets: string[];
  audience: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200">
            <PlatformIcon kind={kind} className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[12px] font-semibold text-slate-100">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:underline-offset-4"
              >
                {handle}
              </a>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{intro}</div>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
          Live
        </span>
      </div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-[12px] leading-6 text-slate-200">
        {bullets.map((b, idx) => (
          <li key={idx}>{b}</li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
        <div className="text-[10px] font-semibold text-slate-300">
          Who this is for
        </div>
        <div className="mt-1 text-[12px] leading-6 text-slate-300">
          {audience}
        </div>
      </div>
    </div>
  );
}

export function MediaLandingSection() {
  return (
    <section id="media" className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-[12px] font-semibold tracking-wide text-slate-300">
              Dr. Brett Media
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Where pressure gets explained in plain language
            </h2>
            <p className="mt-4 max-w-3xl text-[14px] leading-7 text-slate-300">
              This is where Dr. Brett shares how people think and act when the
              moment gets loud. It is not hype. It is not motivation. It is
              simple, honest breakdowns that help you stay clear under pressure.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={LINKS.youtube}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
            >
              Watch on YouTube
            </a>
            <a
              href={LINKS.x}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
            >
              Follow on X
            </a>
            <Link
              href="#media-infrastructure"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
            >
              See the infrastructure
            </Link>
          </div>
        </div>

        {/* Dr. Brett portrait card (adds human proof + focal point) */}
        <div className="rounded-2xl border border-white/10 bg-black/10 p-3 backdrop-blur-xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <img
              src={DR_BRETT_IMAGE_URL}
              alt="Dr. Brett Denkin"
              className="h-[320px] w-full object-cover opacity-95"
              loading="lazy"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <div className="leading-tight">
              <div className="text-[12px] font-semibold text-slate-100">
                Dr. Brett Denkin
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Mental performance coach
              </div>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <GlassCard title="How the media works">
          Each platform has a job. Nothing is posted just to post. Some places
          are for deep thinking, some are for quick clarity, and some are for
          real time reactions.
        </GlassCard>

        <GlassCard title="What to expect">
          Clear explanations. Real examples. Simple steps. If you want noise,
          this is not it. If you want clarity, you are in the right place.
        </GlassCard>
      </div>

      {/* Platforms */}
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <PlatformCard
          kind="youtube"
          handle="@DrBrettMentalGameCoach"
          href={LINKS.youtube}
          intro="Longer videos where ideas are built step by step."
          bullets={[
            "Tactical breakdowns of real moments where performance held up or collapsed",
            "Clear explanations of what worked and what failed without blaming effort",
            "Masterclass style sessions that teach the mental tools behind the moment",
            "Weekly live sessions that feel real and unscripted",
          ]}
          audience="Athletes, coaches, and leaders who want depth, not quick tips."
        />

        <PlatformCard
          kind="tiktok"
          handle="@drbrettrodemodel_academy"
          href={LINKS.tiktok}
          intro="Short videos with one useful idea at a time."
          bullets={[
            "Fast answers to common pressure problems",
            "Clear ways to stop overthinking in the moment",
            "Simple patterns that separate top performers from everyone else",
          ]}
          audience="High performers who want something useful in under a minute."
        />

        <PlatformCard
          kind="linkedin"
          handle="Dr. Brett Denkin"
          href={LINKS.linkedin}
          intro="Leadership, pressure, and decision making without corporate fluff."
          bullets={[
            "Thoughts for founders and executives operating under constant pressure",
            "Breakdowns of why teams lose focus and how to fix it",
            "Simple language for complex leadership problems",
          ]}
          audience="Leaders responsible for people, results, and hard decisions."
        />

        <PlatformCard
          kind="x"
          handle="@drbrettdenkin"
          href={LINKS.x}
          intro="Real time takes on pressure moments when they happen."
          bullets={[
            "Quick observations during games and high pressure moments",
            "Short posts explaining what really went right or wrong",
            "Clear logic instead of emotional reactions",
          ]}
          audience="People who want fast clarity, not long explanations."
        />
      </div>

      {/* Infrastructure */}
      <div id="media-infrastructure" className="mt-12">
        <div className="mb-6">
          <div className="text-[12px] font-semibold text-slate-300">
            Digital Infrastructure
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            The layer under the content
          </h3>
          <p className="mt-3 max-w-3xl text-[13px] leading-7 text-slate-300">
            Public content is only one layer. Some things need a quieter space
            so the signal stays clean. This is where that happens.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold text-slate-100">
                  The SRU Hotline
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  The Calibration Line
                </div>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3 text-[13px] leading-6 text-slate-300">
              <p>
                This is not a place for opinions. It is for real time calibration
                when a moment is hard to read.
              </p>
              <p className="text-[12px] text-slate-300">
                Keep it short. Share what is happening, what you are feeling,
                and what you need to do next. Voice patterns get studied and
                turned into useful guidance.
              </p>
            </div>

            {/* Hotline number + actions */}
            <div className="mt-5 rounded-xl border border-white/10 bg-black/15 px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-slate-300">
                    Hotline
                  </div>
                  <a
                    href={SRU_PHONE_TEL}
                    className="mt-1 block text-[12px] font-semibold text-slate-100 hover:underline hover:underline-offset-4"
                  >
                    {SRU_PHONE_DISPLAY}
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={SRU_PHONE_TEL}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
                  >
                    Call now
                  </a>
                  <a
                    href={SRU_PHONE_SMS}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
                  >
                    Text now
                  </a>
                </div>
              </div>

              <div className="mt-3 text-[11px] leading-6 text-slate-400">
                If you are in a live pressure moment, aim for 20–40 seconds.
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
              <div className="text-[10px] font-semibold text-slate-300">
                Access
              </div>
              <div className="mt-1 text-[12px] text-slate-300">
                Limited. By request only.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-5 backdrop-blur-xl">
            <div className="text-[12px] font-semibold text-slate-100">
              Ask Dr. Brett
            </div>
            {/* ✅ removed "portal" language */}
            <div className="mt-1 text-[11px] text-slate-400">
              Send a situation
            </div>

            <div className="mt-4 space-y-3 text-[13px] leading-6 text-slate-300">
              <p>This is a place to submit a situation, not start a conversation.</p>
              <p className="text-[12px] text-slate-300">
                You can share a mental hurdle you are facing. Your situation may
                be reviewed publicly in a weekly breakdown without names so
                others can learn from it too.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
              <div className="text-[10px] font-semibold text-slate-300">
                Outcome
              </div>
              <div className="mt-1 text-[12px] text-slate-300">
                Clear breakdowns that turn moments into usable tools.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5 backdrop-blur-xl">
          <div className="text-[12px] font-semibold text-slate-100">
            How this connects to BGPT
          </div>
          <p className="mt-3 max-w-4xl text-[13px] leading-7 text-slate-300">
            The media is public. BGPT is private. The same ideas you see here
            can be applied to your exact sport, role, and pressure points inside
            BGPT. No pressure. If it fits, you will know.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
            >
              Open BGPT
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10"
            >
              View plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
