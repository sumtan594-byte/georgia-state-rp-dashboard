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

const TEAM_BORDER = {
  Police: '#60A5FA', Fire: '#F87171', EMS: '#34D399',
  DOT: '#FB923C', Civilian: '#9CA3AF',
};

function parsePlayerName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = raw.lastIndexOf(':');
  if (ci === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

/* ── Avatar divIcon factory ─────────────────────────────────────────────── */
function avatarIcon(rbxId, team, selected) {
  const border = TEAM_BORDER[team] || TEAM_BORDER.Civilian;
  const size = selected ? 48 : 40;
  return L.divIcon({
    html: `<img src="/api/panel/avatar?id=${rbxId}"
      style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${border};
      box-shadow:${selected ? `0 0 14px ${border}` : '0 2px 8px rgba(0,0,0,0.6)'};
      object-fit:cover;transition:width .2s,height .2s,box-shadow .2s;"
      alt="" loading="lazy" crossorigin="anonymous" />`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LiveMap({ players = [], emergencyCalls = [], selectedPlayer, onSelectPlayer, isNkz, onTeleport }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef({});
  const anim = useRef({});
  const raf = useRef(null);
  const calls = useRef([]);
  const drag = useRef({});
  const [ready, setReady] = useState(false);

  /* ── Init map ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !container.current) return;
    const map = L.map(container.current, {
      crs: L.CRS.Simple, minZoom: -2, maxZoom: 3,
      zoomControl: true, attributionControl: false,
    });
    L.imageOverlay('/api/panel/map', [[0, 0], [MAP_PX, MAP_PX]]).addTo(map);
    map.fitBounds([[0, 0], [MAP_PX, MAP_PX]]);
    mapRef.current = map;
    setReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ── RAF animation loop ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!ready) return;
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function tick() {
      const now = performance.now();
      for (const [id, a] of Object.entries(anim.current)) {
        const raw = Math.min(1, (now - a.startedAt) / a.duration);
        const e = ease(raw);
        a.cx = lerp(a.sx, a.tx, e);
        a.cy = lerp(a.sy, a.ty, e);
        markers.current[id]?.setLatLng([a.cy, a.cx]);
        if (raw >= 1) delete anim.current[id];
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [ready]);

  /* ── Update markers + drag logic ───────────────────────────────────────── */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const now = performance.now();
    const seen = new Set();

    for (const p of players) {
      const { id, name } = parsePlayerName(p.Player);
      seen.add(id);
      if (!p.Location) continue;
      const pix = studToPixel(p.Location.LocationX || 0, p.Location.LocationZ || 0);
      const sel = selectedPlayer?.Player === p.Player;

      const m = markers.current[id];
      if (!m) {
        /* ── new marker ── */
        const icon = avatarIcon(id, p.Team, sel);
        const marker = L.marker([pix.y, pix.x], { icon }).addTo(map);
        marker.bindTooltip(name, {
          direction: 'top', offset: [0, -26],
          className: '!bg-gsrp-dark-card !border !border-gsrp-dark-border/50 !text-white !text-[11px] !px-2 !py-1 !rounded-lg',
        });
        if (isNkz) {
          marker.on('mousedown', (e) => startDrag(e, id));
        } else {
          marker.on('click', () => onSelectPlayer(p));
        }
        markers.current[id] = marker;
        anim.current[id] = {
          sx: pix.x, sy: pix.y, tx: pix.x, ty: pix.y,
          cx: pix.x, cy: pix.y, startedAt: now, duration: 900,
        };
      } else {
        /* ── existing marker ── */
        const a = anim.current[id];
        if (a && (Math.abs(a.tx - pix.x) > 0.1 || Math.abs(a.ty - pix.y) > 0.1)) {
          anim.current[id] = {
            sx: a.cx, sy: a.cy, tx: pix.x, ty: pix.y,
            cx: a.cx, cy: a.cy, startedAt: now, duration: 900,
          };
        } else if (!a) {
          m.setLatLng([pix.y, pix.x]);
        }
        m.setIcon(avatarIcon(id, p.Team, sel));
        m.setTooltipContent(name);
        /* rebind click + drag on every pass (handlers close over latest props) */
        m.off('click');
        m.off('mousedown');
        if (isNkz) {
          m.on('mousedown', (e) => startDrag(e, id));
        } else {
          m.on('click', () => onSelectPlayer(p));
        }
      }
    }

    /* remove stale */
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) {
        map.removeLayer(markers.current[id]);
        delete markers.current[id];
        delete anim.current[id];
      }
    }

    /* pan to selected */
    if (selectedPlayer?.Location) {
      const c = studToPixel(selectedPlayer.Location.LocationX, selectedPlayer.Location.LocationZ);
      map.panTo([c.y, c.x], { animate: true, duration: 0.5 });
    }

    /* emergency call rings */
    calls.current.forEach(m => map.removeLayer(m));
    calls.current = [];
    for (const c of emergencyCalls) {
      if (c.Position?.length >= 2) {
        const pix = studToPixel(c.Position[0], c.Position[1]);
        const r = L.circleMarker([pix.y, pix.x], {
          radius: 10, color: '#F97316', fillColor: '#F97316',
          fillOpacity: 0.15, weight: 2, dashArray: '4,4',
        }).addTo(map);
        r.bindTooltip(`#${c.CallNumber} ${c.Team}: ${c.Description || ''}`, {
          className: '!bg-gsrp-dark-card !border !border-gsrp-orange/30 !text-white !text-[11px]',
        });
        calls.current.push(r);
      }
    }

    /* ── drag helpers ───────────────────────────────────────────────────── */
    function startDrag(e, playerId) {
      const d = drag.current;
      d.source = playerId;
      d.startLatLng = e.latlng ? e.latlng.clone() : null;
      d.moved = false;
      d.ghost = null;
      d.line = null;
      d.target = null;
      d.hl = null;
      document.addEventListener('mousemove', onDocMove);
      document.addEventListener('mouseup', onDocUp);
    }

    function onDocMove(domE) {
      const d = drag.current;
      if (!d.source) return;
      const ll = map.mouseEventToLatLng(domE);

      if (!d.moved && d.startLatLng) {
        const dist = ll.distanceTo(d.startLatLng);
        if (dist < 8) return;
        d.moved = true;
        map.dragging.disable();
        d.ghost = L.circleMarker([ll.lat, ll.lng], {
          radius: 24, color: '#F97316', fillColor: '#F97316',
          fillOpacity: 0.2, weight: 3,
        }).addTo(map);
        d.line = L.polyline([[d.startLatLng.lat, d.startLatLng.lng], [ll.lat, ll.lng]], {
          color: '#F97316', weight: 2, dashArray: '6,6', opacity: 0.5,
        }).addTo(map);
        return;
      }

      if (d.ghost) d.ghost.setLatLng(ll);
      if (d.line) {
        const latlngs = d.line.getLatLngs();
        latlngs[1] = ll;
        d.line.setLatLngs(latlngs);
      }

      /* nearest player */
      d.target = null;
      let min = 50;
      for (const [pid, mkr] of Object.entries(markers.current)) {
        if (pid === d.source) continue;
        const dist = ll.distanceTo(mkr.getLatLng());
        if (dist < min) { min = dist; d.target = pid; }
      }
      if (d.hl) map.removeLayer(d.hl);
      d.hl = null;
      if (d.target && markers.current[d.target]) {
        const p = markers.current[d.target].getLatLng();
        d.hl = L.circleMarker(p, {
          radius: 28, color: '#F97316', fillColor: '#F97316',
          fillOpacity: 0.12, weight: 3,
        }).addTo(map);
      }
    }

    function onDocUp() {
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup', onDocUp);
      const d = drag.current;

      if (!d.moved && d.source) {
        /* was a click — select the player */
        map.dragging.enable();
        const pp = players.find(p2 => parsePlayerName(p2.Player).id === d.source);
        if (pp) onSelectPlayer(pp);
        d.source = null;
        return;
      }

      map.dragging.enable();
      if (d.ghost) { map.removeLayer(d.ghost); d.ghost = null; }
      if (d.line) { map.removeLayer(d.line); d.line = null; }
      if (d.hl) { map.removeLayer(d.hl); d.hl = null; }

      if (d.source && d.target) {
        const sp = players.find(p2 => parsePlayerName(p2.Player).id === d.source);
        const tp = players.find(p2 => parsePlayerName(p2.Player).id === d.target);
        if (sp && tp) {
          onTeleport(parsePlayerName(sp.Player).name, parsePlayerName(tp.Player).name);
        }
      }
      d.source = null;
      d.target = null;
    }
  }, [players, emergencyCalls, selectedPlayer, ready, onSelectPlayer, onTeleport, isNkz]);

  return (
    <div ref={container} className="w-full h-full relative" style={{ background: '#0A0E1A' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gsrp-dark/80">
          <Loader2 className="w-6 h-6 text-gsrp-orange animate-spin" />
        </div>
      )}
    </div>
  );
}
