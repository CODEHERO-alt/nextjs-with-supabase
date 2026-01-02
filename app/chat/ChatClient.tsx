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
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

const QUICK_ACTIONS: Array<{
  k: string;
  title: string;
  tag: string;
  prompt: string;
}> = [
  {
    k: "pregame",
    title: "Pre-game prep",
    tag: "Warm-up",
    prompt:
      "I have a big performance coming up. Help me build a simple pre-game mental warm-up (2–5 minutes) that gets me calm, focused, and confident.",
  },
  {
    k: "reset",
    title: "Reset after mistake",
    tag: "Reset",
    prompt:
      "I just made a mistake and I can feel myself spiraling. Give me a quick reset routine I can do in 15–30 seconds to get back into the moment.",
  },
  {
    k: "clutch",
    title: "Clutch moment",
    tag: "Clutch",
    prompt:
      "I’m entering a high-pressure moment. Give me a short, step-by-step pressure plan (breathing + cue + focus target) I can run immediately.",
  },
  {
    k: "confidence",
    title: "Confidence rebuild",
    tag: "Confidence",
    prompt:
      "My confidence is low lately. Help me rebuild it with a simple daily plan (5 minutes/day) + one mindset reframe I can use all week.",
  },
  {
    k: "review",
    title: "Post-game review",
    tag: "Review",
    prompt:
      "Help me do a short post-performance review (wins, lessons, next steps) without beating myself up. Keep it structured and practical.",
  },
];

