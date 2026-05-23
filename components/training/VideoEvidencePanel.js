import { useState } from 'react'
import { Video, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function VideoEvidencePanel({ evidence, onView }) {
  const [viewed, setViewed] = useState(false)

  const handleView = () => {
    setViewed(true)
    if (onView) onView()
  }

  return (
    <div className={`card-glass rounded-2xl border overflow-hidden transition-all duration-300 ${
      viewed ? 'border-gsrp-teal/30' : 'border-gsrp-orange/30 animate-pulse-subtle'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              viewed ? 'bg-gsrp-teal/20' : 'bg-gsrp-orange/20'
            }`}>
              <Video size={14} className={viewed ? 'text-gsrp-teal-light' : 'text-gsrp-orange'} />
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-wider ${
                viewed ? 'text-gsrp-teal-light' : 'text-gsrp-orange'
              }`}>
                {viewed ? 'Evidence Reviewed' : 'Video Evidence Available'}
              </span>
              {!viewed && (
                <span className="text-[10px] text-gsrp-teal-light/30 ml-2">Required</span>
              )}
            </div>
          </div>
          {viewed ? (
            <CheckCircle size={16} className="text-gsrp-teal-light" />
          ) : (
            <Eye size={16} className="text-gsrp-orange" />
          )}
        </div>

        {viewed ? (
          <div className="bg-black/30 rounded-xl p-3.5 border border-gsrp-teal/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gsrp-teal-light animate-pulse" />
              <span className="text-[10px] text-gsrp-teal-light/40 font-mono uppercase tracking-wider">
                Bodycam Footage — Playback
              </span>
            </div>
            <p className="text-xs text-gsrp-teal-light/70 leading-relaxed">
              {evidence.summary}
            </p>
          </div>
        ) : (
          <button
            onClick={handleView}
            className="w-full py-2.5 bg-gsrp-dark-surface border border-gsrp-dark-border/50 rounded-xl text-sm font-bold text-gsrp-teal-light/70 hover:border-gsrp-orange/40 hover:text-gsrp-orange transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Eye size={14} />
            Request Video Evidence
          </button>
        )}
      </div>
    </div>
  )
}
