import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const HEARTBEAT_MS = 30_000; // ping every 30s

export default function PresenceBar({ page = '/' }) {
  const { data: session } = useSession();
  const [viewers, setViewers] = useState([]);
  const [tooltip, setTooltip] = useState(null); // userId of hovered avatar

  const sendHeartbeat = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/presence?page=${encodeURIComponent(page)}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setViewers(data.viewers || []);
      }
    } catch {}
  }, [session, page]);

  useEffect(() => {
    if (!session) return;

    // Initial heartbeat
    sendHeartbeat();

    // Recurring heartbeat
    const interval = setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Leave on unmount / page unload
    const leave = () => {
      navigator.sendBeacon(`/api/presence?page=${encodeURIComponent(page)}`, '');
      // sendBeacon doesn't support DELETE, so we call it quietly
      fetch(`/api/presence?page=${encodeURIComponent(page)}`, { method: 'DELETE', keepalive: true }).catch(() => {});
    };

    window.addEventListener('beforeunload', leave);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', leave);
      leave();
    };
  }, [session, sendHeartbeat, page]);

  // Don't render if nobody or only the current user
  const others = viewers.filter(v => v.userId !== session?.user?.id);
  const all = viewers; // include self for the full count

  if (all.length === 0) return null;

  return (
    <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
      {/* Label */}
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gsrp-teal-light/30 whitespace-nowrap">
        Online now
      </span>

      {/* Avatar stack */}
      <div className="flex items-center">
        {all.slice(0, 12).map((viewer, i) => {
          const isSelf = viewer.userId === session?.user?.id;
          return (
            <div
              key={viewer.userId}
              className="relative group/av"
              style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: all.length - i }}
              onMouseEnter={() => setTooltip(viewer.userId)}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Avatar ring */}
              <div
                className={`w-8 h-8 rounded-full border-2 overflow-hidden transition-all duration-200 group-hover/av:scale-110 group-hover/av:z-50 relative cursor-default ${
                  isSelf
                    ? 'border-gsrp-orange shadow-lg shadow-gsrp-orange/30'
                    : 'border-gsrp-dark/80 hover:border-gsrp-teal/60'
                }`}
              >
                {viewer.image ? (
                  <img
                    src={viewer.image}
                    alt={viewer.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gsrp-dark-surface flex items-center justify-center text-[10px] font-bold text-gsrp-teal-light/60">
                    {viewer.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>

              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-gsrp-dark ring-1 ring-emerald-400/40" />

              {/* Tooltip */}
              {tooltip === viewer.userId && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none z-50"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <div className="bg-gsrp-dark-surface border border-gsrp-dark-border/60 rounded-lg px-2.5 py-1.5 shadow-xl text-center">
                    <p className="text-white text-[11px] font-bold leading-tight">
                      {viewer.name}
                      {isSelf && (
                        <span className="text-gsrp-orange ml-1 text-[9px] font-black uppercase tracking-wide">you</span>
                      )}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="w-2 h-2 bg-gsrp-dark-surface border-r border-b border-gsrp-dark-border/60 rotate-45 -mt-1" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {all.length > 12 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-gsrp-dark/80 bg-gsrp-dark-surface flex items-center justify-center text-[10px] font-bold text-gsrp-teal-light/50"
            style={{ marginLeft: '-8px', zIndex: 0 }}
          >
            +{all.length - 12}
          </div>
        )}
      </div>

      {/* Count */}
      <span className="text-[10px] text-gsrp-teal-light/25 font-medium">
        {all.length === 1 ? '1 person' : `${all.length} people`}
      </span>

      {/* Pulse dot */}
      <span className="relative flex h-2 w-2 ml-0.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
    </div>
  );
}
