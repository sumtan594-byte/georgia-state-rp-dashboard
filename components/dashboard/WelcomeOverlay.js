import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function WelcomeOverlay({ onComplete }) {
  const { data: session } = useSession();
  const [phase, setPhase] = useState('entering'); // 'entering', 'welcome', 'gliding', 'hidden'

  useEffect(() => {
    // Phase 1: Show "Welcome" (slight delay for entrance)
    const t1 = setTimeout(() => setPhase('welcome'), 50);
    
    // Phase 2: Start Gliding after 1.2s (faster than before)
    const t2 = setTimeout(() => {
      setPhase('gliding');
      
      // Phase 3: Complete transition after glide finishes (0.6s)
      const t3 = setTimeout(() => {
        setPhase('hidden');
        onComplete();
      }, 600);
      return () => clearTimeout(t3);
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  if (!session || phase === 'hidden') return null;

  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${phase === 'gliding' ? 'bg-transparent pointer-events-none' : 'bg-gsrp-dark'}`}>
      {/* Background Image - stays centered and fades out during glide */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${phase === 'gliding' ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src="https://i.imgur.com/QVVQSK2.png" 
          alt="" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gsrp-dark/90 backdrop-blur-sm" />
      </div>

      <div className="relative h-full flex items-center justify-center">
        <div 
          className={`transition-all duration-700 ease-in-out ${
            phase === 'entering' ? 'opacity-0 scale-90 translate-y-4' :
            phase === 'welcome' ? 'opacity-100 scale-100 translate-y-0' :
            'animate-welcome-glide'
          }`}
        >
          <div className="text-center">
             <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8 mx-auto">
                {/* Decorative rings */}
                <div className="absolute inset-[-10px] rounded-full border border-gsrp-orange/20 animate-spin-slow" />
                <div className="absolute inset-[-20px] rounded-full border border-gsrp-teal/10 animate-reverse-spin-slow" />
                
                <div className="w-full h-full rounded-full border-4 border-gsrp-dark-surface p-1 bg-gsrp-dark/50 overflow-hidden shadow-2xl shadow-gsrp-orange/20">
                  <img 
                    src={session.user.image || "https://i.imgur.com/SSbZ8VZ.png"} 
                    className="w-full h-full rounded-full object-cover" 
                    alt={session.user.name}
                  />
                </div>
             </div>
             
             <div className="space-y-2">
               <p className="text-gsrp-teal-light text-xs font-bold uppercase tracking-[0.5em] opacity-60">
                 Accessing Secure Terminal
               </p>
               <h1 className="text-white font-black text-5xl md:text-7xl tracking-tighter">
                Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-gsrp-orange via-gsrp-gold to-gsrp-orange bg-[length:200%_auto] animate-shimmer">{session.user.name}</span>
              </h1>
              <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest pt-4">
                Georgia State Roleplay Dashboard &bull; Session v1.0.4
              </p>
             </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-spin-slow {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .animate-reverse-spin-slow {
          animation: reverse-spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
