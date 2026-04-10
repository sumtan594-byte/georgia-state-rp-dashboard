import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TopBar({ onMenuClick }) {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if welcome has been played or if we are not on the dashboard (index page)
    const checkVisibility = () => {
      const played = sessionStorage.getItem('welcome_played');
      if (played || window.location.pathname !== '/') {
        setIsVisible(true);
      } else {
        // If welcome is active, we'll wait for it to finish
        // We can poll or just wait a bit, but better to check storage changes
        const interval = setInterval(() => {
          if (sessionStorage.getItem('welcome_played')) {
            setIsVisible(true);
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    };
    
    checkVisibility();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-gsrp-dark/80 backdrop-blur-xl border-b border-gsrp-dark-border/50 px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-gsrp-dark-surface/60 text-gsrp-teal-light/60 hover:text-white transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <img src="https://i.imgur.com/SSbZ8VZ.png" alt="GSRP" className="w-7 h-7 rounded-lg object-cover hidden sm:block" />
        <div>
          <h1 className="text-white font-bold text-sm md:text-base">Georgia State Roleplay</h1>
          <p className="text-[10px] text-gsrp-teal-light/40 uppercase tracking-widest hidden sm:block">Dashboard</p>
        </div>
      </div>

      {session?.user && (
        <div className={`flex items-center gap-3 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-semibold">{session.user.name}</p>
            <p className="text-[10px] text-gsrp-teal-light/40 font-bold uppercase tracking-wider">{session.user.displayRole}</p>
          </div>
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gsrp-dark-surface border border-gsrp-dark-border/50">
            {session.user.image ? (
              <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-gsrp-teal-light/40 absolute inset-0 m-auto" />
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

