export type TrackerMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

export type TrackingSignals = {
  focus: number;
  pressure: number;
  recovery: number;
  clarity: number;
  momentum: number;
  consistency: number;
  intent: string;
  tempo: string;
  riskFlag: string;
};

const STRESS_WORDS = [
  "panic",
  "choke",
  "tight",
  "overwhelmed",
  "anxious",
  "rush",
  "stressed",
  "pressure",
  "fear",
  "embarrassed",
  "yips",
  "lost",
  "mistake",
  "slump",
];

const CONTROL_WORDS = [
  "calm",
  "steady",
  "breathe",
  "focus",
  "reset",
  "control",
  "poise",
  "composed",
  "patient",
  "clarity",
  "smooth",
  "rhythm",
  "flow",
];

const INTENT_VERBS = [
  "need",
  "want",
  "help",
  "fix",
  "handle",
  "prepare",
  "train",
  "execute",
  "calm",
  "focus",
  "commit",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function countMatches(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.reduce((acc, w) => (lower.includes(w) ? acc + 1 : acc), 0);
}

function extractIntent(text: string) {
  const lower = text.toLowerCase();
  const hit = INTENT_VERBS.find((verb) => lower.includes(verb));
  if (!hit) return "Calibrate performance";
  const firstSentence = text.split(/[.!?]/)[0]?.trim();
  if (firstSentence) return firstSentence.slice(0, 72);
  return "Calibrate performance";
}

function scoreClarity(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 40;
  const sentences = trimmed.split(/[.!?]/).filter(Boolean);
  const avgSentenceLength = trimmed.length / Math.max(sentences.length, 1);
  const clarityBase = 100 - Math.abs(avgSentenceLength - 80) * 0.6;
  const punctuationBonus = /[,:;]/.test(trimmed) ? 6 : 0;
  return clamp(clarityBase + punctuationBonus);
}

function scoreFocus(text: string) {
  const lengthScore = clamp((text.length / 260) * 100, 20, 90);
  const specificity = /\b\d{1,2}\b|\bquarter\b|\bset\b|\bgame\b|\bminute\b|\bpoint\b/i.test(text) ? 12 : 0;
  return clamp(lengthScore + specificity);
}

function scorePressure(text: string) {
  const stressHits = countMatches(text, STRESS_WORDS);
  const controlHits = countMatches(text, CONTROL_WORDS);
  const base = 45 + stressHits * 9 - controlHits * 5;
  return clamp(base);
}

function scoreRecovery(text: string) {
  const controlHits = countMatches(text, CONTROL_WORDS);
  const stressHits = countMatches(text, STRESS_WORDS);
  const base = 55 + controlHits * 8 - stressHits * 4;
  return clamp(base);
}

function inferTempo(messageCount: number, minutes: number) {
  if (minutes <= 0) return "Warmup";
  const pace = messageCount / minutes;
  if (pace >= 1.2) return "Rapid";
  if (pace >= 0.6) return "Steady";
  return "Deep";
}

function scoreMomentum(messageCount: number, minutes: number) {
  if (minutes <= 0) return 45;
  const pace = messageCount / minutes;
  return clamp(40 + pace * 40);
}

function scoreConsistency(messages: TrackerMessage[]) {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.length);
  if (userMessages.length < 2) return 55;
  const avg = userMessages.reduce((a, b) => a + b, 0) / userMessages.length;
  const variance = userMessages.reduce((acc, len) => acc + Math.pow(len - avg, 2), 0) / userMessages.length;
  const std = Math.sqrt(variance);
  return clamp(90 - std * 0.4);
}

export function deriveTrackingSignals(messages: TrackerMessage[]): TrackingSignals {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const totalMessages = messages.filter((m) => m.role !== "system").length;

  const timestamps = messages
    .filter((m) => m.createdAt)
    .map((m) => m.createdAt)
    .sort((a, b) => a - b);

  const durationMs = timestamps.length ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
  const minutes = durationMs > 0 ? durationMs / 60000 : 0;

  const focus = scoreFocus(lastUser);
  const pressure = scorePressure(lastUser);
  const recovery = scoreRecovery(lastAssistant || lastUser);
  const clarity = scoreClarity(lastUser);
  const momentum = scoreMomentum(totalMessages, minutes || 1);
  const consistency = scoreConsistency(messages);
  const tempo = inferTempo(totalMessages, minutes || 1);
  const intent = extractIntent(lastUser);

  const riskFlag = pressure > 70 && recovery < 50 ? "High pressure detected" : "Stable";

  return {
    focus,
    pressure,
    recovery,
    clarity,
    momentum,
    consistency,
    intent,
    tempo,
    riskFlag,
  };
}

export function buildTelemetryPayload(params: {
  sessionId: string;
  signals: TrackingSignals;
  messages: TrackerMessage[];
}) {
  const lastUser = [...params.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastAssistant = [...params.messages].reverse().find((m) => m.role === "assistant")?.content ?? "";

  return {
    sessionId: params.sessionId,
    signals: params.signals,
    summary: `${params.signals.intent} • Focus ${Math.round(params.signals.focus)} • Pressure ${Math.round(
      params.signals.pressure
    )}`,
    sample: {
      user: lastUser.slice(0, 280),
      assistant: lastAssistant.slice(0, 280),
    },
    source: "chat_client_v2",
  };
}
