"use client";

import { useState } from "react";

export default function PlanCard({
  title,
  subtitle,
  price,
  usage,
  bestFor,
  points,
  actionText,
  plan,
  highlight,
  badgeText,
}: {
  title: string;
  subtitle: string;
  price: string;
  usage: string;
  bestFor: string;
  points: string[];
  actionText: string;
  plan: string;
  highlight?: boolean;
  badgeText?: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  const baseClasses =
    "rounded-2xl border p-6 flex flex-col h-full bg-gradient-to-b";
  const highlightClasses = highlight
    ? "border-purple-400/40 from-purple-500/10 to-slate-950/40 shadow-[0_0_40px_rgba(168,85,247,0.35)]"
    : "border-white/10 from-white/5 to-slate-950/30";

  return (
    <div className={`${baseClasses} ${highlightClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {subtitle}
          </div>
          <div className="mt-1 text-lg font-semibold">{title}</div>
          <div className="mt-2 text-3xl font-semibold">{price}</div>
          <div className="mt-1 text-xs text-slate-300">{usage}</div>
        </div>
        {highlight && (
          <span className="rounded-full border border-purple-300/30 bg-purple-500/20 px-2 py-1 text-[10px] text-purple-100">
            {badgeText ?? "Recommended"}
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-300">{bestFor}</p>

      <ul className="mt-5 space-y-2 text-sm text-slate-200">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <form
        action="/api/paywall/checkout"
        method="POST"
        className="mt-6 pt-4 border-t border-white/10"
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="plan" value={plan} />
        <button
          disabled={submitting}
          className="w-full rounded-xl bg-white text-slate-950 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Redirecting…" : actionText}
        </button>
      </form>
    </div>
  );
}
