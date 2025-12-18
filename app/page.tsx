"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * BGPT Landing — World-class iteration (single-file App.tsx)
 * Notes:
 * - Built for an independent product (NOT inside ChatGPT). CTAs point to OPEN_APP_URL / API-backed app routes.
 * - Implements the 12+ improvements: surface tiers, stronger brand motifs, clearer conversion, credibility, demo realism,
 *   better typography rhythm, chapter breaks, athlete moments, explicit deliverables, stronger nav CTA,
 *   meaningful motion (count-up + staged reveal), accessibility/performance reductions (less blur).
 */

const OPEN_APP_URL = "/start"; // protected area; redirects to /login if not logged in
const LOGIN_URL = "/login";
const SIGNUP_URL = "/signup";
const WATCH_DEMO_URL = "https://YOUR_DOMAIN.com/demo.mp4"; // keep or replace later
const PRICING_URL = "/pricing"; // placeholder so it doesn't go nowhere

type ChatRole = "user" | "coach";

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  meta?: string;
}

interface PillProps {
  label: string;
  sub?: string;
}

interface StatCardProps {
  label: string;
  value: string;
  footnote?: string;
}

interface FrameworkItem {
  title: string;
  tagline: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  sport: string;
  quote: string;
  highlight: string;
}

interface SectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  kicker?: string;
  children: React.ReactNode;
  align?: "left" | "center";
  tone?: "quiet" | "loud";
}

interface MomentItem {
  title: string;
  moment: string;
  tool: string;
  output: string;
}

interface DeliverableItem {
  title: string;
  description: string;
  example: string;
}

interface FAQItem {
  q: string;
  a: string;
}

const CORE_FRAMEWORK: FrameworkItem[] = [
  {
    title: "Presence",
    tagline: "Play this rep — not the last one.",
    description:
      "Return to the moment you can control. Train quick resets after mistakes, pressure, or bad calls.",
  },
  {
    title: "Patience",
    tagline: "Trust reps, not instant results.",
    description:
      "Build discipline to stick to your process when outcomes wobble — especially mid-season.",
  },
  {
    title: "Perspective",
    tagline: "Zoom out to stay resilient.",
    description:
      "Stop letting one game define you. Stabilize confidence across weeks, not minutes.",
  },
  {
    title: "Preparation",
    tagline: "Confidence is built — then used.",
    description:
      "Install pre-game scripts, cues, and “if/then” plans so pressure feels familiar.",
  },
  {
    title: "Play",
    tagline: "Compete with freedom again.",
    description:
      "Stay ruthless about standards without becoming rigid. Let performance flow.",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: "A. M.",
    role: "D1 Outside Hitter",
    sport: "Volleyball",
    quote:
      "The reset routine stopped the spiral after one bad set. I could feel the moment coming — and knew exactly what to do.",
    highlight: "+12% hitting efficiency in 6 weeks",
  },
  {
    name: "J. L.",
    role: "Professional Golfer",
    sport: "Golf",
    quote:
      "It wasn’t my swing — it was the way I reacted after one miss. The ‘next shot’ script changed my Sundays.",
    highlight: "Back-to-back top 10 finishes",
  },
  {
    name: "N. W.",
    role: "Founder",
    sport: "Business",
    quote:
      "Same pressure, different arena. The ‘if/then’ plan is how I handle investor calls without spiraling.",
    highlight: "Launched 2 products calmly",
  },
];

const QUICK_PROMPTS: string[] = [
  "I choke in high-pressure moments even though I dominate in practice.",
  "I can’t let go of mistakes and it ruins the rest of my game.",
  "I overthink before competing and feel exhausted before I start.",
  "I lost confidence after injury and don’t feel like the same player.",
];

const PILLARS: PillProps[] = [
  { label: "For athletes 16+", sub: "and high-pressure performers" },
  { label: "Tools, not quotes", sub: "repeatable routines" },
  { label: "Built for pressure", sub: "mistakes · clutch · comebacks" },
  { label: "Private by default", sub: "you control what you share" },
];

const MOMENTS: MomentItem[] = [
  {
    title: "After a mistake",
    moment: "You miss, turnover, shank, or get beat — and your body tightens.",
    tool: "10-second Reset",
    output: "Breath cue + focus phrase + next action",
  },
  {
    title: "Right before competition",
    moment: "You feel the nerves spike in warm-up or the tunnel.",
    tool: "Pre-game Script",
    output: "3-line script + anchor cue + first-play intention",
  },
  {
    title: "Late-game / clutch",
    moment: "It’s close. You start thinking outcomes instead of execution.",
    tool: "If/Then Pressure Plan",
    output: "Triggers → response plan → attention target",
  },
  {
    title: "When coach subs you",
    moment: "You take it personally and lose emotional control.",
    tool: "Perspective Reframe",
    output: "Meaning reset + next rep commitment",
  },
  {
    title: "Return from injury",
    moment: "You hesitate and don’t trust your body.",
    tool: "Confidence Rebuild",
    output: "Exposure ladder + “proof log” routine",
  },
  {
    title: "Slumps & cold streaks",
    moment: "Confidence dips, you start forcing results.",
    tool: "Process Lock",
    output: "2 controllables + one non-negotiable rep",
  },
  {
    title: "Crowd / scrutiny",
    moment: "You feel watched and start performing ‘for approval’.",
    tool: "Attention Narrowing",
    output: "Visual target + breath cadence + cue word",
  },
  {
    title: "Team leadership pressure",
    moment: "You feel responsible for everything and play tight.",
    tool: "Role Clarity",
    output: "Role statement + on-court boundaries",
  },
];

