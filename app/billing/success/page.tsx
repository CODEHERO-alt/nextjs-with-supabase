import { Suspense } from "react";
import SuccessClient from "./success-client";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SuccessClient />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
        <h1 className="text-xl font-semibold text-white">Billing Success</h1>
        <div className="mt-3 text-sm text-slate-300">
          <p>Loading…</p>
        </div>
      </div>
    </main>
  );
}
