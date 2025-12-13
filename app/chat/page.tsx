"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type Fundamental = "Presence" | "Patience" | "Perspective" | "Poise" | "Perseverance";
type Tone = "celebrate" | "reframe" | "steady";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number; // epoch ms
  meta?: {
    fundamental?: Fundamental;
    label?: string; // small tag like "Reset" / "Clutch"
    tone?: Tone;
  };
};

type Session = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

const BRAND = {
  name: "Dr. Brett GPT",
  subtitle: "Mental game coach for athletes",
};

/**
 * Reduced quick actions: 3 (more room for sessions list)
 * Keep the most-used / highest-value:
 * - Reset (after mistake)
 * - Clutch (late-game)
 * - Post-game review
 */
const QUICK_ACTIONS: Array<{
  k: string;
  title: string;
  prompt: string;
  tag: string;
  fundamental: Fundamental;
}> = [
  {
    k: "reset",
    title: "90s Reset (after mistake)",
    prompt:
      "Build me a 90-second reset routine I can run after a mistake. My sport is ___. The moment I struggle most is ___.",
    tag: "Reset",
    fundamental: "Presence",
  },
  {
    k: "clutch",
    title: "Clutch cue (late-game)",
    prompt:
      "Late in games I rush decisions. Give me one cue + one breath pattern + one next-action focus for the next play.",
    tag: "Clutch",
    fundamental: "Poise",
  },
  {
    k: "review",
    title: "5-min post-game review",
    prompt:
      "Guide me through a 5-minute post-game review. Today I did ___. I struggled with ___. One thing I’ll practice is ___.",
    tag: "Review",
    fundamental: "Perspective",
  },
];

/** ---------------- Storage ---------------- */
const STORAGE_KEY = "bgpt_chat_v1";

