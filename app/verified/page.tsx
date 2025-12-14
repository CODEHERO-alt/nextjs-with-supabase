"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifiedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/start";

  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    let cancelled = false;

    (async () => {
      const confetti = (await import("canvas-confetti")).default;

      const start = Date.now();
      const duration = 7000; // 🎉 total celebration time (7s)

      interval = setInterval(() => {
        if (cancelled) return;

        const elapsed = Date.now() - start;
        if (elapsed > duration) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 40,
          spread: 80,
          startVelocity: 30,
          gravity: 0.9,
          origin: {
            x: Math.random(),
            y: Math.random() * 0.6,
          },
        });
      }, 450); // smooth waves, not overwhelming
    })();

    redirectTimer = setTimeout(() => {
      router.replace(next);
    }, 7000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(redirectTimer);
    };
  }, [router, next]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-semibold">Your account is verified!</h1>
        <p className="text-muted-foreground">
          Welcome aboard — your email has been successfully confirmed.
        </p>

        <button
          onClick={() => router.replace(next)}
          className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90"
        >
          Continue now
        </button>

        <p className="text-xs text-muted-foreground">
          You’ll be redirected automatically…
        </p>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">✅</div>
            <p className="text-muted-foreground">Verifying your account…</p>
          </div>
        </div>
      }
    >
      <VerifiedInner />
    </Suspense>
  );
}
