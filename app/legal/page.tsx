// app/legal/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Legal Disclaimer
          </h1>
          <Link
            href="/"
            className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
          >
            ← Back
          </Link>
        </div>

        <p className="mt-6 text-slate-300 leading-relaxed">
          Dr. Brett GPT is an AI Coaching Assistant designed to provide general coaching
          principles, strategies, and guidance related to performance, the mental game,
          personal growth, and mindset.
        </p>

        <section className="mt-10 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">1) Nature of Guidance and Scope</h2>
            <p className="mt-2 text-slate-300 leading-relaxed">
              The guidance is coaching-oriented and based on Dr. Brett’s framework:
              Presence, Patience, Perspective, Poise, Perseverance.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">2) Not a Substitute for Professional Care</h2>
            <ul className="mt-2 list-disc pl-6 text-slate-300 leading-relaxed space-y-2">
              <li>
                Dr. Brett GPT is <span className="font-semibold">not</span> a medical provider,
                therapist, psychologist, or emergency service.
              </li>
              <li>
                It does <span className="font-semibold">not</span> provide medical, psychological,
                therapeutic, crisis intervention, diagnosis, or treatment.
              </li>
              <li>
                It does <span className="font-semibold">not</span> provide legal, financial, or
                specific investment advice.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">3) Crisis Protocol</h2>
            <p className="mt-2 text-slate-300 leading-relaxed">
              If you are in crisis or may harm yourself or others, stop using the service and
              seek immediate professional help.
            </p>
            <p className="mt-2 text-slate-300 leading-relaxed">
              If you are in the U.S., you can call or text <span className="font-semibold">988</span>.
              If outside the U.S., contact your local emergency number or local crisis hotline.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">4) “As Is” and No Warranty</h2>
            <p className="mt-2 text-slate-300 leading-relaxed">
              Dr. Brett GPT is provided “as is” and “as available.” We make no warranties
              regarding accuracy, completeness, or suitability for your individual situation.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">5) User Responsibility and Limitation of Liability</h2>
            <p className="mt-2 text-slate-300 leading-relaxed">
              You are solely responsible for how you interpret and apply any guidance. By using
              Dr. Brett GPT, you agree that Dr. Brett, Role Model Academy, and associated entities
              are not liable for damages or losses resulting from reliance on the AI’s responses.
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-400">
          This page is a platform disclaimer and does not constitute legal advice.
        </div>
      </div>
    </main>
  );
}
