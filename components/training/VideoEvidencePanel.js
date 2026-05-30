import { useState } from 'react'
import { Video, Eye, CheckCircle, AlertTriangle } from 'lucide-react'

export default function VideoEvidencePanel({ evidence, evidenceValid, onView, requestLabel }) {
  const [viewed, setViewed] = useState(false)

  const handleView = () => {
    setViewed(true)
    if (onView) onView()
  }

  return (
    <div className={`card-glass rounded-2xl border overflow-hidden transition-all duration-300 ${
      viewed ? (evidenceValid ? 'border-gsrp-teal/30' : 'border-amber-500/30') : 'border-gsrp-orange/30 animate-pulse-subtle'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              viewed ? (evidenceValid ? 'bg-gsrp-teal/20' : 'bg-amber-500/20') : 'bg-gsrp-orange/20'
            }`}>
              <Video size={14} className={viewed ? (evidenceValid ? 'text-gsrp-teal-light' : 'text-amber-400') : 'text-gsrp-orange'} />
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-wider ${
                viewed ? (evidenceValid ? 'text-gsrp-teal-light' : 'text-amber-400') : 'text-gsrp-orange'
              }`}>
                {viewed ? 'Evidence Reviewed' : requestLabel ? 'Details Available' : 'Evidence Available'}
              </span>
              {!viewed && (
                <span className="text-[10px] text-gsrp-teal-light/30 ml-2">Required</span>
              )}
            </div>
          </div>
          {viewed ? (
            evidenceValid
              ? <CheckCircle size={16} className="text-gsrp-teal-light" />
              : <AlertTriangle size={16} className="text-amber-400" />
          ) : (
            <Eye size={16} className="text-gsrp-orange" />
          )}
        </div>

        {viewed ? (
          <div className={`rounded-xl p-3.5 border ${
            evidenceValid
              ? 'bg-black/30 border-gsrp-teal/10'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                evidenceValid ? 'bg-gsrp-teal-light' : 'bg-amber-400'
              }`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-gsrp-teal-light/40">
                {requestLabel ? 'RP Request Context' : 'Player-submitted Clip'}
              </span>
              {!evidenceValid && (
                <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Evidence Inconclusive
                </span>
              )}
            </div>
            <p className={`text-xs leading-relaxed ${
              evidenceValid ? 'text-gsrp-teal-light/70' : 'text-amber-300/80'
            }`}>
              {evidence.summary}
            </p>
          </div>
        ) : (
          <button
            onClick={handleView}
            className="w-full py-2.5 bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl text-sm font-bold text-gsrp-teal-light/70 hover:border-gsrp-orange/40 hover:text-gsrp-orange transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Eye size={14} />
            {requestLabel || 'Review Evidence'}
          </button>
        )}
      </div>
    </div>
  )
}
