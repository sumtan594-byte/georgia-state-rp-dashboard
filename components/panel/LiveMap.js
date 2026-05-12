import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Loader2 } from 'lucide-react';

const MAP_PX = 3120;
const OFFSET_X = 11;
const OFFSET_Z = -17;
const SPAN_X = 3142;
const SPAN_Z = 3089;

function studToPixel(studX, studZ) {
  const px = ((studX + OFFSET_X) / SPAN_X) * MAP_PX;
  const py = MAP_PX - ((studZ + OFFSET_Z) / SPAN_Z) * MAP_PX;
  return { x: px, y: py };
}

const TEAM_COLORS = {
  Police: '#60A5FA',
  Fire: '#F87171',
  EMS: '#34D399',
  DOT: '#FB923C',
  Civilian: '#9CA3AF',
};

function parsePlayerName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const colonIdx = raw.lastIndexOf(':');
  if (colonIdx === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, colonIdx), id: raw.slice(colonIdx + 1) };
}

export default function LiveMap({ players = [], emergencyCalls = [], selectedPlayer, onSelectPlayer, isNkz, onTeleport }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const animRef = useRef({});
  const rafRef = useRef(null);
  const callMarkersRef = useRef([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 3,
      zoomControl: true,
      attributionControl: false,
    });
    const bounds = [[0, 0], [MAP_PX, MAP_PX]];
    L.imageOverlay('/api/panel/map', bounds).addTo(map);
    map.fitBounds(bounds);
    mapRef.current = map;
    setReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function frame() {
      const now = performance.now();
      for (const [id, a] of Object.entries(animRef.current)) {
        const raw = Math.min(1, (now - a.startedAt) / a.duration);
        const e = ease(raw);
        a.cx = lerp(a.sx, a.tx, e);
        a.cy = lerp(a.sy, a.ty, e);
        markersRef.current[id]?.setLatLng([a.cy, a.cx]);
        if (raw >= 1) delete animRef.current[id];
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const now = performance.now();
    const seen = new Set();

    for (const p of players) {
      const { id, name } = parsePlayerName(p.Player);
      seen.add(id);
      if (!p.Location) continue;
      const pix = studToPixel(p.Location.LocationX || 0, p.Location.LocationZ || 0);

      if (!markersRef.current[id]) {
        const color = TEAM_COLORS[p.Team] || TEAM_COLORS.Civilian;
        const m = L.circleMarker([pix.y, pix.x], {
          radius: 6, color, fillColor: color, fillOpacity: 0.8, weight: 2, opacity: 1,
        }).addTo(map);
        m.bindTooltip(name, { direction: 'top', offset: [0, -8], className: '!bg-gsrp-dark-card !border !border-gsrp-dark-border/50 !text-white !text-[11px] !font-nunito !px-2 !py-1 !rounded-lg' });
        m.on('click', () => onSelectPlayer(p));
        markersRef.current[id] = m;
        animRef.current[id] = { sx: pix.x, sy: pix.y, tx: pix.x, ty: pix.y, cx: pix.x, cy: pix.y, startedAt: now, duration: 900 };
      } else {
        const a = animRef.current[id];
        if (a && (Math.abs(a.tx - pix.x) > 0.5 || Math.abs(a.ty - pix.y) > 0.5)) {
          animRef.current[id] = { sx: a.cx, sy: a.cy, tx: pix.x, ty: pix.y, cx: a.cx, cy: a.cy, startedAt: now, duration: 900 };
        } else if (!a) {
          markersRef.current[id].setLatLng([pix.y, pix.x]);
        }
        const color = TEAM_COLORS[p.Team] || TEAM_COLORS.Civilian;
        markersRef.current[id].setStyle({ color, fillColor: color });
        markersRef.current[id].setTooltipContent(name);
      }
    }

    for (const id of Object.keys(markersRef.current)) {
      if (!seen.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
        delete animRef.current[id];
      }
    }

    for (const id of Object.keys(markersRef.current)) {
      const p = players.find(pp => parsePlayerName(pp.Player).id === id);
      const sel = selectedPlayer && parsePlayerName(selectedPlayer.Player).id === id;
      markersRef.current[id].setStyle({ radius: sel ? 9 : 6, weight: sel ? 3 : 2, opacity: sel ? 1 : 0.7 });
      if (sel && p?.Location) {
        const pix = studToPixel(p.Location.LocationX, p.Location.LocationZ);
        map.panTo([pix.y, pix.x], { animate: true, duration: 0.5 });
      }
    }

    callMarkersRef.current.forEach(m => map.removeLayer(m));
    callMarkersRef.current = [];
    for (const call of emergencyCalls) {
      if (call.Position?.length >= 2) {
        const pix = studToPixel(call.Position[0], call.Position[1]);
        const m = L.circleMarker([pix.y, pix.x], {
          radius: 10, color: '#F97316', fillColor: '#F97316', fillOpacity: 0.2, weight: 2, dashArray: '4,4',
        }).addTo(map);
        m.bindTooltip(`#${call.CallNumber} ${call.Team}: ${call.Description || ''}`, { className: '!bg-gsrp-dark-card !border !border-gsrp-orange/30 !text-white !text-[11px]' });
        callMarkersRef.current.push(m);
      }
    }
  }, [players, emergencyCalls, selectedPlayer, ready, onSelectPlayer]);

  // Drag teleport (NKZ only)
  useEffect(() => {
    if (!ready || !isNkz) return;
    const map = mapRef.current;
    let source = null, ghost = null, line = null, target = null, hl = null;

    function mousedown(e) {
      for (const [id, marker] of Object.entries(markersRef.current)) {
        if (e.latlng.distanceTo(marker.getLatLng()) < 15) {
          source = id; map.dragging.disable();
          const ll = marker.getLatLng();
          ghost = L.circleMarker([ll.lat, ll.lng], { radius: 8, color: '#F97316', fillColor: '#F97316', fillOpacity: 0.5, weight: 3 }).addTo(map);
          line = L.polyline([[ll.lat, ll.lng], [ll.lat, ll.lng]], { color: '#F97316', weight: 2, dashArray: '5,5', opacity: 0.6 }).addTo(map);
          map.on('mousemove', mousemove); map.on('mouseup', mouseup);
          break;
        }
      }
    }
    function mousemove(e) {
      if (!ghost || !line) return;
      ghost.setLatLng(e.latlng);
      const ll = line.getLatLngs(); ll[1] = e.latlng; line.setLatLngs(ll);
      target = null; let min = Infinity;
      for (const [id, m] of Object.entries(markersRef.current)) {
        if (id === source) continue;
        const d = e.latlng.distanceTo(m.getLatLng());
        if (d < 30 && d < min) { min = d; target = id; }
      }
      if (hl) map.removeLayer(hl); hl = null;
      if (target && markersRef.current[target]) {
        const p = markersRef.current[target].getLatLng();
        hl = L.circleMarker(p, { radius: 14, color: '#F97316', fillColor: '#F97316', fillOpacity: 0.2, weight: 3 }).addTo(map);
      }
    }
    function mouseup() {
      map.dragging.enable(); map.off('mousemove', mousemove); map.off('mouseup', mouseup);
      if (ghost) { map.removeLayer(ghost); ghost = null; }
      if (line) { map.removeLayer(line); line = null; }
      if (hl) { map.removeLayer(hl); hl = null; }
      if (target && source) {
        const sp = players.find(p => parsePlayerName(p.Player).id === source);
        const tp = players.find(p => parsePlayerName(p.Player).id === target);
        if (sp && tp) onTeleport(parsePlayerName(sp.Player).name, parsePlayerName(tp.Player).name);
      }
      source = null; target = null;
    }
    map.on('mousedown', mousedown);
    return () => { map.off('mousedown', mousedown); map.off('mousemove', mousemove); map.off('mouseup', mouseup); map.dragging.enable(); };
  }, [ready, isNkz, players, onTeleport]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: '#0A0E1A' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gsrp-orange animate-spin" />
        </div>
      )}
    </div>
  );
}
