"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildTelemetryPayload, deriveTrackingSignals, type TrackerMessage, type TrackingSignals } from "@/lib/algorithmTracking";

type Role = "user" | "assistant" | "system";

type Agent = "coach" | "stock" | "codecheck" | "fueling" | "errortracker";

type Tone = "celebrate" | "reframe" | "steady";

const AGENTS: Array<{ id: Agent; label: string; hint: string }> = [
  { id: "coach", label: "Coach", hint: "Performance coaching" },
  { id: "stock", label: "Stock Data", hint: "Price, volume change, 1 headline" },
  { id: "codecheck", label: "Code Check", hint: "Bugs + bottlenecks only" },
  { id: "fueling", label: "Schedule Fueling", hint: "Meals + caffeine timing" },
  { id: "errortracker", label: "Error Tracker", hint: "1 repeated mistake + 1 directive" },
];

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
  name: "Performance Lab",
  subtitle: "Command Center",
  mark: "PL",
  tagline: "Real-time performance calibration",
};

const THINKING_STEPS = ["Thinking…", "Analyzing the moment…", "Drafting a precise routine…"] as const;

const QUICK_ACTIONS = [
  {
    k: "mistake",
    title: "Reset after mistake",
    tag: "Reset",
    detail: "Release tension in 8 seconds and recover the next rep.",
    prompt: "I just made a mistake and my body tightened up. I need a quick reset routine so I can execute the next rep.",
  },
  {
    k: "clutch",
    title: "Late-game lock-in",
    tag: "Clutch",
    detail: "One-breath routine to stay locked under pressure.",
    prompt:
      "It’s a high-pressure moment and I can feel myself thinking outcomes instead of executing. I need a short routine for this moment.",
  },
  {
    k: "injury",
    title: "Return from injury",
    tag: "Confidence",
    detail: "Rebuild trust and commit to movement.",
    prompt: "I’m coming back from injury and I don’t fully trust my body yet. I need a simple routine to commit to movement again.",
  },
  {
    k: "slump",
    title: "Cold streak reset",
    tag: "Recovery",
    detail: "Stop forcing and return to clean execution.",
    prompt: "I’m in a slump and I’m pressing. I need a routine to stop forcing and get back to clean execution.",
  },
  {
    k: "leadership",
    title: "Leadership pressure",
    tag: "Poise",
    detail: "Command presence without overthinking outcomes.",
    prompt: "People are looking to me to lead and I can feel the pressure. I need a routine to stay composed and decisive.",
  },
];

const STORAGE_KEY = "bgpt_chat_v1";

