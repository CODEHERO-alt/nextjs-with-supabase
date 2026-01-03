"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type Tone = "celebrate" | "reframe" | "steady";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number; // epoch ms
  meta?: {
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
 * “Thinking stream” steps (UI-only; does NOT expose model reasoning)
 * Keep it short + neutral.
 */
const THINKING_STEPS = [
  "Thinking…",
  "Analyzing your situation…",
  "Drafting a practical response…",
] as const;

/**
 * Reduced quick actions: 3 (more room for sessions list)
 * Keep the most-used / highest-value:
 * - Reset (after mistake)
 * - Clutch (late-game)
 * - Post-game review
 */
const QUICK_ACTIONS = [
  {
    k: "mistake",
    title: "After a mistake",
    tag: "Reset",
    prompt:
      "I just made a mistake and my body tightened up. I need a quick reset routine so I can execute the next rep.",
  },
  {
    k: "clutch",
    title: "Late-game / clutch",
    tag: "Clutch",
    prompt:
      "It’s a high-pressure moment and I can feel myself thinking outcomes instead of executing. I need a short routine for this moment.",
  },
  {
    k: "injury",
    title: "Coming back from injury",
    tag: "Confidence",
    prompt:
      "I’m coming back from injury and I don’t fully trust my body yet. I need a simple routine to commit to movement again.",
  },
  {
    k: "slump",
    title: "Slump / cold streak",
    tag: "Reset",
    prompt:
      "I’m in a slump and I’m pressing. I need a routine to stop forcing and get back to clean execution.",
  },
  {
    k: "leadership",
    title: "Leadership pressure",
    tag: "Poise",
    prompt:
      "People are looking to me to lead and I can feel the pressure. I need a routine to stay composed and decisive.",
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
      const x = 50 + Math.sin(t * 0.18) * 6;
      const y = 18 + Math.cos(t * 0.14) * 5;
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
      const ease = 0.10;
      currentX = currentX + (targetX - currentX) * ease;
      currentY = currentY + (targetY - currentY) * ease;

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
        content: "What’s the situation you want to handle better — and when does it show up?",
        createdAt: 0,
        meta: { label: "Start", tone: "steady" },
      },
    ],
  };
}

/** ---------------- API seam (LIVE ONLY) ----------------
 * - Streaming enabled (client reads streamed text chunks)
 * - Cost + usage protection is enforced server-side in /api/chat (no client changes needed)
 */
async function callApiChatStreaming(payload: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  onToken: (token: string) => void;
}) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: payload.messages, stream: true }),
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!res.body) {
    throw new Error("No response body (stream unavailable).");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) payload.onToken(chunk);
  }
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

// --- B2 helpers ---
function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function mapTagToRoutine(tag: string): string {
  const t = (tag || "").toLowerCase();
  if (t.includes("reset")) return "Reset";
  if (t.includes("clutch")) return "Clutch";
  if (t.includes("review")) return "Post-game review";
  return titleCase(tag);
}

function deriveMantraFromAssistant(text: string): string {
  const t = (text || "").trim();
  if (!t) return "Slow is smooth. Smooth is fast.";

  // Prefer explicit Next step
  const next =
    t
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /^next step[:\-]/i.test(l)) || "";

  if (next) return next.replace(/^next step[:\-]\s*/i, "").replace(/\.$/, "");

  // Otherwise use first sentence (short)
  const first = t.split(/(?<=[.!?])\s+/)[0]?.trim() || "";
  const cleaned = first.replace(/^##\s+/, "").replace(/\.$/, "");
  if (cleaned.length >= 8 && cleaned.length <= 90) return cleaned;

  return "Slow is smooth. Smooth is fast.";
}

