import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST() {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are Dr. Brett GPT." },
      { role: "user", content: "Say hello in one sentence." },
    ],
    max_tokens: 50,
  });

  return NextResponse.json({
    reply: response.choices[0].message.content,
  });
}
