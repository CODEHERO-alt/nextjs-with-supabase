"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type Agent = "coach" | "stock" | "codecheck" | "fueling" | "errortracker";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

type Session = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

const STORAGE_KEY = "bgpt_chat_v2_command_center";

const AGENTS: Array<{
  id: Agent;
  label: string;
  sub: string;
  rules: string;
}> = [
  {
    id: "coach",
    label: "Coach",
    sub: "Performance calibration",
    rules: "Short. Runnable. No fluff.",
  },
  {
    id: "stock",
    label: "Stock Data",
    sub: "Price + volume + 1 headline",
    rules: "No analysis. No opinions.",
  },
  {
    id: "codecheck",
    label: "Code Check",
    sub: "Bugs + bottlenecks",
    rules: "Fix list only. No explanations.",
  },
  {
    id: "fueling",
    label: "Schedule Fueling",
    sub: "Meals + caffeine timing",
    rules: "Specific times. One-line safety note.",
  },
  {
    id: "errortracker",
    label: "Error Tracker",
    sub: "1 repeated mistake + 1 directive",
    rules: "One mistake. One directive. Nothing else.",
  },
];

// ---------- small helpers ----------
let __uid = 0;
function rid(prefix = "id") {
  const c = (globalThis as any)?.crypto as Crypto | undefined;
  if (c?.randomUUID) return `${prefix}_${c.randomUUID()}`;
  __uid = (__uid + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_${Date.now()}_${__uid}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
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
    const t = await safeReadText(res);
    throw new Error(t || `Request failed (${res.status})`);
  }

  if (!res.body) throw new Error("No response body (stream unavailable).");

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

function seedSession(): Session {
  const now = Date.now();
  return {
    id: rid("sess"),
    title: "Session: Today",
    updatedAt: now,
    messages: [
      {
        id: rid("a"),
        role: "assistant",
        content: "Command Center online. Choose an agent mode and enter your input.",
        createdAt: now,
      },
    ],
  };
}

// ---------- background pointer glow ----------
function useHudBackground() {
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--mx", "50%");
    root.style.setProperty("--my", "18%");

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let targetX = 0.5;
    let targetY = 0.18;
    let curX = 0.5;
    let curY = 0.18;

    const onMove = (e: PointerEvent) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      targetX = Math.min(0.98, Math.max(0.02, e.clientX / w));
      targetY = Math.min(0.98, Math.max(0.02, e.clientY / h));
    };

    const tick = () => {
      const ease = 0.12;
      curX += (targetX - curX) * ease;
      curY += (targetY - curY) * ease;

      root.style.setProperty("--mx", `${Math.round(curX * 1000) / 10}%`);
      root.style.setProperty("--my", `${Math.round(curY * 1000) / 10}%`);

      raf = requestAnimationFrame(tick);
    };

    if (!prefersReduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export default function ChatClient() {
  useHudBackground();

  const [agent, setAgent] = useState<Agent>("coach");
  const agentMeta = useMemo(() => AGENTS.find((a) => a.id === agent)!, [agent]);

  const seededRef = useRef<Session | null>(null);
  if (!seededRef.current) seededRef.current = seedSession();

  const [sessions, setSessions] = useState<Session[]>(() => [seededRef.current!]);
  const [activeId, setActiveId] = useState<string>(() => seededRef.current!.id);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load from localStorage
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeJsonParse<{ sessions: Session[]; activeId: string }>(raw);
    if (!parsed?.sessions?.length || !parsed.activeId) return;
    setSessions(parsed.sessions);
    setActiveId(parsed.activeId);
  }, []);

  // Persist
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, activeId }));
      } catch {
        // ignore
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [sessions, activeId]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  function newSession() {
    const now = Date.now();
    const s: Session = {
      id: rid("sess"),
      title: "New session",
      updatedAt: now,
      messages: [
        {
          id: rid("a"),
          role: "assistant",
          content: "New session created. Choose an agent and input your data.",
          createdAt: now,
        },
      ],
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  }

  function scrollToMessage(id: string) {
    const el = msgRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildApiMessages(session: Session) {
    // We do not send system from client; server builds system based on agent.
    // Keep last 20 user+assistant messages.
    const nonSystem = session.messages.filter((m) => m.role !== "system");
    const last = nonSystem.slice(-20);
    return last.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }

  async function send() {
    if (!active) return;
    const text = input.trim();
    if (!text || isTyping) return;

    setInput("");

    const now = Date.now();
    const userMsg: Message = { id: rid("u"), role: "user", content: text, createdAt: now };
    const assistantId = rid("a");
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", createdAt: now + 1 };

    setIsTyping(true);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: now,
              title: s.title === "New session" ? `Session: ${agentMeta.label}` : s.title,
              messages: [...s.messages, userMsg, assistantMsg],
            }
          : s
      )
    );

    // Scroll to placeholder
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToMessage(assistantId)));

    try {
      const payloadMessages = buildApiMessages({ ...active, messages: [...active.messages, userMsg] });

      await callApiChatStreaming({
        messages: payloadMessages as any,
        agent,
        onToken: (tok) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === active.id
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + tok } : m)),
                  }
                : s
            )
          );
        },
      });
    } catch (e: any) {
      const msg =
        (e?.message as string) ||
        "Server error. Check /api/chat route + env vars (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY).";
      setSessions((prev) =>
        prev.map((s) =>
          s.id === active.id
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)),
              }
            : s
        )
      );
    } finally {
      setIsTyping(false);
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToMessage(assistantId)));
    }
  }

  // HUD metrics (fake, UI-only; can be wired later)
  const flowPct = useMemo(() => 92 + Math.floor(((active?.updatedAt ?? 0) / 1000) % 7), [active?.updatedAt]);
  const poisePct = useMemo(() => 95 + Math.floor(((active?.updatedAt ?? 0) / 1000) % 4), [active?.updatedAt]);

  // “Calibration timer” UI-only
  const [calibrateSec, setCalibrateSec] = useState(3 * 3600 + 47 * 60 + 11);
  useEffect(() => {
    const t = window.setInterval(() => setCalibrateSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, []);
  const calibrateText = useMemo(() => {
    const hh = Math.floor(calibrateSec / 3600)
      .toString()
      .padStart(2, "0");
    const mm = Math.floor((calibrateSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(calibrateSec % 60)
      .toString()
      .padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [calibrateSec]);

  return (
    <div className="h-screen overflow-hidden text-slate-100 bg-[#070a10]">
      {/* HUD background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070a10]" />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:28px_28px]" />
        {/* teal glow */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px circle at var(--mx) var(--my), rgba(34,211,238,0.20), transparent 60%)",
          }}
        />
        {/* red/amber lab glow */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(900px circle at calc(var(--mx) + 25%) calc(var(--my) + 25%), rgba(244,63,94,0.12), transparent 62%)",
          }}
        />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_25%,rgba(255,255,255,0.05))]" />
      </div>

      {/* top bar */}
      <div className="border-b border-cyan-300/15 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-cyan-300/25 bg-cyan-300/10 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border border-cyan-200/60 shadow-[0_0_20px_rgba(34,211,238,0.25)]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">PERFORMANCE LAB COMMAND CENTER</div>
              <div className="text-[11px] text-slate-400">BGPT • Virtual Assist Suite</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Metric label="Flow-State %" value={`${flowPct}%`} />
            <Metric label="Poise Levels" value={`${poisePct}%`} />
            <div className="h-9 w-[1px] bg-white/10" />
            <button
              onClick={newSession}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[12px] font-semibold hover:bg-cyan-300/15"
            >
              + New Session
            </button>
          </div>
        </div>
      </div>

      {/* main grid */}
      <div className="mx-auto grid h-[calc(100vh-57px)] max-w-[1400px] grid-cols-12 gap-4 px-4 py-4">
        {/* left: sessions + agent selector */}
        <aside className="col-span-12 lg:col-span-3 min-h-0">
          <Panel title="SESSIONS" tone="teal">
            <div className="space-y-2 max-h-[180px] overflow-auto pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left transition",
                    s.id === activeId
                      ? "border-cyan-300/30 bg-cyan-300/10"
                      : "border-white/10 bg-black/20 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="text-[12px] font-semibold text-slate-100 line-clamp-1">{s.title}</div>
                  <div className="text-[10px] text-slate-400">Updated {formatTime(s.updatedAt)}</div>
                </button>
              ))}
            </div>
          </Panel>

          <div className="mt-4">
            <Panel title="AGENT MODES" tone="teal">
              <div className="grid grid-cols-1 gap-2">
                {AGENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAgent(a.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-left transition",
                      a.id === agent
                        ? "border-cyan-300/35 bg-cyan-300/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-semibold">{a.label}</div>
                        <div className="text-[11px] text-slate-400">{a.sub}</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                        {a.id.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">{a.rules}</div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </aside>

        {/* center: calibration + chat */}
        <section className="col-span-12 lg:col-span-6 min-h-0 flex flex-col gap-4">
          {/* calibration */}
          <Panel title="CENTRAL CALIBRATION" tone="teal">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <CalibrationRing />
                <div>
                  <div className="text-[11px] text-slate-400">Calibration timer</div>
                  <div className="text-3xl font-semibold tracking-tight">{calibrateText}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Active agent: <span className="text-slate-200 font-semibold">{agentMeta.label}</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <div className="text-[11px] text-slate-400">Rule</div>
                <div className="mt-1 text-[12px] leading-6 text-slate-200">{agentMeta.rules}</div>
              </div>
            </div>
          </Panel>

          {/* chat */}
          <Panel title="CHAT CONSOLE" tone="red" className="flex-1 min-h-0">
            <div className="flex h-full flex-col min-h-0">
              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="space-y-3">
                  {active.messages.map((m) => (
                    <div
                      key={m.id}
                      ref={(el) => {
                        msgRefs.current[m.id] = el;
                      }}
                      className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={[
                          "max-w-[88%] rounded-2xl border px-3 py-2 text-[13px] leading-6",
                          m.role === "user"
                            ? "border-cyan-300/20 bg-cyan-300/10"
                            : "border-white/10 bg-black/30",
                        ].join(" ")}
                      >
                        <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between gap-3">
                          <span className="uppercase tracking-wide">{m.role === "user" ? "Operator" : "Assistant"}</span>
                          <span>{formatTime(m.createdAt)}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%] rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[13px]">
                        <div className="text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Assistant</div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80 animate-pulse" />
                          Streaming response…
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* composer */}
              <div className="mt-3 grid grid-cols-12 gap-2">
                <div className="col-span-12 sm:col-span-9">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-300/25"
                    placeholder={placeholderFor(agent)}
                  />
                  <div className="mt-1 text-[10px] text-slate-400">
                    Mode: <span className="text-slate-200 font-semibold">{agentMeta.label}</span> • {agentMeta.sub}
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-3 flex gap-2">
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() || isTyping}
                    className="w-full rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[12px] font-semibold hover:bg-cyan-300/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Execute
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </section>

        {/* right: stock volume + forensic audit */}
        <aside className="col-span-12 lg:col-span-3 min-h-0 flex flex-col gap-4">
          <Panel title="THE VOLUME" tone="red">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-[12px] font-semibold text-slate-200">Market Watch (Agent)</div>
              <div className="mt-1 text-[11px] text-slate-400">
                Use <span className="text-slate-200 font-semibold">Stock Data</span> mode and input tickers.
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat label="S&P 500" value="—" />
                <MiniStat label="NVDA" value="—" />
              </div>
              <div className="mt-3 text-[10px] text-slate-500">This panel is UI-only for now (agent returns the data in chat).</div>
            </div>
          </Panel>

          <Panel title="FORENSIC AUDIT" tone="red" className="flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-3">
              <AuditField label="Session Notes" />
              <AuditField label="Sprint Notes" />
              <AuditField label="Mistake Pattern" />
              <AuditField label="Directive" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <BadgeButton text="Presence" />
              <BadgeButton text="Poise" />
              <BadgeButton text="Patience" />
            </div>

            <div className="mt-4">
              <div className="text-[11px] text-slate-400">Headmaster’s Strategic Briefing</div>
              <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[12px] text-slate-200">
                Select an agent. Input only what it asks for. Execute the directive tomorrow.
              </div>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ---------- UI components ----------
function Panel({
  title,
  tone,
  className,
  children,
}: {
  title: string;
  tone: "teal" | "red";
  className?: string;
  children: React.ReactNode;
}) {
  const border = tone === "teal" ? "border-cyan-300/20" : "border-rose-400/15";
  const glow =
    tone === "teal"
      ? "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_30px_rgba(34,211,238,0.06)]"
      : "shadow-[0_0_0_1px_rgba(244,63,94,0.08),0_0_30px_rgba(244,63,94,0.05)]";

  return (
    <div className={["rounded-2xl border bg-black/15 backdrop-blur-xl", border, glow, className ?? ""].join(" ")}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-[11px] font-semibold tracking-wide text-slate-200">{title}</div>
        <div className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-3 py-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-[12px] font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function CalibrationRing() {
  return (
    <div className="relative h-16 w-16">
      <div className="absolute inset-0 rounded-full border border-cyan-300/35 bg-cyan-300/5 shadow-[0_0_25px_rgba(34,211,238,0.12)]" />
      <div className="absolute inset-[6px] rounded-full border border-cyan-200/25" />
      <div className="absolute inset-[14px] rounded-full border border-cyan-100/20" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-1/2 -translate-y-1/2 bg-cyan-300/25 origin-left rotate-[22deg]" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-1/2 -translate-y-1/2 bg-cyan-300/25 origin-left rotate-[138deg]" />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-[12px] font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function AuditField({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="mt-2 h-8 rounded-lg border border-white/10 bg-black/25" />
    </div>
  );
}

function BadgeButton({ text }: { text: string }) {
  return (
    <button className="rounded-xl border border-cyan-300/18 bg-cyan-300/10 px-3 py-2 text-[11px] font-semibold text-slate-100 hover:bg-cyan-300/15">
      {text}
    </button>
  );
}

function placeholderFor(agent: Agent) {
  switch (agent) {
    case "stock":
      return "Stock Data: enter tickers (example: AAPL MSFT NVDA). Output is price, volume change, and 1 headline.";
    case "codecheck":
      return "Code Check: paste code. Output is only bugs + performance bottlenecks + the fixes. No explanations.";
    case "fueling":
      return "Schedule Fueling: paste your schedule (wake time, meeting times, workout, sleep). Output is meal + caffeine times.";
    case "errortracker":
      return "Error Tracker: paste daily logs / notes. Output is ONE repeated mistake + ONE directive for tomorrow.";
    default:
      return "Coach: describe the moment. Keep it real. You’ll get a runnable routine in under 10 minutes.";
  }
}
