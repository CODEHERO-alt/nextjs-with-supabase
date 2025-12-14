"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function VerifiedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/start";

  useEffect(() => {
    // Confetti burst
    confetti({
      particleCount: 160,
      spread: 70,
      origin: { y: 0.6 },
    });

    // A couple extra bursts for a "party" feel
    const t1 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } }), 300);
    const t2 = setTimeout(() => confetti({ particleCount: 90, spread: 110, origin: { y: 0.6 } }), 700);

    // Redirect after a short moment
    const t3 = setTimeout(() => router.replace(next), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [router, next]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-semibold">Your email is verified!</h1>
        <p className="text-muted-foreground">
          Congrats — your account is now active, Now you just have to login. Taking you to the app…
        </p>

        <div className="pt-4">
          <button
            onClick={() => router.replace(next)}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
