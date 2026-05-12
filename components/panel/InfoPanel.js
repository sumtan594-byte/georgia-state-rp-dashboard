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
      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gsrp-dark-border/50">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              tab === t.key
                ? 'text-gsrp-orange border-b-2 border-gsrp-orange'
                : 'text-gsrp-teal-light/40 hover:text-white'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {tab === 'vehicles' && (
          <div className="space-y-1">
            {vehicles.length === 0 && <p className="text-gsrp-teal-light/20 text-[11px] text-center py-8">No vehicles</p>}
            {vehicles.map((v, i) => (
              <div key={i} className="px-2 py-1.5 rounded-lg bg-gsrp-dark-surface/30 border border-gsrp-dark-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.ColorHex || '#666' }} />
                  <span className="text-xs font-semibold text-white truncate">{v.Name}</span>
                </div>
                <div className="text-[10px] text-gsrp-teal-light/40 mt-0.5">
                  {v.Owner} · {v.Plate}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'staff' && (
          <div className="space-y-3">
            {staff.Admins && Object.keys(staff.Admins).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gsrp-sunset/60 mb-1">Admins</p>
                {Object.entries(staff.Admins).map(([id, name]) => (
                  <div key={id} className="px-2 py-1 text-xs text-white">{name}</div>
                ))}
              </div>
            )}
            {staff.Mods && Object.keys(staff.Mods).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gsrp-orange/60 mb-1">Mods</p>
                {Object.entries(staff.Mods).map(([id, name]) => (
                  <div key={id} className="px-2 py-1 text-xs text-white">{name}</div>
                ))}
              </div>
            )}
            {staff.Helpers && Object.keys(staff.Helpers).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gsrp-teal-light/40 mb-1">Helpers</p>
                {Object.entries(staff.Helpers).map(([id, name]) => (
                  <div key={id} className="px-2 py-1 text-xs text-white">{name}</div>
                ))}
              </div>
            )}
            {(!staff.Admins && !staff.Mods && !staff.Helpers) && (
              <p className="text-gsrp-teal-light/20 text-[11px] text-center py-8">No staff data</p>
            )}
          </div>
        )}

        {tab === 'calls' && (
          <div className="space-y-1">
            {emergencyCalls.length === 0 && <p className="text-gsrp-teal-light/20 text-[11px] text-center py-8">No active calls</p>}
            {emergencyCalls.map((c, i) => (
              <div key={i} className="px-2 py-1.5 rounded-lg bg-gsrp-dark-surface/30 border border-gsrp-dark-border/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gsrp-sunset">#{c.CallNumber}</span>
                  <span className="text-xs font-semibold text-white">{c.Team}</span>
                </div>
                {c.Description && <p className="text-[10px] text-gsrp-teal-light/60 mt-0.5 truncate">{c.Description}</p>}
                {c.PositionDescriptor && <p className="text-[9px] text-gsrp-teal-light/30">{c.PositionDescriptor}</p>}
                <p className="text-[9px] text-gsrp-teal-light/20">
                  {new Date(c.StartedAt * 1000).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