function rid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/** ---------- Background ---------- */
function useInteractiveBackground() {
  useEffect(() => {
    const root = document.documentElement;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${x}%`);
        root.style.setProperty("--my", `${y}%`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
}

/** ---------- Storage ---------- */
const STORAGE_KEY = "dbgpt_sessions_v1";

function readStorage(): { sessions: Session[]; activeId?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorage(payload: { sessions: Session[]; activeId?: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/** ---------- Formatting ---------- */
function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDay(ts: number) {
  try {
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/** ---------- Initial Session Seed (no network) ---------- */
function seedSessionStatic(): Session {
  const now = Date.now();
  return {
    id: "seed",
    title: "New session",
    createdAt: now - 3 * 60_000,
    updatedAt: now - 1 * 60_000,
    messages: [
      {
        id: "sys_seed",
        role: "system",
        content:
          "Private coaching session. Keep answers practical, athlete-friendly, and grounded in Presence, Patience, Perspective, Poise, Perseverance.",
        createdAt: now - 3 * 60_000,
      },
      {
        id: "a_seed",
        role: "assistant",
        content:
          "Welcome. Tell me what moment you’re in right now (training, competition, work, or recovery) and what you want to feel instead.",
        createdAt: now - 2 * 60_000,
      },
      {
        id: "u_seed",
        role: "user",
        content: "I get anxious before I perform and my mind races.",
        createdAt: now - 90_000,
      },
      {
        id: "a_seed2",
        role: "assistant",
        content:
          "Got it. Here’s a 90-second reset you can run before you start:\n\n- **Presence:** exhale long (4–6 seconds) × 3. Feel your feet.\n- **Patience:** give yourself permission to be a little nervous.\n- **Perspective:** “This is energy, not danger.”\n- **Poise:** pick one simple cue word (e.g., “smooth”).\n- **Perseverance:** commit to the next rep only.\n\n**Next step:** Tell me your sport (or activity) and what triggers the anxiety most.",
        createdAt: now - 60_000,
        meta: { label: "Reset", tone: "steady" },
      },
    ],
  };
}

/** ---------- Assistant Blocks ---------- */
type AssistantBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h2"; text: string };

function parseAssistantBlocks(text: string): AssistantBlock[] {
  const lines = (text || "").split("\n").map((l) => l.trim());
  const blocks: AssistantBlock[] = [];

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

  for (const line of lines) {
    if (!line) {
      flushLists();
      continue;
    }

    // Heading
    if (/^#{2}\s+/.test(line)) {
      flushLists();
      blocks.push({ kind: "h2", text: line.replace(/^#{2}\s+/, "") });
      continue;
    }

    // UL
    if (/^[-•]\s+/.test(line)) {
      ol = [];
      ul.push(line.replace(/^[-•]\s+/, ""));
      continue;
    }

    // OL
    if (/^\d+\.\s+/.test(line)) {
      ul = [];
      ol.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushLists();
    blocks.push({ kind: "p", text: line });
  }

  flushLists();
  return blocks;
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deriveMantraFromText(text: string): string {
  const t = (text || "").trim();
  if (!t) return "Slow is smooth. Smooth is fast.";

  const nextStepLine =
    t
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /^next step[:\-]/i.test(l)) ?? "";

  if (nextStepLine) {
    return nextStepLine.replace(/^next step[:\-]\s*/i, "").replace(/\.$/, "");
  }

  const first = t.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  const cleaned = first.replace(/^##\s+/, "").replace(/\.$/, "");
  if (cleaned.length >= 8 && cleaned.length <= 80) return cleaned;

  return "Slow is smooth. Smooth is fast.";
}

function mapTagToRoutine(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes("reset")) return "Reset";
  if (t.includes("clutch")) return "Clutch";
  if (t.includes("review")) return "Post-game review";
  return titleCase(tag);
}

function deriveSessionNotesFromAssistant(text: string): string[] {
  const blocks = parseAssistantBlocks(text || "");
  const notes: string[] = [];

  // Prefer list items first
  for (const b of blocks) {
    if (b.kind === "ul" || b.kind === "ol") {
      for (const it of b.items) {
        const clean = it.trim();
        if (clean) notes.push(clean);
        if (notes.length >= 3) return notes;
      }
    }
  }

  // Fallback: take first 2-3 short paragraphs
  for (const b of blocks) {
    if (b.kind === "p") {
      const clean = b.text.trim().replace(/\.$/, "");
      if (clean.length >= 10 && clean.length <= 140) notes.push(clean);
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
      {parts.map((p, idx) =>
        p.bold ? (
          <strong key={idx} className="font-semibold text-white">
            {p.t}
          </strong>
        ) : (
          <span key={idx}>{p.t}</span>
        )
      )}
    </>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const blocks = parseAssistantBlocks(msg.content);

  const tone = msg.meta?.tone ?? "steady";
  const toneClasses =
    tone === "celebrate"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "reframe"
      ? "border-indigo-500/20 bg-indigo-500/5"
      : "border-white/10 bg-white/[0.02]";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold text-slate-300">Coach</div>
        {msg.meta?.label ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
            {msg.meta.label}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-3 text-[14px] leading-7 text-slate-100">
        {blocks.map((b, idx) => {
          if (b.kind === "h2") {
            return (
              <h3 key={idx} className="text-[13px] font-semibold text-white">
                {b.text}
              </h3>
            );
          }
          if (b.kind === "ul") {
            return (
              <ul key={idx} className="list-disc pl-5 space-y-2 text-slate-100">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <InlineMarkdown text={it} />
                  </li>
                ))}
              </ul>
            );
          }
          if (b.kind === "ol") {
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-2 text-slate-100">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <InlineMarkdown text={it} />
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <p key={idx} className="text-slate-100">
              <InlineMarkdown text={b.text} />
            </p>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: Message }) {
  return (
    <div className="ml-auto max-w-[90%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] leading-7 text-slate-100">
      <div className="text-[11px] font-semibold text-slate-300">You</div>
      <div className="mt-2 whitespace-pre-wrap">{msg.content}</div>
      <div className="mt-2 text-right text-[11px] text-slate-500">{formatTime(msg.createdAt)}</div>
    </div>
  );
}

/** ---------------- Page ---------------- */
export default function ChatPage() {
  useInteractiveBackground();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Render-safe initial state (static seed)
  const [sessions, setSessions] = useState<Session[]>(() => [seedSessionStatic()]);
  const [activeId, setActiveId] = useState<string>(() => seedSessionStatic().id);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [activeRoutine, setActiveRoutine] = useState<string>("—");
  const [mantra, setMantra] = useState<string>("Slow is smooth. Smooth is fast.");
  const [sessionNotes, setSessionNotes] = useState<string[]>([]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = readStorage();
    if (!stored?.sessions?.length) return;

    // Sanitize minimal
    const safeSessions = stored.sessions.map((s) => ({
      ...s,
      messages: (s.messages || []).map((m) => ({
        ...m,
        id: m.id || rid(m.role),
        createdAt: m.createdAt || Date.now(),
      })),
    }));
    setSessions(safeSessions);
    setActiveId(stored.activeId || safeSessions[0].id);
  }, []);

  // Persist on changes
  useEffect(() => {
    writeStorage({ sessions, activeId });
  }, [sessions, activeId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeId, sessions]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  useEffect(() => {
    if (!active) return;

    const lastAssistant = [...active.messages]
      .reverse()
      .find((m) => m.role === "assistant" && (m.content || "").trim().length > 0);

    if (!lastAssistant) return;

    setMantra(deriveMantraFromText(lastAssistant.content));
    setSessionNotes(deriveSessionNotesFromAssistant(lastAssistant.content));
  }, [activeId, active?.messages]);

  // Create a new session
  function createSession() {
    const now = Date.now();
    const s: Session = {
      id: rid("sess"),
      title: "New session",
      createdAt: now,
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
          content:
            "Welcome. Tell me the moment you’re in right now (training, competition, work, or recovery) and what you want to feel instead.",
          createdAt: now + 1,
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
    requestAnimationFrame(() => {
      const el = document.querySelector("textarea");
      (el as HTMLTextAreaElement | null)?.focus?.();
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
                  content:
                    "Reset complete. Tell me what moment you’re in right now and what you want to feel instead.",
                  createdAt: now + 1,
                  meta: { label: "Reset", tone: "steady" },
                },
              ],
            }
          : s
      )
    );
  }

  async function sendMessage() {
    const t = input.trim();
    if (!t || isTyping || !active) return;

    composingRef.current = true;

    const now = Date.now();
    const userMsg: Message = { id: rid("u"), role: "user", content: t, createdAt: now };

    setInput("");
    setIsTyping(true);

    // optimistic update
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: now,
              messages: [...s.messages, userMsg],
            }
          : s
      )
    );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...active.messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch response");
      const data = await res.json();
      const assistantText = (data?.content || data?.message || "").toString().trim();

      const assistantMsg: Message = {
        id: rid("a"),
        role: "assistant",
        content: assistantText || "I’m here. Tell me what you want to improve right now.",
        createdAt: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === active.id
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, assistantMsg],
              }
            : s
        )
      );
    } catch (e) {
      const errMsg: Message = {
        id: rid("a_err"),
        role: "assistant",
        content:
          "I hit a connection issue. Try again in a moment. If it keeps happening, refresh the page.",
        createdAt: Date.now(),
        meta: { label: "Error", tone: "reframe" },
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === active.id
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, errMsg] }
            : s
        )
      );
    } finally {
      setIsTyping(false);
      composingRef.current = false;
      requestAnimationFrame(() => {
        const el = scrollerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const groupedSessions = useMemo(() => {
    const byDay: Record<string, Session[]> = {};
    for (const s of sessions) {
      const key = formatDay(s.updatedAt);
      byDay[key] = byDay[key] || [];
      byDay[key].push(s);
    }
    return Object.entries(byDay).sort((a, b) => {
      const ta = new Date(a[0]).getTime();
      const tb = new Date(b[0]).getTime();
      return tb - ta;
    });
  }, [sessions]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px 500px at var(--mx, 50%) var(--my, 30%), rgba(99,102,241,0.20), transparent 60%), radial-gradient(900px 500px at calc(var(--mx, 50%) + 10%) calc(var(--my, 30%) + 25%), rgba(16,185,129,0.14), transparent 60%), radial-gradient(900px 500px at calc(var(--mx, 50%) - 15%) calc(var(--my, 30%) + 10%), rgba(245,158,11,0.10), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),rgba(0,0,0,0.95))]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/10"
            >
              {sidebarOpen ? "Hide" : "Show"} sessions
            </button>
            <div>
              <div className="text-[13px] font-semibold text-white">Dr. Brett GPT</div>
              <div className="text-[11px] text-slate-400">Private coaching session</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createSession}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/10"
            >
              New session
            </button>
            <button
              onClick={resetActive}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>

        <main className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* sidebar */}
          <aside
            className={[
              "rounded-2xl border border-white/10 bg-black/10 backdrop-blur-xl",
              sidebarOpen ? "block" : "hidden lg:block",
            ].join(" ")}
          >
            <div className="border-b border-white/10 p-4">
              <div className="text-[12px] font-semibold text-white">Sessions</div>
              <div className="mt-1 text-[11px] text-slate-400">
                Your conversations stay on this device.
              </div>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-auto p-3">
              {groupedSessions.map(([day, ss]) => (
                <div key={day} className="mb-4">
                  <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {day}
                  </div>
                  <div className="space-y-2">
                    {ss.map((s) => {
                      const isActive = s.id === activeId;
                      const lastUser = [...s.messages].reverse().find((m) => m.role === "user")?.content;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveId(s.id)}
                          className={[
                            "w-full rounded-xl border px-3 py-3 text-left transition",
                            isActive
                              ? "border-white/20 bg-white/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-[12px] font-semibold text-white">{s.title || "Session"}</div>
                            <div className="text-[10px] text-slate-500">{formatTime(s.updatedAt)}</div>
                          </div>
                          <div className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                            {lastUser || "New conversation"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* quick actions */}
            <div className="border-t border-white/10 p-4">
              <div className="text-[11px] font-semibold text-slate-300">Quick actions</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {QUICK_ACTIONS.slice(0, 3).map((a) => (
                  <button
                    key={a.k}
                    onClick={() => applyQuick(a.prompt, a.tag)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[12px] text-slate-200 hover:bg-white/10"
                    title={a.prompt}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{a.title}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                        {a.tag}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="text-[11px] font-semibold text-slate-300">Safety</div>
                <div className="mt-2 text-[11px] leading-5 text-slate-400">
                  Coaching only — not medical care. If you’re in crisis, seek immediate local professional help.
                  <Link href="/legal" className="ml-1 underline underline-offset-4 hover:text-white">
                    Legal disclaimer
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* main chat */}
          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-white/10 bg-black/10 backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-semibold text-white">{active?.title || "Session"}</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Grounded in Presence · Patience · Perspective · Poise · Perseverance
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2">
                    {QUICK_ACTIONS.slice(0, 3).map((a) => (
                      <button
                        key={a.k}
                        onClick={() => applyQuick(a.prompt, a.tag)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/10"
                        title={a.prompt}
                      >
                        {a.tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                ref={scrollerRef}
                className="max-h-[calc(100vh-280px)] overflow-auto px-5 py-5 space-y-4"
              >
                {active?.messages.map((m) =>
                  m.role === "assistant" ? (
                    <AssistantMessage key={m.id} msg={m} />
                  ) : m.role === "user" ? (
                    <UserMessage key={m.id} msg={m} />
                  ) : null
                )}

                {isTyping ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-[11px] font-semibold text-slate-300">Coach</div>
                    <div className="mt-3 text-[13px] text-slate-300">Thinking…</div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-white/10 px-5 py-5">
                <div className="flex items-end gap-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={3}
                    className="min-h-[52px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-[14px] leading-7 text-slate-100 placeholder:text-slate-500 outline-none focus:border-white/25"
                    placeholder="Describe the moment. What’s happening, and what do you want to feel instead?"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isTyping}
                    className={[
                      "rounded-2xl px-4 py-3 text-[13px] font-semibold transition",
                      !input.trim() || isTyping
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                        : "border border-white/15 bg-white/10 text-white hover:bg-white/15",
                    ].join(" ")}
                  >
                    Send
                  </button>
                </div>

                <div className="mt-2 text-[11px] leading-5 text-slate-500">
                  Tip: Press <span className="text-slate-300">Enter</span> to send,{" "}
                  <span className="text-slate-300">Shift+Enter</span> for a new line.
                </div>
              </div>
            </div>

            {/* Right panel — Performance Dashboard */}
            <aside className="hidden w-[360px] shrink-0 lg:block">
              <div className="sticky top-[84px] space-y-4">
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
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">
                        One calm exhale before action.
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                      <div className="text-[11px] font-semibold text-slate-200">Cue</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">
                        One word that locks you in.
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                      <div className="text-[11px] font-semibold text-slate-200">Next action</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">
                        Only the next rep/play matters.
                      </div>
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

                {/* Quick actions (dashboard-style) */}
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl">
                  <div className="text-[11px] font-semibold text-slate-300">Quick actions</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.k}
                        onClick={() => applyQuick(a.prompt, a.tag)}
                        className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-left hover:bg-white/5"
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
          </section>
        </main>
      </div>
    </div>
  );
}
