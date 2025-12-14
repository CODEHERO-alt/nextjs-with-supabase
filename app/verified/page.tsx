"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifiedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/start";

  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    (async () => {
      const confetti = (await import("canvas-confetti")).default;

      confetti({
        particleCount: 160,
        spread: 70,
        origin: { y: 0.6 },
      });

      t1 = setTimeout(
        () => confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } }),
        300
      );
      t2 = setTimeout(
        () => confetti({ particleCount: 90, spread: 110, origin: { y: 0.6 } }),
        700
      );

      t3 = setTimeout(() => router.replace(next), 2000);
    })();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
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
          Continue
        </button>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  // ✅ Suspense boundary fixes Next.js prerender error for useSearchParams()
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
