import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeScreen({ session, onComplete }) {
  const [stage, setStage] = useState('welcome'); // 'welcome' -> 'gliding' -> 'complete'

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage('gliding');
      setTimeout(() => {
        onComplete();
      }, 1000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (stage === 'complete') return null;

  const isGliding = stage === 'gliding';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gsrp-dark overflow-hidden"
      >
        <motion.div 
          animate={isGliding ? { 
            x: typeof window !== 'undefined' && window.innerWidth > 768 ? window.innerWidth - 300 : 0, 
            y: -window.innerHeight / 2 + 50, // Approximate movement toward top right
            scale: 0.4,
            opacity: 0 
          } : { 
            x: 0, 
            y: 0, 
            scale: 1, 
            opacity: 1 
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center scale-110"
        >
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gsrp-teal-light/30 shadow-lg shadow-gsrp-teal-light/20"
          >
            <img 
              src={session?.user?.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
              alt={session?.user?.name} 
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center mt-6"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
              Welcome, <span className="text-gsrp-teal-light">{session?.user?.name}</span>
            </h1>
            <p className="text-lg md:text-xl text-gsrp-teal-light/60 font-bold uppercase tracking-widest mt-2">
              {session?.user?.displayRole || 'Member'}
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
