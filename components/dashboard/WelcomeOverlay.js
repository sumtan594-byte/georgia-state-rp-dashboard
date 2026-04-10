import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Phases: 'entering' -> 'visible' -> 'gliding' -> 'done'
export default function WelcomeOverlay({ onComplete }) {
  const { data: session } = useSession();
  const [phase, setPhase] = useState('entering');

  useEffect(() => {
    // Small delay then fade in the welcome text
    const t1 = setTimeout(() => setPhase('visible'), 80);
    // After 1.4s start the glide
    const t2 = setTimeout(() => setPhase('gliding'), 1600);
    // After glide finishes call onComplete
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (!session || phase === 'done') return null;

  const isGliding = phase === 'gliding';
  const isVisible = phase === 'visible' || phase === 'gliding';

  // Overlay background fades out during glide
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isGliding ? 'transparent' : '#0A0E1A',
    transition: 'background-color 0.5s ease',
    pointerEvents: isGliding ? 'none' : 'auto',
  };

  const bgImageStyle = {
    position: 'absolute',
    inset: 0,
    opacity: isGliding ? 0 : 1,
    transition: 'opacity 0.6s ease',
  };

  // The welcome content transitions through 3 states
  const contentStyle = {
    textAlign: 'center',
    opacity: isVisible ? (isGliding ? 0 : 1) : 0,
    transform: isVisible
      ? (isGliding ? 'scale(0.35) translate(38vw, -48vh)' : 'scale(1) translate(0, 0)')
      : 'scale(0.9) translate(0, 12px)',
    transition: isGliding
      ? 'opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'opacity 0.6s ease, transform 0.6s ease',
    willChange: 'opacity, transform',
    transformOrigin: 'center center',
  };

  return (
    <div style={overlayStyle}>
      {/* Background */}
      <div style={bgImageStyle}>
        <img
          src="https://i.imgur.com/QVVQSK2.png"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10, 14, 26, 0.88)' }} />
      </div>

      {/* Welcome content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={contentStyle}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: 128, height: 128, margin: '0 auto 32px' }}>
            <div style={{
              position: 'absolute', inset: -10,
              borderRadius: '50%',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              animation: 'gsrp-spin 12s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: -20,
              borderRadius: '50%',
              border: '1px solid rgba(13, 148, 136, 0.12)',
              animation: 'gsrp-spin-reverse 20s linear infinite',
            }} />
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              border: '3px solid rgba(21, 29, 53, 0.8)',
              overflow: 'hidden',
              boxShadow: '0 0 40px rgba(249, 115, 22, 0.15)',
            }}>
              <img
                src={session.user.image || 'https://i.imgur.com/SSbZ8VZ.png'}
                alt={session.user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Text */}
          <p style={{
            color: 'rgba(20, 184, 166, 0.6)',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.45em',
            marginBottom: 12,
          }}>
            Accessing Secure Terminal
          </p>
          <h1 style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0,
          }}>
            Welcome,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #F97316, #FBBF24, #F97316)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gsrp-shimmer 2s linear infinite',
            }}>
              {session.user.name}
            </span>
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.15)',
            fontFamily: 'monospace',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            marginTop: 24,
          }}>
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
