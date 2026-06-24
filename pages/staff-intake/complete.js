import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function StaffIntakeComplete() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <section className="relative z-10 w-full max-w-md tac-panel rounded-3xl p-8 shadow-tac-3 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl border border-gsrp-orange/25 bg-gradient-to-br from-gsrp-orange/15 to-gsrp-teal/12 flex items-center justify-center mb-6">
          <CheckCircle2 size={28} className="text-gsrp-orange" />
        </div>

        <h1 className="font-display text-white font-extrabold text-2xl tracking-tight mb-3">
          Authorisation Complete
        </h1>

        <p className="text-gsrp-teal-light/60 text-sm leading-relaxed mb-7">
          You can go back to Discord and follow the next steps.
        </p>

        <p className="text-gsrp-teal-light/35 text-[11px] uppercase tracking-[0.18em] mb-7">
          Staff fast pass / transfer
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center bg-gsrp-orange hover:bg-gsrp-orange/90 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-colors duration-200 w-full"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
