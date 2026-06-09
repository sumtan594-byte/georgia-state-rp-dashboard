import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { AlertTriangle, Crosshair, Flame, Layers, LocateFixed, Lock, MapPinned, Minus, PhoneCall, Plus, Radio, Shield, Siren, Unlock, Users, Loader2 } from 'lucide-react';

export const MAP_PX = 3120;
const OFFSET_X = 11;
const OFFSET_Z = -17;
const SPAN_X = 3142;
const SPAN_Z = 3089;

export function toPixel(studX, studZ) {
  const px = ((studX + OFFSET_X) / SPAN_X) * MAP_PX;
  const py = MAP_PX - ((studZ + OFFSET_Z) / SPAN_Z) * MAP_PX;
  return [py, px];
}

export function pixelToLocation(px, py) {
  const studX = (px / MAP_PX) * SPAN_X - OFFSET_X;
  const studZ = ((MAP_PX - py) / MAP_PX) * SPAN_Z - OFFSET_Z;
  return { studX, studZ };
}

const TEAM_BORDER = {
  Police: '#60A5FA', Fire: '#F87171', EMS: '#34D399',
  DOT: '#FB923C', Civilian: '#9CA3AF',
};

const RP_TYPE_COLORS = {
  'Traffic Stop': '#60A5FA', 'Pursuit': '#F87171',
  'Medical Emergency': '#34D399', 'Fire Response': '#F97316',
  'Crime Scene': '#EF4444', 'Arrest': '#8B5CF6',
  'Patrol': '#9CA3AF', default: '#F97316',
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

function rpPinIcon(rbxId, color) {
  const avatarUrl = rbxId ? `/api/panel/avatar?id=${rbxId}` : '';
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:46px;">
      <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid rgba(255,255,255,0.3);box-shadow:0 4px 12px rgba(0,0,0,0.5);position:absolute;top:0;left:0;"></div>
      ${rbxId ? `<img src="${avatarUrl}" onerror="this.style.display='none'"
        style="width:24px;height:24px;border-radius:50%;position:absolute;top:6px;left:6px;object-fit:cover;pointer-events:none;" />` : ''}
    </div>`,
    className: '',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
}

export default function LiveMap({
  players = [],
  emergencyCalls = [],
  selectedPlayer,
  onSelectPlayer,
  isNkz,
  onTeleport,
  teamFilter = 'All',
  roleplays = [],
  playerSelectMode = false,
  onPlayerSelected,
  locationSelectMode = false,
  onLocationSelected,
  lockedPlayerId,
  onLockPlayer,
  server,
  live,
  error,
  rateLimitUntil,
}) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef({});
  const anim = useRef({});
  const raf = useRef(null);
  const calls = useRef([]);
  const rpMarkers = useRef({});
  const ds = useRef(null);
  const playersRef = useRef(players);
  playersRef.current = players;
  const onTpRef = useRef(onTeleport);
  onTpRef.current = onTeleport;
  const locationSelectModeRef = useRef(locationSelectMode);
  locationSelectModeRef.current = locationSelectMode;
  const playerSelectModeRef = useRef(playerSelectMode);
  playerSelectModeRef.current = playerSelectMode;
  const [ready, setReady] = useState(false);
  const selectedInfo = selectedPlayer ? parseName(selectedPlayer.Player) : null;
  const teamCounts = players.reduce((acc, player) => {
    const team = player.Team || 'Unknown';
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {});
  const activeUnits = players.filter(player => player.Team && player.Team !== 'Civilian').length;
  const wantedCount = players.filter(player => (player.WantedStars || 0) > 0).length;
  const rateLimitSeconds = rateLimitUntil ? Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000)) : 0;

  /* Init map */
  useEffect(() => {
    if (mapRef.current || !container.current) return;
    const map = L.map(container.current, {
      crs: L.CRS.Simple, minZoom: -2, maxZoom: 3,
      zoomControl: true, attributionControl: false,
      zoomSnap: 0, zoomDelta: 4,
    });
    L.imageOverlay('/api/panel/map', [[0, 0], [MAP_PX, MAP_PX]]).addTo(map);
    map.fitBounds([[0, 0], [MAP_PX, MAP_PX]]);
    mapRef.current = map;
    setReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* Map click handler for location pin drop */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const onClick = (e) => {
      if (!locationSelectModeRef.current) return;
      const { lat: py, lng: px } = e.latlng;
      const { studX, studZ } = pixelToLocation(px, py);
      const allP = playersRef.current;
      let nearest = null;
      let minDist = Infinity;
      for (const p of allP) {
        if (!p.Location) continue;
        const dx = (p.Location.LocationX || 0) - studX;
        const dz = (p.Location.LocationZ || 0) - studZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) { minDist = dist; nearest = p; }
      }
      let locationStr = `${Math.round(studX)}, ${Math.round(studZ)}`;
      if (nearest?.Location && minDist < 200) {
        const l = nearest.Location;
        locationStr = [l.StreetName, l.PostalCode ? `Postal #${l.PostalCode}` : ''].filter(Boolean).join(', ') || locationStr;
      }
      onLocationSelected?.({ location: locationStr, pinX: px, pinY: py });
    };
    map.on('click', onClick);
    return () => map.off('click', onClick);
  }, [ready, onLocationSelected]);

  /* RAF animation loop */
  useEffect(() => {
    if (!ready) return;
    function tick() {
      const t = performance.now();
      for (const [id, s] of Object.entries(anim.current)) {
        const mkr = markers.current[id];
        if (!mkr || (ds.current?.playerId === id && ds.current?.isDragging)) continue;
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

  function startTween(id, px, py) {
    const t = performance.now();
    const prev = anim.current[id];
    if (!prev) {
      anim.current[id] = { startX: px, startY: py, targetX: px, targetY: py, currentX: px, currentY: py, startedAt: t, duration: 900 };
      return;
    }
    anim.current[id] = {
      startX: prev.currentX, startY: prev.currentY,
      targetX: px, targetY: py,
      currentX: prev.currentX, currentY: prev.currentY,
      startedAt: t, duration: 900,
    };
  }

  function startDrag(evt, playerId) {
    const map = mapRef.current;
    if (!map || evt.originalEvent.button !== 0) return;
    evt.originalEvent.preventDefault();
    evt.originalEvent.stopPropagation();
    map.dragging.disable();
    const mkr = markers.current[playerId];
    if (!mkr) return;
    const s = anim.current[playerId];
    ds.current = {
      playerId,
      origX: s?.currentX || mkr.getLatLng().lng,
      origY: s?.currentY || mkr.getLatLng().lat,
      lngLat: mkr.getLatLng(),
      isDragging: false,
      startMouseX: evt.originalEvent.clientX,
      startMouseY: evt.originalEvent.clientY,
    };
    const el = mkr.getElement();
    if (el) el.style.opacity = '0.5';
  }

  /* Camera lock: follow locked player */
  useEffect(() => {
    if (!ready || !mapRef.current || !lockedPlayerId) return;
    const locked = players.find(p => parseName(p.Player).id === lockedPlayerId);
    if (locked?.Location) {
      const [py, px] = toPixel(locked.Location.LocationX || 0, locked.Location.LocationZ || 0);
      mapRef.current.panTo([py, px], { animate: true, duration: 0.4 });
    }
  }, [players, lockedPlayerId, ready]);

  /* Update player markers */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const seen = new Set();

    for (const p of players) {
      if (!p.Location) continue;
      const { id, name } = parseName(p.Player);
      const isVisible = teamFilter === 'All' || p.Team === teamFilter;

      if (!isVisible) {
        if (markers.current[id]) {
          const el = markers.current[id].getElement();
          if (el) el.style.display = 'none';
        }
        continue;
      }

      seen.add(id);
      const [py, px] = toPixel(p.Location.LocationX || 0, p.Location.LocationZ || 0);
      startTween(id, px, py);

      const isSelected = selectedPlayer?.Player === p.Player;
      const isLocked = lockedPlayerId === id;

      const buildClickHandler = (mkr) => {
        mkr.off('click');
        mkr.off('mousedown');
        if (playerSelectModeRef.current) {
          mkr.on('click', () => onPlayerSelected?.({
            name, id, avatarUrl: `/api/panel/avatar?id=${id}`,
          }));
        } else if (isNkz) {
          mkr.on('mousedown', e => startDrag(e, id));
        } else {
          mkr.on('click', () => onSelectPlayer(p));
        }
      };

      if (markers.current[id]) {
        const mkr = markers.current[id];
        const wasSelected = mkr._lastSelected;
        const nowSelected = isSelected || isLocked;
        if (wasSelected !== nowSelected) {
          mkr.setIcon(avatarIcon(id, p.Team, nowSelected));
          mkr._lastSelected = nowSelected;
        }
        mkr.setTooltipContent(name + (isLocked ? ' 🔒' : ''));
        const el = mkr.getElement();
        if (el) {
          el.style.display = '';
          el.style.outline = isLocked ? '3px solid #F97316' : '';
          el.style.borderRadius = '50%';
        }
        buildClickHandler(mkr);
      } else {
        const mkr = L.marker([py, px], { icon: avatarIcon(id, p.Team, isSelected) })
          .addTo(map)
          .bindTooltip(name, {
            direction: 'top', offset: [0, -26],
            className: '!bg-gsrp-dark-card !border !border-gsrp-dark-border/50 !text-white !text-[11px] !px-2 !py-1 !rounded-lg',
          });
        buildClickHandler(mkr);
        markers.current[id] = mkr;
      }
    }

    // Remove stale markers
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) {
        map.removeLayer(markers.current[id]);
        delete markers.current[id];
        delete anim.current[id];
      }
    }

    // Pan to selected if no camera lock
    if (!lockedPlayerId && selectedPlayer?.Location) {
      const [py, px] = toPixel(selectedPlayer.Location.LocationX, selectedPlayer.Location.LocationZ);
      map.panTo([py, px], { animate: true, duration: 0.5 });
    }

    // Emergency call markers
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
  }, [players, emergencyCalls, selectedPlayer, ready, onSelectPlayer, isNkz, teamFilter, lockedPlayerId, playerSelectMode]);

  /* Roleplay pins */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const activeIds = new Set(roleplays.filter(r => r.active).map(r => r.rpId));

    for (const id of Object.keys(rpMarkers.current)) {
      if (!activeIds.has(id)) {
        map.removeLayer(rpMarkers.current[id]);
        delete rpMarkers.current[id];
      }
    }

    for (const rp of roleplays) {
      if (!rp.active || rp.pinX == null || rp.pinY == null) continue;
      const color = RP_TYPE_COLORS[rp.roleplayType] || RP_TYPE_COLORS.default;
      const icon = rpPinIcon(rp.robloxUserId, color);
      const msLeft = new Date(rp.expiresAt) - Date.now();
      const timeStr = msLeft > 0
        ? `${Math.floor(msLeft / 60000)}m ${Math.floor((msLeft % 60000) / 1000)}s left`
        : 'Expired';
      const tooltipHtml = `
        <div style="min-width:160px">
          <div style="font-weight:700;font-size:12px;color:#fff;margin-bottom:4px">${rp.robloxUsername}</div>
          <div style="font-size:11px;color:${color};font-weight:600;margin-bottom:2px">${rp.roleplayType}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:2px">${rp.location}</div>
          <div style="font-size:10px;color:rgba(249,115,22,0.7);font-family:monospace">${timeStr}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">By ${rp.moderatorName}</div>
        </div>`;

      if (rpMarkers.current[rp.rpId]) {
        const mkr = rpMarkers.current[rp.rpId];
        mkr.setLatLng([rp.pinY, rp.pinX]);
        mkr.setIcon(icon);
        mkr.setTooltipContent(tooltipHtml);
      } else {
        const mkr = L.marker([rp.pinY, rp.pinX], { icon, zIndexOffset: 200 })
          .addTo(map)
          .bindTooltip(tooltipHtml, {
            direction: 'top',
            className: '!bg-gsrp-dark-card !border !border-gsrp-dark-border/60 !text-white !rounded-xl !px-3 !py-2',
          });
        rpMarkers.current[rp.rpId] = mkr;
      }
    }
  }, [roleplays, ready]);

  /* NKZ drag-to-teleport */
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
      const base = map.latLngToContainerPoint(ds.current.lngLat);
      const newLL = map.containerPointToLatLng([base.x + dx, base.y + dy]);
      mkr.setLatLng(newLL);
      const nearId = getPlayerAt(newLL);
      for (const [id, m] of Object.entries(markers.current)) {
        if (id === ds.current.playerId) continue;
        const el = m.getElement();
        if (el) el.style.filter = id === nearId ? 'drop-shadow(0 0 8px #F97316)' : '';
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
          const allP = playersRef.current;
          const src = allP.find(p => parseName(p.Player).id === ds.current.playerId);
          const tgt = allP.find(p => parseName(p.Player).id === nearId);
          if (src && tgt) onTpRef.current(parseName(src.Player).name, parseName(tgt.Player).name);
        }
        if (mkr) {
          const t = performance.now();
          const ll2 = mkr.getLatLng();
          anim.current[ds.current.playerId] = {
            startX: ll2.lng, startY: ll2.lat,
            targetX: ds.current.origX, targetY: ds.current.origY,
            currentX: ll2.lng, currentY: ll2.lat,
            startedAt: t, duration: 500,
          };
        }
      }
      ds.current = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [ready, isNkz]);

  const cursorStyle = locationSelectMode ? 'crosshair' : playerSelectMode ? 'cell' : 'grab';
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const recenterMap = () => mapRef.current?.fitBounds([[0, 0], [MAP_PX, MAP_PX]], { animate: true, duration: 0.4 });
  const locateSelected = () => {
    if (!selectedPlayer?.Location || !mapRef.current) return;
    const [py, px] = toPixel(selectedPlayer.Location.LocationX || 0, selectedPlayer.Location.LocationZ || 0);
    mapRef.current.flyTo([py, px], Math.max(mapRef.current.getZoom(), 0), { duration: 0.5 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={container} className="w-full h-full relative" style={{ background: '#000', cursor: cursorStyle }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gsrp-dark/80">
          <Loader2 className="w-6 h-6 text-gsrp-orange animate-spin" />
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-[300] flex max-w-[calc(100%-1.5rem)] flex-col gap-2 sm:max-w-sm">
        <div className="rounded-2xl border border-gsrp-dark-border/70 bg-gsrp-dark-card/90 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-gsrp-orange/80">
                <Radio size={12} /> Live Operations
              </p>
              <h2 className="truncate text-sm font-black text-white">{server?.Name || 'ER:LC Server'}</h2>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${live && !error ? 'border-green-400/20 bg-green-400/10 text-green-300' : 'border-gsrp-orange/20 bg-gsrp-orange/10 text-gsrp-orange'}`}>
              {live && !error ? 'LIVE' : 'DEGRADED'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Metric icon={Users} label="Players" value={`${server?.CurrentPlayers ?? players.length}/${server?.MaxPlayers ?? '?'}`} />
            <Metric icon={Shield} label="Units" value={activeUnits} />
            <Metric icon={PhoneCall} label="911" value={emergencyCalls.length} hot={emergencyCalls.length > 0} />
            <Metric icon={Siren} label="Wanted" value={wantedCount} hot={wantedCount > 0} />
          </div>
          {(error || rateLimitSeconds > 0) && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-gsrp-orange/20 bg-gsrp-orange/10 px-2.5 py-2 text-[11px] text-gsrp-orange/80">
              <AlertTriangle size={13} className="flex-shrink-0" />
              <span className="min-w-0 truncate">{rateLimitSeconds > 0 ? `Rate limited. Refresh resumes in ${rateLimitSeconds}s.` : error}</span>
            </div>
          )}
        </div>

        <div className="hidden rounded-2xl border border-gsrp-dark-border/70 bg-gsrp-dark-card/85 p-3 backdrop-blur-xl sm:block">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            <Layers size={12} /> Team Spread
          </p>
          <div className="space-y-1.5">
            {Object.entries(teamCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([team, count]) => (
              <div key={team} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAM_BORDER[team] || TEAM_BORDER.Civilian }} />
                <span className="flex-1 truncate text-white/55">{team}</span>
                <span className="font-mono text-white/35">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-[300] flex flex-col gap-2">
        <MapButton label="Zoom in" onClick={zoomIn} icon={Plus} />
        <MapButton label="Zoom out" onClick={zoomOut} icon={Minus} />
        <MapButton label="Recenter" onClick={recenterMap} icon={Crosshair} />
        <MapButton label="Find selected" onClick={locateSelected} icon={LocateFixed} disabled={!selectedPlayer?.Location} />
      </div>

      {selectedPlayer && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[300] w-[min(360px,calc(100%-1.5rem))] rounded-2xl border border-gsrp-dark-border/70 bg-gsrp-dark-card/90 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gsrp-orange/70">Selected Unit</p>
              <h3 className="truncate text-lg font-black text-white">{selectedInfo?.name || 'Unknown'}</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/45">{selectedPlayer.Team || 'Unknown'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <InfoChip label="Callsign" value={selectedPlayer.Callsign || 'N/A'} />
            <InfoChip label="Postal" value={selectedPlayer.Location?.PostalCode ? `#${selectedPlayer.Location.PostalCode}` : 'Unknown'} />
            <InfoChip label="Street" value={selectedPlayer.Location?.StreetName || 'Unknown'} />
            <InfoChip label="Wanted" value={selectedPlayer.WantedStars ? `${selectedPlayer.WantedStars} stars` : 'Clear'} hot={selectedPlayer.WantedStars > 0} />
          </div>
        </div>
      )}

      {(emergencyCalls.length > 0 || roleplays.length > 0) && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[300] hidden max-w-xs rounded-2xl border border-gsrp-dark-border/70 bg-gsrp-dark-card/85 p-3 backdrop-blur-xl lg:block">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            <MapPinned size={12} /> Active Incidents
          </p>
          <div className="space-y-2">
            {emergencyCalls.slice(0, 3).map(call => (
              <IncidentRow key={`call-${call.CallNumber || call.StartedAt}`} icon={PhoneCall} title={`911 #${call.CallNumber || 'N/A'}`} detail={call.Description || call.PositionDescriptor || call.Team || 'Emergency call'} hot />
            ))}
            {roleplays.slice(0, 3).map(rp => (
              <IncidentRow key={rp.rpId} icon={Flame} title={rp.roleplayType || 'Roleplay'} detail={`${rp.robloxUsername || 'Unknown'} · ${rp.location || 'Pinned location'}`} />
            ))}
          </div>
        </div>
      )}

      {playerSelectMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[300] bg-gsrp-dark-card/95 border border-gsrp-orange/40 rounded-xl px-4 py-2 text-xs font-bold text-gsrp-orange flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-gsrp-orange animate-pulse" />
          Click a player blip to select
        </div>
      )}

      {locationSelectMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[300] bg-gsrp-dark-card/95 border border-gsrp-teal/40 rounded-xl px-4 py-2 text-xs font-bold text-gsrp-teal flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-gsrp-teal animate-pulse" />
          Click anywhere on map to drop pin
        </div>
      )}

      {lockedPlayerId && (
        <div className="absolute bottom-3 left-3 z-[300] bg-gsrp-dark-card/90 border border-gsrp-orange/30 rounded-xl px-3 py-1.5 text-xs font-bold text-gsrp-orange flex items-center gap-1.5">
          <Lock size={11} />
          Camera locked
          <button
            onClick={() => onLockPlayer?.(null)}
            className="text-white/40 hover:text-white/80 ml-1 cursor-pointer pointer-events-auto transition-colors"
          >
            <Unlock size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, hot = false }) {
  return (
    <div className={`rounded-xl border px-2 py-2 ${hot ? 'border-gsrp-sunset/25 bg-gsrp-sunset/10' : 'border-white/10 bg-black/25'}`}>
      <Icon size={13} className={hot ? 'mb-1 text-gsrp-sunset' : 'mb-1 text-gsrp-orange/70'} />
      <p className="text-sm font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</p>
    </div>
  );
}

function MapButton({ label, onClick, icon: Icon, disabled = false }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gsrp-dark-border/70 bg-gsrp-dark-card/90 text-white/50 shadow-xl backdrop-blur-xl transition-all hover:border-gsrp-orange/30 hover:text-gsrp-orange disabled:cursor-not-allowed disabled:opacity-35"
    >
      <Icon size={16} />
    </button>
  );
}

function InfoChip({ label, value, hot = false }) {
  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${hot ? 'border-gsrp-sunset/20 bg-gsrp-sunset/10' : 'border-white/10 bg-black/20'}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</p>
      <p className={`truncate font-bold ${hot ? 'text-gsrp-sunset' : 'text-white/75'}`}>{value}</p>
    </div>
  );
}

function IncidentRow({ icon: Icon, title, detail, hot = false }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
      <Icon size={13} className={hot ? 'mt-0.5 flex-shrink-0 text-gsrp-sunset' : 'mt-0.5 flex-shrink-0 text-gsrp-orange'} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black text-white/75">{title}</p>
        <p className="truncate text-[10px] text-white/35">{detail}</p>
      </div>
    </div>
  );
}
