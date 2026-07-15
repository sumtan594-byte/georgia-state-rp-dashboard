import Head from 'next/head';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Maximize2, Minimize2, Volume2, Volume1, VolumeX, RotateCcw } from 'lucide-react';

const VIDEO_SRC = '/media/Georgia_State_Roleplay_Ten_Thousand_Member_Anniversary.mp4';
const LOGO = '/media/gsrp-logo.png';

function fmt(t) {
  if (!t || Number.isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Trailer() {
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const hideTimer = useRef(null);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [ended, setEnded] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play().catch(() => {});
      setStarted(true);
      setEnded(false);
    } else {
      v.pause();
    }
  }, []);

  const restart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    setEnded(false);
  };

  const onSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const pct = Number(e.target.value);
    v.currentTime = (pct / 100) * (v.duration || 0);
    setCurrent(v.currentTime);
  };

  const onVolume = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.volume === 0) {
      v.volume = 0.6;
      setVolume(0.6);
    }
  };

  const toggleFullscreen = () => {
    const el = screenRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  // Auto-hide controls while playing and idle
  const nudgeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  useEffect(() => () => hideTimer.current && clearTimeout(hideTimer.current), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'KeyK') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'KeyM') toggleMute();
      else if (e.code === 'KeyF') toggleFullscreen();
      else if (e.code === 'ArrowRight' && videoRef.current) videoRef.current.currentTime += 5;
      else if (e.code === 'ArrowLeft' && videoRef.current) videoRef.current.currentTime -= 5;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <Head>
        <title>Georgia State Roleplay Trailer</title>
        <meta name="description" content="Watch the official Georgia State Roleplay trailer, celebrating our Ten Thousand Member anniversary." />
        <meta name="robots" content="index, follow" />
      </Head>

      {/* Opening curtains */}
      <div aria-hidden="true" className="cinema-curtain cinema-curtain-left" />
      <div aria-hidden="true" className="cinema-curtain cinema-curtain-right" />

      <div className="relative min-h-screen bg-gsrp-dark overflow-hidden flex flex-col">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.85)_100%)]" />
        <div aria-hidden="true" className="cinema-ambient pointer-events-none fixed inset-0 opacity-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[60vh] rounded-full bg-gsrp-orange/12 blur-[160px]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[50vw] h-[40vh] rounded-full bg-gsrp-teal/10 blur-[150px]" />
        </div>

        {/* Top bar */}
        <header className="relative z-30 flex items-center justify-between px-5 sm:px-8 h-16 cinema-fade-up">
          <Link href="/" className="inline-flex items-center gap-2 text-gsrp-teal-light/70 hover:text-white transition-colors text-[13.5px] font-semibold">
            <ArrowLeft size={17} />
            Back to site
          </Link>
          <div className="flex items-center gap-2.5">
            <img src={LOGO} alt="" className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10" />
            <span className="font-display font-extrabold text-white text-[13.5px] tracking-tight hidden sm:block">
              Georgia State <span className="text-gsrp-orange">Roleplay</span>
            </span>
          </div>
        </header>

        {/* Stage */}
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 pb-10">
          <div className="cinema-fade-up text-center mb-6">
            <p className="text-gsrp-orange font-semibold text-[12.5px] tracking-[0.25em] uppercase mb-2">Now Showing</p>
            <h1 className="font-display text-white font-extrabold tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.03]">
              Georgia State Roleplay <span className="bg-gradient-to-r from-gsrp-orange via-gsrp-warm to-gsrp-gold bg-clip-text text-transparent">Trailer</span>
            </h1>
            <p className="text-gsrp-teal-light/55 text-[13.5px] sm:text-[15px] mt-3">Ten Thousand Member Anniversary</p>
          </div>

          {/* Screen */}
          <div
            ref={screenRef}
            className="cinema-screen group/screen relative w-full max-w-[1180px] aspect-video"
            onMouseMove={nudgeControls}
            onMouseLeave={() => playing && setControlsVisible(false)}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full rounded-[11px] object-contain bg-black cursor-pointer"
              src={VIDEO_SRC}
              playsInline
              preload="metadata"
              onClick={togglePlay}
              onPlay={() => { setPlaying(true); setStarted(true); nudgeControls(); }}
              onPause={() => { setPlaying(false); setControlsVisible(true); }}
              onEnded={() => { setPlaying(false); setEnded(true); setControlsVisible(true); }}
              onTimeUpdate={(e) => {
                setCurrent(e.target.currentTime);
                const b = e.target.buffered;
                if (b.length) setBuffered(b.end(b.length - 1));
              }}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
            />

            {/* Big center play / replay overlay */}
            {(!started || !playing) && (
              <button
                onClick={ended ? restart : togglePlay}
                aria-label={ended ? 'Replay trailer' : 'Play trailer'}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[11px] bg-black/40 backdrop-blur-[2px] transition-colors hover:bg-black/25 cursor-pointer"
              >
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gsrp-orange shadow-glow-orange transition-transform hover:scale-105">
                  <span aria-hidden="true" className="absolute inset-0 rounded-full bg-gsrp-orange animate-ping opacity-30" />
                  {ended
                    ? <RotateCcw size={30} className="relative text-white" />
                    : <Play size={32} className="relative translate-x-[2px] fill-white text-white" />}
                </span>
                <span className="font-display font-bold text-white text-[15px] tracking-wide">
                  {ended ? 'Replay Trailer' : started ? 'Resume' : 'Play Trailer'}
                </span>
              </button>
            )}

            {/* Themed control bar */}
            <div
              className={`absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pb-3 pt-10 rounded-b-[11px] bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-opacity duration-300 ${controlsVisible || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {/* Seek bar */}
              <div className="gsrp-seek-wrap group/seek relative flex items-center">
                <div className="pointer-events-none absolute left-0 right-0 h-[5px] rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-white/20" style={{ width: `${bufPct}%` }} />
                </div>
                <div className="pointer-events-none absolute left-0 h-[5px] rounded-full bg-gradient-to-r from-gsrp-orange to-gsrp-gold" style={{ width: `${pct}%` }} />
                <input
                  type="range" min="0" max="100" step="0.1" value={pct}
                  onChange={onSeek}
                  aria-label="Seek"
                  className="gsrp-range relative z-10 w-full"
                />
              </div>

              {/* Buttons row */}
              <div className="mt-2 flex items-center gap-2 sm:gap-3">
                <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gsrp-orange text-white shadow-glow-orange hover:bg-gsrp-orange-light transition-colors cursor-pointer shrink-0">
                  {playing ? <Pause size={16} className="fill-white" /> : <Play size={16} className="translate-x-[1px] fill-white" />}
                </button>

                <button onClick={restart} aria-label="Restart"
                  className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-gsrp-teal-light/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                  <RotateCcw size={16} />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/vol shrink-0">
                  <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gsrp-teal-light/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <VolIcon size={17} />
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume}
                    onChange={onVolume} aria-label="Volume"
                    className="gsrp-range gsrp-range-vol w-0 sm:w-20 opacity-0 sm:opacity-100 sm:group-hover/vol:w-24 transition-all"
                    style={{ '--val': `${(muted ? 0 : volume) * 100}%` }}
                  />
                </div>

                {/* Time */}
                <span className="font-mono text-[12px] text-gsrp-teal-light/80 tabular-nums select-none">
                  {fmt(current)} <span className="text-gsrp-teal-light/35">/ {fmt(duration)}</span>
                </span>

                <div className="flex-1" />

                <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gsrp-teal-light/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0">
                  {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
              </div>
            </div>
          </div>

          <p className="cinema-fade-up mt-5 text-gsrp-teal-light/35 text-[12px] tracking-wide">
            Space / K play · M mute · F fullscreen · ← → seek
          </p>
        </main>
      </div>
    </>
  );
}