/** ---------------- Build-safe deterministic ID helpers ---------------- */
let __uidCounter = 0;
/** Render-safe deterministic ID (no random/Date/crypto) */
function uid(prefix = "x") {
  __uidCounter = (__uidCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_static_${__uidCounter.toString(16)}`;
}
/** Runtime ID (event handlers / effects only) */
function rid(prefix = "m") {
  const c = (globalThis as any)?.crypto as Crypto | undefined;
  if (c?.randomUUID) return `${prefix}_${c.randomUUID()}`;

  __uidCounter = (__uidCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_${__uidCounter.toString(16)}`;
}

function formatTime(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function pickFundamental(text: string): Fundamental {
  const t = text.toLowerCase();
  if (/(anxious|nervous|racing|overthink|mind|future|panic)/.test(t)) return "Presence";
  if (/(rush|hurry|force|now|impatient|quick|fast)/.test(t)) return "Patience";
  if (/(bigger|season|long-term|story|perspective|career)/.test(t)) return "Perspective";
  if (/(pressure|clutch|late|tight|choke|4th|final|min|close game)/.test(t)) return "Poise";
  if (/(slump|stuck|again|quit|hard|confidence|down|spiral)/.test(t)) return "Perseverance";
  return "Poise";
}

function detectTone(text: string): Tone {
  const t = text.toLowerCase();
  const win =
    /(won|win|crushed|great|best|proud|good game|played well|nailed|improved|dominated|personal best|pb)/.test(t);
  const loss =
    /(lost|loss|terrible|awful|hate|failed|embarrass|choked|disappointed|bummed|frustrated|angry)/.test(t);
  if (win && !loss) return "celebrate";
  if (loss) return "reframe";
  return "steady";
}

/** ---------------- Interactive background ----------------
 * - Pointer-follow radial lights via CSS variables (--mx/--my)
 * - Gentle ambient drift so mobile still feels alive
 * - Respects prefers-reduced-motion
 * - Fixed layer ensures background never “cuts off” at page bottom
 */
function useInteractiveBackground() {
  useEffect(() => {
    const root = document.documentElement;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Set defaults so it looks good before first mouse move
    root.style.setProperty("--mx", "50%");
    root.style.setProperty("--my", "18%");

    // Ambient drift (works even without mouse). Keep subtle.
    let raf = 0;
    let t0 = performance.now();
    const drift = () => {
      const t = (performance.now() - t0) / 1000;
      // gentle slow movement in a small range
      const x = 50 + Math.sin(t * 0.18) * 6;
      const y = 18 + Math.cos(t * 0.14) * 5;
      // Only apply drift if user hasn't moved mouse recently
      if (prefersReduced) return;
      root.style.setProperty("--dx", `${x}%`);
      root.style.setProperty("--dy", `${y}%`);
      raf = requestAnimationFrame(drift);
    };

    // Pointer follow (smoothed)
    let targetX = 0.5;
    let targetY = 0.18;
    let currentX = 0.5;
    let currentY = 0.18;
    let lastPointerAt = 0;

    const onMove = (e: PointerEvent) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      targetX = Math.min(0.98, Math.max(0.02, e.clientX / w));
      targetY = Math.min(0.98, Math.max(0.02, e.clientY / h));
      lastPointerAt = performance.now();
    };

    const animate = () => {
      // Ease towards target
      const ease = 0.10;
      currentX = currentX + (targetX - currentX) * ease;
      currentY = currentY + (targetY - currentY) * ease;

      // If no pointer activity recently, blend toward drift position (dx/dy)
      const idle = performance.now() - lastPointerAt > 2500;
      if (idle && !prefersReduced) {
        const dx = parseFloat(getComputedStyle(root).getPropertyValue("--dx")) || 50;
        const dy = parseFloat(getComputedStyle(root).getPropertyValue("--dy")) || 18;
        const driftX = dx / 100;
        const driftY = dy / 100;
        currentX = currentX + (driftX - currentX) * 0.02;
        currentY = currentY + (driftY - currentY) * 0.02;
      }

      root.style.setProperty("--mx", `${Math.round(currentX * 1000) / 10}%`);
      root.style.setProperty("--my", `${Math.round(currentY * 1000) / 10}%`);

      raf = requestAnimationFrame(animate);
    };

    // Start drift + animation
    if (!prefersReduced) {
      raf = requestAnimationFrame(drift);
    }
    raf = requestAnimationFrame(animate);

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/** ---------------- Minimal local “coach brain” with tone branching ---------------- */
function coachReply(userText: string): { content: string; fundamental: Fundamental; label: string; tone: Tone } {
  const f = pickFundamental(userText);
  const tone = detectTone(userText);

  const header: Record<Fundamental, string> = {
    Presence: "Presence: bring attention back to what’s real, right now.",
    Patience: "Patience: slow the game down and trust the process.",
    Perspective: "Perspective: widen the lens so one moment doesn’t define you.",
    Poise: "Poise: calm execution under pressure.",
    Perseverance: "Perseverance: keep showing up with structure, not emotion.",
  };

  const labelByF: Record<Fundamental, string> = {
    Presence: "Reset",
    Patience: "Tempo",
    Perspective: "Review",
    Poise: "Clutch",
    Perseverance: "Plan",
  };

  const baseByF: Record<Fundamental, string[]> = {
    Presence: [
      "Here’s a simple reset you can run in the moment:",
      "1) **Exhale long** (6–8s). Shoulders down.",
      "2) **Name what’s true**: “Next play.”",
      "3) **One job**: pick the *next controllable action* (footwork / first step / target).",
      "",
      "Quick check: what sport + what’s the exact situation where this shows up most?",
    ],
    Patience: [
      "Your skill is there — the leak is rushing the sequence.",
      "Try this **3-step tempo cue** for the next rep:",
      "1) **See it** (one clear picture).",
      "2) **Breathe** (one slow exhale).",
      "3) **Do it** (commit to the first action only).",
      "",
      "Tell me: what’s the *first* action you need to execute (first step / first read / first touch)?",
    ],
    Perspective: [
      "Let’s separate the moment from the meaning.",
      "Run this quick review (2 minutes):",
      "- What happened (facts only)?",
      "- What did you control well?",
      "- What’s one adjustment you’ll practice this week?",
      "",
      "If you share the one moment you want back, I’ll turn it into a repeatable cue.",
    ],
    Poise: [
      "Late-game pressure is a **Poise** problem: calm body → clear decision → clean action.",
      "Use this **Clutch Protocol (15 seconds)**:",
      "1) **Exhale** (slow).",
      "2) **Cue**: “Smooth + simple.”",
      "3) **Narrow focus**: only the next read or next step.",
      "",
      "What usually breaks first for you — breathing, legs, or decision speed?",
    ],
    Perseverance: [
      "Confidence comes back fastest with a small, repeatable plan.",
      "For the next 7 days:",
      "- 10 minutes fundamentals (same drill daily)",
      "- 3 reps under pressure (timer / consequence)",
      "- 60-second reflection: what worked, what to repeat",
      "",
      "What’s your current level + how many minutes/day can you realistically commit?",
    ],
  };

  const celebrateOverlay: string[] = [
    "Good. Don’t rush past that.",
    "A real win isn’t just the scoreboard — it’s the moment you stayed composed when it mattered.",
    "",
    "## Lock it in (so it’s repeatable)",
    "- What was the exact moment (time + situation)?",
    "- What did your body feel like (breath / jaw / shoulders)?",
    "- What was your one cue or thought?",
    "",
    "Tell me your sport and the moment — I’ll turn it into a 15-second routine you can reuse.",
  ];

  const reframeOverlay: string[] = [
    "I hear the frustration. That sting is normal when effort is high.",
    "We’re going to extract one lesson without turning it into a story about you as a person.",
    "",
    "## Quick reframe (2 minutes)",
    "- One moment you want back (specific).",
    "- One thing you did well that you’ll keep.",
    "- One adjustment you’ll practice this week.",
    "",
    "Share the moment you want back and I’ll build a reset so that pattern doesn’t repeat.",
  ];

  const lines: string[] = [];
  lines.push(`**${header[f]}**`, "");

  if (tone === "celebrate") {
    lines.push(...celebrateOverlay, "", "## Keep it simple for next time", ...shallowTool(baseByF[f]));
  } else if (tone === "reframe") {
    lines.push(...reframeOverlay, "", "## One clean step forward", ...shallowTool(baseByF[f]));
  } else {
    lines.push(...baseByF[f]);
  }

  return { content: lines.join("\n"), fundamental: f, label: labelByF[f], tone };
}

function shallowTool(lines: string[]): string[] {
  const compact: string[] = [];
  let nonEmpty = 0;

  for (const l of lines) {
    if (l.trim()) nonEmpty++;
    if (nonEmpty <= 7) compact.push(l);
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l.endsWith("?")) {
      if (!compact.includes(lines[i])) compact.push("", lines[i]);
      break;
    }
  }
  return compact;
}

/** ---------------- Seed data (deterministic: NO Date/crypto) ---------------- */
function seedSessionStatic(): Session {
  return {
    id: uid("sess"),
    title: "Session: Today",
    updatedAt: 0,
    messages: [
      {
        id: uid("sys"),
        role: "system",
        content: "Private coaching session. Keep answers practical and athlete-friendly.",
        createdAt: 0,
      },
      {
        id: uid("a"),
        role: "assistant",
        content: "Tell me what you’re training today — pressure, confidence, focus, or bounce-back.",
        createdAt: 0,
        meta: { fundamental: "Poise", label: "Start", tone: "steady" },
      },
      {
        id: uid("u"),
        role: "user",
        content: "Late in games I start thinking ahead, my legs feel heavy, and I rush decisions.",
        createdAt: 0,
      },
    ],
  };
}

/** ---------------- API seam (non-streaming now; streaming stub) ---------------- */
type ChatResponderMode = "local" | "api";

/**
 * Set NEXT_PUBLIC_CHAT_RESPONDER="api" to use /api/chat.
 * Defaults to local demo responder.
 */
function getResponderMode(): ChatResponderMode {
  const v = (process.env.NEXT_PUBLIC_CHAT_RESPONDER || "").toLowerCase();
  return v === "api" ? "api" : "local";
}

async function callApiChatNonStreaming(payload: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { reply?: string; content?: string };
  const reply = data.reply ?? data.content;
  if (!reply) throw new Error("No reply returned from /api/chat");
  return reply;
}

async function callApiChatStreaming(_payload: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  onToken: (token: string) => void;
}) {
  throw new Error("Streaming not implemented yet.");
}

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** ---------------- Assistant block rendering ---------------- */
type RenderBlock =
  | { kind: "h"; text: string }
  | { kind: "p"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseAssistantBlocks(text: string): RenderBlock[] {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const blocks: RenderBlock[] = [];

  let ul: string[] = [];
  let ol: string[] = [];

  const flushLists = () => {
    if (ul.length) {
      blocks.push({ kind: "ul", items: ul });
      ul = [];
    }
    if (ol.length) {
      blocks.push({ kind: "ol", items: ol });
      ol = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushLists();
      continue;
    }

    if (line.startsWith("## ")) {
      flushLists();
      blocks.push({ kind: "h", text: line.replace(/^##\s+/, "") });
      continue;
    }

    if (line.startsWith("> ")) {
      flushLists();
      blocks.push({ kind: "quote", text: line.replace(/^>\s+/, "") });
      continue;
    }

    const olMatch = line.match(/^\d+(\)|\.)\s+(.*)$/);
    if (olMatch) {
      ol.push(olMatch[2]);
      continue;
    }

    if (line.startsWith("- ")) {
      ul.push(line.replace(/^- /, ""));
      continue;
    }

    flushLists();
    blocks.push({ kind: "p", text: line });
  }

  flushLists();
  return blocks;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts: Array<{ t: string; bold: boolean }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = re.lastIndex;
    if (start > last) parts.push({ t: text.slice(last, start), bold: false });
    parts.push({ t: m[1], bold: true });
    last = end;
  }
  if (last < text.length) parts.push({ t: text.slice(last), bold: false });

  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-semibold text-slate-100">
            {p.t}
          </strong>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )}
    </>
  );
}

/** ---------------- localStorage helpers ---------------- */
function readStorage(): { sessions: Session[]; activeId: string } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessions?: Session[]; activeId?: string };
    if (!parsed.sessions?.length || !parsed.activeId) return null;
    return { sessions: parsed.sessions, activeId: parsed.activeId };
  } catch {
    return null;
  }
}

