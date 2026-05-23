import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { Menu } from 'lucide-react';

export default function TopBar({ onMenuClick }) {
  const { data: session } = useSession();

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
          <h1 className="text-white font-bold text-sm md:text-base truncate max-w-[160px] sm:max-w-none">Georgia State Roleplay</h1>
          <p className="text-[10px] text-gsrp-teal-light/40 uppercase tracking-widest hidden sm:block">Dashboard</p>
        </div>
      </div>

      {session?.user && (
        <div className="flex items-center gap-3">
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
            onClick={async (e) => {
              e.preventDefault();
              await signOut({ redirect: false });
              window.location.href = '/login';
            }}
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