import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopBar({ onMenuClick }) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 bg-gsrp-dark/75 backdrop-blur-xl border-b border-gsrp-dark-border/40 px-4 md:px-6 h-[60px] flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <motion.button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/[0.06] text-gsrp-teal-light/60 hover:text-white transition-colors cursor-pointer"
          whileTap={{ scale: 0.9 }}
        >
          <Menu size={18} />
        </motion.button>
        <img src="https://i.imgur.com/SSbZ8VZ.png" alt="GSRP" className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10 hidden sm:block" />
        <div className="min-w-0">
          <h1 className="font-display text-white font-extrabold text-[15px] md:text-base truncate max-w-[170px] sm:max-w-none tracking-tight leading-tight">
            Georgia State Roleplay
          </h1>
          <p className="text-[11px] font-medium text-gsrp-teal-light/40 hidden sm:block mt-0.5">Dashboard</p>
        </div>
      </div>

      {session?.user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block leading-tight">
            <p className="text-white text-[13.5px] font-bold truncate max-w-[160px]">{session.user.name}</p>
            {session.user.displayRole && (
              <p className="font-mono text-[9.5px] text-gsrp-teal-light/50 uppercase tracking-[0.14em] mt-0.5 truncate max-w-[160px]">
                {session.user.displayRole}
              </p>
            )}
          </div>
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gsrp-dark-surface ring-1 ring-white/12 shadow-tac-1">
            {session.user.image ? (
              <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-gsrp-teal-light/45 absolute inset-0 m-auto" />
            )}
          </div>
          <motion.button
            onClick={async (e) => {
              e.preventDefault();
              await signOut({ redirect: false });
              window.location.href = '/login';
            }}
            className="p-2 rounded-lg hover:bg-gsrp-sunset/12 text-gsrp-teal-light/45 hover:text-gsrp-sunset transition-colors cursor-pointer"
            aria-label="Sign out"
            title="Sign Out"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      )}
    </header>
  );
}
