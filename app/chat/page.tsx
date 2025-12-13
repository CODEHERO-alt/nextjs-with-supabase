"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";

type Fundamental = "Presence" | "Poise" | "Patience" | "Perspective" | "Perseverance";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  meta?: {
    fundamental?: Fundamental;
    title?: string;
  };
};

const BRAND = {
  name: "Dr. Brett GPT",
  subtitle: "Mental game coaching for athletes",
};

const FUNDAMENTALS: Array<{ k: Fundamental; desc: string }> = [
  { k: "Presence", desc: "Back to what’s real, right now." },
  { k: "Poise", desc: "Calm execution under pressure." },
  { k: "Patience", desc: "Trust the process. Don’t force." },
  { k: "Perspective", desc: "Widen the lens. One moment ≠ you." },
  { k: "Perseverance", desc: "Show up with structure, not emotion." },
];

const STARTERS: Array<{ title: string; prompt: string }> = [
  {
    title: "90-second reset after a mistake",
    prompt:
      "Build me a 90-second reset routine I can run after a mistake. My sport is ___. The moment I struggle most is ___.",
  },
  {
    title: "Pre-game focus cue",
    prompt:
      "Give me a pre-game cue and a short script for calm execution. My sport is ___. My biggest distraction is ___.",
  },
  {
    title: "Late-game pressure plan",
    prompt:
      "Late in games I rush decisions and feel heavy legs. Build me a simple plan for the last 5 minutes.",
  },
  {
    title: "5-minute post-game review",
    prompt:
      "Guide me through a 5-minute post-game review. Today I did ___. I struggled with ___. One adjustment is ___.",
  },
];

const SEED: Message[] = [
  {
    id: "seed_u",
    role: "user",
    content:
      "Late in games I start thinking ahead, my legs feel heavy, and I rush decisions. I know what to do — I just don’t execute.",
    createdAt: 0,
  },
  {
    id: "seed_a",
    role: "assistant",
    content: [
      "[Poise] Calm execution under pressure.",
      "",
      "## One clean step (for the last 5 minutes)",
      "- **Breathe:** one slow inhale + long exhale (shoulders down).",
      "- **See:** pick *one* next action (e.g., “get to my spot”).",
      "- **Do:** run that action at 80–90% control, not 110% speed.",
      "",
      "## Two quick questions",
      "- What sport + level are you playing?",
      "- What exact moment triggers the rush (mistake / clock / crowd / opponent run)?",
      "",
      "> Confidence isn’t a feeling. It’s a repeatable response under pressure.",
    ].join("\n"),
    createdAt: 0,
    meta: { fundamental: "Poise", title: "Last 5 minutes" },
  },
];

function pickFundamental(text: string): Fundamental {
  const t = text.toLowerCase();
  if (/(tight|pressure|late|clutch|clock|choke|closing)/.test(t)) return "Poise";
  if (/(anxious|nervous|overthink|future|what if|racing)/.test(t)) return "Presence";
  if (/(rush|hurry|fast|now|impatient)/.test(t)) return "Patience";
  if (/(bigger|season|career|meaning|perspective|story)/.test(t)) return "Perspective";
  if (/(slump|stuck|again|quit|give up|hard)/.test(t)) return "Perseverance";
  return "Poise";
}

