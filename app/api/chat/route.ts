import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Use a modern model; switch if you want
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOTAL_CHARS = 8000;

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

type ChatMessage = { role: "user" | "assistant"; content: string };

function sanitizeMessages(input: any): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }))
    .slice(-MAX_MESSAGES);
}

function countChars(messages: ChatMessage[]) {
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

export async function POST(req: Request) {
  try {
    // --- Supabase server client using cookies ---
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ANON is correct here; keep RLS on
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // ignore cookie set errors in route handlers
            }
          },
        },
      }
    );

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

    const cleaned = sanitizeMessages(body.messages);
    if (!cleaned.length) {
      return NextResponse.json({ error: "No valid messages provided" }, { status: 400 });
    }

    if (countChars(cleaned) > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "Message content too long" }, { status: 413 });
    }

    // --- OpenAI (Responses API) ---
    // We pass "input" as structured messages + instructions.
    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: cleaned.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      })),
      // keep it coach-y and concise
      temperature: 0.6,
      max_output_tokens: 450,
    });

    const reply = response.output_text?.trim();
    if (!reply) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("/api/chat error:", err);
    return NextResponse.json(
      { error: "The coaching service is temporarily unavailable. Please try again shortly." },
      { status: 500 }
    );
  }
}
