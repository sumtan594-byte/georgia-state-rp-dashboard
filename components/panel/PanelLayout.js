import { Briefcase, Info, Map, Users2 } from 'lucide-react';

const TABS = [
  { key: 'map', icon: Map, label: 'Map' },
  { key: 'players', icon: Users2, label: 'Players' },
  { key: 'info', icon: Info, label: 'Details' },
  { key: 'staff', icon: Briefcase, label: 'Staff' },
];

export default function PanelLayout({ playerList, liveMap, infoPanel, staffPanel, commandBar, mobileView, setMobileView, moduleView = 'live' }) {
  if (moduleView === 'staff') {
    return (
      <>
        <div className="hidden md:block flex-1 min-h-0 p-2">
          <div className="h-full overflow-hidden rounded-lg card-glass">
            {staffPanel}
          </div>
        </div>

        <div className="md:hidden flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">{staffPanel}</div>
          <MobileNav mobileView={mobileView} setMobileView={setMobileView} />
        </div>
      </>
    );
  }

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
          <div className={`absolute inset-0 overflow-y-auto ${mobileView === 'staff' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>{staffPanel}</div>
        </div>

        <MobileNav mobileView={mobileView} setMobileView={setMobileView} />
      </div>
    </>
  );
}

function MobileNav({ mobileView, setMobileView }) {
  return (
    <nav className="flex-shrink-0 flex bg-gsrp-dark-card/90 backdrop-blur-xl border-t border-gsrp-dark-border/50">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => setMobileView(tab.key)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            mobileView === tab.key
              ? 'text-gsrp-orange'
              : 'text-white/30 hover:text-white/60'
          }`}
        >
          <tab.icon size={16} />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