const DELIVERABLES: DeliverableItem[] = [
  {
    title: "Reset Routine Generator",
    description:
      "A short routine for the exact moment you tighten — designed for your sport and role.",
    example: "“Breathe 4–2–6 → cue ‘Next rep’ → eyes to target → first action.”",
  },
  {
    title: "Pre-game Script Builder",
    description:
      "A tight mental script for the hour before competition (no fluff, all execution).",
    example: "“I expect nerves → I return to breath → I execute one rep at a time.”",
  },
  {
    title: "Pressure If/Then Plan",
    description:
      "A decision tree for clutch moments so your mind doesn’t improvise under stress.",
    example: "“If I feel rushed → slow exhale → pick one target → commit.”",
  },
  {
    title: "Confidence Rebuild Protocol",
    description:
      "A practical way to rebuild trust after injury, mistakes, or a bad stretch.",
    example: "Exposure ladder + proof log + controllables checklist.",
  },
  {
    title: "Post-game Debrief Template",
    description:
      "A debrief that builds learning without self-attack — so you improve faster.",
    example: "3 wins · 1 lesson · 1 adjustment · next rep intention.",
  },
];

const FAQ: FAQItem[] = [
  {
    q: "Is this therapy?",
    a: "No. Dr. Brett GPT is performance coaching — routines, attention control, and pressure skills. If you need mental health care or crisis support, use local professional services to feel better and remember life is a blessing.",
  },
  {
    q: "Where does the coaching happen?",
    a: "This coaching happens in our main app Dr. Brett GPT, after signing up & selecting a plan when you click on Try Brett GPT. You’ll start sessions there and get Responses for your questions, queries, scripts or reset plans.",
  },
  {
    q: "Do I need to sign up?",
    a: "So you actually need to sign up with us as a requirement of accessing Dr. Brett GPT or Brett GPT, But This also Has your sessions kept in your account .",
  },
  {
    q: "How fast will I feel a difference?",
    a: "Most athletes feel a shift quickly once they have a clear routine for the specific moment they tighten — then it compounds with reps.",
  },
  {
    q: "Is my data private?",
    a: "We keep your data safe with us as subjected to our policies. You control what you share, and you can delete your sessions as well.",
  },
];

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const current = doc.scrollTop;
      setProgress(total <= 0 ? 0 : current / total);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return progress;
}

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const [inView, setInView] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px", ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

/** Count-up for meaningful motion (stats). */
function useCountUp(target: number, startWhen: boolean, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!startWhen) return;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, startWhen, durationMs]);

  return value;
}

/* ----------------------------- Brand Motifs ----------------------------- */

const FocusWaves: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 600 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M30 120 C 120 40, 240 40, 330 120 C 420 200, 520 200, 570 120"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="2"
      />
      <path
        d="M30 140 C 120 60, 240 60, 330 140 C 420 220, 520 220, 570 140"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="2"
      />
      <path
        d="M30 100 C 120 20, 240 20, 330 100 C 420 180, 520 180, 570 100"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      <circle
        cx="300"
        cy="120"
        r="6"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <circle
        cx="300"
        cy="120"
        r="18"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
      <circle
        cx="300"
        cy="120"
        r="34"
        stroke="currentColor"
        strokeOpacity="0.12"
      />
    </svg>
  );
};

/* ----------------------------- Surfaces (Tiered) ----------------------------- */

const SurfaceB: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => {
  return (
    <div
      className={`relative rounded-3xl border border-white/8 bg-white/[0.035] ${className}`}
    >
      {children}
    </div>
  );
};

const SurfaceC: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-purple-500/10" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const SoftDivider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="relative py-10 md:py-14">
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    {label && (
      <div className="relative mx-auto w-fit rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-slate-200">
        {label}
      </div>
    )}
  </div>
);

/* ----------------------------- UI Bits ----------------------------- */

const TagPill: React.FC<PillProps> = ({ label, sub }) => {
  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs md:text-sm text-slate-100/90 hover:border-white/14 hover:bg-white/[0.05] transition-colors">
      <span className="font-medium">{label}</span>
      {sub && <span className="text-slate-300/90 text-[11px] mt-1">{sub}</span>}
    </div>
  );
};

const PrimaryButton: React.FC<
  React.PropsWithChildren<{
    href: string;
    className?: string;
    ariaLabel?: string;
  }>
> = ({ href, className = "", ariaLabel, children }) => (
  <a
    href={href}
    aria-label={ariaLabel}
    className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-500 to-sky-400 px-4 md:px-5 py-2.5 text-xs md:text-sm font-medium text-white shadow-xl shadow-purple-500/35 hover:shadow-purple-400/55 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 transition-all ${className}`}
  >
    {children}
  </a>
);

const SecondaryButton: React.FC<
  React.PropsWithChildren<{
    onClick?: () => void;
    href?: string;
    className?: string;
    ariaLabel?: string;
  }>
> = ({ onClick, href, className = "", ariaLabel, children }) => {
  const Comp: any = href ? "a" : "button";
  return (
    <Comp
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs md:text-sm font-medium text-slate-100 hover:bg-white/[0.06] hover:border-white/16 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-all ${className}`}
      type={href ? undefined : "button"}
    >
      {children}
    </Comp>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  footnote?: string;
  emphasis?: boolean;
}> = ({ label, value, footnote, emphasis }) => {
  return (
    <SurfaceB
      className={`p-5 lg:p-6 ${
        emphasis ? "border-purple-300/20 bg-purple-500/[0.06]" : ""
      }`}
    >
      <div className="text-[10px] md:text-xs uppercase tracking-[0.22em] text-slate-300 mb-3">
        {label}
      </div>
      <div className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight">
        {value}
      </div>
      {footnote && (
        <p className="text-[11px] md:text-sm text-slate-300/90 leading-relaxed">
          {footnote}
        </p>
      )}
    </SurfaceB>
  );
};

