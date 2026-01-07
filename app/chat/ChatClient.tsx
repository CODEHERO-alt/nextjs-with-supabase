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

const STORAGE_KEY = "bgpt_chat_v2_agent_suite";

const AGENTS: Array<{
  id: Agent;
  title: string;
  description: string;
  contract: string[];
  example: string;
}> = [
  {
    id: "stock",
    title: "Stock Data",
    description: "Input tickers → current price, volume change, and the single most relevant headline.",
    contract: ["No analysis.", "No opinions.", "Only the data requested."],
    example: "AAPL MSFT NVDA",
  },
  {
    id: "codecheck",
    title: "Code Check",
    description: "Paste code → identify only bugs + performance bottlenecks. Output is only fixes.",
    contract: ["No explanation of how code works.", "Only fixes.", "Bugs + performance only."],
    example: "Paste code here…",
  },
  {
    id: "fueling",
    title: "Schedule Fueling",
    description: "Paste schedule → exact meal + caffeine times for peak alertness in high-stakes meetings.",
    contract: ["Specific times.", "Practical only.", "One-line safety note."],
    example: "Wake 7:00, meeting 10:30–12:00, gym 5:30…",
  },
  {
    id: "errortracker",
    title: "Error Tracker",
    description: "Paste daily logs → find the #1 repeated mistake + provide 1 directive for tomorrow.",
    contract: ["One mistake only.", "One directive only.", "No extra coaching."],
    example: "Today I rushed the first 10 minutes…",
  },
  {
    id: "coach",
    title: "Coach",
    description: "Performance calibration for athletes + high performers.",
    contract: ["Short.", "Runnable.", "Under 10 minutes."],
    example: "I choke in the first quarter. Heart rate spikes. Hands tighten.",
  },
];

// ---------- helpers ----------
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
        content:
          "Pick an agent mode. Input only what it asks for. The output will follow the contract (no opinions, no fluff).",
        createdAt: now,
      },
    ],
  }
}

function useSoftBackground() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--mx", "50%");
    root.style.setProperty("--my", "18%");

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
      const ease = 0.10;
      curX += (targetX - curX) * ease;
      curY += (targetY - curY) * ease;
      root.style.setProperty("--mx", `${Math.round(curX * 1000) / 10}%`);
      root.style.setProperty("--my", `${Math.round(curY * 1000) / 10}%`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export default function ChatClient() {
  useSoftBackground();

  const seededRef = useRef<Session | null>(null);
  if (!seededRef.current) seededRef.current = seedSession();

  const [sessions, setSessions] = useState<Session[]>(() => [seededRef.current!]);
  const [activeId, setActiveId] = useState<string>(() => seededRef.current!.id);

  const [agent, setAgent] = useState<Agent>("stock");
  const agentMeta = useMemo(() => AGENTS.find((a) => a.id === agent)!, [agent]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  // Load from localStorage
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeJsonParse<{ sessions: Session[]; activeId: string; agent?: Agent }>(raw);
    if (!parsed?.sessions?.length || !parsed.activeId) return;
    setSessions(parsed.sessions);
    setActiveId(parsed.activeId);
    if (parsed.agent) setAgent(parsed.agent);
  }, []);

  // Persist
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, activeId, agent }));
      } catch {
        // ignore
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [sessions, activeId, agent]);

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
          content: "New session created. Select a mode and follow the contract.",
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
    // No system message from client; server constructs it by agent.
    return session.messages
      .filter((m) => m.role !== "system")
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
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
              title: s.title === "New session" ? `Session: ${agentMeta.title}` : s.title,
              messages: [...s.messages, userMsg, assistantMsg],
            }
          : s
      )
    );

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
        "Server error. Check /api/chat + env vars (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY).";
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

  return (
    <div className="h-screen overflow-hidden bg-[#070a10] text-slate-100">
      {/* background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070a10]" />
        <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px circle at var(--mx) var(--my), rgba(34,211,238,0.18), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(900px circle at calc(var(--mx) + 25%) calc(var(--my) + 25%), rgba(244,63,94,0.10), transparent 64%)",
          }}
        />
      </div>

      {/* top */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">BGPT — Agent Suite</div>
            <div className="text-[11px] text-slate-400">Strict modes • Data-first • No fluff</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newSession}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[12px] font-semibold hover:bg-cyan-300/15"
            >
              + New Session
            </button>
          </div>
        </div>
      </div>

      {/* layout */}
      <div className="mx-auto grid h-[calc(100vh-57px)] max-w-[1400px] grid-cols-12 gap-4 px-4 py-4">
        {/* left: sessions */}
        <aside className="col-span-12 lg:col-span-3 min-h-0">
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold text-slate-200">SESSIONS</div>
            <div className="p-3 max-h-[calc(100vh-140px)] overflow-auto pr-1">
              <div className="space-y-2">
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
            </div>
          </div>
        </aside>

        {/* middle: agent cards + chat */}
        <section className="col-span-12 lg:col-span-9 min-h-0 flex flex-col gap-4">
          {/* agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAgent(a.id)}
                className={[
                  "rounded-2xl border p-4 text-left transition backdrop-blur-xl",
                  a.id === agent
                    ? "border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                    : "border-white/10 bg-black/20 hover:bg-white/5",
                ].join(" ")}
              >
                <div className="text-[12px] font-semibold text-slate-100">{a.title}</div>
                <div className="mt-1 text-[11px] leading-5 text-slate-400">{a.description}</div>
                <div className="mt-3 space-y-1">
                  {a.contract.map((c, i) => (
                    <div key={i} className="text-[10px] text-slate-300">
                      • {c}
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[10px] text-slate-400">
                  Example: <span className="text-slate-200">{a.example}</span>
                </div>
              </button>
            ))}
          </div>

          {/* chat */}
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl flex-1 min-h-0">
            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-200">CHAT</div>
                <div className="text-[11px] text-slate-400">
                  Active mode: <span className="text-slate-200 font-semibold">{agentMeta.title}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500">
                Contract enforced server-side • {isTyping ? "Streaming…" : "Ready"}
              </div>
            </div>

            <div className="p-4 h-full flex flex-col min-h-0">
              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3"
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
                          <span className="uppercase tracking-wide">{m.role === "user" ? "You" : "Assistant"}</span>
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
                <div className="col-span-12 md:col-span-10">
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
                  <div className="mt-1 text-[10px] text-slate-500">
                    Tip: follow the contract. If you want a different contract, tell us and we’ll make a new agent.
                  </div>
                </div>
                <div className="col-span-12 md:col-span-2">
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() || isTyping}
                    className="h-full w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[12px] font-semibold hover:bg-cyan-300/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function placeholderFor(agent: Agent) {
  switch (agent) {
    case "stock":
      return "Stock Data: enter tickers (example: AAPL MSFT NVDA). Output is price, volume change, and 1 headline.";
    case "codecheck":
      return "Code Check: paste code. Output is only bugs + performance bottlenecks + the fixes. No explanations.";
    case "fueling":
      return "Schedule Fueling: paste your schedule (wake time, meetings, workout, sleep). Output is meal + caffeine times.";
    case "errortracker":
      return "Error Tracker: paste daily logs / notes. Output is ONE repeated mistake + ONE directive for tomorrow.";
    default:
      return "Coach: describe the moment. You’ll get a runnable routine.";
  }
}
