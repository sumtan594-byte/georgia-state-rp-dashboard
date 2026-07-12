import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Film, Gauge } from 'lucide-react';

// Inline marker styling per event kind. Colors mirror the monitoring timeline
// used elsewhere in the reviewer so the two views read as one system.
const MARKER_STYLES = {
  tabout: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  mouseleave: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  paste: 'bg-red-500/15 text-red-300 border-red-500/30',
  rightclick: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  idle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

const SPEEDS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
  { label: 'Instant', value: 0 },
];

// Longest we ever wait between two events, so a replay stays watchable even if
// the applicant paused for minutes. The real gap is still surfaced as an [IDLE]
// marker when it exceeds the idle threshold.
const MAX_GAP_MS = 1400;

function markerLabel(kind, meta) {
  const secs = Math.max(0, Math.round(meta?.duration || 0));
  switch (kind) {
    case 'tabout': return `TAB-OUT ${secs}s`;
    case 'mouseleave': return `MOUSE LEFT ${secs}s`;
    case 'paste': return `PASTE ${meta?.charCount ?? (meta?.content ? meta.content.length : 0)}`;
    case 'rightclick': return 'RIGHT-CLICK';
    case 'idle': return `IDLE ${secs}s`;
    default: return kind;
  }
}

// Shift existing marker offsets so they stay anchored to the same logical spot
// after an edit of shape { p (prefix kept), d (chars deleted), i (chars inserted) }.
function shiftMarkers(markers, diff) {
  const delta = diff.i.length - diff.d;
  if (delta === 0) return markers;
  return markers.map((m) => {
    if (m.offset <= diff.p) return m;
    if (m.offset >= diff.p + diff.d) return { ...m, offset: m.offset + delta };
    return { ...m, offset: diff.p };
  });
}

function applyEvent(state, event) {
  if (event.kind === 'input') {
    const { p, d, i } = event.diff;
    const value = state.value.slice(0, p) + i + state.value.slice(p + d);
    return {
      value,
      caret: p + i.length,
      markers: shiftMarkers(state.markers, event.diff),
    };
  }
  return {
    ...state,
    markers: [...state.markers, { offset: state.caret, kind: event.kind, meta: event.meta, id: event.id }],
  };
}

