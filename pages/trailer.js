import Head from 'next/head';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowLeft, Play, Maximize2, Volume2, VolumeX } from 'lucide-react';

const VIDEO_SRC = '/media/Georgia%20State%20Roleplay%20Ten%20Thousand%20Member%20Anniversary.mp4';
const LOGO = '/media/gsrp-logo.png';

export default function Trailer() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
    setStarted(true);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const goFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  };

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
        {/* Deep cinema vignette */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.85)_100%)]" />
        {/* Ambient screen spill */}
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
          <div className="cinema-screen relative w-full max-w-[1180px] aspect-video">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full rounded-[11px] object-contain bg-black"
              src={VIDEO_SRC}
              controls={started}
              playsInline
              preload="metadata"
              onPlay={() => setStarted(true)}
            />

            {/* Play overlay */}
            {!started && (
              <button
                onClick={play}
                aria-label="Play trailer"
                className="group absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[11px] bg-black/45 backdrop-blur-[2px] transition-colors hover:bg-black/30 cursor-pointer"
              >
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gsrp-orange shadow-glow-orange transition-transform group-hover:scale-105">
                  <span aria-hidden="true" className="absolute inset-0 rounded-full bg-gsrp-orange animate-ping opacity-30" />
                  <Play size={32} className="relative translate-x-[2px] fill-white text-white" />
                </span>
                <span className="font-display font-bold text-white text-[15px] tracking-wide">Play Trailer</span>
              </button>
            )}
          </div>

          {/* Controls under screen */}
          <div className="cinema-fade-up mt-6 flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="inline-flex items-center gap-2 tac-panel tac-panel-hover text-white px-4 py-2.5 rounded-xl font-semibold text-[13px] cursor-pointer"
            >
              {muted ? <VolumeX size={16} className="text-gsrp-teal-light" /> : <Volume2 size={16} className="text-gsrp-teal-light" />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={goFullscreen}
              className="inline-flex items-center gap-2 tac-panel tac-panel-hover text-white px-4 py-2.5 rounded-xl font-semibold text-[13px] cursor-pointer"
            >
              <Maximize2 size={16} className="text-gsrp-teal-light" />
              Fullscreen
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