/* ----------------------------- Modal (Demo Video) ----------------------------- */

const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close modal"
      />
      <div className="relative w-full max-w-3xl">
        <SurfaceC className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm md:text-base font-semibold text-white">
                {title}
              </div>
              <div className="text-[11px] md:text-xs text-slate-300">
                Short demo — how a session produces a reset plan.
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Close
            </button>
          </div>
          {children}
        </SurfaceC>
      </div>
    </div>
  );
};

/* ----------------------------- Chat Demo (More Real) ----------------------------- */

const ChatBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex w-full gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-400 text-[11px] font-semibold text-white shrink-0">
          BG
        </div>
      )}
      <div
        className={`max-w-[84%] rounded-2xl px-3.5 py-3 text-xs md:text-sm leading-relaxed shadow-md shadow-black/35 ${
          isUser
            ? "rounded-br-sm bg-white/90 text-slate-900"
            : "rounded-bl-sm bg-slate-950/70 text-slate-100 border border-white/10"
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.text}</p>
        {msg.meta && (
          <div className="mt-1.5 text-[10px] md:text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            {msg.meta}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[11px] font-semibold text-slate-50 shrink-0">
          U
        </div>
      )}
    </div>
  );
};

const ResetPlanCard: React.FC = () => {
  return (
    <div className="rounded-2xl border border-purple-300/20 bg-purple-500/[0.06] p-3.5 text-xs md:text-sm text-slate-100">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300">
          Output: 10-second reset plan
        </div>
        <span className="text-[10px] text-slate-300">Saved to session</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mb-1">
            Breath
          </div>
          <div className="font-medium">4–2–6 exhale</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mb-1">
            Cue
          </div>
          <div className="font-medium">“Next rep.”</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mb-1">
            Next action
          </div>
          <div className="font-medium">Eyes to target → commit</div>
        </div>
      </div>
    </div>
  );
};

const ChatDemo: React.FC<{ onWatchDemo: () => void }> = ({ onWatchDemo }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "user",
      text: "In practice I’m great, but in games I get tight after one mistake.",
      meta: "Moment: after mistake",
    },
    {
      id: 2,
      role: "coach",
      text:
        "Good — we’re not fixing your talent, we’re fixing your response.\n\nTell me the exact trigger:\n• after a miss?\n• after coach reacts?\n• after the crowd shifts?",
      meta: "Clarifying the trigger",
    },
    {
      id: 3,
      role: "user",
      text: "After a miss. I feel my shoulders rise and my mind races.",
      meta: "Body cue: tension",
    },
    {
      id: 4,
      role: "coach",
      text:
        "Perfect. Here’s your 10-second reset for that moment.\n\nRun it every time in practice so it shows up automatically in games.",
      meta: "Generating a routine",
    },
  ]);

  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showPlan, setShowPlan] = useState(true);
  const [idCounter, setIdCounter] = useState(5);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking, showPlan]);

  const handlePromptClick = (prompt: string) => setUserInput(prompt);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = userInput.trim();
    if (!trimmed || isThinking) return;

    const userMessage: ChatMessage = { id: idCounter, role: "user", text: trimmed };
    setIdCounter((p) => p + 1);
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsThinking(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: idCounter + 1,
          role: "coach",
          text:
            "Got you. We’ll map that to one skill and one routine.\n\nNext: What’s the *first* physical cue you notice (jaw, shoulders, breath, hands)?",
          meta: "Next question",
        },
      ]);
      setIdCounter((p) => p + 2);
      setIsThinking(false);
      setShowPlan(true);
    }, 700);
  };

  return (
    <SurfaceC className="p-4 md:p-5 lg:p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-sky-400 blur-md opacity-55" />
            <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-slate-950 text-[11px] font-semibold text-white border border-white/10">
              BG
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-100">
              <span className="font-medium">BGPT</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-slate-200">
                Demo preview
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live-style flow
              </span>
            </div>
            <p className="text-[11px] md:text-xs text-slate-300/90">
              Built for pressure moments · outputs routines & scripts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onWatchDemo} ariaLabel="Watch demo">
            <span>Watch 45s</span>
            <span className="text-base leading-none">▶</span>
          </SecondaryButton>
          <PrimaryButton href={OPEN_APP_URL} ariaLabel="Open BGPT app">
            <span>Open BGPT</span>
            <span className="text-lg leading-none">↗</span>
          </PrimaryButton>
        </div>
      </div>

      <div className="relative mb-3 flex-1 overflow-hidden rounded-2xl border border-white/8 bg-black/35">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.10),transparent_55%)] opacity-90" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2 text-[10px] text-slate-300/90 bg-black/30">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 border border-white/10">
                Output: routine
              </span>
              <button
                type="button"
                onClick={() => setShowPlan((s) => !s)}
                className="rounded-full bg-white/[0.04] px-2 py-0.5 border border-white/10 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                {showPlan ? "Hide output" : "Show output"}
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}

            {showPlan && <ResetPlanCard />}

            {isThinking && (
              <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-2">
                <div className="h-6 w-6 rounded-xl border border-white/10 bg-slate-950/60 flex items-center justify-center">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.12s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.24s]" />
                  </span>
                </div>
                <span>Building your next prompt…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
        {QUICK_PROMPTS.map((prompt, index) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handlePromptClick(prompt)}
            className="group flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] md:text-xs text-left text-slate-200/90 hover:bg-white/[0.06] hover:border-white/16 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-all"
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-300/80">
              <span className="h-1 w-1 rounded-full bg-slate-400/80" />
              <span>
                {index === 0
                  ? "Pressure"
                  : index === 1
                  ? "Mistakes"
                  : index === 2
                  ? "Overthinking"
                  : "Confidence"}
              </span>
            </div>
            <span className="line-clamp-2 group-hover:line-clamp-none">
              {prompt}
            </span>
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 md:px-3.5 md:py-2.5"
      >
        <input
          type="text"
          placeholder="Describe the moment you tighten…"
          className="flex-1 bg-transparent text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          value={userInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUserInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={!userInput.trim() || isThinking}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-purple-500 to-sky-400 px-3 py-1.5 text-[11px] md:text-xs font-medium text-white shadow-lg shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
        >
          <span>Ask</span>
          <span className="text-[15px] leading-none">↗</span>
        </button>
      </form>

      {/* Reduced disclaimer intensity (only where needed) */}
      <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
        Performance coaching only. Not for emergencies.
      </p>
    </SurfaceC>
  );
};

/* ----------------------------- Sections ----------------------------- */

const Section: React.FC<SectionProps> = ({
  id,
  eyebrow,
  title,
  kicker,
  children,
  align = "left",
  tone = "quiet",
}) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const isCenter = align === "center";

  return (
    <section
      id={id}
      ref={ref}
      className={`relative py-16 md:py-24 lg:py-28 ${
        tone === "loud" ? "overflow-hidden" : ""
      }`}
    >
      {tone === "loud" && (
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <FocusWaves className="absolute -top-6 left-1/2 w-[900px] -translate-x-1/2 text-sky-300/40" />
        </div>
      )}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header
          className={`mb-10 md:mb-14 lg:mb-16 ${
            isCenter ? "text-center max-w-2xl mx-auto" : "max-w-xl"
          }`}
        >
          {eyebrow && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] md:text-xs uppercase tracking-[0.25em] text-slate-200/90">
              <span className="h-1 w-1 rounded-full bg-gradient-to-br from-purple-500 to-sky-400" />
              <span>{eyebrow}</span>
            </div>
          )}

          {/* Unique type move: tighter tracking + slightly larger + controlled gradient */}
          <h2
            className={`text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.02em] text-white ${
              isCenter ? "mx-auto" : ""
            }`}
          >
            {title}
          </h2>

          {kicker && (
            <p className="mt-3 md:mt-4 text-sm md:text-base text-slate-200/90 leading-relaxed">
              {kicker}
            </p>
          )}
        </header>

        <div
          className={`${
            inView
              ? "animate-[slideUpSoft_0.9s_ease-out_forwards]"
              : "opacity-0 translate-y-6"
          }`}
        >
          {children}
        </div>
      </div>
    </section>
  );
};

const HeroSection: React.FC<{ onWatchDemo: () => void }> = ({ onWatchDemo }) => {
  const scrollProgress = useScrollProgress();

  const heroBackgroundStyle = useMemo<React.CSSProperties>(() => {
    const y = scrollProgress * 60;
    return {
      transform: `translateY(${y}px)`,
    };
  }, [scrollProgress]);

  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-16 pt-20 md:pt-24 lg:pt-28 lg:pb-24"
    >
      {/* Background: less blur overall (performance), more identity via field lines + waves */}
      <div
        className="pointer-events-none absolute inset-0 opacity-95 transition-transform duration-700 ease-out"
        style={heroBackgroundStyle}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,1)_0,rgba(15,23,42,0.90)_40%,rgba(15,23,42,1)_100%)]" />

        {/* Field line motif */}
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:84px_84px]" />

        {/* Color energy (reduced blur usage) */}
        <div className="absolute -top-56 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[conic-gradient(from_210deg_at_50%_50%,_rgba(129,140,248,0.10),_rgba(96,165,250,0.24),_rgba(244,114,182,0.14),_rgba(129,140,248,0.10))] opacity-70" />
        <div className="absolute -bottom-44 -left-20 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_30%_80%,rgba(56,189,248,0.16),transparent_60%)] opacity-80" />
        <div className="absolute -bottom-52 -right-8 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_70%_20%,rgba(168,85,247,0.22),transparent_60%)] opacity-80" />

        <FocusWaves className="absolute top-10 left-1/2 w-[1000px] -translate-x-1/2 text-purple-300/30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(15,23,42,0.35),rgba(15,23,42,0.95))]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8">
        <div
          className={`flex-1 ${
            inView
              ? "animate-[slideUpSoft_0.9s_ease-out_forwards]"
              : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 border border-white/10 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-200/90">
              Mental Performance · Athletes 16+
            </span>
          </div>

          {/* Punch line + supporting line (improved hierarchy) */}
          <h1 className="text-3xl md:text-5xl leading-[1.06] tracking-[-0.03em] text-white font-semibold">
            Turn pressure into{" "}
            <span className="bg-gradient-to-br from-sky-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              execution
            </span>
            .
          </h1>

          <p className="mt-3 md:mt-4 text-sm md:text-base text-slate-200/90 leading-relaxed max-w-xl">
            Dr. Brett GPT helps you handle the exact moment you tighten — and gives you a
            routine you can run{" "}
            <span className="font-semibold text-slate-50">tonight</span>.
          </p>

          {/* Above-the-fold micro promise (conversion clarity) */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
              Describe the moment
            </span>
            <span className="text-slate-500">→</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
              Get a reset routine
            </span>
            <span className="text-slate-500">→</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
              Use it in your next rep
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PrimaryButton href={OPEN_APP_URL} ariaLabel="Try Dr.Brett GPT now">
              <span>Try BGPT now</span>
              <span className="text-lg leading-none">↗</span>
            </PrimaryButton>

            <SecondaryButton onClick={onWatchDemo} ariaLabel="Watch demo">
              <span>Watch 45s demo</span>
              <span className="text-base leading-none">▶</span>
            </SecondaryButton>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 md:flex md:flex-wrap md:gap-3">
            {PILLARS.map((pill) => (
              <TagPill key={pill.label} {...pill} />
            ))}
          </div>

          {/* Trust chips (grounding) */}
          <div className="mt-6 md:mt-7 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Outputs: scripts · routines · plans
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Built for pressure moments
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Private sessions
            </div>
          </div>
        </div>

        <div
          className={`flex-1 lg:max-w-md xl:max-w-lg ${
            inView
              ? "animate-[slideUpSoft_1.05s_ease-out_forwards]"
              : "opacity-0 translate-y-8"
          }`}
        >
          <ChatDemo onWatchDemo={onWatchDemo} />
        </div>
      </div>
    </section>
  );
};