export default function TypingReplay({
  events = [],
  tabOuts = [],
  pastes = [],
  mouseLeaves = [],
  rightClicks = [],
  idlePeriods = [],
  finalValue = '',
}) {
  // Merge every signal into one time-ordered stream. Input diffs win ties so a
  // marker recorded at the same millisecond lands after the character it follows.
  const merged = useMemo(() => {
    const out = [];
    events.forEach((e, idx) => out.push({ t: e.t, order: 0, kind: 'input', diff: { p: e.p, d: e.d, i: e.i || '' }, id: `in-${idx}` }));
    tabOuts.forEach((e, idx) => out.push({ t: e.leftAt, order: 1, kind: 'tabout', meta: e, id: `to-${idx}` }));
    pastes.forEach((e, idx) => out.push({ t: e.timestamp, order: 1, kind: 'paste', meta: e, id: `pa-${idx}` }));
    mouseLeaves.forEach((e, idx) => out.push({ t: e.leftAt, order: 1, kind: 'mouseleave', meta: e, id: `ml-${idx}` }));
    rightClicks.forEach((e, idx) => out.push({ t: e.timestamp, order: 1, kind: 'rightclick', meta: e, id: `rc-${idx}` }));
    idlePeriods.forEach((e, idx) => out.push({ t: e.startedAt, order: 1, kind: 'idle', meta: e, id: `id-${idx}` }));
    out.sort((a, b) => (a.t - b.t) || (a.order - b.order));
    return out;
  }, [events, tabOuts, pastes, mouseLeaves, rightClicks, idlePeriods]);

  const total = merged.length;

  // Fold events [0, step) into the visible state. Deterministic, so scrubbing
  // and playback share the exact same result at any point.
  const buildView = useCallback((step) => {
    let state = { value: '', caret: 0, markers: [] };
    for (let idx = 0; idx < step && idx < merged.length; idx++) {
      state = applyEvent(state, merged[idx]);
    }
    return state;
  }, [merged]);

  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    // Reset to the fully-typed view whenever the underlying data changes.
    setStep(total);
    setPlaying(false);
  }, [total]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!playing) { clearTimer(); return undefined; }
    if (stepRef.current >= total) { setPlaying(false); return undefined; }

    const advance = () => {
      const current = stepRef.current;
      if (current >= total) { setPlaying(false); return; }
      const next = current + 1;
      setStep(next);
      if (next >= total) { setPlaying(false); return; }
      const gap = speed === 0
        ? 0
        : Math.min(MAX_GAP_MS, Math.max(8, merged[next].t - merged[current].t)) / speed;
      timerRef.current = setTimeout(advance, gap);
    };

    const startGap = speed === 0 ? 0 : 220;
    timerRef.current = setTimeout(advance, startGap);
    return () => clearTimer();
  }, [playing, speed, total, merged]);

  const view = useMemo(() => buildView(step), [buildView, step]);

  const handlePlayPause = () => {
    if (playing) { setPlaying(false); return; }
    if (stepRef.current >= total) setStep(0);
    setPlaying(true);
  };

  const handleRestart = () => {
    setPlaying(false);
    setStep(0);
  };

  const handleScrub = (e) => {
    setPlaying(false);
    setStep(Number(e.target.value));
  };

  // Splice the inline marker chips into the reconstructed text at their offsets.
  const rendered = useMemo(() => {
    const { value, caret, markers } = view;
    const sorted = [...markers].sort((a, b) => a.offset - b.offset);
    const nodes = [];
    let cursor = 0;
    const pushText = (from, to, keyBase) => {
      if (to <= from) return;
      nodes.push(<span key={`t-${keyBase}`}>{value.slice(from, to)}</span>);
    };
    const caretEl = (key) => <span key={key} className="inline-block w-[2px] h-[1.05em] align-middle bg-gsrp-orange animate-pulse -mb-[0.15em]" />;

    sorted.forEach((m, idx) => {
      const at = Math.min(Math.max(m.offset, 0), value.length);
      pushText(cursor, at, idx);
      if (playing && at === caret) nodes.push(caretEl(`c-${idx}`));
      nodes.push(
        <span
          key={`m-${m.id}`}
          className={`inline-flex items-center mx-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider align-middle ${MARKER_STYLES[m.kind] || 'bg-white/10 text-white/70 border-white/20'}`}
        >
          [{markerLabel(m.kind, m.meta)}]
        </span>
      );
      cursor = at;
    });
    pushText(cursor, value.length, 'end');
    if (playing && caret >= cursor) nodes.push(caretEl('c-end'));
    return nodes;
  }, [view, playing]);

  if (total === 0) {
    return (
      <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-[11px] text-gsrp-teal-light/40 italic">
        No typing timeline was recorded for this field (older submission).
      </div>
    );
  }

  const isEmptyValue = view.value.trim().length === 0 && step > 0;

  return (
    <div className="mt-3 rounded-2xl border border-gsrp-orange/20 bg-black/30 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/5 bg-gsrp-dark-surface/40">
        <button
          onClick={handlePlayPause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gsrp-orange hover:bg-gsrp-orange/90 text-white text-[11px] font-bold uppercase tracking-widest transition-colors"
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? 'Pause' : step >= total ? 'Replay' : 'Play'}
        </button>
        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gsrp-dark-surface border border-white/10 text-gsrp-teal-light/70 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors"
        >
          <RotateCcw size={12} /> Restart
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <Gauge size={12} className="text-gsrp-teal-light/40" />
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSpeed(s.value)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                speed === s.value ? 'bg-gsrp-orange/20 text-gsrp-orange' : 'text-gsrp-teal-light/40 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        <input
          type="range"
          min={0}
          max={total}
          value={step}
          onChange={handleScrub}
          className="w-full accent-gsrp-orange h-1.5 bg-gsrp-dark-border rounded-lg appearance-none cursor-pointer"
          aria-label="Replay position"
        />
        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gsrp-teal-light/30 mt-1">
          <span>Step {step} / {total}</span>
          <span className="flex items-center gap-1"><Film size={10} /> Typing replay</span>
        </div>
      </div>

      <div className="p-4">
        <div className="min-h-[3rem] rounded-xl bg-gsrp-dark-surface/50 border border-white/5 px-4 py-3 text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words font-medium">
          {isEmptyValue ? (
            <span className="text-gsrp-teal-light/30 italic">(field is empty at this point)</span>
          ) : rendered.length > 0 ? (
            rendered
          ) : (
            <span className="text-gsrp-teal-light/30 italic">Press play to replay how this answer was typed.</span>
          )}
        </div>
      </div>
    </div>
  );
}