function writeStorage(data: { sessions: Session[]; activeId: string }) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** ---------------- Page ---------------- */
export default function ChatPage() {
  useInteractiveBackground();

  const responderMode = useMemo(getResponderMode, []);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Render-safe initial state (static seed)
  const [sessions, setSessions] = useState<Session[]>(() => [seedSessionStatic()]);
  const [activeId, setActiveId] = useState<string>(() => seedSessionStatic().id);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);

  // Hydrate from localStorage (client-only), otherwise convert seed to runtime ids/timestamps.
  useEffect(() => {
    const now = Date.now();

    const fromStorage = readStorage();
    if (fromStorage) {
      setSessions(fromStorage.sessions);
      setActiveId(fromStorage.activeId);
      return;
    }

    const seeded = seedSessionStatic();
    const hydrated: Session = {
      ...seeded,
      id: rid("sess"),
      updatedAt: now - 2 * 60_000,
      messages: seeded.messages.map((m, idx) => ({
        ...m,
        id: rid(m.role === "assistant" ? "a" : m.role === "user" ? "u" : "sys"),
        createdAt: now - (10 - idx) * 60_000,
      })),
    };

    setSessions([hydrated]);
    setActiveId(hydrated.id);
    writeStorage({ sessions: [hydrated], activeId: hydrated.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist changes (debounced)
  useEffect(() => {
    if (activeId.includes("_static_")) return;

    const t = window.setTimeout(() => {
      writeStorage({ sessions, activeId });
    }, 150);

    return () => window.clearTimeout(t);
  }, [sessions, activeId]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  const lastUser = useMemo(() => {
    const ms = active?.messages ?? [];
    for (let i = ms.length - 1; i >= 0; i--) if (ms[i].role === "user") return ms[i].content;
    return "";
  }, [active]);

  const focusFundamental = useMemo(() => (lastUser ? pickFundamental(lastUser) : "Poise"), [lastUser]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active?.messages?.length, isTyping]);

  function newSession() {
    const now = Date.now();
    const s: Session = {
      id: rid("sess"),
      title: "New session",
      updatedAt: now,
      messages: [
        {
          id: rid("sys"),
          role: "system",
          content: "Private coaching session. Keep answers practical and athlete-friendly.",
          createdAt: now,
        },
        {
          id: rid("a"),
          role: "assistant",
          content: "What’s the situation you want to handle better — and when does it show up?",
          createdAt: now,
          meta: { fundamental: "Presence", label: "Start", tone: "steady" },
        },
      ],
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  }

  function applyQuick(prompt: string) {
    setInput(prompt);
  }

  function resetActive() {
    if (!active) return;
    const now = Date.now();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: now,
              messages: [
                {
                  id: rid("sys"),
                  role: "system",
                  content: "Private coaching session. Keep answers practical and athlete-friendly.",
                  createdAt: now,
                },
                {
                  id: rid("a"),
                  role: "assistant",
                  content: "What’s the situation you want to handle better — and when does it show up?",
                  createdAt: now,
                  meta: { fundamental: "Poise", label: "Start", tone: "steady" },
                },
              ],
            }
          : s
      )
    );
    setIsTyping(false);
    setInput("");
  }

  function buildApiPayloadMessages(session: Session) {
    const all = session.messages.map((m) => ({ role: m.role, content: m.content }));
    const system = all.find((m) => m.role === "system");
    const rest = all.filter((m) => m.role !== "system").slice(-20);
    return [...(system ? [system] : []), ...rest] as Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
  }

  async function send() {
    if (isTyping) return;

    const text = input.trim();
    if (!text || !active) return;

    setInput("");

    const now = Date.now();
    const userMsg: Message = { id: rid("u"), role: "user", content: text, createdAt: now };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: now,
              messages: [...s.messages, userMsg],
              title: s.title === "New session" ? "Session: Training" : s.title,
            }
          : s
      )
    );

    setIsTyping(true);

    try {
      if (responderMode === "api") {
        const payload = {
          messages: buildApiPayloadMessages({ ...active, messages: [...active.messages, userMsg] }),
        };
        const replyText = await callApiChatNonStreaming(payload);

        const assistantMsg: Message = {
          id: rid("a"),
          role: "assistant",
          content: replyText,
          createdAt: Date.now(),
          meta: {
            fundamental: pickFundamental(replyText),
            label: "Coach",
            tone: detectTone(text),
          },
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === active.id ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMsg] } : s
          )
        );
      } else {
        await new Promise((r) => setTimeout(r, Math.min(1400, 650 + text.length * 8)));

        const reply = coachReply(text);
        const assistantMsg: Message = {
          id: rid("a"),
          role: "assistant",
          content: reply.content,
          createdAt: Date.now(),
          meta: { fundamental: reply.fundamental, label: reply.label, tone: reply.tone },
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === active.id ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMsg] } : s
          )
        );
      }
    } catch {
      const assistantMsg: Message = {
        id: rid("a"),
        role: "assistant",
        createdAt: Date.now(),
        content:
          "I couldn’t reach the server just now. Try again in a moment — and if it keeps happening, we’ll check the API route and environment variables.",
        meta: { fundamental: "Poise", label: "Error", tone: "steady" },
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === active.id ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMsg] } : s
        )
      );
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      {/* Fixed interactive gradient background — never “cuts off” */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Base wash */}
        <div className="absolute inset-0 bg-[#0b0f19]" />

        {/* Pointer-follow light */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(900px circle at var(--mx) var(--my), rgba(90,79,246,0.18), transparent 55%)",
          }}
        />
        {/* Secondary soft light (drift blend) */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(820px circle at calc(var(--mx) + 18%) calc(var(--my) + 14%), rgba(58,166,255,0.14), transparent 58%)",
          }}
        />
        {/* Warm accent */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(760px circle at calc(var(--mx) - 18%) calc(var(--my) + 44%), rgba(244,197,66,0.10), transparent 60%)",
          }}
        />
        {/* Texture layer */}
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_30%,rgba(255,255,255,0.03))]" />
        {/* Subtle grain */}
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.65)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1400px]">
        {/* Sidebar */}
        <aside
          className={[
            "hidden lg:flex h-screen w-[320px] shrink-0 flex-col border-r border-white/10 bg-black/10 backdrop-blur-xl",
            sidebarOpen ? "" : "w-0 overflow-hidden opacity-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold ring-1 ring-white/10">
                BG
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">{BRAND.name}</div>
                <div className="text-[11px] text-slate-400">{BRAND.subtitle}</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
            >
              Collapse
            </button>
          </div>

          {/* Make the middle area scroll internally so sessions don't “push” layout */}
          <div className="flex min-h-0 flex-1 flex-col px-5">
            <button
              onClick={newSession}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-left text-[12px] font-semibold hover:bg-white/15"
            >
              + New session
            </button>

            <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
              <div>
                <div className="mb-2 text-[11px] font-semibold text-slate-300">Sessions</div>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveId(s.id)}
                      className={[
                        "w-full rounded-xl border border-white/10 px-3 py-2 text-left hover:bg-white/5",
                        s.id === activeId ? "bg-white/10" : "bg-black/15",
                      ].join(" ")}
                    >
                      <div className="text-[12px] font-semibold text-slate-100 line-clamp-1">{s.title}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        Updated {s.updatedAt ? formatTime(s.updatedAt) : "—"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[11px] font-semibold text-slate-300">Quick actions</div>
                <div className="space-y-2">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.k}
                      onClick={() => applyQuick(a.prompt)}
                      className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-left hover:bg-white/5"
                      title={a.prompt}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-semibold text-slate-100">{a.title}</div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                          {a.fundamental}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-1 text-[10px] text-slate-400">{a.tag}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 pt-4">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="text-[11px] font-semibold text-slate-300">Safety</div>
              <div className="mt-2 text-[11px] leading-5 text-slate-400">
                Coaching only — not medical care. If you’re in crisis, seek immediate local professional help.
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="relative z-10 flex min-h-screen flex-1 flex-col min-w-0">
          {/* Top bar */}
          <div className="sticky top-0 z-20 border-b border-white/10 bg-black/10 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="hidden lg:inline-flex rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
                  >
                    Sidebar
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                  <span className="text-[11px] text-slate-300">
                    {BRAND.name} <span className="text-slate-500">•</span>{" "}
                    <span className="text-slate-400">{isTyping ? "Thinking…" : "Online"}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetActive}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/10"
                >
                  Reset chat
                </button>
                <a
                  href="/"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/10"
                >
                  Home
                </a>
              </div>
            </div>
          </div>

          {/* Make this area own the scroll; prevents “bottom fade/flat” issues */}
          <div className="mx-auto flex w-full max-w-[1100px] flex-1 gap-6 px-4 py-6 md:px-6 min-h-0 overflow-hidden">
            {/* Chat column */}
            <section className="flex min-w-0 flex-1 flex-col min-h-0">
              {/* Fundamentals strip */}
              <div className="mb-4 flex flex-wrap gap-2">
                {(["Presence", "Poise", "Patience", "Perspective", "Perseverance"] as Fundamental[]).map((f) => (
                  <span
                    key={f}
                    className={[
                      "rounded-full border border-white/10 px-3 py-1 text-[11px]",
                      f === focusFundamental ? "bg-white/10 text-slate-100" : "bg-white/5 text-slate-300",
                    ].join(" ")}
                    title={f}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* Messages */}
              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/10 backdrop-blur-xl"
              >
                <div className="space-y-4 p-4 md:p-5">
                  {(active?.messages ?? [])
                    .filter((m) => m.role !== "system")
                    .map((m) => (
                      <ChatRow key={m.id} message={m} />
                    ))}

                  {isTyping && (
                    <div className="flex gap-3">
                      <Avatar label="BG" />
                      <div className="max-w-[82ch] rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-[11px] font-semibold text-slate-100">{BRAND.name}</div>
                        <div className="mt-2 space-y-2">
                          <div className="h-3 w-full rounded-full bg-white/10" />
                          <div className="h-3 w-5/6 rounded-full bg-white/10" />
                          <div className="h-3 w-2/3 rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3 backdrop-blur-xl">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onCompositionStart={() => {
                      composingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                      composingRef.current = false;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !composingRef.current) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={3}
                    placeholder="Describe the moment. Where does it break: breathing, focus, confidence, or decision speed?"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[14px] leading-6 text-slate-100 placeholder:text-slate-500 outline-none focus:border-white/20"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() || isTyping}
                    className="h-[46px] shrink-0 rounded-xl border border-white/10 bg-white/10 px-4 text-[12px] font-semibold text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.k}
                      onClick={() => applyQuick(a.prompt)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-white/10"
                    >
                      {a.tag}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Focus panel */}
            <aside className="hidden w-[320px] shrink-0 lg:block">
              <div className="sticky top-[84px] space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">Focus for this session</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-slate-100">{focusFundamental}</div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      Auto-detected
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-slate-300">
                    Keep it simple: calm body → clear next action → repeatable routine.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">How to use this GPT</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] leading-6 text-slate-300">
                    <li>Describe the exact moment (time + situation).</li>
                    <li>Say what breaks first (breath / legs / decision).</li>
                    <li>Ask for one cue + one routine you can repeat.</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">Demo mode</div>
                  <p className="mt-2 text-[12px] leading-6 text-slate-300">
                    Replies are simulated locally for design review. Later, swap the responder with{" "}
                    <code className="text-slate-200">/api/chat</code>.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

/** ---------------- UI bits ---------------- */
function Avatar({ label }: { label: string }) {
  return (
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold ring-1 ring-white/10">
      {label}
    </div>
  );
}

function ChatRow({ message }: { message: Message }) {
  const isUser = message.role === "user";

  const blocks = useMemo(() => {
    if (isUser) return null;
    return parseAssistantBlocks(message.content);
  }, [isUser, message.content]);

  return (
    <div className="flex gap-3 justify-start">
      <Avatar label={isUser ? "You" : "BG"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold text-slate-100">{isUser ? "You" : BRAND.name}</div>
            {!isUser && message.meta?.fundamental && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                {message.meta.fundamental}
              </span>
            )}
            {!isUser && message.meta?.label && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                {message.meta.label}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">{message.createdAt ? formatTime(message.createdAt) : "—"}</div>
        </div>

        <div
          className={[
            "mt-2 max-w-[82ch] rounded-2xl border border-white/10 px-4 py-3 text-[14px] leading-7",
            isUser ? "bg-white/5 text-slate-100" : "bg-black/20 text-slate-200",
          ].join(" ")}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="space-y-3">
              {blocks?.map((b, idx) => {
                if (b.kind === "h") {
                  return (
                    <div key={idx} className="text-[14px] font-semibold text-slate-100">
                      {b.text}
                    </div>
                  );
                }
                if (b.kind === "quote") {
                  return (
                    <div key={idx} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 italic text-slate-200">
                      <InlineMarkdown text={b.text} />
                    </div>
                  );
                }
                if (b.kind === "ul") {
                  return (
                    <ul key={idx} className="list-disc space-y-1 pl-5 text-slate-200">
                      {b.items.map((it, i) => (
                        <li key={i}>
                          <InlineMarkdown text={it} />
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (b.kind === "ol") {
                  return (
                    <ol key={idx} className="list-decimal space-y-1 pl-5 text-slate-200">
                      {b.items.map((it, i) => (
                        <li key={i}>
                          <InlineMarkdown text={it} />
                        </li>
                      ))}
                    </ol>
                  );
                }
                return (
                  <p key={idx} className="whitespace-pre-wrap">
                    <InlineMarkdown text={b.text} />
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