const StatsSection: React.FC = () => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const perfLift = useCountUp(12, inView, 950);
  const athletes = useCountUp(5000, inView, 950);
  const sessions = useCountUp(70000, inView, 1050);

  return (
    <section ref={ref} id="results" className="relative py-16 md:py-24 lg:py-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] md:text-xs uppercase tracking-[0.25em] text-slate-200/90">
            <span className="h-1 w-1 rounded-full bg-gradient-to-br from-purple-500 to-sky-400" />
            Proof & traction
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.02em] text-white">
            Real shifts — not just motivation.
          </h2>
          <p className="mt-3 text-sm md:text-base text-slate-200/90 leading-relaxed">
            Numbers are only useful if they’re grounded. Keep your measurement
            simple, transparent, and honest.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
          <StatCard
            label="Average performance lift"
            value={`+${perfLift}%`}
            footnote="+12% = self-reported performance marker after 6–8 weeks (add n=___)."
            emphasis
          />
          <StatCard
            label="Athletes & performers"
            value={`${athletes.toLocaleString()}+`}
            footnote="Across multiple sports and high-pressure roles."
          />
          <StatCard
            label="Sessions informed"
            value={`${sessions.toLocaleString()}+`}
            footnote="Used to refine prompts, routines, and flows."
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1.2fr,1fr] items-stretch">
          {/* Tier B panel (NOT glass) to break the “box rhythm” */}
          <SurfaceB className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300 mb-1">
                  Stories (privacy preserved)
                </div>
                <div className="text-sm md:text-base font-semibold text-white">
                  Names changed. Scenarios real.
                </div>
              </div>
              <span className="text-[11px] text-slate-300">
                Keep details anonymous, keep the results honest.
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-black/30 border border-white/10 px-3.5 py-3 text-xs text-slate-100 leading-relaxed">
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Before
                </div>
                <p>
                  “One mistake and I’d go into protection mode. I stopped
                  attacking and started surviving.”
                </p>
              </div>
              <div className="rounded-2xl bg-purple-500/[0.07] border border-purple-300/20 px-3.5 py-3 text-xs text-slate-100 leading-relaxed">
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                  After (with reps)
                </div>
                <p>
                  “Pressure still shows up, but I have a routine. I recover in
                  seconds instead of spiraling for minutes.”
                </p>
              </div>
            </div>
          </SurfaceB>

          <div className="space-y-3 md:space-y-4">
            <SurfaceB className="p-5">
              <p className="text-sm text-slate-200/90 leading-relaxed">
                Built for athletes who want{" "}
                <span className="font-semibold text-white">execution tools</span>{" "}
                — not hype.
              </p>
            </SurfaceB>
            <SurfaceB className="p-5">
              <p className="text-[11px] md:text-sm text-slate-300 leading-relaxed">
                Credibility block goes here (coach credentials, methodology
                note, team/university logos if you have them).
              </p>
            </SurfaceB>
          </div>
        </div>
      </div>
    </section>
  );
};

