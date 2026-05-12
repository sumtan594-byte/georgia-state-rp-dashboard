import { useState } from 'react';
import { Car, Shield, PhoneCall } from 'lucide-react';

const TABS = [
  { key: 'vehicles', icon: Car, label: 'Vehicles' },
  { key: 'staff', icon: Shield, label: 'Staff' },
  { key: 'calls', icon: PhoneCall, label: 'Calls' },
];

export default function InfoPanel({ vehicles = [], staff = {}, emergencyCalls = [] }) {
  const [tab, setTab] = useState('vehicles');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex border-b border-gsrp-orange/20">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
              tab === t.key
                ? 'text-white bg-gradient-to-b from-gsrp-orange/20 to-transparent'
                : 'text-white/30 hover:text-white/70'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tab === 'vehicles' && (
          vehicles.length === 0
            ? <p className="text-white/25 text-[11px] text-center py-8">No vehicles</p>
            : vehicles.map((v, i) => (
              <div key={i} className="px-2.5 py-2 rounded-lg bg-gradient-to-br from-gsrp-orange/10 to-gsrp-gold/5 border border-gsrp-orange/20">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/30" style={{ backgroundColor: v.ColorHex || '#555' }} />
                  <span className="text-xs font-semibold text-white truncate">{v.Name}</span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5 ml-4.5">
                  {v.Owner} · {v.Plate}
                </div>
              </div>
            ))
        )}

        {tab === 'staff' && (
          staff.Admins && Object.keys(staff.Admins).length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gsrp-sunset/80 mb-1.5 px-1">Admins</p>
              {Object.entries(staff.Admins).map(([id, name]) => (
                <div key={id} className="px-2.5 py-1.5 text-xs text-white/90 bg-gradient-to-r from-gsrp-orange/15 to-transparent rounded-lg mb-0.5 border border-gsrp-orange/10">{name}</div>
              ))}
            </div>
          ) : null
        )}
        {tab === 'staff' && staff.Mods && Object.keys(staff.Mods).length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange/80 mb-1.5 px-1">Mods</p>
            {Object.entries(staff.Mods).map(([id, name]) => (
              <div key={id} className="px-2.5 py-1.5 text-xs text-white/90 bg-gradient-to-r from-gsrp-orange/10 to-transparent rounded-lg mb-0.5 border border-gsrp-orange/10">{name}</div>
            ))}
          </div>
        )}
        {tab === 'staff' && staff.Helpers && Object.keys(staff.Helpers).length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 px-1">Helpers</p>
            {Object.entries(staff.Helpers).map(([id, name]) => (
              <div key={id} className="px-2.5 py-1.5 text-xs text-white/90 bg-gradient-to-r from-white/10 to-transparent rounded-lg mb-0.5 border border-white/10">{name}</div>
            ))}
          </div>
        )}
        {tab === 'staff' && (!staff.Admins && !staff.Mods && !staff.Helpers) && (
          <p className="text-white/25 text-[11px] text-center py-8">No staff data</p>
        )}

        {tab === 'calls' && (
          emergencyCalls.length === 0
            ? <p className="text-white/25 text-[11px] text-center py-8">No active calls</p>
            : emergencyCalls.map((c, i) => (
              <div key={i} className="px-2.5 py-2 rounded-lg bg-gradient-to-br from-gsrp-orange/10 to-gsrp-gold/5 border border-gsrp-orange/20">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gsrp-sunset">#{c.CallNumber}</span>
                  <span className="text-xs font-semibold text-white">{c.Team}</span>
                </div>
                {c.Description && <p className="text-[10px] text-white/60 mt-0.5 truncate">{c.Description}</p>}
                {c.PositionDescriptor && <p className="text-[9px] text-white/30">{c.PositionDescriptor}</p>}
                <p className="text-[9px] text-white/20">{new Date(c.StartedAt * 1000).toLocaleTimeString()}</p>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