let __uidCounter = 0;
function uid(prefix = "x") {
  __uidCounter = (__uidCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_static_${__uidCounter.toString(16)}`;
}

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

function formatDuration(ms: number) {
  if (!ms || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function detectTone(text: string): Tone {
  const t = text.toLowerCase();
  const win = /(won|win|crushed|great|best|proud|good game|played well|nailed|improved|dominated|personal best|pb)/.test(t);
  const loss = /(lost|loss|terrible|awful|hate|failed|embarrass|choked|disappointed|bummed|frustrated|angry)/.test(t);
  if (win && !loss) return "celebrate";
  if (loss) return "reframe";
  return "steady";
}

function useInteractiveBackground() {
  useEffect(() => {
    const root = document.documentElement;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    root.style.setProperty("--mx", "45%");
    root.style.setProperty("--my", "12%");

    let raf = 0;
    let t0 = performance.now();
    const drift = () => {
      const t = (performance.now() - t0) / 1000;
      const x = 45 + Math.sin(t * 0.2) * 10;
      const y = 12 + Math.cos(t * 0.14) * 6;
      if (prefersReduced) return;
      root.style.setProperty("--dx", `${x}%`);
      root.style.setProperty("--dy", `${y}%`);
      raf = requestAnimationFrame(drift);
    };

    let targetX = 0.45;
    let targetY = 0.12;
    let currentX = 0.45;
    let currentY = 0.12;
    let lastPointerAt = 0;

    const onMove = (e: PointerEvent) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      targetX = Math.min(0.98, Math.max(0.02, e.clientX / w));
      targetY = Math.min(0.98, Math.max(0.02, e.clientY / h));
      lastPointerAt = performance.now();
    };

    const animate = () => {
      const ease = 0.08;
      currentX = currentX + (targetX - currentX) * ease;
      currentY = currentY + (targetY - currentY) * ease;

      const idle = performance.now() - lastPointerAt > 2600;
      if (idle && !prefersReduced) {
        const dx = parseFloat(getComputedStyle(root).getPropertyValue("--dx")) || 45;
        const dy = parseFloat(getComputedStyle(root).getPropertyValue("--dy")) || 12;
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

async function callApiChatStreaming(payload: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  agent: Agent;
  onToken: (token: string) => void;
}) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: payload.messages, agent: payload.agent, stream: true }),
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

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function mapTagToRoutine(tag: string): string {
  const t = (tag || "").toLowerCase();
  if (t.includes("reset")) return "Reset";
  if (t.includes("clutch")) return "Clutch";
  if (t.includes("review")) return "Post-game review";
  if (t.includes("confidence")) return "Confidence";
  return titleCase(tag);
}

function deriveMantraFromAssistant(text: string): string {
  const t = (text || "").trim();
  if (!t) return "Slow is smooth. Smooth is fast.";

  const next =
    t
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /^next step[:\-]/i.test(l)) || "";

  if (next) return next.replace(/^next step[:\-]\s*/i, "").replace(/\.$/, "");

  const first = t.split(/(?<=[.!?])\s+/)[0]?.trim() || "";
  const cleaned = first.replace(/^##\s+/, "").replace(/\.$/, "");
  if (cleaned.length >= 8 && cleaned.length <= 90) return cleaned;

  return "Slow is smooth. Smooth is fast.";
}

function deriveSessionNotes(text: string): string[] {
  const blocks = parseAssistantBlocks(text || "");
  const notes: string[] = [];

  for (const b of blocks) {
    if (b.kind === "ul" || b.kind === "ol") {
      for (const it of b.items) {
        const clean = it.trim();
        if (clean) notes.push(clean);
        if (notes.length >= 3) return notes;
      }
    }
  }

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
          <strong key={i} className="font-semibold text-white">
            {p.t}
          </strong>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )}
    </>
  );
}

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

export default function ChatPage() {
  useInteractiveBackground();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const seededRef = useRef<Session | null>(null);
  if (!seededRef.current) seededRef.current = seedSessionStatic();
  const seeded = seededRef.current;

  const [sessions, setSessions] = useState<Session[]>(() => [seeded]);
  const [activeId, setActiveId] = useState<string>(() => seeded.id);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [agent, setAgent] = useState<Agent>("coach");

  const [mantra, setMantra] = useState("Slow is smooth. Smooth is fast.");
  const [activeRoutine, setActiveRoutine] = useState<string>("—");
  const [sessionNotes, setSessionNotes] = useState<string[]>([]);

  const [thinkingPhase, setThinkingPhase] = useState(0);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const lastTelemetryId = useRef<string | null>(null);

  const userScrollRef = useRef<{ active: boolean; t?: number }>({ active: false });

  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [sessionMenuOpenId, setSessionMenuOpenId] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeId.includes("_static_")) return;

    const t = window.setTimeout(() => {
      writeStorage({ sessions, activeId });
    }, 150);

    return () => window.clearTimeout(t);
  }, [sessions, activeId]);

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

  useEffect(() => {
    if (!isTyping) return;
    setThinkingPhase(0);
    const id = window.setInterval(() => {
      setThinkingPhase((p) => (p + 1) % THINKING_STEPS.length);
    }, 700);
    return () => window.clearInterval(id);
  }, [isTyping]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  const trackerMessages = useMemo<TrackerMessage[]>(() => {
    return (active?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
  }, [active?.messages]);

  const trackingSignals = useMemo<TrackingSignals>(() => deriveTrackingSignals(trackerMessages), [trackerMessages]);

  const sessionDurationMs = useMemo(() => {
    const times = trackerMessages.map((m) => m.createdAt).filter(Boolean).sort((a, b) => a - b);
    if (!times.length) return 0;
    const end = times[times.length - 1] || Date.now();
    return Math.max(0, end - times[0]);
  }, [trackerMessages]);

  useEffect(() => {
    if (!active) return;

    const lastAssistant = [...active.messages].reverse().find((m) => m.role === "assistant" && (m.content || "").trim());

    if (!lastAssistant) return;

    setMantra(deriveMantraFromAssistant(lastAssistant.content));
    setSessionNotes(deriveSessionNotes(lastAssistant.content));
  }, [activeId, active?.messages]);

  useEffect(() => {
    if (!active || isTyping) return;

    const lastAssistant = [...active.messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || lastTelemetryId.current === lastAssistant.id) return;

    lastTelemetryId.current = lastAssistant.id;

    const payload = buildTelemetryPayload({
      sessionId: active.id,
      signals: trackingSignals,
      messages: trackerMessages,
    });

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry", blob);
    } else {
      void fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  }, [active, trackerMessages, trackingSignals, isTyping]);

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

    const assistantId = rid("a");
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      meta: { label: "Coach", tone: detectTone(text) },
    };

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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToAssistantStart(assistantId));
    });

    try {
      const payloadMessages = buildApiPayloadMessages({ ...active, messages: [...active.messages, userMsg] });

      let didFirstTokenScroll = false;

      await callApiChatStreaming({
        messages: payloadMessages,
        agent,
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
    <div className="relative h-screen overflow-hidden bg-[#05060b] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#05060b]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_var(--mx)_var(--my),rgba(56,189,248,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(680px_circle_at_70%_18%,rgba(45,212,191,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_12%_70%,rgba(129,140,248,0.08),transparent_60%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.55),transparent_35%,rgba(15,23,42,0.6))]" />
      </div>

      <div className="relative mx-auto flex h-screen max-w-[1650px] flex-col px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/30 via-sky-500/20 to-emerald-300/20 text-sm font-semibold ring-1 ring-white/10">
              {BRAND.mark}
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">{BRAND.name}</div>
              <div className="text-xs text-slate-400">{BRAND.subtitle}</div>
            </div>
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300 md:inline-flex">
              {BRAND.tagline}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <MetricPill label="Focus" value={trackingSignals.focus} />
            <MetricPill label="Pressure" value={trackingSignals.pressure} tone="warning" />
            <MetricPill label="Recovery" value={trackingSignals.recovery} tone="success" />
            <MetricPill label="Clarity" value={trackingSignals.clarity} />
          </div>

          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-200 hover:bg-white/10 lg:inline-flex"
              >
                Sessions
              </button>
            )}
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value as Agent)}
              className="h-[36px] rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] text-slate-100 outline-none hover:bg-white/10"
              title={AGENTS.find((a) => a.id === agent)?.hint ?? "Agent mode"}
            >
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#05060b]">
                  {a.label}
                </option>
              ))}
            </select>
            <button
              onClick={resetActive}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 hover:bg-white/10"
            >
              Reset
            </button>
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 hover:bg-white/10"
            >
              Home
            </Link>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside
            className={[
              "hidden h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl lg:flex",
              sidebarOpen ? "" : "lg:hidden",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mission Log</div>
                <div className="mt-1 text-sm font-semibold text-white">Sessions</div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
              >
                Collapse
              </button>
            </div>

            <button
              onClick={newSession}
              className="mt-4 w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-left text-[12px] font-semibold text-cyan-100 hover:bg-cyan-500/20"
            >
              + New session
            </button>

            <div className="mt-4 min-h-0 flex-1 overflow-auto space-y-3 pr-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={[
                    "relative rounded-xl border border-white/10 px-3 py-2 transition",
                    s.id === activeId ? "bg-white/10" : "bg-white/[0.03] hover:bg-white/10",
                  ].join(" ")}
                >
                  <button onClick={() => setActiveId(s.id)} className="block w-full text-left pr-8">
                    <div className="text-[12px] font-semibold text-white line-clamp-1">{s.title}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">Updated {s.updatedAt ? formatTime(s.updatedAt) : "—"}</div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionMenuOpenId((prev) => (prev === s.id ? null : s.id));
                    }}
                    className="absolute right-2 top-2 rounded-lg px-2 py-1 text-[12px] text-slate-300 hover:bg-white/5 hover:text-white"
                    aria-label="Session menu"
                  >
                    ⋯
                  </button>

                  {sessionMenuOpenId === s.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-10 z-30 w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#05060b]/95 backdrop-blur-xl shadow-lg"
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

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quick Protocols</div>
              <div className="mt-3 space-y-2">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.k}
                    onClick={() => applyQuick(a.prompt, a.tag)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-[11px] text-slate-200 hover:bg-white/10"
                    title={a.prompt}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-white">{a.title}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                        {a.tag}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">{a.detail}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-slate-400">
              Coaching only — not medical care. If you’re in crisis, seek immediate local professional help.{" "}
              <Link href="/legal" className="underline underline-offset-4 hover:text-white">
                Legal disclaimer
              </Link>
            </div>
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Comms Terminal</div>
                  <div className="mt-1 text-lg font-semibold text-white">{active?.title ?? "Session"}</div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {isTyping ? "Processing" : "Online"}
                  </span>
                  <span>Session time {formatDuration(sessionDurationMs)}</span>
                </div>
              </div>
            </div>

            <div
              ref={scrollerRef}
              onScroll={markUserScrolling}
              onWheel={markUserScrolling}
              onTouchMove={markUserScrolling}
              className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgba(3,6,18,0.45)] backdrop-blur-2xl"
              style={{ scrollbarGutter: "stable" }}
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
                      <ChatRow message={m} brandMark={BRAND.mark} brandName={BRAND.name} />
                    </div>
                  ))}

                {isTyping && (
                  <div className="flex gap-3">
                    <Avatar label={BRAND.mark} />
                    <div className="max-w-[82ch] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_8px_24px_rgba(3,6,18,0.4)]">
                      <div className="text-[11px] font-semibold text-white">{BRAND.name}</div>
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

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-2xl">
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
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[14px] leading-6 text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                />
                <button
                  onClick={() => void send()}
                  disabled={!input.trim() || isTyping}
                  className="h-[46px] shrink-0 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/30 via-sky-500/20 to-emerald-400/20 px-4 text-[12px] font-semibold text-white hover:from-cyan-500/40 hover:to-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.k}
                    onClick={() => applyQuick(a.prompt, a.tag)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-white/10"
                  >
                    {a.tag}
                  </button>
                ))}
                <span className="text-[11px] text-slate-500">Press Enter to send • Shift+Enter for new line</span>
              </div>
            </div>
          </section>

          <aside className="hidden flex-col gap-4 lg:flex">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_rgba(3,6,18,0.4)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Calibration Core</div>
                  <div className="mt-1 text-sm font-semibold text-white">Central calibration</div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                  {trackingSignals.tempo}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <FocusCore
                  focus={trackingSignals.focus}
                  pressure={trackingSignals.pressure}
                  recovery={trackingSignals.recovery}
                  duration={formatDuration(sessionDurationMs)}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                <SignalStat label="Momentum" value={trackingSignals.momentum} />
                <SignalStat label="Consistency" value={trackingSignals.consistency} />
                <SignalStat label="Intent" valueText={trackingSignals.intent} />
                <SignalStat label="Risk" valueText={trackingSignals.riskFlag} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_rgba(3,6,18,0.4)] backdrop-blur-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Signal Matrix</div>
              <div className="mt-3 space-y-3">
                <SignalBar label="Focus lock" value={trackingSignals.focus} />
                <SignalBar label="Pressure load" value={trackingSignals.pressure} tone="warning" />
                <SignalBar label="Recovery" value={trackingSignals.recovery} tone="success" />
                <SignalBar label="Clarity" value={trackingSignals.clarity} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_rgba(3,6,18,0.4)] backdrop-blur-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Forensic Audit</div>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] font-semibold text-slate-300">Anchor phrase</div>
                  <div className="mt-1 text-[13px] text-white">{mantra}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] font-semibold text-slate-300">Active routine</div>
                  <div className="mt-1 text-[13px] text-white">{activeRoutine}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] font-semibold text-slate-300">Session notes</div>
                  {sessionNotes.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-slate-200">
                      {sessionNotes.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12px] text-slate-400">
                      Notes appear here once the coach responds.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" }) {
  const toneStyles =
    tone === "success"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : tone === "warning"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
      : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";

  return (
    <div className={`rounded-full border px-3 py-1 text-[11px] ${toneStyles}`}>
      {label} {Math.round(value)}%
    </div>
  );
}

function SignalBar({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" }) {
  const toneStyles =
    tone === "success"
      ? "from-emerald-400/80 to-emerald-500/30"
      : tone === "warning"
      ? "from-amber-400/80 to-amber-500/30"
      : "from-cyan-400/80 to-sky-500/30";

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-white/5">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${toneStyles}`}
          style={{ width: `${Math.max(6, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function SignalStat({ label, value, valueText }: { label: string; value?: number; valueText?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-1 text-[12px] font-semibold text-white">
        {valueText ?? `${Math.round(value ?? 0)}%`}
      </div>
    </div>
  );
}

function FocusCore({
  focus,
  pressure,
  recovery,
  duration,
}: {
  focus: number;
  pressure: number;
  recovery: number;
  duration: string;
}) {
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const focusOffset = circumference - (focus / 100) * circumference;
  const pressureOffset = circumference - (pressure / 100) * circumference;
  const recoveryOffset = circumference - (recovery / 100) * circumference;

  return (
    <div className="relative flex h-[220px] w-[220px] items-center justify-center">
      <svg className="absolute h-full w-full" viewBox="0 0 220 220">
        <circle cx="110" cy="110" r="82" stroke="rgba(148,163,184,0.25)" strokeWidth="10" fill="none" />
        <circle
          cx="110"
          cy="110"
          r="82"
          stroke="rgba(56,189,248,0.7)"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={focusOffset}
          strokeLinecap="round"
          transform="rotate(-90 110 110)"
        />
        <circle
          cx="110"
          cy="110"
          r="68"
          stroke="rgba(251,191,36,0.6)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={pressureOffset}
          strokeLinecap="round"
          transform="rotate(-90 110 110)"
        />
        <circle
          cx="110"
          cy="110"
          r="54"
          stroke="rgba(52,211,153,0.6)"
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={recoveryOffset}
          strokeLinecap="round"
          transform="rotate(-90 110 110)"
        />
      </svg>
      <div className="relative text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Core</div>
        <div className="mt-1 text-2xl font-semibold text-white">{duration}</div>
        <div className="mt-2 text-[11px] text-slate-400">Session timer</div>
      </div>
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 via-sky-500/20 to-emerald-400/20 text-[11px] font-semibold ring-1 ring-white/15">
      {label}
    </div>
  );
}

function ChatRow({ message, brandMark, brandName }: { message: Message; brandMark: string; brandName: string }) {
  const isUser = message.role === "user";

  const blocks = useMemo(() => {
    if (isUser) return null;
    return parseAssistantBlocks(message.content);
  }, [isUser, message.content]);

  return (
    <div className="flex gap-3 justify-start">
      <Avatar label={isUser ? "You" : brandMark} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold text-white">{isUser ? "You" : brandName}</div>
            {!isUser && message.meta?.label && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                {message.meta.label}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">{message.createdAt ? formatTime(message.createdAt) : "—"}</div>
        </div>

        <div
          className={[
            "mt-2 max-w-[90ch] rounded-2xl border border-white/10 px-4 py-3 text-[14px] leading-7 shadow-[0_8px_24px_rgba(3,6,18,0.35)]",
            isUser
              ? "bg-gradient-to-br from-white/10 via-white/5 to-white/10 text-slate-100"
              : "bg-white/[0.04] text-slate-200",
          ].join(" ")}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="space-y-3">
              {blocks?.map((b, idx) => {
                if (b.kind === "h") {
                  return (
                    <div key={idx} className="text-[14px] font-semibold text-white">
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
