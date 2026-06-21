import { useState, useEffect } from 'react'
import { Phone, MapPin, User } from 'lucide-react'

export default function ModCallPopup({ modCall, onRespond }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="w-80 card-glass rounded-2xl border border-gsrp-orange/40 shadow-2xl shadow-gsrp-orange/10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gsrp-orange via-gsrp-orange-light to-gsrp-orange" />

        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gsrp-orange/20">
              <Phone size={14} className="text-gsrp-orange animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-gsrp-orange uppercase tracking-wider">Mod Call</span>
              <span className="text-[10px] text-gsrp-teal-light/30 ml-2">Incoming</span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2.5">
              <User size={12} className="text-gsrp-teal-light/40 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gsrp-teal-light/50 font-medium">Caller</p>
                <p className="text-sm font-bold text-white truncate">{modCall.callerName}</p>
              </div>
            </div>
            {modCall.location && (
              <div className="flex items-start gap-2.5">
                <MapPin size={12} className="text-gsrp-teal-light/40 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gsrp-teal-light/50 font-medium">Location</p>
                  <p className="text-sm text-gsrp-teal-light/70 truncate">{modCall.location}</p>
                </div>
              </div>
            )}
            <div className="mt-2 p-2.5 bg-gsrp-dark-surface/50 rounded-xl border border-gsrp-dark-border/30">
              <p className="text-xs text-gsrp-teal-light/60 leading-relaxed">
                &ldquo;{modCall.reason}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={onRespond}
            className="w-full py-2.5 bg-gsrp-orange text-white rounded-xl text-sm font-bold hover:bg-gsrp-orange/90 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Phone size={14} />
            Respond
          </button>
        </div>
      </div>
    </div>
  )
}
