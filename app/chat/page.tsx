"use client";

/**
 * Notion-inspired /chat page for Dr. Brett GPT
 * - Typography-led layout (reading-first)
 * - Calm, authored "coaching notebook" feel
 * - Motivating celebrations without hype/emojis
 * - Local demo "coach replies" (NO API calls yet)
 * - Ready to swap the local responder with /api/chat later
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";

type Fundamental = "Presence" | "Patience" | "Perspective" | "Poise" | "Perseverance";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number; // epoch ms
  meta?: {
    title?: string;
    tags?: string[];
    fundamental?: Fundamental;
    tone?: "celebrate" | "steady" | "reframe";
  };
};

type CoachDraft = {
  fundamental: Fundamental;
  title: string;
  blocks: Array<
    | { kind: "p"; text: string }
    | { kind: "h"; text: string }
    | { kind: "ul"; items: string[] }
    | { kind: "quote"; text: string }
    | { kind: "callout"; label: string; text: string }
  >;
};

const BRAND = {
  product: "Dr. Brett GPT",
  subtitle: "Mental Game Coach for Athletes",
};

const QUICK_MOMENTS: Array<{ label: string; hint: string }> = [
  { label: "Pre-game nerves", hint: "I get anxious before games and overthink." },
  { label: "Bounce back after mistake", hint: "After an error, I spiral and play small." },
  { label: "Closing minutes pressure", hint: "Late game I tighten up and rush decisions." },
  { label: "Slump / confidence dip", hint: "I’m in a slump and my confidence is slipping." },
  { label: "Celebrate a win", hint: "I played well today and stayed calm under pressure." },
  { label: "Recover from a loss", hint: "We lost and I feel frustrated and stuck on mistakes." },
];

const STARTER_TEMPLATES: Array<{ title: string; body: string }> = [
  {
    title: "90-Second Reset Routine",
    body:
      "Build a reset I can run after a mistake. My sport is ___. My next game is ___. The moment I struggle most is ___.",
  },
  {
    title: "Pre-Game Focus Script",
    body:
      "Write a short pre-game script I can read before warm-up. I want to feel ___. My biggest distraction is ___.",
  },
  {
    title: "Post-Game Review (5 minutes)",
    body:
      "Guide me through a quick post-game review. Today I did ___. I struggled with ___. One thing I want to improve is ___.",
  },
  {
    title: "Confidence Rebuild Plan",
    body:
      "Create a simple 14-day plan to rebuild confidence. My level is ___. I can commit __ minutes/day.",
  },
];

const DOCK_ACTIONS: Array<{ k: string; label: string; description: string }> = [
  { k: "reset", label: "Reset routine", description: "Stabilize your body and attention fast." },
  { k: "pregame", label: "Pre-game cue", description: "Lock into calm execution." },
  { k: "review", label: "Post-game review", description: "Extract lessons without self-punishment." },
  { k: "plan", label: "2-week plan", description: "Turn today into momentum." },
];

function uid(prefix = "m") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickFundamentalFromText(text: string): Fundamental {
  const t = text.toLowerCase();
  if (/(panic|anxious|nervous|racing|overthink|future)/.test(t)) return "Presence";
  if (/(impatient|now|quick|fast|rush|hurry)/.test(t)) return "Patience";
  if (/(meaning|bigger|long-term|career|season|perspective|story)/.test(t)) return "Perspective";
  if (/(pressure|tight|choke|close|late|4th|clutch)/.test(t)) return "Poise";
  if (/(slump|quit|give up|stuck|repeat|again|hard)/.test(t)) return "Perseverance";
  return "Poise";
}

function detectTone(text: string): "celebrate" | "steady" | "reframe" {
  const t = text.toLowerCase();
  const win = /(won|win|crushed|great|best|proud|good game|played well|nailed|improved)/.test(t);
  const loss = /(lost|loss|terrible|awful|hate|failed|embarrass|choked|disappointed)/.test(t);
  if (win && !loss) return "celebrate";
  if (loss) return "reframe";
  return "steady";
}

function buildCoachDraft(userText: string): CoachDraft {
  const fundamental = pickFundamentalFromText(userText);
  const tone = detectTone(userText);

  const celebration = [
    { kind: "h", text: "Good. Don’t rush past that." } as const,
    {
      kind: "p",
      text:
        "A real win isn’t just the scoreboard — it’s the moment you stayed present when it mattered. That’s a repeatable skill.",
    } as const,
    {
      kind: "callout",
      label: "Anchor",
      text: "Name the exact moment you handled well. Then we’ll turn it into a cue you can reuse.",
    } as const,
    {
      kind: "ul",
      items: [
        "What was the moment (time + situation)?",
        "What did your body feel like (tight/loose, breathing, jaw)?",
        "What was the single thought or cue you used?",
      ],
    } as const,
    {
      kind: "quote",
      text:
        "Confidence grows when you can explain your calm — not when you hope it shows up again.",
    } as const,
    {
      kind: "p",
      text:
        "Tell me your sport and the specific moment. I’ll help you turn that into a 15-second reset you can run before big plays.",
    } as const,
  ];

  const reframe = [
    { kind: "h", text: "I hear the frustration." } as const,
    {
      kind: "p",
      text:
        "Losses sting when effort is high. That’s normal. The goal is to extract one lesson without turning it into a story about you as a person.",
    } as const,
    {
      kind: "callout",
      label: "Rule",
      text:
        "We only review what you can control: attention, body, decisions, and response after mistakes.",
    } as const,
    {
      kind: "ul",
      items: [
        "One moment you want back (be specific).",
        "One thing you did well that you’ll keep.",
        "One adjustment you’ll practice this week.",
      ],
    } as const,
    {
      kind: "p",
      text:
        "If you share the moment you want back, I’ll help you build a simple reset so that pattern doesn’t repeat.",
    } as const,
  ];

  const steady = [
    {
      kind: "p",
      text:
        "Got it. We’ll keep this practical. I’ll ask two quick questions and then give you one clean step you can run today.",
    } as const,
    {
      kind: "ul",
      items: [
        "What sport and level are you playing?",
        "When does the issue show up most (before / during / after competition)?",
      ],
    } as const,
    {
      kind: "p",
      text:
        "While you answer: we’ll likely build a short routine you can repeat — nothing complicated, just reliable.",
    } as const,
  ];

  const headByFundamental: Record<Fundamental, string> = {
    Presence: "This is Presence: attention back to what’s real, right now.",
    Patience: "This is Patience: trust the process and stop forcing results.",
    Perspective: "This is Perspective: widen the lens so one moment doesn’t define you.",
    Poise: "This is Poise: calm execution under pressure.",
    Perseverance: "This is Perseverance: keep showing up with structure, not emotion.",
  };

  const titleByTone: Record<CoachDraft["title"], CoachDraft["title"]> = {
    "": "",
  } as any;

  const baseTitle =
    tone === "celebrate"
      ? "Lock in the win"
      : tone === "reframe"
        ? "Turn the loss into a lesson"
        : "One clean step forward";

  const blocks =
    tone === "celebrate" ? celebration : tone === "reframe" ? reframe : steady;

  // Insert the fundamental “frame” near the top (Notion-style authored hint)
  const framed: CoachDraft["blocks"] = [
    { kind: "callout", label: fundamental, text: headByFundamental[fundamental] },
    ...blocks,
  ];

  return {
    fundamental,
    title: baseTitle,
    blocks: framed,
  };
}

function draftToMessage(draft: CoachDraft): Message {
  // Store the draft as structured “markdown-ish” text for now (we’ll render blocks in UI)
  // But we keep blocks separately via meta; the actual content can be a plain summary string.
  const summary = `${draft.title} — ${draft.fundamental}`;
  return {
    id: uid("a"),
    role: "assistant",
    content: summary,
    createdAt: Date.now(),
    meta: {
      title: draft.title,
      tags: ["coaching", draft.fundamental.toLowerCase()],
      fundamental: draft.fundamental,
      tone: "steady",
    },
  };
}

function composeBlockText(blocks: CoachDraft["blocks"]): string {
  // Not used for rendering (we render blocks), but useful for future storage/export.
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === "h") lines.push(`## ${b.text}`);
    if (b.kind === "p") lines.push(b.text);
    if (b.kind === "quote") lines.push(`> ${b.text}`);
    if (b.kind === "callout") lines.push(`[${b.label}] ${b.text}`);
    if (b.kind === "ul") {
      for (const item of b.items) lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function useAutoScroll(deps: any[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Smoothly scroll to bottom when deps change (new message)
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightRailOpen, setRightRailOpen] = useState(true);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [sessionTitle, setSessionTitle] = useState("Session: Today");
  const [sessionNote, setSessionNote] = useState(
    "Focus on calm execution under pressure. Keep the next step small and repeatable."
  );

  const [draftBlocks, setDraftBlocks] = useState<CoachDraft["blocks"] | null>(null);

  const initialMessages = useMemo<Message[]>(
    () => [
      {
        id: uid("s"),
        role: "system",
        content: "Private coaching session. Keep answers practical and athlete-friendly.",
        createdAt: Date.now() - 1000 * 60 * 12,
      },
      {
        id: uid("a"),
        role: "assistant",
        content:
          "Ready to cut through the noise and elevate your game? I’m BGPT, Dr. Brett’s AI Coaching Assistant. State the challenge you wish to conquer.",
        createdAt: Date.now() - 1000 * 60 * 11,
        meta: { fundamental: "Poise", tags: ["intro"], title: "Welcome" },
      },
      {
        id: uid("u"),
        role: "user",
        content:
          "Late in games I start thinking ahead, my legs feel heavy, and I rush decisions. I know what to do — I just don’t execute.",
        createdAt: Date.now() - 1000 * 60 * 10,
      },
    ],
    []
  );

  const [messages, setMessages] = useState<Message[]>(() => initialMessages);

  const scrollerRef = useAutoScroll([messages.length, isTyping]);

  const publicDemoNote = useMemo(() => {
    return {
      label: "Demo mode",
      text:
        "This chat is currently design-first. Replies are simulated locally for client review. We’ll connect it to the OpenAI API after feedback.",
    };
  }, []);

  const coachPresenceLine = useMemo(() => {
    // subtle status line (Notion-ish)
    return isTyping ? "Thinking…" : "Online";
  }, [isTyping]);

  function pushUserMessage(text: string) {
    const clean = text.trim();
    if (!clean) return;

    const m: Message = {
      id: uid("u"),
      role: "user",
      content: clean,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, m]);
  }

  async function simulateCoachResponse(userText: string) {
    setIsTyping(true);

    // Simulate “thinking” in a calm premium way
    const delayMs = clamp(650 + userText.length * 12, 800, 2200);
    await new Promise((r) => setTimeout(r, delayMs));

    const draft = buildCoachDraft(userText);
    const assistantMsg: Message = {
      id: uid("a"),
      role: "assistant",
      content: composeBlockText(draft.blocks), // for storage/export later
      createdAt: Date.now(),
      meta: {
        title: draft.title,
        fundamental: draft.fundamental,
        tags: ["coaching", draft.fundamental.toLowerCase()],
        tone: detectTone(userText),
      },
    };

    setDraftBlocks(draft.blocks);
    setMessages((prev) => [...prev, assistantMsg]);
    setIsTyping(false);
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    pushUserMessage(text);
    await simulateCoachResponse(text);
  }

  function onQuickMoment(hint: string) {
    setInput(hint);
  }

  function insertTemplate(body: string) {
    setInput(body);
  }

  function onDockAction(k: string) {
    if (k === "reset") {
      setInput(
        "Build me a 90-second reset routine I can run after a mistake. My sport is ___. The moment I struggle most is ___."
      );
      return;
    }
    if (k === "pregame") {
      setInput(
        "Give me a pre-game cue + short script for calm execution. My sport is ___. I tend to overthink ___."
      );
      return;
    }
    if (k === "review") {
      setInput(
        "Guide me through a 5-minute post-game review. Today I did ___. I struggled with ___."
      );
      return;
    }
    if (k === "plan") {
      setInput(
        "Create a simple 14-day plan to rebuild confidence and consistency. I can commit __ minutes/day."
      );
      return;
    }
  }

  function exportTranscript() {
    const lines: string[] = [];
    lines.push(`# ${BRAND.product} — Transcript`);
    lines.push(`## ${sessionTitle}`);
    lines.push("");
    for (const m of messages) {
      if (m.role === "system") continue;
      const who = m.role === "user" ? "You" : BRAND.product;
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

  function clearSession() {
    setMessages(initialMessages);
    setDraftBlocks(null);
    setInput("");
    setIsTyping(false);
  }

  return (
    <div className="min-h-screen bg-[#050712] text-slate-100">
      {/* Subtle background texture (Notion-ish calm dimension) */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/10 via-white/0 to-transparent blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(90,79,246,0.10),transparent_40%),radial-gradient(circle_at_75%_20%,rgba(58,166,255,0.10),transparent_45%),radial-gradient(circle_at_55%_90%,rgba(244,197,66,0.06),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_35%,rgba(255,255,255,0.02))]" />
      </div>

      {/* App shell */}
      <div className="relative mx-auto flex min-h-screen max-w-[1400px]">
        {/* LEFT SIDEBAR */}
        <aside
          className={[
            "relative z-10 hidden h-screen w-[300px] shrink-0 flex-col border-r border-white/10 bg-black/10 backdrop-blur-xl lg:flex",
            sidebarOpen ? "opacity-100" : "w-0 overflow-hidden opacity-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold tracking-tight ring-1 ring-white/10">
                BG
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">{BRAND.product}</div>
                <div className="text-[11px] text-slate-400">{BRAND.subtitle}</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
              aria-label="Collapse sidebar"
              title="Collapse"
            >
              Collapse
            </button>
          </div>

          <div className="px-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-200">Quick moments</div>
                <div className="text-[10px] text-slate-400">Tap to preload</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {QUICK_MOMENTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => onQuickMoment(q.hint)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-left text-[11px] text-slate-200 hover:bg-white/7"
                    title={q.hint}
                  >
                    <div className="font-medium">{q.label}</div>
                    <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">{q.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] font-semibold text-slate-200">Templates</div>
              <div className="mt-2 space-y-2">
                {STARTER_TEMPLATES.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => insertTemplate(t.body)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/7"
                  >
                    <div className="text-[11px] font-medium text-slate-100">{t.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">{t.body}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] font-semibold text-slate-200">Tools</div>
              <div className="mt-2 grid gap-2">
                {DOCK_ACTIONS.map((a) => (
                  <button
                    key={a.k}
                    onClick={() => onDockAction(a.k)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/7"
                  >
                    <div className="text-[11px] font-medium text-slate-100">{a.label}</div>
                    <div className="text-[10px] text-slate-400">{a.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto px-5 pb-5 pt-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] font-semibold text-slate-200">Session controls</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={exportTranscript}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 hover:bg-white/7"
                >
                  Export
                </button>
                <button
                  onClick={clearSession}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 hover:bg-white/7"
                >
                  Reset
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Export creates a .txt transcript you can share with your coach/parent if helpful.
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <main className="relative z-10 flex min-h-screen flex-1 flex-col">
          {/* Top bar */}
          <div className="sticky top-0 z-20 border-b border-white/10 bg-black/10 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                {!sidebarOpen ? (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/7 lg:inline-flex"
                  >
                    Sidebar
                  </button>
                ) : (
                  <span className="hidden lg:inline-flex text-[11px] text-slate-400">
                    Coaching notebook
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                  <span className="text-[11px] text-slate-300">
                    {BRAND.product} <span className="text-slate-500">•</span>{" "}
                    <span className="text-slate-400">{coachPresenceLine}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRightRailOpen((v) => !v)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/7"
                >
                  Notes
                </button>
                <a
                  href="/"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/7"
                >
                  Home
                </a>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto flex w-full max-w-[1200px] flex-1">
            {/* Message area */}
            <section className="flex w-full flex-1 flex-col">
              <div className="mx-auto w-full max-w-[980px] px-4 py-8 md:px-6">
                {/* Header / Title (Notion-like: calm, text-first) */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Session
                    </div>
                    <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-slate-50">
                      {sessionTitle}
                    </h1>
                    <p className="mt-2 max-w-[70ch] text-[13px] leading-6 text-slate-300">
                      The goal is not motivation — it’s <span className="font-medium text-slate-100">execution</span>.
                      We’ll keep each step small, measurable, and repeatable under pressure.
                    </p>
                  </div>

                  <div className="hidden md:flex shrink-0 items-center gap-2">
                    <Badge label="Athlete-friendly" />
                    <Badge label="Practical steps" />
                    <Badge label="Calm coaching" />
                  </div>
                </div>

                {/* Demo callout */}
                <div className="mt-6">
                  <Callout label={publicDemoNote.label} text={publicDemoNote.text} />
                </div>

                {/* Conversation */}
                <div className="mt-8">
                  <div className="text-[11px] font-semibold text-slate-300">Conversation</div>

                  <div
                    ref={scrollerRef}
                    className="mt-3 max-h-[52vh] overflow-auto rounded-2xl border border-white/10 bg-black/15 px-3 py-3 backdrop-blur-xl md:px-4"
                  >
                    <div className="space-y-3">
                      {messages
                        .filter((m) => m.role !== "system")
                        .map((m) => (
                          <NotionMessage key={m.id} message={m} />
                        ))}

                      {isTyping && (
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-[10px] font-semibold">
                              BG
                            </span>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-slate-100">
                                {BRAND.product}
                              </div>
                              <div className="text-[10px] text-slate-400">Drafting a response…</div>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <SkeletonLine />
                            <SkeletonLine />
                            <SkeletonLine short />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-slate-300">
                        Message {BRAND.product}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Press <span className="rounded border border-white/10 bg-white/5 px-1">Enter</span> to send
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
                        placeholder="State the challenge — or share a win/loss. Keep it real."
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[14px] leading-6 text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-white/20"
                      />

                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          onClick={() => void onSend()}
                          disabled={!input.trim() || isTyping}
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send
                        </button>
                        <button
                          onClick={clearSession}
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-medium text-slate-200 hover:bg-white/10"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Sub-actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MiniChip
                        label="Build a reset routine"
                        onClick={() => onDockAction("reset")}
                      />
                      <MiniChip
                        label="Guide a post-game review"
                        onClick={() => onDockAction("review")}
                      />
                      <MiniChip
                        label="Pre-game focus script"
                        onClick={() => onDockAction("pregame")}
                      />
                      <MiniChip
                        label="14-day confidence plan"
                        onClick={() => onDockAction("plan")}
                      />
                    </div>

                    <div className="mt-3 text-[11px] text-slate-400">
                      Note: This is coaching — not medical or therapeutic care. If you’re in crisis or at risk of self-harm,
                      seek immediate professional help in your region.
                    </div>
                  </div>
                </div>

                {/* A Notion-ish “divider” and an optional “coach output preview” */}
                <div className="mt-10 border-t border-white/10 pt-6">
                  <div className="text-[11px] font-semibold text-slate-300">What you’ll get</div>
                  <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-slate-300">
                    You leave with something usable: a short routine, a cue, a plan, or a structured reflection — not
                    vague motivation. When you share a win, we’ll lock it in. When you share a loss, we’ll turn it into a lesson.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MiniCard title="Calm under pressure" body="Simple resets you can run mid-game." />
                    <MiniCard title="Confidence with structure" body="Confidence that comes from repeatable process." />
                    <MiniCard title="Momentum from moments" body="Turn today into a plan — not a mood." />
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT RAIL (NOTES) */}
            {rightRailOpen && (
              <aside className="relative hidden w-[340px] shrink-0 border-l border-white/10 bg-black/10 backdrop-blur-xl xl:block">
                <div className="sticky top-[52px] p-5">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-200">Session notes</div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          Keep it short. This is the “one thing” you’re training.
                        </div>
                      </div>
                      <button
                        onClick={() => setRightRailOpen(false)}
                        className="rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5 hover:text-slate-100"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Title
                        </label>
                        <input
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-white/20"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Note
                        </label>
                        <textarea
                          value={sessionNote}
                          onChange={(e) => setSessionNote(e.target.value)}
                          rows={5}
                          className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] leading-6 text-slate-100 outline-none focus:border-white/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={exportTranscript}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-slate-100 hover:bg-white/10"
                        >
                          Export
                        </button>
                        <button
                          onClick={clearSession}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-slate-100 hover:bg-white/10"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fundamental chips */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold text-slate-200">The 5 Fundamentals</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <FundamentalChip title="Presence" body="Attention back to now." />
                      <FundamentalChip title="Poise" body="Calm under pressure." />
                      <FundamentalChip title="Patience" body="Trust the process." />
                      <FundamentalChip title="Perspective" body="Widen the lens." />
                      <FundamentalChip title="Perseverance" body="Keep showing up." />
                    </div>
                  </div>

                  {/* Latest coach draft preview */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-slate-200">Coach draft</div>
                      <div className="text-[10px] text-slate-500">Preview</div>
                    </div>

                    {draftBlocks ? (
                      <div className="mt-3 space-y-3">
                        {draftBlocks.slice(0, 6).map((b, idx) => (
                          <div key={idx} className="text-[12px] leading-6 text-slate-200">
                            {b.kind === "h" && (
                              <div className="text-[12px] font-semibold text-slate-100">{b.text}</div>
                            )}
                            {b.kind === "p" && <div className="text-slate-200">{b.text}</div>}
                            {b.kind === "quote" && (
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 italic text-slate-200">
                                {b.text}
                              </div>
                            )}
                            {b.kind === "callout" && (
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  {b.label}
                                </div>
                                <div className="mt-1 text-slate-200">{b.text}</div>
                              </div>
                            )}
                            {b.kind === "ul" && (
                              <ul className="list-disc space-y-1 pl-5 text-slate-200">
                                {b.items.map((it, i) => (
                                  <li key={i}>{it}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}

                        <div className="text-[10px] text-slate-500">
                          This will become the model’s structured response once we connect the API.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[12px] leading-6 text-slate-400">
                        Send a message to see a structured coach draft here.
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 text-[10px] leading-5 text-slate-500">
                    This UI is intentionally calm. It’s designed to help athletes think clearly when emotions are high.
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

/* ----------------------------- UI Components ----------------------------- */

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200">
      {label}
    </span>
  );
}

function Callout({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-[13px] leading-6 text-slate-200">{text}</div>
    </div>
  );
}

function MiniChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-white/10"
    >
      {label}
    </button>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[12px] font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-[12px] leading-6 text-slate-300">{body}</div>
    </div>
  );
}

function FundamentalChip({ title, body }: { title: Fundamental; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-100">{title}</div>
      <div className="mt-0.5 text-[10px] text-slate-400">{body}</div>
    </div>
  );
}

function SkeletonLine({ short }: { short?: boolean }) {
  return (
    <div
      className={[
        "h-3 rounded-full bg-white/10",
        short ? "w-2/3" : "w-full",
      ].join(" ")}
    />
  );
}

/**
 * Notion-style message: "authored blocks", minimal bubble look.
 * - user: slightly different background + left border
 * - assistant: calm block with callouts/headings/bullets
 */
function NotionMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const title = message.meta?.title;
  const fundamental = message.meta?.fundamental;
  const tone = message.meta?.tone ?? "steady";

  // If assistant content is our "markdown-ish" text, render it blocky:
  // We’ll render headings, callouts, bullets, quotes based on patterns.
  // (Later we’ll switch to structured JSON from API.)
  const rendered = useMemo(() => {
    if (isUser) return null;

    // Parse simplistic patterns from composeBlockText output
    const lines = message.content.split("\n").map((l) => l.trimEnd());
    const blocks: Array<
      | { kind: "h"; text: string }
      | { kind: "p"; text: string }
      | { kind: "quote"; text: string }
      | { kind: "callout"; label: string; text: string }
      | { kind: "ul"; items: string[] }
    > = [];

    let ul: string[] = [];
    const flushUl = () => {
      if (ul.length) {
        blocks.push({ kind: "ul", items: ul });
        ul = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flushUl();
        continue;
      }

      if (line.startsWith("## ")) {
        flushUl();
        blocks.push({ kind: "h", text: line.replace(/^##\s+/, "") });
        continue;
      }

      if (line.startsWith("> ")) {
        flushUl();
        blocks.push({ kind: "quote", text: line.replace(/^>\s+/, "") });
        continue;
      }

      // [Label] text
      const calloutMatch = line.match(/^\[(.+?)\]\s+(.*)$/);
      if (calloutMatch) {
        flushUl();
        blocks.push({ kind: "callout", label: calloutMatch[1], text: calloutMatch[2] });
        continue;
      }

      if (line.startsWith("- ")) {
        ul.push(line.replace(/^- /, ""));
        continue;
      }

      flushUl();
      blocks.push({ kind: "p", text: line });
    }
    flushUl();

    return blocks;
  }, [isUser, message.content]);

  return (
    <div
      className={[
        "rounded-2xl border border-white/10 px-3 py-3 md:px-4",
        isUser ? "bg-white/5" : "bg-black/20",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ring-1 ring-white/10",
            isUser ? "bg-white/10 text-slate-100" : "bg-white/10 text-slate-100",
          ].join(" ")}
        >
          {isUser ? "You" : "BG"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold text-slate-100">
                {isUser ? "You" : BRAND.product}
              </div>

              {!isUser && fundamental && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                  {fundamental}
                </span>
              )}

              {!isUser && tone && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                  {tone === "celebrate" ? "Recognize" : tone === "reframe" ? "Reframe" : "Next step"}
                </span>
              )}

              {!isUser && title && (
                <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 md:inline-flex">
                  {title}
                </span>
              )}
            </div>

            <div className="text-[10px] text-slate-500">{formatTime(message.createdAt)}</div>
          </div>

          {/* Body */}
          <div className="mt-2 text-[14px] leading-7 text-slate-200">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="space-y-3">
                {rendered?.map((b, idx) => {
                  if (b.kind === "h") {
                    return (
                      <div key={idx} className="text-[14px] font-semibold text-slate-100">
                        {b.text}
                      </div>
                    );
                  }
                  if (b.kind === "p") {
                    return (
                      <p key={idx} className="whitespace-pre-wrap text-slate-200">
                        {b.text}
                      </p>
                    );
                  }
                  if (b.kind === "quote") {
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 italic text-slate-200"
                      >
                        {b.text}
                      </div>
                    );
                  }
                  if (b.kind === "callout") {
                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {b.label}
                        </div>
                        <div className="mt-1 text-slate-200">{b.text}</div>
                      </div>
                    );
                  }
                  if (b.kind === "ul") {
                    return (
                      <ul key={idx} className="list-disc space-y-1 pl-5 text-slate-200">
                        {b.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
