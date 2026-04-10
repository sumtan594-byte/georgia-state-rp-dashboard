import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

/**
 * WHY REFS INSTEAD OF STATE:
 *
 * When you change React state, the re-render and DOM mutation happen in the
 * same browser paint frame. CSS `transition` needs to see two *separate*
 * painted frames — one for the "from" value and one for the "to" value —
 * to interpolate between them. If both are applied in the same frame, the
 * browser skips the animation entirely and jumps to the final value.
 *
 * The fix: store refs to the DOM nodes, set initial styles synchronously in
 * JSX, then mutate them imperatively inside requestAnimationFrame (which
 * guarantees a new paint frame before the transition target is applied).
 *
 * Double-rAF (rAF inside rAF) is used for the glide phase because a single
 * rAF sometimes still collapses into the same frame in Chromium; the second
 * rAF reliably forces a second composited frame.
 */
export default function WelcomeOverlay({ onComplete }) {
  const { data: session } = useSession();
  // `visible` only controls mount/unmount — never used to derive animation styles
  const [visible, setVisible] = useState(true);

  const overlayRef = useRef(null);
  const bgRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!session) return;

    const overlay = overlayRef.current;
    const bg = bgRef.current;
    const content = contentRef.current;
    if (!overlay || !bg || !content) return;

    // ── Phase 1: "entering" → "visible" ───────────────────────────────────
    // The element is already painted with opacity:0 / scale(0.9) from JSX.
    // One rAF is enough here because we just want to start a transition FROM
    // the initial painted state.
    const t1 = setTimeout(() => {
      requestAnimationFrame(() => {
        content.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        content.style.opacity = '1';
        content.style.transform = 'scale(1) translateY(0)';
      });
    }, 80);

    // ── Phase 2: "visible" → "gliding" ────────────────────────────────────
    // Double-rAF ensures a full composited frame exists showing the "visible"
    // state before we overwrite the styles with the glide targets. Without
    // the double-rAF, Chromium can merge both into one frame.
    const t2 = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Overlay background fades to transparent
          overlay.style.transition = 'background-color 0.5s ease';
          overlay.style.backgroundColor = 'transparent';
          overlay.style.pointerEvents = 'none';

          // Background image fades out
          bg.style.transition = 'opacity 0.6s ease';
          bg.style.opacity = '0';

          // Content glides to the top-right corner (where TopBar user info lives)
          content.style.transition = [
            'opacity   0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            'transform 0.80s cubic-bezier(0.4, 0, 0.2, 1)',
          ].join(', ');
          content.style.opacity = '0';
          content.style.transform = 'scale(0.35) translate(38vw, -48vh)';
        });
      });
    }, 1600);

    // ── Phase 3: unmount + notify parent ──────────────────────────────────
    const t3 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [session, onComplete]);

  if (!session || !visible) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Solid dark background is the initial painted state — no state needed
        backgroundColor: '#0A0E1A',
      }}
    >
      {/* ── Background image layer ── */}
      <div ref={bgRef} style={{ position: 'absolute', inset: 0, opacity: 1 }}>
        <img
          src="https://i.imgur.com/QVVQSK2.png"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(10, 14, 26, 0.88)',
          }}
        />
      </div>

      {/* ── Animated content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          ref={contentRef}
          style={{
            textAlign: 'center',
            // INITIAL state — painted on first frame; rAF transitions away from here
            opacity: 0,
            transform: 'scale(0.9) translateY(12px)',
            willChange: 'opacity, transform',
            transformOrigin: 'center center',
          }}
        >
          {/* Avatar with orbital rings */}
          <div
            style={{
              position: 'relative',
              width: 128,
              height: 128,
              margin: '0 auto 32px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                border: '1px solid rgba(249, 115, 22, 0.2)',
                animation: 'gsrp-spin 12s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: -20,
                borderRadius: '50%',
                border: '1px solid rgba(13, 148, 136, 0.12)',
                animation: 'gsrp-spin-reverse 20s linear infinite',
              }}
            />
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid rgba(21, 29, 53, 0.8)',
                overflow: 'hidden',
                boxShadow: '0 0 40px rgba(249, 115, 22, 0.15)',
              }}
            >
              <img
                src={session.user.image || 'https://i.imgur.com/SSbZ8VZ.png'}
                alt={session.user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Sub-label */}
          <p
            style={{
              color: 'rgba(20, 184, 166, 0.6)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.45em',
              marginBottom: 12,
              marginTop: 0,
            }}
          >
            Accessing Secure Terminal
          </p>

          {/* Main heading */}
          <h1
            style={{
              color: '#fff',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 7vw, 5rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Welcome,{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #F97316, #FBBF24, #F97316)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'gsrp-shimmer 2s linear infinite',
              }}
            >
              {session.user.name}
            </span>
          </h1>

          {/* Footer mono text */}
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.15)',
              fontFamily: 'monospace',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Georgia State Roleplay Dashboard
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gsrp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes gsrp-spin-reverse {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes gsrp-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}