// --- B3 helper ---
function deriveSessionNotes(text: string): string[] {
  const blocks = parseAssistantBlocks(text || "");
  const notes: string[] = [];

  // Prefer bullets/numbered steps
  for (const b of blocks) {
    if (b.kind === "ul" || b.kind === "ol") {
      for (const it of b.items) {
        const clean = it.trim();
        if (clean) notes.push(clean);
        if (notes.length >= 3) return notes;
      }
    }
  }

  // Fallback: short paragraphs
  for (const b of blocks) {
    if (b.kind === "p") {
      const clean = b.text.trim().replace(/\.$/, "");
      if (clean.length >= 12 && clean.length <= 140) notes.push(clean);
      if (notes.length >= 3) return notes;
    }
  }

  return notes.slice(0, 3);
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

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Seed ONCE so ids stay consistent
  const seededRef = useRef<Session | null>(null);
  if (!seededRef.current) seededRef.current = seedSessionStatic();
  const seeded = seededRef.current;

  // Render-safe initial state (static seed)
  const [sessions, setSessions] = useState<Session[]>(() => [seeded]);
  const [activeId, setActiveId] = useState<string>(() => seeded.id);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // B2/B3 state
  const [mantra, setMantra] = useState("Slow is smooth. Smooth is fast.");
  const [activeRoutine, setActiveRoutine] = useState<string>("—");
  const [sessionNotes, setSessionNotes] = useState<string[]>([]);

  // Thinking stream state (UI-only)
  const [thinkingPhase, setThinkingPhase] = useState(0);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);

  // Track whether the user is actively scrolling; pause auto-scroll if so
  const userScrollRef = useRef<{ active: boolean; t?: number }>({ active: false });

  // Keep refs to each message container so we can scroll to the assistant reply start
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [sessionMenuOpenId, setSessionMenuOpenId] = useState<string | null>(null);

  // Hydrate from localStorage (client-only), otherwise convert seed to runtime ids/timestamps.
  useEffect(() => {
    const now = Date.now();

    const fromStorage = readStorage();
    if (fromStorage) {
      setSessions(fromStorage.sessions);
      setActiveId(fromStorage.activeId);
      return;
    }

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

  // Close session menu on outside click / escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSessionMenuOpenId(null);
    };
    const onClick = () => setSessionMenuOpenId(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, []);

  // Thinking stream ticker (UI only)
  useEffect(() => {
    if (!isTyping) return;
    setThinkingPhase(0);
    const id = window.setInterval(() => {
      setThinkingPhase((p) => (p + 1) % THINKING_STEPS.length);
    }, 700);
    return () => window.clearInterval(id);
  }, [isTyping]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  // B2/B3: auto-update mantra + notes from last assistant message in active session
  useEffect(() => {
    if (!active) return;

    const lastAssistant = [...active.messages]
      .reverse()
      .find((m) => m.role === "assistant" && (m.content || "").trim());

    if (!lastAssistant) return;

    setMantra(deriveMantraFromAssistant(lastAssistant.content));
    setSessionNotes(deriveSessionNotes(lastAssistant.content));
  }, [activeId, active?.messages]);

  function markUserScrolling() {
    userScrollRef.current.active = true;
    if (userScrollRef.current.t) window.clearTimeout(userScrollRef.current.t);
    userScrollRef.current.t = window.setTimeout(() => {
      userScrollRef.current.active = false;
    }, 1200);
  }

  function scrollToAssistantStart(messageId: string) {
    const scroller = scrollerRef.current;
    const el = msgRefs.current[messageId];
    if (!scroller || !el) return;

    // If user is actively scrolling, don't interfere
    if (userScrollRef.current.active) return;

    const box = scroller.getBoundingClientRect();
    const mbox = el.getBoundingClientRect();

    const padding = 12;
    const visibleTop = box.top + padding;
    const visibleBottom = box.bottom - padding;

    const tooLow = mbox.top > visibleBottom - 24;
    const tooHigh = mbox.top < visibleTop + 24;

    if (tooLow || tooHigh) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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
          meta: { label: "Start", tone: "steady" },
        },
      ],
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  }

  function applyQuick(prompt: string, tag?: string) {
    setInput(prompt);
    if (tag) setActiveRoutine(mapTagToRoutine(tag));

    // focus composer (safe: runs on click only)
    requestAnimationFrame(() => {
      const el = document.querySelector("textarea") as HTMLTextAreaElement | null;
      el?.focus?.();
    });
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
                  meta: { label: "Start", tone: "steady" },
                },
              ],
            }
          : s
      )
    );
    setIsTyping(false);
    setInput("");
    setActiveRoutine("—");
    setSessionNotes([]);
    setMantra("Slow is smooth. Smooth is fast.");
  }

  function deleteSession(sessionId: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      if (!next.length) {
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
              meta: { label: "Start", tone: "steady" },
            },
          ],
        };
        setActiveId(s.id);
        return [s];
      }

      if (activeId === sessionId) setActiveId(next[0].id);
      return next;
    });
    setSessionMenuOpenId(null);
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

    // Create the assistant placeholder message immediately (for streaming)
    const assistantId = rid("a");
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      meta: { label: "Coach", tone: detectTone(text) },
    };

    // Commit user message + placeholder
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: now,
              messages: [...s.messages, userMsg, assistantMsg],
              title: s.title === "New session" ? "Session: Training" : s.title,
            }
          : s
      )
    );

    setIsTyping(true);

    // Subtle scroll to the assistant start soon after it appears
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToAssistantStart(assistantId));
    });

    try {
      const payloadMessages = buildApiPayloadMessages({ ...active, messages: [...active.messages, userMsg] });

      let didFirstTokenScroll = false;

      await callApiChatStreaming({
        messages: payloadMessages,
        onToken: (token) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === active.id
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m)),
                  }
                : s
            )
          );

          // Scroll to assistant start once (after first token) for a clean “reply begins here” feel
          if (!didFirstTokenScroll) {
            didFirstTokenScroll = true;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => scrollToAssistantStart(assistantId));
            });
          }
        },
      });
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === active.id
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:
                          "I couldn’t reach the server just now. Try again in a moment — and if it keeps happening, we’ll check the API route and environment variables.",
                        meta: { label: "Error", tone: "steady" },
                      }
                    : m
                ),
              }
            : s
        )
      );

      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToAssistantStart(assistantId));
      });
    } finally {
      setIsTyping(false);
    }
  }

  return (
    // NOTE: lock to viewport height so page does not grow
    <div className="h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      {/* Fixed interactive gradient background — never “cuts off” */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0b0f19]" />
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(900px circle at var(--mx) var(--my), rgba(90,79,246,0.18), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(820px circle at calc(var(--mx) + 18%) calc(var(--my) + 14%), rgba(58,166,255,0.14), transparent 58%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(760px circle at calc(var(--mx) - 18%) calc(var(--my) + 44%), rgba(244,197,66,0.10), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_30%,rgba(255,255,255,0.03))]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.65)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* full height layout */}
      <div className="relative mx-auto flex h-screen max-w-[1500px]">
        {/* Sidebar */}
        <aside
          className={[
            "hidden lg:flex h-full w-[320px] shrink-0 flex-col border-r border-white/10 bg-black/10 backdrop-blur-xl",
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
                    <div
                      key={s.id}
                      className={[
                        "relative w-full rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5",
                        s.id === activeId ? "bg-white/10" : "bg-black/15",
                      ].join(" ")}
                    >
                      <button onClick={() => setActiveId(s.id)} className="block w-full text-left pr-8">
                        <div className="text-[12px] font-semibold text-slate-100 line-clamp-1">{s.title}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          Updated {s.updatedAt ? formatTime(s.updatedAt) : "—"}
                        </div>
                      </button>

                      {/* three-dots menu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionMenuOpenId((prev) => (prev === s.id ? null : s.id));
                        }}
                        className="absolute right-2 top-2 rounded-lg px-2 py-1 text-[12px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
                        aria-label="Session menu"
                        title="Session options"
                      >
                        ⋯
                      </button>

                      {sessionMenuOpenId === s.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-2 top-10 z-30 w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-xl shadow-lg"
                        >
                          <button
                            onClick={() => deleteSession(s.id)}
                            className="w-full px-3 py-2 text-left text-[12px] text-slate-200 hover:bg-white/5"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[11px] font-semibold text-slate-300">Quick actions</div>
                <div className="space-y-2">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.k}
                      onClick={() => applyQuick(a.prompt, a.tag)}
                      className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-left hover:bg-white/5"
                      title={a.prompt}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-semibold text-slate-100">{a.title}</div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                          {a.tag}
                        </span>
                      </div>
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
                Coaching only — not medical care. If you’re in crisis, seek immediate local professional help.{" "}
                <Link href="/legal" className="underline underline-offset-4 hover:text-white">
                  Legal disclaimer
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="relative z-10 flex h-full flex-1 flex-col min-w-0">
          {/* Top bar */}
          <div className="shrink-0 sticky top-0 z-20 border-b border-white/10 bg-black/10 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-6">
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

          {/* Two-column: Chat (left) + Panels (right) */}
          <div className="mx-auto flex w-full max-w-[1200px] flex-1 gap-6 px-4 py-6 md:px-6 min-h-0">
            {/* Chat column */}
            <section className="flex min-w-0 flex-1 flex-col min-h-0">
              {/* Messages */}
              <div
                ref={scrollerRef}
                onScroll={markUserScrolling}
                onWheel={markUserScrolling}
                onTouchMove={markUserScrolling}
                className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/10 backdrop-blur-xl"
                style={{
                  // keeps layout from shifting when scrollbar appears
                  scrollbarGutter: "stable",
                }}
              >
                <div className="space-y-4 p-4 md:p-5">
                  {(active?.messages ?? [])
                    .filter((m) => m.role !== "system")
                    .map((m) => (
                      <div
                        key={m.id}
                        ref={(el) => {
                          msgRefs.current[m.id] = el;
                        }}
                      >
                        <ChatRow message={m} />
                      </div>
                    ))}

                  {/* ChatGPT-style "thinking stream" */}
                  {isTyping && (
                    <div className="flex gap-3">
                      <Avatar label="BG" />
                      <div className="max-w-[82ch] rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="text-[11px] font-semibold text-slate-100">{BRAND.name}</div>
                        <div className="mt-2 space-y-1 text-[12px] leading-6 text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400/80" />
                            <span>{THINKING_STEPS[thinkingPhase]}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-70">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400/60" />
                            <span>{THINKING_STEPS[(thinkingPhase + 1) % THINKING_STEPS.length]}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-50">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400/40" />
                            <span>{THINKING_STEPS[(thinkingPhase + 2) % THINKING_STEPS.length]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="mt-4 shrink-0 rounded-2xl border border-white/10 bg-black/10 p-3 backdrop-blur-xl">
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
                      onClick={() => applyQuick(a.prompt, a.tag)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-white/10"
                    >
                      {a.tag}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Right panel — Performance Dashboard */}
            <aside className="hidden w-[360px] shrink-0 lg:block">
              <div
                className="sticky top-[84px] max-h-[calc(100vh-84px-24px)] overflow-y-auto space-y-4 pr-1"
                style={{ scrollbarGutter: "stable" }}
                >
                {/* Focus / Mantra */}
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-slate-300">Today’s focus</div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      Mantra
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-slate-200">{mantra}</p>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    Want a custom mantra? Use a quick action or describe the moment.
                  </p>
                </div>

                {/* Active routine */}
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-slate-300">Active routine</div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      Live
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-slate-200">{activeRoutine}</p>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    Tap a quick action to set a routine, or describe the moment.
                  </p>
                </div>

                {/* Mental Watchlist */}
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">Mental watchlist</div>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                      <div className="text-[11px] font-semibold text-slate-200">Breath</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">One calm exhale before action.</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                      <div className="text-[11px] font-semibold text-slate-200">Cue</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">One word that locks you in.</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                      <div className="text-[11px] font-semibold text-slate-200">Next action</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">Only the next rep/play matters.</div>
                    </div>
                  </div>
                </div>

                {/* Session notes */}
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">Session notes</div>

                  {sessionNotes.length ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-[12px] leading-6 text-slate-200">
                      {sessionNotes.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      Your key takeaways will appear here after the coach responds.
                    </p>
                  )}
                </div>
                
                {/* Safety (with link) */}
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">Safety</div>
                  <p className="mt-2 text-[12px] leading-6 text-slate-300">
                    Coaching only — not medical care. If you’re in crisis, seek immediate local professional help.{" "}
                    <Link href="/legal" className="underline underline-offset-4 hover:text-white">
                      Legal disclaimer
                    </Link>
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
            "mt-2 max-w-[90ch] rounded-2xl border border-white/10 px-4 py-3 text-[14px] leading-7",
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
