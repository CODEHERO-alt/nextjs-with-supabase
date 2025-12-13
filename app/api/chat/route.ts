import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

/* -------------------------------------------------------------------------- */
/* OpenAI */
/* -------------------------------------------------------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* -------------------------------------------------------------------------- */
/* Configuration */
/* -------------------------------------------------------------------------- */

const MODEL = "gpt-4o-mini";

// Abuse protection
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOTAL_CHARS = 8000;

/* -------------------------------------------------------------------------- */
/* Locked System Prompt */
/* -------------------------------------------------------------------------- */

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
`;

/* -------------------------------------------------------------------------- */
/* Types */
/* -------------------------------------------------------------------------- */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Route */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    /* ---------------- Supabase (Server-side) ---------------- */

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    /* ---------------- Paid Enforcement ---------------- */

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_paid")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_paid) {
      return NextResponse.json(
        { error: "Paid access required" },
        { status: 402 } // Payment Required
      );
    }

    /* ---------------- Input Validation ---------------- */

    const body = await req.json();

    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const cleanedMessages = sanitizeMessages(body.messages);

    if (!cleanedMessages.length) {
      return NextResponse.json(
        { error: "No valid messages provided" },
        { status: 400 }
      );
    }

    if (countChars(cleanedMessages) > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        { error: "Message content too long" },
        { status: 413 }
      );
    }

    /* ---------------- OpenAI Call ---------------- */

    const finalMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...cleanedMessages,
    ];

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: finalMessages,
      temperature: 0.6,
      max_tokens: 450,
    });

    const reply = completion.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        { error: "No response generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("/api/chat error:", err);

    return NextResponse.json(
      {
        error:
          "The coaching service is temporarily unavailable. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}
