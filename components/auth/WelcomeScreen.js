import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

export default function WelcomeScreen({ onComplete }) {
  const { data: session, status } = useSession();
  const [stage, setStage] = useState('welcome'); // 'welcome' -> 'gliding' -> 'complete'
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      onCompleteRef.current();
      return undefined;
    }

    if (status === 'authenticated') {
      let finishTimer;
      const timer = setTimeout(() => {
        setStage('gliding');
        finishTimer = setTimeout(() => onCompleteRef.current(), 800);
      }, 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(finishTimer);
      };
    }
    return undefined;
  }, [status]);

  if (stage === 'complete' || status === 'loading') return null;
  if (status === 'unauthenticated') return null;

  const isGliding = stage === 'gliding';
  const userName = session?.user?.name || 'User';
  const userRole = session?.user?.displayRole || 'Member';
  const userImage = session?.user?.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        style={{ 
          backgroundColor: 'transparent', 
          pointerEvents: 'none' 
        }}
      >
        <motion.div 
          animate={isGliding ? { 
            x: typeof window !== 'undefined' ? window.innerWidth * 0.32 : 0, 
            y: typeof window !== 'undefined' ? -window.innerHeight * 0.42 : 0, 
            scale: 0.25,
            opacity: 0 
          } : { 
            x: 0, 
            y: 0, 
            scale: 1, 
            opacity: 1 
          }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center"
        >
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gsrp-teal-light/30 shadow-lg shadow-gsrp-teal-light/20"
          >
            <img 
              src={userImage} 
              alt={userName} 
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center mt-7"
          >
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-white tracking-[-0.03em] drop-shadow-lg leading-[1.05]">
              Welcome, <span className="text-gsrp-teal-light">{userName}</span>
            </h1>
            <p className="text-sm md:text-base text-gsrp-teal-light/55 font-semibold tracking-[0.12em] mt-3">
              {userRole}
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
