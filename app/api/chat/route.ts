import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* ---------------- Configuration ---------------- */

const MODEL = "gpt-4o-mini";

// Hard limits (protect tokens & abuse)
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1_200;
const MAX_TOTAL_CHARS = 8_000;

/* ---------------- System Prompt (LOCKED) ---------------- */

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

/* ---------------- Helpers ---------------- */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

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

/* ---------------- Route ---------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    // Remove any user-supplied system messages (prompt injection defense)
    const cleanedMessages = sanitizeMessages(body.messages);

    if (cleanedMessages.length === 0) {
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

    // 🔒 Enforce OUR system prompt at the top
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
    console.error("API /chat error:", err);

    return NextResponse.json(
      {
        error:
          "The coaching service is temporarily unavailable. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}
