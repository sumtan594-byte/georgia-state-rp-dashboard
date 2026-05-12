import { Map, Users2, Info, ScrollText } from 'lucide-react';

const TABS = [
  { key: 'map', icon: Map, label: 'Map' },
  { key: 'players', icon: Users2, label: 'Players' },
  { key: 'info', icon: Info, label: 'Info' },
  { key: 'logs', icon: ScrollText, label: 'Logs' },
];

export default function PanelLayout({ playerList, liveMap, infoPanel, logPanel, commandBar, mobileView, setMobileView }) {
  return (
    <>
      <div className="hidden md:grid md:grid-cols-[280px_1fr_300px] md:grid-rows-[1fr_auto] gap-1.5 flex-1 p-1.5 min-h-0">
        <div className="overflow-hidden rounded-lg bg-black border border-gsrp-orange/20 flex flex-col min-h-0 shadow-lg shadow-orange-900/20">
          {playerList}
        </div>
        <div className="overflow-hidden rounded-lg bg-black border border-gsrp-orange/20 relative min-h-0 shadow-lg shadow-orange-900/20">
          {liveMap}
        </div>
        <div className="flex flex-col gap-1.5 min-h-0">
          <div className="flex-1 overflow-hidden rounded-lg bg-black border border-gsrp-orange/20 flex flex-col min-h-0 shadow-lg shadow-orange-900/20">
            {infoPanel}
          </div>
          {commandBar && (
            <div className="flex-shrink-0 rounded-lg bg-black border border-gsrp-orange/20 shadow-lg shadow-orange-900/20">
              {commandBar}
            </div>
          )}
        </div>
        <div className="col-span-3 overflow-hidden rounded-lg bg-black border border-gsrp-orange/20 flex flex-col max-h-[200px] min-h-[120px] shadow-lg shadow-orange-900/20">
          {logPanel}
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
          <div className={`absolute inset-0 overflow-y-auto ${mobileView === 'logs' ? 'z-10' : 'z-0 pointer-events-none opacity-0'}`}>
            <div className="p-3 h-full">{logPanel}</div>
          </div>
        </div>

        <nav className="flex-shrink-0 flex bg-black border-t border-gsrp-orange/20">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMobileView(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mobileView === tab.key
                  ? 'text-white bg-gradient-to-t from-gsrp-orange/30 to-transparent'
                  : 'text-white/30 hover:text-white/70'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
