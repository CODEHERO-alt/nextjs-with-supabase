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

const SYSTEM_PROMPT = `
You are Dr. Brett GPT — a calm, practical mental performance coach for athletes (16+).

Your role:
- Focus on execution, not hype or therapy
- Give short, usable routines, cues, and plans
- Be supportive but direct
- No emojis, no slang, no fluff

Boundaries:
- You are NOT a doctor, therapist, or emergency service
- Do not give medical or clinical advice
- If the user expresses self-harm or crisis, advise seeking immediate professional help

Style:
- Clear
- Structured
- Athlete-friendly
- Calm and confident
`.trim();

type CleanMsg = { role: "system" | "user" | "assistant"; content: string };

function sanitizeMessages(input: any): CleanMsg[] {
  if (!Array.isArray(input)) return [];

  const cleaned = input
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
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

function todayISODate() {
  // date in UTC: YYYY-MM-DD
  return new Date().toISOString().slice(0, 10);
}

function calcCostUSD(inputTokens: number, outputTokens: number) {
  if (!INPUT_USD_PER_1K && !OUTPUT_USD_PER_1K) return 0;
  const inCost = (inputTokens / 1000) * INPUT_USD_PER_1K;
  const outCost = (outputTokens / 1000) * OUTPUT_USD_PER_1K;
  return +(inCost + outCost);
}

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // anon is correct with RLS
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // ignore in route handlers
          }
        },
      },
    }
  );
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_paid")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile?.is_paid) {
      return NextResponse.json({ error: "Paid access required" }, { status: 402 });
    }

    // --- Input validation ---
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const stream = Boolean(body.stream);

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
      return NextResponse.json(
        { error: "Usage table missing. Run the SQL migration for ai_usage_daily." },
        { status: 500 }
      );
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

    // Construct messages for OpenAI
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
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

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const streamResp = await openai.chat.completions.create({
            model: MODEL,
            messages,
            temperature: 0.6,
            max_tokens: MAX_OUTPUT_TOKENS,
            stream: true,
            // Some SDKs support include_usage. If not present, usage stays 0 and we still count requests.
            stream_options: { include_usage: true } as any,
          });

          for await (const chunk of streamResp as any) {
            const delta = chunk?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              streamedText += delta;
              controller.enqueue(encoder.encode(delta));
            }

            // If usage arrives in the last chunk (include_usage), capture it.
            const u = chunk?.usage;
            if (u?.prompt_tokens != null) finalInputTokens = u.prompt_tokens;
            if (u?.completion_tokens != null) finalOutputTokens = u.completion_tokens;
          }

          // update usage at the end (best-effort)
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
          // If stream fails, close cleanly.
          controller.enqueue(encoder.encode("\n\n[Error: streaming failed]\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    console.error("/api/chat error:", err);
    return NextResponse.json(
      { error: "The coaching service is temporarily unavailable. Please try again shortly." },
      { status: 500 }
    );
  }
}