function runtimeId(prefix = "m") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(16)}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Minimal “markdown-lite” renderer for assistant messages */
function renderAssistantBlocks(text: string) {
  const lines = text.split("\n");
  const blocks: Array<
    | { kind: "h"; text: string }
    | { kind: "p"; text: string }
    | { kind: "quote"; text: string }
    | { kind: "callout"; label: string; text: string }
    | { kind: "ul"; items: string[] }
  > = [];

  let ul: string[] = [];
  const flushUl = () => {
    if (ul.length) blocks.push({ kind: "ul", items: ul }), (ul = []);
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushUl();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushUl();
      blocks.push({ kind: "h", text: trimmed.replace(/^##\s+/, "") });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushUl();
      blocks.push({ kind: "quote", text: trimmed.replace(/^>\s+/, "") });
      continue;
    }

    const calloutMatch = trimmed.match(/^\[(.+?)\]\s+(.*)$/);
    if (calloutMatch) {
      flushUl();
      blocks.push({ kind: "callout", label: calloutMatch[1], text: calloutMatch[2] });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      ul.push(trimmed.replace(/^- /, ""));
      continue;
    }

    flushUl();
    blocks.push({ kind: "p", text: trimmed });
  }
  flushUl();

  return blocks;
}

function buildCoachReply(userText: string) {
  const f = pickFundamental(userText);

  // Keep it “coach-like” but compact and usable.
  const replyByFundamental: Record<Fundamental, string> = {
    Presence: [
      "[Presence] Back to now.",
      "",
      "## Quick reset (20 seconds)",
      "- Exhale long (drop shoulders).",
      "- Name **one** controllable: “feet / breath / next rep.”",
      "- Look at a fixed target for 2 seconds, then go.",
      "",
      "## One question",
      "- What do you notice first when you start overthinking: breath, legs, or eyes?",
    ].join("\n"),

    Poise: [
      "[Poise] Calm execution under pressure.",
      "",
      "## Last 5 minutes protocol",
      "- **Slow is smooth:** reduce speed 10%, increase control 30%.",
      "- **One cue:** pick one phrase (e.g., “next play”).",
      "- **Next action:** choose a single job (defend / space / rebound / pass).",
      "",
      "## Make it specific",
      "- What sport + what exact “late-game” moment triggers the rush?",
    ].join("\n"),

    Patience: [
      "[Patience] Stop forcing results.",
      "",
      "## The shift",
      "- Don’t chase the outcome. Chase the **next rep done correctly**.",
      "",
      "## A simple rule",
      "- If you feel urgency: slow your breathing, then pick the smallest next action.",
      "",
      "## Tell me",
      "- Where do you rush most: decisions, mechanics, or shot/finish selection?",
    ].join("\n"),

    Perspective: [
      "[Perspective] Widen the lens.",
      "",
      "## Reframe that helps athletes",
      "- One moment is data — not identity.",
      "",
      "## Keep / Fix / Practice (2 minutes)",
      "- **Keep:** one thing you did well.",
      "- **Fix:** one decision you’ll adjust.",
      "- **Practice:** one drill you’ll do this week.",
      "",
      "## What’s your sport + level?",
    ].join("\n"),

    Perseverance: [
      "[Perseverance] Structure beats mood.",
      "",
      "## 7-day consistency plan (simple)",
      "- 10 min/day: fundamentals + one pressure rep.",
      "- Track: “showed up” ✅ and “one cue used” ✅",
      "",
      "## What would ‘showing up’ mean for you?",
      "- Minutes/day + which skill you’re building.",
    ].join("\n"),
  };

  return {
    fundamental: f,
    title: `${f} focus`,
    content: replyByFundamental[f],
  };
}

export default function ChatPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [focusOpen, setFocusOpen] = useState(true);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [focusNote, setFocusNote] = useState("Keep the next step small and repeatable under pressure.");
  const [activeFundamental, setActiveFundamental] = useState<Fundamental>("Poise");

  const [messages, setMessages] = useState<Message[]>(() => SEED);

  // Hydrate seed timestamps after mount (avoid Date.now during prerender)
  useEffect(() => {
    const now = Date.now();
    setMessages((prev) =>
      prev.map((m, idx) => ({
        ...m,
        id: runtimeId(m.role === "assistant" ? "a" : "u"),
        createdAt: now - (prev.length - idx) * 60_000,
      }))
    );
  }, []);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping]);

  const compactHeader = useMemo(() => {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold ring-1 ring-white/10">
          BG
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-50">{BRAND.name}</div>
          <div className="text-[11px] text-slate-400">{BRAND.subtitle}</div>
        </div>
      </div>
    );
  }, []);

  function pushUser(text: string) {
    const clean = text.trim();
    if (!clean) return;

    const m: Message = {
      id: runtimeId("u"),
      role: "user",
      content: clean,
      createdAt: Date.now(),
    };
    setMessages((p) => [...p, m]);
  }

  async function simulateReply(userText: string) {
    setIsTyping(true);

    const reply = buildCoachReply(userText);
    setActiveFundamental(reply.fundamental);

    // Small, consistent delay
    await new Promise((r) => setTimeout(r, Math.min(1200, 500 + userText.length * 8)));

    const m: Message = {
      id: runtimeId("a"),
      role: "assistant",
      content: reply.content,
      createdAt: Date.now(),
      meta: { fundamental: reply.fundamental, title: reply.title },
    };

    setMessages((p) => [...p, m]);
    setIsTyping(false);
  }

  async function onSend() {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    pushUser(text);
    await simulateReply(text);
  }

  function exportTranscript() {
    const lines: string[] = [];
    lines.push(`# ${BRAND.name} — Transcript`);
    lines.push(`Focus: ${activeFundamental}`);
    lines.push(`Note: ${focusNote}`);
    lines.push("");

    for (const m of messages) {
      const who = m.role === "user" ? "You" : BRAND.name;
      lines.push(`**${who}** (${formatTime(m.createdAt)}):`);
      lines.push(m.content.trim());
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dr-brett-gpt-transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetSession() {
    const now = Date.now();
    setMessages(
      SEED.map((m, idx) => ({
        ...m,
        id: runtimeId(m.role === "assistant" ? "a" : "u"),
        createdAt: now - (SEED.length - idx) * 60_000,
      }))
    );
    setInput("");
    setIsTyping(false);
    setActiveFundamental("Poise");
    setFocusNote("Keep the next step small and repeatable under pressure.");
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      {/* subtle background */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-28 left-1/2 h-[420px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/10 via-white/0 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(90,79,246,0.12),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(58,166,255,0.10),transparent_42%),radial-gradient(circle_at_55%_90%,rgba(244,197,66,0.07),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1400px]">
        {/* LEFT: lightweight starter panel */}
        <aside
          className={[
            "hidden h-screen w-[320px] shrink-0 border-r border-white/10 bg-black/10 backdrop-blur-xl lg:flex lg:flex-col",
            leftOpen ? "" : "w-0 overflow-hidden",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-5 py-5">
            {compactHeader}
            <button
              onClick={() => setLeftOpen(false)}
              className="rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
              title="Collapse"
            >
              Collapse
            </button>
          </div>

          <div className="px-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] font-semibold text-slate-200">Start fast</div>
              <div className="mt-2 space-y-2">
                {STARTERS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => setInput(s.prompt)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                  >
                    <div className="text-[12px] font-medium text-slate-100">{s.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">{s.prompt}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] font-semibold text-slate-200">Session</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={exportTranscript}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] hover:bg-white/10"
                >
                  Export
                </button>
                <button
                  onClick={resetSession}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Keep it simple: export a transcript to review with a coach/parent.
              </div>
            </div>
          </div>

          <div className="mt-auto px-5 pb-5 pt-4 text-[10px] leading-5 text-slate-500">
            Coaching support only — not medical or therapeutic care.
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex min-h-screen flex-1 flex-col">
          {/* Top bar (ChatGPT-ish) */}
          <div className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-2">
                {!leftOpen && (
                  <button
                    onClick={() => setLeftOpen(true)}
                    className="hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10 lg:inline-flex"
                  >
                    Menu
                  </button>
                )}
                <div className="text-[12px] text-slate-300">
                  Focus:{" "}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
                    {activeFundamental}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFocusOpen((v) => !v)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/10"
                >
                  Focus panel
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

          <div className="mx-auto flex w-full max-w-[1200px] flex-1">
            {/* Chat column */}
            <section className="flex flex-1 flex-col">
              <div className="mx-auto flex w-full max-w-[980px] flex-1 flex-col px-4 py-6 md:px-6">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-[18px] font-semibold tracking-tight text-slate-50">{BRAND.name}</h1>
                    <p className="mt-1 max-w-[72ch] text-[13px] leading-6 text-slate-300">
                      Clean coaching. Small steps. Repeatable execution under pressure.
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollerRef}
                  className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-xl md:p-4"
                >
                  <div className="space-y-4">
                    {messages.map((m) => (
                      <ChatMessage key={m.id} m={m} />
                    ))}

                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="mt-1 h-8 w-8 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/10" />
                        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="h-3 w-1/3 rounded-full bg-white/10" />
                          <div className="mt-3 space-y-2">
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
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-xl md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-slate-300">Message</div>
                    <div className="text-[10px] text-slate-500">
                      Enter to send • Shift+Enter for new line
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void onSend();
                        }
                      }}
                      rows={3}
                      placeholder="What happened? When does it show up? What do you want to execute better?"
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] leading-6 text-slate-100 placeholder:text-slate-500 outline-none focus:border-white/20"
                    />

                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => void onSend()}
                        disabled={!input.trim() || isTyping}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-[12px] font-semibold text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send
                      </button>
                      <button
                        onClick={resetSession}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[12px] text-slate-200 hover:bg-white/10"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400">
                    Tip: include your <span className="text-slate-200">sport</span> and the{" "}
                    <span className="text-slate-200">exact moment</span> it breaks down (before / during / after).
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT: Focus panel */}
            {focusOpen && (
              <aside className="relative hidden w-[360px] shrink-0 border-l border-white/10 bg-black/10 backdrop-blur-xl xl:block">
                <div className="sticky top-[52px] p-5">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-200">Focus</div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          Keep one coaching note for this session.
                        </div>
                      </div>
                      <button
                        onClick={() => setFocusOpen(false)}
                        className="rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
                      >
                        Close
                      </button>
                    </div>

                    <textarea
                      value={focusNote}
                      onChange={(e) => setFocusNote(e.target.value)}
                      rows={4}
                      className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[12px] leading-6 text-slate-100 outline-none focus:border-white/20"
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold text-slate-200">The 5 Fundamentals</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {FUNDAMENTALS.map((f) => (
                        <button
                          key={f.k}
                          onClick={() => setActiveFundamental(f.k)}
                          className={[
                            "rounded-2xl border border-white/10 px-3 py-2 text-left hover:bg-white/5",
                            activeFundamental === f.k ? "bg-white/10" : "bg-white/5",
                          ].join(" ")}
                        >
                          <div className="text-[11px] font-semibold text-slate-100">{f.k}</div>
                          <div className="mt-0.5 text-[10px] text-slate-400">{f.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 text-[10px] text-slate-500">
                      Responses will naturally tag a Fundamental based on what you describe.
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold text-slate-200">What this is</div>
                    <p className="mt-2 text-[12px] leading-6 text-slate-300">
                      A calm interface designed for athletes—less noise, more execution. You’ll get routines, cues, and
                      simple plans you can actually run.
                    </p>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ChatMessage({ m }: { m: Message }) {
  const isUser = m.role === "user";

  return (
    <div className={["flex gap-3", isUser ? "justify-end" : "justify-start"].join(" ")}>
      {!isUser && (
        <div className="mt-1 h-8 w-8 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-[11px] font-semibold">
          BG
        </div>
      )}

      <div
        className={[
          "max-w-[820px] rounded-2xl border border-white/10 p-4",
          isUser ? "bg-white/10" : "bg-black/20",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold text-slate-200">
            {isUser ? "You" : BRAND.name}
          </div>

          <div className="flex items-center gap-2">
            {!isUser && m.meta?.fundamental && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                {m.meta.fundamental}
              </span>
            )}
            <div className="text-[10px] text-slate-500">{m.createdAt ? formatTime(m.createdAt) : ""}</div>
          </div>
        </div>

        <div className="mt-2 text-[14px] leading-7 text-slate-100">
          {isUser ? (
            <p className="whitespace-pre-wrap">{m.content}</p>
          ) : (
            <AssistantContent text={m.content} />
          )}
        </div>
      </div>

      {isUser && (
        <div className="mt-1 h-8 w-8 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-[11px] font-semibold">
          You
        </div>
      )}
    </div>
  );
}

function AssistantContent({ text }: { text: string }) {
  const blocks = useMemo(() => renderAssistantBlocks(text), [text]);

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => {
        if (b.kind === "h") return <div key={idx} className="text-[14px] font-semibold text-slate-50">{b.text}</div>;
        if (b.kind === "p") return <p key={idx} className="whitespace-pre-wrap text-slate-100">{b.text}</p>;
        if (b.kind === "quote")
          return (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 italic text-slate-200">
              {b.text}
            </div>
          );
        if (b.kind === "callout")
          return (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{b.label}</div>
              <div className="mt-1 text-slate-200">{b.text}</div>
            </div>
          );
        if (b.kind === "ul")
          return (
            <ul key={idx} className="list-disc space-y-1 pl-5 text-slate-100">
              {b.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          );
        return null;
      })}
    </div>
  );
}
