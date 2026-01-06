import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// Per-request guardrails
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_TOTAL_CHARS = 12000;
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 450);

// Daily limits (cost protection + anti-abuse)
const DAILY_REQUEST_LIMIT = Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 60);
const DAILY_INPUT_TOKEN_LIMIT = Number(process.env.AI_DAILY_INPUT_TOKEN_LIMIT ?? 120_000);
const DAILY_OUTPUT_TOKEN_LIMIT = Number(process.env.AI_DAILY_OUTPUT_TOKEN_LIMIT ?? 60_000);
const DAILY_COST_LIMIT_USD = Number(process.env.AI_DAILY_COST_LIMIT_USD ?? 3);

// Optional pricing (to compute cost). If not set, we enforce token/request limits but cost becomes 0.
const INPUT_USD_PER_1K = Number(process.env.OPENAI_INPUT_USD_PER_1K ?? 0);
const OUTPUT_USD_PER_1K = Number(process.env.OPENAI_OUTPUT_USD_PER_1K ?? 0);

const BASE_SYSTEM_PROMPT = `
You are Dr. Brett GPT.

Your job is NOT therapy.

Your job is real-time performance calibration for athletes (16+), entrepreneurs, and high performers.

Identity / voice (The Gentleman Sage):
- Calm
- Precise
- Grounded
- Direct
- Authoritative without emotional language
- Short sentences. 8th-grade clarity.
- No emojis. No slang. No fluff.

Core framework (always in this order):
1) Presence
2) Patience
3) Perspective
4) Poise
5) Perseverance

Hard boundaries (must follow):
- You are NOT a doctor, therapist, psychologist, or emergency service.
- Do not provide medical diagnosis or treatment advice.
- Do not provide legal advice, financial advice, or specific investment advice.
- If the user expresses self-harm, harm to others, suicidal intent, or severe crisis:
  1) Stop coaching immediately.
  2) Encourage urgent professional help right now.
  3) If in the U.S., say: call or text 988 and/or call 911 if immediate danger.
     If outside the U.S., advise local emergency/crisis services.
- If the user shows severe panic/crisis language (can’t breathe,...ns, mania, etc.), treat it as crisis and follow the steps above.

Your operating principle:
We don’t fix people. We calibrate execution.
The user should leave with something runnable in under 10 minutes.

Output rules (NON-NEGOTIABLE):
You MUST respond using this exact structure every time (unless crisis):

Moment:
Name the exact moment the user is in. One short sentence.

Why this happens:
Explain the mechanism simply. No psychology jargon.
One or two short sentences maximum.

The Routine (10–30 seconds):
Give a short, rehearsable routine the user can run immediately.
Use numbered steps.

Anchor phrase:
One short phrase the user repeats to lock in.

One rep:
One concrete “next rep” action. Tiny and specific.

If needed:
Ask ONE question that would meaningfully improve the routine. Only one.
`.trim();

type Agent = "coach" | "stock" | "codecheck" | "fueling" | "errortracker";

function normalizeAgent(v: unknown): Agent {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "stock" || s === "codecheck" || s === "fueling" || s === "errortracker") return s as Agent;
  return "coach";
}

function buildSystemPrompt(agent: Agent): string {
  if (agent === "coach") return BASE_SYSTEM_PROMPT;

  if (agent === "codecheck") {
    return (
      BASE_SYSTEM_PROMPT +
      `

Agent mode: Code Check.
Rules (non-negotiable):
- You only identify bugs and performance bottlenecks.
- You do NOT explain how the code works.
- Output only a list of fixes. No extra coaching.
- If the user did not provide code, ask for the code in one short sentence.
`
    );
  }

  if (agent === "fueling") {
    return (
      BASE_SYSTEM_PROMPT +
      `

Agent mode: Schedule Fueling.
Rules (non-negotiable):
- The user gives a daily schedule; you return specific times for meals and caffeine.
- Keep it practical and short.
- Include exactly ONE short safety line: “General guidance only.”
`
    );
  }

  if (agent === "errortracker") {
    return (
      BASE_SYSTEM_PROMPT +
      `

Agent mode: Error Tracker.
Rules (non-negotiable):
- From the user's logs, identify the ONE most repeated mistake.
- Provide ONE directive for tomorrow.
- No extra analysis, no extra coaching, no second directive.
- If the user did not provide logs, ask for them in one short sentence.
`
    );
  }

  // stock agent is handled tool-first (no OpenAI analysis)
  return BASE_SYSTEM_PROMPT;
}

