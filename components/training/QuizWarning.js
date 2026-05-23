import { useState } from 'react';
import { AlertTriangle, BookOpen, X, Shield } from 'lucide-react';
import Link from 'next/link';

export default function QuizWarning({ onProceed, onGoToHandbook }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      <div className="relative w-full max-w-lg card-glass rounded-3xl border border-gsrp-orange/20 p-8 shadow-2xl shadow-gsrp-orange/5">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gsrp-orange via-gsrp-gold to-gsrp-orange rounded-t-3xl" />

        {/* Close button */}
        <button
          onClick={onGoToHandbook}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gsrp-teal-light/40 hover:text-white hover:bg-gsrp-dark-surface/60 transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gsrp-orange/10 border border-gsrp-orange/20 mb-6 mx-auto">
          <AlertTriangle size={28} className="text-gsrp-orange" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-white text-center mb-2">
          Read the Handbook First
        </h2>

        {/* Warning message */}
        <div className="bg-gsrp-orange/10 border border-gsrp-orange/20 rounded-xl p-4 mb-6">
          <p className="text-gsrp-orange-light text-sm font-bold text-center leading-relaxed">
            If you did not read the handbook properly, you <span className="text-white font-black">WILL</span> fail.
          </p>
          <p className="text-gsrp-teal-light/60 text-xs text-center mt-2">
            The quiz covers detailed information from all sections of the Staff Handbook.
            A minimum of <span className="text-gsrp-orange font-bold">17/20</span> correct answers is required to pass.
          </p>
        </div>

        {/* Handbook link */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Link
            href="/training/handbook"
            className="flex items-center gap-2 px-5 py-2.5 bg-gsrp-teal/10 border border-gsrp-teal/30 rounded-xl text-gsrp-teal-light text-sm font-bold hover:bg-gsrp-teal/20 transition-all cursor-pointer"
          >
            <BookOpen size={16} />
            Read the Staff Handbook
          </Link>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gsrp-dark-border bg-gsrp-dark-surface accent-gsrp-orange cursor-pointer"
          />
          <span className="text-sm text-gsrp-teal-light/60 group-hover:text-gsrp-teal-light/80 transition-colors">
            I have read the Staff Handbook and am ready to take the quiz.
          </span>
        </label>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onGoToHandbook}
            className="flex-1 px-5 py-3 bg-gsrp-dark-surface border border-gsrp-dark-border rounded-xl text-gsrp-teal-light/60 text-sm font-bold hover:border-gsrp-teal/30 hover:text-gsrp-teal-light transition-all cursor-pointer"
          >
            Read Handbook First
          </button>
          <button
            onClick={onProceed}
            disabled={!confirmed}
            className={`flex-1 px-5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              confirmed
                ? 'bg-gsrp-orange text-white hover:bg-gsrp-orange/90 shadow-lg shadow-gsrp-orange/20'
                : 'bg-gsrp-dark-surface text-gsrp-teal-light/20 border border-gsrp-dark-border cursor-not-allowed'
            }`}
          >
            <Shield size={16} />
            Start Quiz
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-gsrp-teal-light/20 mt-4">
          You have 6 hours between failed attempts. Choose wisely.
        </p>
      </div>
    </div>
  );
}