const MomentsSection: React.FC = () => {
  return (
    <Section
      id="moments"
      eyebrow="Moments we train"
      title="Athletes don’t buy motivation — they buy help for the exact moment."
      kicker="Pick the moment. Dr. Brett GPT outputs a routine or script you can rehearse in practice until it shows up under pressure."
      align="left"
      tone="loud"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {MOMENTS.map((m) => (
          <SurfaceB key={m.title} className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm md:text-base font-semibold text-white">
                  {m.title}
                </div>
                <p className="mt-1 text-[11px] md:text-sm text-slate-200/90 leading-relaxed">
                  {m.moment}
                </p>
              </div>
              <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-slate-200">
                Tool: <span className="font-semibold text-white">{m.tool}</span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-[11px] md:text-sm text-slate-200/90">
              <span className="text-slate-300 uppercase tracking-[0.18em] text-[10px]">
                Output
              </span>
              <div className="mt-1 font-medium text-slate-50">{m.output}</div>
            </div>
          </SurfaceB>
        ))}
      </div>
    </Section>
  );
};

const DeliverablesSection: React.FC = () => {
  return (
    <Section
      id="deliverables"
      eyebrow="What you get"
      title="In 10 minutes, you leave with something usable."
      kicker="This is the difference between a nice conversation and actual training: a routine you can run on the field."
      align="center"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DELIVERABLES.map((d) => (
          <SurfaceB key={d.title} className="p-5 md:p-6">
            <div className="text-sm md:text-base font-semibold text-white">
              {d.title}
            </div>
            <p className="mt-2 text-[11px] md:text-sm text-slate-200/90 leading-relaxed">
              {d.description}
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-[11px] md:text-sm text-slate-200/90">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mb-1">
                Example
              </div>
              <div className="text-slate-50 font-medium">{d.example}</div>
            </div>
          </SurfaceB>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <PrimaryButton href={OPEN_APP_URL} ariaLabel="Try Dr. Brett GPT now">
          <span>Try BGPT now</span>
          <span className="text-lg leading-none">↗</span>
        </PrimaryButton>
        <SecondaryButton href="#faq" ariaLabel="Read FAQ">
          <span>Read FAQ</span>
        </SecondaryButton>
      </div>
    </Section>
  );
};

const FrameworkSection: React.FC = () => {
  return (
    <Section
      id="framework"
      eyebrow="Core framework"
      title="A framework is useful only if it becomes automatic."
      kicker="Dr. Brett GPT uses a simple structure to turn messy pressure into clear routines. Keep it balanced: enough structure to guide, not so much it feels preachy."
      align="left"
    >
      <div className="grid gap-6 md:grid-cols-[1.15fr,1fr] items-start">
        <div className="space-y-4">
          {CORE_FRAMEWORK.map((item, idx) => (
            <SurfaceB key={item.title} className="p-5 md:p-6">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="mt-0.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-slate-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-sky-400 text-[10px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    <span className="tracking-[0.16em] uppercase text-[10px] text-slate-200/90">
                      {item.title}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-white mb-1.5">
                    {item.tagline}
                  </h3>
                  <p className="text-[11px] md:text-sm text-slate-200/90 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </SurfaceB>
          ))}
        </div>

        {/* Sticky panel is now Tier B (subtle), not glass */}
        <div className="sticky md:top-24">
          <SurfaceB className="p-5 md:p-6">
            <h3 className="text-sm md:text-base font-semibold text-white mb-2">
              What a session actually does
            </h3>
            <p className="text-[11px] md:text-sm text-slate-200/90 leading-relaxed mb-3">
              Not “How do you feel?” — it’s “Where exactly does it break, and
              what’s the routine for that moment?”
            </p>

            <ul className="space-y-2.5 text-[11px] md:text-sm text-slate-200/90">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                <div>
                  Identify your <span className="font-semibold">trigger</span>.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                <div>
                  Build a <span className="font-semibold">routine</span> you can
                  rehearse.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <div>
                  Output a <span className="font-semibold">plan</span> (reset /
                  script / if-then).
                </div>
              </li>
            </ul>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-[11px] text-slate-300">
              Tip: The routine only works if it’s trained in practice first.
            </div>
          </SurfaceB>
        </div>
      </div>
    </Section>
  );
};

const StoriesSection: React.FC = () => {
  return (
    <Section
      id="stories"
      eyebrow="From the field"
      title="Stories from athletes & high performers."
      kicker="Names are anonymized. The point is the pattern: pressure → routine → freedom."
      align="left"
    >
      <div className="grid gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        {TESTIMONIALS.map((t) => (
          <SurfaceB
            key={t.name}
            className="p-5 md:p-6 flex flex-col justify-between hover:bg-white/[0.05] transition-colors"
          >
            <div>
              <p className="text-[11px] md:text-sm text-slate-100/95 leading-relaxed">
                “{t.quote}”
              </p>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">{t.name}</p>
                <p className="text-[11px] text-slate-300">
                  {t.role} · {t.sport}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1 text-[10px] text-emerald-200 text-right leading-snug">
                {t.highlight}
              </span>
            </div>
          </SurfaceB>
        ))}
      </div>
    </Section>
  );
};

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      title="Clear answers before you commit."
      kicker="The goal is trust through clarity — not over-explaining."
      align="left"
    >
      <div className="grid gap-4 md:grid-cols-[1fr,0.9fr] items-start">
        <div className="space-y-3">
          {FAQ.map((item, idx) => {
            const open = openIndex === idx;
            return (
              <SurfaceB key={item.q} className="p-5 md:p-6">
                <button
                  type="button"
                  onClick={() => setOpenIndex((cur) => (cur === idx ? null : idx))}
                  className="w-full text-left flex items-start justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-2xl"
                  aria-expanded={open}
                >
                  <div className="text-sm md:text-base font-semibold text-white">
                    {item.q}
                  </div>
                  <div className="mt-0.5 rounded-xl border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-slate-200">
                    {open ? "–" : "+"}
                  </div>
                </button>
                {open && (
                  <p className="mt-3 text-[11px] md:text-sm text-slate-200/90 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </SurfaceB>
            );
          })}
        </div>

        <SurfaceC className="p-5 md:p-6">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300 mb-2">
            Ready?
          </div>
          <div className="text-xl md:text-2xl font-semibold text-white tracking-tight">
            Use it before your next session.
          </div>
          <p className="mt-2 text-[11px] md:text-sm text-slate-200/90 leading-relaxed">
            The fastest way to build a mental edge is to train one routine for
            one moment — then repeat.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <PrimaryButton href={OPEN_APP_URL} ariaLabel="Open Dr. Brett GPT now">
              <span>Open BGPT</span>
              <span className="text-lg leading-none">↗</span>
            </PrimaryButton>
            <SecondaryButton href={PRICING_URL} ariaLabel="See pricing">
              <span>Pricing / Access</span>
            </SecondaryButton>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-slate-300">
            Privacy note: keep sessions private by default and let users delete
            them.
          </div>
        </SurfaceC>
      </div>
    </Section>
  );
};