function formatPct(n: number): string {
  if (!isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

function extractTickers(text: string): string[] {
  const matches = (text || "").toUpperCase().match(/\b[A-Z]{1,6}(?:[.-][A-Z]{1,3})?\b/g) ?? [];
  const blacklist = new Set(["USD", "US", "TX", "USA", "CEO", "CFO", "AI", "API", "GPT"]);
  const uniq: string[] = [];
  for (const m of matches) {
    if (blacklist.has(m)) continue;
    if (!uniq.includes(m)) uniq.push(m);
    if (uniq.length >= 10) break;
  }
  return uniq;
}

async function fetchFinnhubJSON(url: string): Promise<any> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("Missing FINNHUB_API_KEY");
  const res = await fetch(url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(key), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Finnhub request failed (${res.status})`);
  }
  return res.json();
}

async function getStockSummary(ticker: string): Promise<string> {
  const q = await fetchFinnhubJSON(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}`);
  const price = typeof q?.c === "number" ? q.c : null;

  // Volume change (last 2 daily candles)
  const nowSec = Math.floor(Date.now() / 1000);
  const fromSec = nowSec - 60 * 60 * 24 * 10;
  const c = await fetchFinnhubJSON(
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${fromSec}&to=${nowSec}`
  );

  let volChangePct: string = "—";
  if (c?.s === "ok" && Array.isArray(c?.v) && c.v.length >= 2) {
    const v1 = Number(c.v[c.v.length - 2]);
    const v2 = Number(c.v[c.v.length - 1]);
    if (isFinite(v1) && isFinite(v2) && v1 > 0) volChangePct = formatPct(((v2 - v1) / v1) * 100);
  }

  // Single headline (latest company news)
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);
  const news = await fetchFinnhubJSON(
    `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}`
  );

  let headline = "No major headline found.";
  if (Array.isArray(news) && news.length) {
    const item = news[0];
    const h = typeof item?.headline === "string" ? item.headline.trim() : "";
    const src = typeof item?.source === "string" ? item.source.trim() : "";
    const dt = typeof item?.datetime === "number" ? new Date(item.datetime * 1000).toISOString().slice(0, 10) : "";
    headline = h ? `${h}${src || dt ? ` (${[src, dt].filter(Boolean).join(", ")})` : ""}` : headline;
  }

  const p = price != null ? `$${price}` : "—";
  return `${ticker} — ${p} | Vol: ${volChangePct} | Headline: ${headline}`;
}

function streamText(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const chunkSize = 64;
      for (let i = 0; i < text.length; i += chunkSize) {
        controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
      }
      controller.close();
    },
  });
}

type CleanMsg = { role: "system" | "user" | "assistant"; content: string };

function sanitizeMessages(messages: any[]): CleanMsg[] {
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "system" || m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    })) as CleanMsg[];

  // keep last N, but keep at most one system message (we provide our own anyway)
  const noSystem = cleaned.filter((m) => m.role !== "system").slice(-MAX_MESSAGES);
  return noSystem;
}

function countChars(messages: CleanMsg[]) {
  return messages.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
}

function todayISODate() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// SUPER rough estimate (keeps us from unbounded spend)
function roughTokensFromText(s: string) {
  // ~4 chars per token on average (English); guard only.
  return Math.ceil((s?.length ?? 0) / 4);
}

function calcCostUSD(inputTokens: number, outputTokens: number) {
  if (!INPUT_USD_PER_1K || !OUTPUT_USD_PER_1K) return 0;
  return (inputTokens / 1000) * INPUT_USD_PER_1K + (outputTokens / 1000) * OUTPUT_USD_PER_1K;
}

async function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabase();

    // --- Auth check ---
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // --- Paid enforcement ---
    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_paid").eq("id", authData.user.id).single();

    if (profileError || !profile?.is_paid) {
      return NextResponse.json({ error: "Paid access required" }, { status: 402 });
    }

    // --- Input validation ---
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const stream = Boolean(body.stream);

    const agent = normalizeAgent(body.agent);

    const cleaned = sanitizeMessages(body.messages);
    if (!cleaned.length) {
      return NextResponse.json({ error: "No valid messages provided" }, { status: 400 });
    }

    if (countChars(cleaned) > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "Message content too long" }, { status: 413 });
    }

    // --- Usage / limits (daily) ---
    const day = todayISODate();
    const { data: usageRow, error: usageErr } = await supabase
      .from("ai_usage_daily")
      .select("requests,input_tokens,output_tokens,cost_usd")
      .eq("user_id", authData.user.id)
      .eq("day", day)
      .maybeSingle();

    if (usageErr) {
      // if table not created yet, you'll see this. We hard-fail to avoid unbounded spend.
      return NextResponse.json({ error: "Usage table missing. Run the SQL migration for ai_usage_daily." }, { status: 500 });
    }

    const used = usageRow ?? { requests: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };

    // cheap + effective pre-checks
    if (used.requests >= DAILY_REQUEST_LIMIT) {
      return NextResponse.json({ error: "Daily request limit reached" }, { status: 429 });
    }
    if (used.input_tokens >= DAILY_INPUT_TOKEN_LIMIT) {
      return NextResponse.json({ error: "Daily input token limit reached" }, { status: 429 });
    }
    if (used.output_tokens >= DAILY_OUTPUT_TOKEN_LIMIT) {
      return NextResponse.json({ error: "Daily output token limit reached" }, { status: 429 });
    }
    if (DAILY_COST_LIMIT_USD > 0 && used.cost_usd >= DAILY_COST_LIMIT_USD) {
      return NextResponse.json({ error: "Daily cost limit reached" }, { status: 429 });
    }

    // --- Agent: STOCK DATA (tool-first, no analysis) ---
    if (agent === "stock") {
      const lastUser = [...cleaned].reverse().find((m) => m.role === "user")?.content ?? "";
      const tickers = extractTickers(lastUser);

      if (!tickers.length) {
        const msg = "Provide 1–3 tickers (example: AAPL, MSFT).";

        await supabase.from("ai_usage_daily").upsert(
          {
            user_id: authData.user.id,
            day,
            requests: used.requests + 1,
            input_tokens: used.input_tokens,
            output_tokens: used.output_tokens,
            cost_usd: used.cost_usd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,day" }
        );

        return stream
          ? new Response(streamText(msg), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
          : NextResponse.json({ reply: msg });
      }

      const lines: string[] = [];
      for (const t of tickers) {
        try {
          lines.push(await getStockSummary(t));
        } catch (e: any) {
          lines.push(`${t} — Error: ${String(e?.message ?? e)}`);
        }
      }

      const out = lines.join("\n");

      await supabase.from("ai_usage_daily").upsert(
        {
          user_id: authData.user.id,
          day,
          requests: used.requests + 1,
          input_tokens: used.input_tokens,
          output_tokens: used.output_tokens,
          cost_usd: used.cost_usd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day" }
      );

      return stream
        ? new Response(streamText(out), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
        : NextResponse.json({ reply: out });
    }

    // Construct messages for OpenAI
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: buildSystemPrompt(agent) },
      ...cleaned.map((m) => ({ role: m.role, content: m.content })),
    ];

    if (!stream) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: MAX_OUTPUT_TOKENS,
      });

      const reply = completion.choices?.[0]?.message?.content?.trim() ?? "";
      if (!reply) {
        return NextResponse.json({ error: "No response generated" }, { status: 500 });
      }

      const usage = completion.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const inputTokens = usage.prompt_tokens ?? 0;
      const outputTokens = usage.completion_tokens ?? 0;

      const costUSD = calcCostUSD(inputTokens, outputTokens);

      // upsert daily usage
      await supabase.from("ai_usage_daily").upsert(
        {
          user_id: authData.user.id,
          day,
          requests: used.requests + 1,
          input_tokens: used.input_tokens + inputTokens,
          output_tokens: used.output_tokens + outputTokens,
          cost_usd: +(used.cost_usd + costUSD),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day" }
      );

      return NextResponse.json({ reply });
    }

    // --- STREAMING ---
    // We'll stream plain text chunks. Client appends as it arrives.
    let streamedText = "";
    let finalInputTokens = 0;
    let finalOutputTokens = 0;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.6,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    });

    const streamRes = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const part of completion as any) {
            const token = part?.choices?.[0]?.delta?.content ?? "";
            if (token) {
              streamedText += token;
              controller.enqueue(encoder.encode(token));
            }
          }

          // rough token estimate for daily caps (since streaming doesn't provide usage)
          finalInputTokens = roughTokensFromText(messages.map((m) => m.content).join("\n"));
          finalOutputTokens = roughTokensFromText(streamedText);

          const costUSD = calcCostUSD(finalInputTokens, finalOutputTokens);

          await supabase.from("ai_usage_daily").upsert(
            {
              user_id: authData.user.id,
              day,
              requests: used.requests + 1,
              input_tokens: used.input_tokens + finalInputTokens,
              output_tokens: used.output_tokens + finalOutputTokens,
              cost_usd: +(used.cost_usd + costUSD),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,day" }
          );

          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(streamRes, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err: any) {
    const msg = (err?.message ?? "Unknown error").toString();
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
