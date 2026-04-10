import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Menu } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * WHY REF INSTEAD OF STATE HERE:
 *
 * If we gate the transition on a React state boolean (userVisible), the first
 * render where userVisible flips to true can happen in the same frame as the
 * initial mount — meaning the browser never paints the "opacity:0" state, so
 * there's nothing to transition *from*.
 *
 * Using a ref + imperative style mutation inside rAF guarantees:
 *   1. The element is mounted and painted at opacity:0 / translateX(16px).
 *   2. The rAF callback fires in the *next* frame and applies the transition
 *      + the target values — the browser then smoothly interpolates between
 *      the two painted states.
 */
export default function TopBar({ onMenuClick }) {
  const { data: session } = useSession();
  const router = useRouter();

  // Ref to the user-info section we want to animate
  const userSectionRef = useRef(null);

  useEffect(() => {
    const el = userSectionRef.current;
    if (!el || !session?.user) return;

    const revealUser = () => {
      // Double-rAF: first rAF enqueues, second fires after the browser has
      // committed the initial paint (opacity:0 from inline style below).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          el.style.opacity    = '1';
          el.style.transform  = 'translateX(0)';
        });
      });
    };

    // On any page that isn't the dashboard home, reveal immediately.
    if (router.pathname !== '/') {
      revealUser();
      return;
    }

    // If the welcome animation already ran this session, reveal immediately.
    if (sessionStorage.getItem('welcome_played')) {
      revealUser();
      return;
    }

    // Otherwise poll until WelcomeOverlay calls onComplete() which sets the flag.
    const interval = setInterval(() => {
      if (sessionStorage.getItem('welcome_played')) {
        clearInterval(interval);
        revealUser();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [router.pathname, session]);

  return (
    <header className="sticky top-0 z-40 bg-gsrp-dark/80 backdrop-blur-xl border-b border-gsrp-dark-border/50 px-4 md:px-6 py-3 flex items-center justify-between">
      {/* Left: menu toggle + branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-gsrp-dark-surface/60 text-gsrp-teal-light/60 hover:text-white transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <img
          src="https://i.imgur.com/SSbZ8VZ.png"
          alt="GSRP"
          className="w-7 h-7 rounded-lg object-cover hidden sm:block"
        />
        <div>
          <h1 className="text-white font-bold text-sm md:text-base">
            Georgia State Roleplay
          </h1>
          <p className="text-[10px] text-gsrp-teal-light/40 uppercase tracking-widest hidden sm:block">
            Dashboard
          </p>
        </div>
      </div>

      {/* Right: user section — mounted hidden, revealed by rAF after overlay */}
      {session?.user && (
        <div
          ref={userSectionRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            // INITIAL painted state — opacity 0, shifted right
            opacity: 0,
            transform: 'translateX(16px)',
            // No transition here — transition is added by the rAF callback
            // so the browser sees a full frame at opacity:0 first.
            willChange: 'opacity, transform',
          }}
        >
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-semibold">{session.user.name}</p>
            <p className="text-[10px] text-gsrp-teal-light/40 font-bold uppercase tracking-wider">
              {session.user.displayRole}
            </p>
          </div>

          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gsrp-dark-surface border border-gsrp-dark-border/50">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User
                size={16}
                className="text-gsrp-teal-light/40 absolute inset-0 m-auto"
              />
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-lg hover:bg-gsrp-sunset/10 text-gsrp-teal-light/40 hover:text-gsrp-sunset transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}