"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "idle" | "verifying" | "success" | "error";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id") || "", [searchParams]);

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let canceled = false;

    async function verify() {
      if (!sessionId) {
        setStatus("error");
        setMessage("Missing session id.");
        return;
      }

      setStatus("verifying");
      setMessage("");

      try {
        const res = await fetch("/api/paywall/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await res.json().catch(() => ({}));

        if (canceled) return;

        if (res.ok && data?.ok) {
          setStatus("success");
          setMessage("Payment verified. Your access is now active.");
          return;
        }

        setStatus("error");
        setMessage(
          data?.error
            ? `Could not verify payment (${data.error}).`
            : "Could not verify payment."
        );
      } catch {
        if (canceled) return;
        setStatus("error");
        setMessage("Verification failed due to a network/server issue.");
      }
    }

    verify();

    return () => {
      canceled = true;
    };
  }, [sessionId]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
        <h1 className="text-xl font-semibold text-white">Billing Success</h1>

        <div className="mt-3 text-sm text-slate-300">
          {status === "verifying" && <p>Verifying your payment…</p>}
          {status === "success" && <p>{message}</p>}
          {status === "error" && <p>{message}</p>}
          {status === "idle" && <p>Preparing verification…</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            Continue
          </Link>

          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 text-white px-4 py-2 text-sm hover:bg-white/5"
          >
            Back to Pricing
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-400 break-all">
          Session: {sessionId || "—"}
        </p>
      </div>
    </main>
  );
}