const FinalCTASection: React.FC<{ onWatchDemo: () => void }> = ({ onWatchDemo }) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section id="start" ref={ref} className="relative py-16 md:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.10),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.10),transparent_55%)] opacity-80" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SurfaceC
          className={`p-6 md:p-8 lg:p-10 ${
            inView
              ? "animate-[slideUpSoft_0.9s_ease-out_forwards]"
              : "opacity-0 translate-y-6"
          }`}
        >
          <div className="grid gap-6 md:grid-cols-[1.1fr,1fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 border border-white/10 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.22em] text-slate-200">
                  Start now
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-[-0.02em] mb-3">
                One routine. One moment. Big shift.
              </h2>

              <p className="text-sm md:text-base text-slate-200/90 leading-relaxed mb-4">
                Don’t redesign your whole mindset. Start with the exact moment
                you tighten — and train a response you can trust.
              </p>

              <ul className="space-y-2 text-[11px] md:text-sm text-slate-200/90 mb-4">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Describe your moment (mistake, clutch, anxiety, injury return).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                  <span>Get a routine (reset / script / if-then plan).</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Rehearse it in practice so it shows up in games.</span>
                </li>
              </ul>

              <div className="text-[11px] text-slate-300">
                Minimal disclaimers: performance coaching only. Not for emergencies.
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <PrimaryButton href={OPEN_APP_URL} ariaLabel="Open Dr. Brett GPT app">
                <span>Open BGPT</span>
                <span className="text-lg leading-none">↗</span>
              </PrimaryButton>
              <SecondaryButton onClick={onWatchDemo} ariaLabel="Watch demo">
                <span>Watch 45s demo</span>
                <span className="text-base leading-none">▶</span>
              </SecondaryButton>

              <div className="rounded-2xl bg-black/40 border border-white/10 px-3.5 py-3 text-[11px] md:text-xs text-slate-200/90 leading-relaxed">
                <span className="font-semibold text-slate-50">Tip:</span> Put your
                routine on a note card and rehearse it 5 times in warm-up.
              </div>
            </div>
          </div>
        </SurfaceC>
      </div>
    </section>
  );
};

