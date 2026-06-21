import { Map, Users2, Info } from 'lucide-react';

const TABS = [
  { key: 'map', icon: Map, label: 'Map' },
  { key: 'players', icon: Users2, label: 'Players' },
  { key: 'info', icon: Info, label: 'Details' },
];

export default function PanelLayout({ playerList, liveMap, infoPanel, commandBar, mobileView, setMobileView }) {
  return (
    <>
      <div className="hidden md:grid md:grid-cols-[320px_1fr_340px] gap-2 flex-1 p-2 min-h-0">
        <div className="overflow-hidden rounded-lg card-glass flex flex-col min-h-0">
          {playerList}
        </div>
        <div className="overflow-hidden rounded-lg card-glass relative min-h-0">
          {liveMap}
        </div>
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex-1 overflow-hidden rounded-lg card-glass flex flex-col min-h-0">
            {infoPanel}
          </div>
          {commandBar && (
            <div className="flex-shrink-0 rounded-lg card-glass">
              {commandBar}
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden flex flex-col h-full">
        <div className="flex-1 relative overflow-hidden">
          <div className={`absolute inset-0 ${mobileView === 'map' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>{liveMap}</div>
          <div className={`absolute inset-0 overflow-y-auto ${mobileView === 'players' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>{playerList}</div>
          <div className={`absolute inset-0 overflow-y-auto ${mobileView === 'info' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
            <div className="p-3 h-full">{infoPanel}</div>
            {commandBar && <div className="p-3 pt-0">{commandBar}</div>}
          </div>
        </div>

        <nav className="flex-shrink-0 flex bg-gsrp-dark-card/90 backdrop-blur-xl border-t border-gsrp-dark-border/50">
          {TABS.map(tab => {
            const active = mobileView === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMobileView(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex-1 flex flex-col items-center gap-1 py-3 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 cursor-pointer ${
                  active ? 'text-gsrp-orange' : 'text-white/35 hover:text-white/65'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-9 rounded-full bg-gradient-to-r from-gsrp-orange-light to-gsrp-orange shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                )}
                <tab.icon size={16} strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
