import { Car, PhoneCall, Activity } from 'lucide-react';

export default function InfoPanel({ vehicles = [], emergencyCalls = [] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {emergencyCalls.length > 0 && (
          <Section icon={PhoneCall} label="Active Calls" count={emergencyCalls.length} color="text-gsrp-orange">
            {emergencyCalls.map((c, i) => (
              <div key={i} className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-gsrp-dark-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gsrp-orange">#{c.CallNumber}</span>
                  <span className="text-xs font-semibold text-white/80">{c.Team}</span>
                </div>
                {c.Description && <p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">{c.Description}</p>}
                {c.PositionDescriptor && <p className="text-[9px] text-white/25">{c.PositionDescriptor}</p>}
              </div>
            ))}
          </Section>
        )}

        {vehicles.length > 0 && (
          <Section icon={Car} label="Vehicles" count={vehicles.length} color="text-gsrp-teal-light">
            {vehicles.slice(0, 15).map((v, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white/20" style={{ backgroundColor: v.ColorHex || '#555' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 truncate font-medium">{v.Name}</p>
                  <p className="text-[10px] text-white/30 truncate">{v.Owner} · {v.Plate}</p>
                </div>
              </div>
            ))}
            {vehicles.length > 15 && (
              <p className="text-[10px] text-white/25 text-center py-1">+{vehicles.length - 15} more</p>
            )}
          </Section>
        )}

        {emergencyCalls.length === 0 && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/20">
            <Activity size={24} className="mb-2 opacity-50" />
            <p className="text-xs">No server data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, label, count, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className={color} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</span>
        <span className="text-[9px] text-white/30 ml-auto">{count}</span>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