/* ----------------------------- Nav + Background ----------------------------- */

const TopNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 14);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-xl" : "backdrop-blur-none"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`mt-3 flex items-center justify-between gap-4 rounded-2xl border ${
            scrolled
              ? "border-white/10 bg-black/65 shadow-lg shadow-black/35"
              : "border-white/8 bg-black/35 shadow-sm shadow-black/25"
          } px-3 py-2 md:px-4 transition-all duration-300 ${
            scrolled ? "py-2" : "py-2.5"
          }`}
        >
          <a
            href="#top"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-2xl"
          >
            <img
              src="https://i.ibb.co/BVX6yYXg/BGPT-secondary-logo-or-icon.png"
              alt="BGPT logo"
              className={`rounded-2xl border border-white/10 shadow-sm object-cover transition-all duration-300 ${
                scrolled ? "h-7 w-7" : "h-8 w-8"
              }`}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-xs md:text-sm font-semibold text-white tracking-[-0.01em]">
                BGPT
              </span>
              <span className="text-[10px] md:text-[11px] text-slate-300">
                Mental performance coach
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-4 text-[11px] text-slate-200">
            <a href="#results" className="hover:text-white transition-colors duration-150">
              Proof
            </a>
            <a href="#moments" className="hover:text-white transition-colors duration-150">
              Moments
            </a>
            <a href="#deliverables" className="hover:text-white transition-colors duration-150">
              What you get
            </a>
            <a href="#framework" className="hover:text-white transition-colors duration-150">
              Framework
            </a>
            <a href="#faq" className="hover:text-white transition-colors duration-150">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={PRICING_URL}
              className="hidden sm:inline-flex rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Pricing
            </a>

            {!user ? (
              <>
                <a
                  href={LOGIN_URL}
                  className="hidden sm:inline-flex rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Log in
                </a>

                <a
                  href={SIGNUP_URL}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-purple-500 to-sky-400 px-3.5 py-2 text-[11px] font-medium text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-400/45 hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                >
                  <span>Get started</span>
                  <span className="text-base leading-none">↗</span>
                </a>
              </>
            ) : (
              <div className="relative group">
                <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-slate-200 hover:bg-black/60 focus:outline-none">
                  <span className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-sky-400 flex items-center justify-center text-[10px] font-semibold text-white">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">Account</span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-xl opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => router.push("/profile")}
                    className="block w-full px-4 py-2 text-left text-[11px] text-slate-200 hover:bg-white/[0.06]"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => router.push("/account")}
                    className="block w-full px-4 py-2 text-left text-[11px] text-slate-200 hover:bg-white/[0.06]"
                  >
                    Account
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.refresh();
                    }}
                    className="block w-full px-4 py-2 text-left text-[11px] text-red-300 hover:bg-red-500/10"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const Background: React.FC = () => {
  const scrollProgress = useScrollProgress();
  const style = useMemo<React.CSSProperties>(() => {
    const opacity = 0.18 + scrollProgress * 0.35;
    const rotation = scrollProgress * 10;
    return { opacity, transform: `rotate(${rotation}deg)` };
  }, [scrollProgress]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.92),rgba(15,23,42,1))]" />

      {/* Reduced blur, more shape identity */}
      <div
        className="absolute -left-28 top-12 h-60 w-60 rounded-[3rem] border border-purple-500/30 bg-gradient-to-br from-purple-500/24 via-sky-500/10 to-transparent mix-blend-screen"
        style={style}
      />
      <div
        className="absolute -right-16 bottom-10 h-60 w-60 rounded-[3rem] border border-sky-400/30 bg-gradient-to-tl from-sky-400/22 via-emerald-400/10 to-transparent mix-blend-screen"
        style={style}
      />

      <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-black via-slate-950/70 to-transparent" />
    </div>
  );
};

/* ----------------------------- Footer (Reduced disclaimers) ----------------------------- */

const Footer: React.FC = () => {
  return (
    <footer className="relative border-t border-white/6 bg-gradient-to-b from-slate-950 to-black py-8 md:py-10">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <img
              src="https://i.ibb.co/BVX6yYXg/BGPT-secondary-logo-or-icon.png"
              alt="BGPT logo"
              className="h-7 w-7 rounded-2xl border border-white/10 object-cover"
            />
            <span className="text-xs md:text-sm font-semibold text-white">
              BGPT
            </span>
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 max-w-md leading-relaxed">
            Performance coaching tools for pressure moments. Privacy-first by
            design.
          </p>
          <p className="mt-2 text-[10px] text-slate-500">
            Not for emergencies. If you’re in crisis, contact local support.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex flex-wrap gap-3">
            <a
              href="#moments"
              className="text-[11px] md:text-xs text-slate-300 hover:text-white underline/50 decoration-slate-600 hover:decoration-slate-200"
            >
              Moments
            </a>
            <a
              href="#deliverables"
              className="text-[11px] md:text-xs text-slate-300 hover:text-white underline/50 decoration-slate-600 hover:decoration-slate-200"
            >
              What you get
            </a>
            <a
              href="#faq"
              className="text-[11px] md:text-xs text-slate-300 hover:text-white underline/50 decoration-slate-600 hover:decoration-slate-200"
            >
              FAQ
            </a>
            <a
              href={OPEN_APP_URL}
              className="text-[11px] md:text-xs text-slate-300 hover:text-white underline/50 decoration-slate-600 hover:decoration-slate-200"
            >
              Open BGPT
            </a>
          </div>
          <p className="text-[10px] text-slate-500">
            © 2025 Dr. Brett GPT · All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

/* ----------------------------- App ----------------------------- */

const App: React.FC = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  const openDemo = useCallback(() => setDemoOpen(true), []);
  const closeDemo = useCallback(() => setDemoOpen(false), []);

  return (
    <main id="top" className="min-h-screen bg-slate-950 text-slate-50">
      <Background />
      <TopNav />

      <HeroSection onWatchDemo={openDemo} />

      <SoftDivider label="PROOF" />
      <StatsSection />

      <SoftDivider label="MOMENTS" />
      <MomentsSection />

      <SoftDivider label="OUTPUTS" />
      <DeliverablesSection />

      <SoftDivider label="FRAMEWORK" />
      <FrameworkSection />

      <SoftDivider label="STORIES" />
      <StoriesSection />

      <SoftDivider label="FAQ" />
      <FAQSection />

      <FinalCTASection onWatchDemo={openDemo} />

      <Footer />

      <Modal open={demoOpen} onClose={closeDemo} title="Dr. Brett GPT — 45 second demo">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60">
          {/* Replace with your own player; this is safe default */}
          <video
            src={WATCH_DEMO_URL}
            controls
            className="h-full w-full"
            poster="" // optional thumbnail
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300">
            Want this exact flow? Open the app and start a session.
          </div>
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={closeDemo}>Close</SecondaryButton>
            <PrimaryButton href={OPEN_APP_URL}>Open Dr. Brett GPT ↗</PrimaryButton>
          </div>
        </div>
      </Modal>
    </main>
  );
};

export default App;

/* -----------------------------------------------------------------------------
  Animations (Tailwind arbitrary names used above)
  Keep these minimal for performance.
----------------------------------------------------------------------------- */

/* 
  NOTE: In Tailwind, keyframes would typically live in tailwind.config.
  But since you’re running arbitrary animation names already,
  ensure these exist in your global CSS if needed:

  @keyframes slideUpSoft {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInSoft {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
*/
