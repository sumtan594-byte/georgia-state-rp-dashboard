import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Loader2 } from 'lucide-react';

const MAP_PX = 3120;
const OFFSET_X = 11;
const OFFSET_Z = -17;
const SPAN_X = 3142;
const SPAN_Z = 3089;

function toPixel(studX, studZ) {
  const px = ((studX + OFFSET_X) / SPAN_X) * MAP_PX;
  const py = MAP_PX - ((studZ + OFFSET_Z) / SPAN_Z) * MAP_PX;
  return [py, px];
}

const TEAM_BORDER = {
  Police: '#60A5FA', Fire: '#F87171', EMS: '#34D399',
  DOT: '#FB923C', Civilian: '#9CA3AF',
};

function parseName(raw) {
  if (!raw) return { name: 'Unknown', id: '' };
  const ci = raw.lastIndexOf(':');
  if (ci === -1) return { name: raw, id: raw };
  return { name: raw.slice(0, ci), id: raw.slice(ci + 1) };
}

function avatarIcon(rbxId, team, selected) {
  const border = TEAM_BORDER[team] || TEAM_BORDER.Civilian;
  const size = selected ? 48 : 40;
  return L.divIcon({
    html: `<img src="/api/panel/avatar?id=${rbxId}"
      style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${border};
      box-shadow:${selected ? `0 0 14px ${border}` : '0 2px 8px rgba(0,0,0,0.6)'};
      object-fit:cover;" alt="" loading="lazy" crossorigin="anonymous" />`,
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
  const ds = useRef(null);
  const playersRef = useRef(players);
  playersRef.current = players;
  const onTpRef = useRef(onTeleport);
  onTpRef.current = onTeleport;
  const [ready, setReady] = useState(false);

  /* ── Init map ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !container.current) return;
    const map = L.map(container.current, {
      crs: L.CRS.Simple, minZoom: -2, maxZoom: 3,
      zoomControl: true, attributionControl: false,
      zoomSnap: 0, zoomDelta: 0.5, wheelPxPerZoomLevel: 120,
    });
    L.imageOverlay('/api/panel/map', [[0, 0], [MAP_PX, MAP_PX]]).addTo(map);
    map.fitBounds([[0, 0], [MAP_PX, MAP_PX]]);
    mapRef.current = map;
    setReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ── RAF animation loop (matches old panel.html) ───────────────────────── */
  useEffect(() => {
    if (!ready) return;
    function tick() {
      const t = performance.now();
      for (const [id, s] of Object.entries(anim.current)) {
        const mkr = markers.current[id];
        if (!mkr) continue;
        if (ds.current && ds.current.playerId === id && ds.current.isDragging) continue;
        const raw = Math.min(1, (t - s.startedAt) / s.duration);
        const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        s.currentX = s.startX + (s.targetX - s.startX) * eased;
        s.currentY = s.startY + (s.targetY - s.startY) * eased;
        mkr.setLatLng([s.currentY, s.currentX]);
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [ready]);

  /* ── startTween at component level so both effects can call it ─────────── */
  function startTween(id, px, py) {
    const t = performance.now();
    const prev = anim.current[id];
    if (!prev) {
      anim.current[id] = {
        startX: px, startY: py, targetX: px, targetY: py,
        currentX: px, currentY: py, startedAt: t, duration: 900,
      };
      return;
    }
    anim.current[id] = {
      startX: prev.currentX, startY: prev.currentY,
      targetX: px, targetY: py,
      currentX: prev.currentX, currentY: prev.currentY,
      startedAt: t, duration: 900,
    };
  }

  /* ── startDrag at component level so marker-on can reach it ────────────── */
  function startDrag(evt, playerId) {
    const map = mapRef.current;
    if (!map || evt.originalEvent.button !== 0) return;
    evt.originalEvent.preventDefault();
    evt.originalEvent.stopPropagation();
    map.dragging.disable();
    const mkr = markers.current[playerId];
    if (!mkr) return;
    ds.current = {
      playerId,
      origX: 0, origY: 0,
      lngLat: mkr.getLatLng(),
      isDragging: false,
      startMouseX: evt.originalEvent.clientX,
      startMouseY: evt.originalEvent.clientY,
    };
    const s = anim.current[playerId];
    if (s) { ds.current.origX = s.currentX; ds.current.origY = s.currentY; }
    const el = mkr.getElement();
    if (el) el.style.opacity = '0.5';
  }

  /* ── Update markers ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const seen = new Set();

    for (const p of players) {
      if (!p.Location) continue;
      const { id, name } = parseName(p.Player);
      seen.add(id);
      const [py, px] = toPixel(p.Location.LocationX || 0, p.Location.LocationZ || 0);
      startTween(id, px, py);

      if (markers.current[id]) {
        const mkr = markers.current[id];
        mkr.setIcon(avatarIcon(id, p.Team, selectedPlayer?.Player === p.Player));
        mkr.setTooltipContent(name);
        mkr.off('click');
        mkr.off('mousedown');
        if (isNkz) {
          mkr.on('mousedown', e => startDrag(e, id));
        } else {
          mkr.on('click', () => onSelectPlayer(p));
        }
      } else {
        const mkr = L.marker([py, px], { icon: avatarIcon(id, p.Team, selectedPlayer?.Player === p.Player) })
          .addTo(map)
          .bindTooltip(name, {
            direction: 'top', offset: [0, -26],
            className: '!bg-gsrp-dark-card !border !border-gsrp-dark-border/50 !text-white !text-[11px] !px-2 !py-1 !rounded-lg',
          });
        if (isNkz) {
          mkr.on('mousedown', e => startDrag(e, id));
        } else {
          mkr.on('click', () => onSelectPlayer(p));
        }
        markers.current[id] = mkr;
      }
    }

    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) {
        map.removeLayer(markers.current[id]);
        delete markers.current[id];
        delete anim.current[id];
      }
    }

    if (selectedPlayer?.Location) {
      const [py, px] = toPixel(selectedPlayer.Location.LocationX, selectedPlayer.Location.LocationZ);
      map.panTo([py, px], { animate: true, duration: 0.5 });
    }

    calls.current.forEach(m => map.removeLayer(m));
    calls.current = [];
    for (const c of emergencyCalls) {
      if (c.Position?.length >= 2) {
        const [py, px] = toPixel(c.Position[0], c.Position[1]);
        const r = L.circleMarker([py, px], {
          radius: 10, color: '#F97316', fillColor: '#F97316',
          fillOpacity: 0.15, weight: 2, dashArray: '4,4',
        }).addTo(map);
        r.bindTooltip(`#${c.CallNumber} ${c.Team}: ${c.Description || ''}`, {
          className: '!bg-gsrp-dark-card !border !border-gsrp-orange/30 !text-white !text-[11px]',
        });
        calls.current.push(r);
      }
    }
  }, [players, emergencyCalls, selectedPlayer, ready, onSelectPlayer, isNkz]);

  /* ── Document-level drag events (matches old panel.html) ────────────────── */
  useEffect(() => {
    if (!ready || !isNkz || !mapRef.current) return;
    const map = mapRef.current;

    function getPlayerAt(lngLat) {
      const pt = map.latLngToContainerPoint(lngLat);
      let closest = null, closestDist = 60;
      for (const [id, mkr] of Object.entries(markers.current)) {
        if (id === ds.current?.playerId) continue;
        const mPt = map.latLngToContainerPoint(mkr.getLatLng());
        const dist = Math.hypot(pt.x - mPt.x, pt.y - mPt.y);
        if (dist < closestDist) { closest = id; closestDist = dist; }
      }
      return closest;
    }

    function onMove(e) {
      if (!ds.current) return;
      const dx = e.clientX - ds.current.startMouseX;
      const dy = e.clientY - ds.current.startMouseY;
      if (!ds.current.isDragging && Math.hypot(dx, dy) > 4) ds.current.isDragging = true;
      if (!ds.current.isDragging) return;
      const mkr = markers.current[ds.current.playerId];
      if (!mkr) return;
      const containerPt = map.containerPointToLatLng([
        map.latLngToContainerPoint(ds.current.lngLat).x + dx,
        map.latLngToContainerPoint(ds.current.lngLat).y + dy,
      ]);
      mkr.setLatLng(containerPt);
      const nearId = getPlayerAt(containerPt);
      for (const [id, m] of Object.entries(markers.current)) {
        if (id === ds.current.playerId) continue;
        const el = m.getElement();
        if (el) el.style.filter = (id === nearId) ? 'drop-shadow(0 0 8px #F97316)' : '';
      }
    }

    function onUp() {
      if (!ds.current) return;
      for (const [, m] of Object.entries(markers.current)) {
        const el = m.getElement();
        if (el) { el.style.filter = ''; el.style.opacity = ''; }
      }
      map.dragging.enable();
      if (ds.current.isDragging) {
        const mkr = markers.current[ds.current.playerId];
        const ll = mkr?.getLatLng();
        const nearId = ll ? getPlayerAt(ll) : null;
        if (nearId) {
          const allP = playersRef.current || [];
          const src = allP.find(p => parseName(p.Player).id === ds.current.playerId);
          const tgt = allP.find(p => parseName(p.Player).id === nearId);
          if (src && tgt) {
            onTpRef.current(parseName(src.Player).name, parseName(tgt.Player).name);
          }
        }
        if (mkr) {
          const t = performance.now();
          const cur = anim.current[ds.current.playerId] || { currentX: ds.current.origX, currentY: ds.current.origY };
          const pos = mkr.getLatLng();
          anim.current[ds.current.playerId] = {
            startX: pos.lng, startY: pos.lat,
            targetX: ds.current.origX, targetY: ds.current.origY,
            currentX: pos.lng, currentY: pos.lat,
            startedAt: t, duration: 500,
          };
        }
      }
      const srcMkr = markers.current[ds.current.playerId];
      if (srcMkr) { const el = srcMkr.getElement(); if (el) el.style.opacity = ''; }
      ds.current = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [ready, isNkz]);

  return (
    <div ref={container} className="w-full h-full relative" style={{ background: '#000000' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gsrp-dark/80">
          <Loader2 className="w-6 h-6 text-gsrp-orange animate-spin" />
        </div>
      )}
    </div>
  );
}
