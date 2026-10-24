import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoIcon } from './Logo';

export const CinematicIntro = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Sequence timing
    const t1 = setTimeout(() => setStep(2), 700);  // Reveal abstract shadow shape
    const t2 = setTimeout(() => setStep(3), 1500); // Morph into SHADO logo
    const t3 = setTimeout(() => setStep(4), 2200); // Reveal "SHADO"
    const t4 = setTimeout(() => setStep(5), 2900); // Reveal Tagline
    const t5 = setTimeout(() => {
      setStep(6);
      setTimeout(onComplete, 600); // Smooth exit
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {step < 6 && (
        <motion.div
          key="cinematic-canvas"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080c] overflow-hidden select-none"
        >
          {/* Subtle Ambient Violet Radial Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.2, 0.45, 0.2],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[130px]"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.15, 0.35, 0.15],
              }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-[20%] right-[20%] w-[500px] h-[500px] rounded-full bg-sky-500/15 blur-[120px]"
            />
            {/* Fine grain overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          </div>

          {/* Central Logo & Animation Sequence */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Step 1 & 2: Abstract Shadow Shape */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              {step < 3 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
                  animate={{
                    opacity: step >= 2 ? 0.9 : 0.2,
                    scale: step >= 2 ? 1 : 0.6,
                    rotate: step >= 2 ? 0 : -15,
                  }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-violet-900/60 to-purple-600/30 border border-violet-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(139,92,246,0.3)] flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 animate-pulse" />
                </motion.div>
              ) : (
                /* Step 3: Morph into SHADO Logo */
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.7, type: 'spring', bounce: 0.35 }}
                  className="relative"
                >
                  <div className="absolute -inset-4 rounded-full bg-violet-600/30 blur-2xl animate-pulse" />
                  <LogoIcon size={84} />
                </motion.div>
              )}
            </div>

            {/* Step 4: Reveal SHADO Title */}
            <div className="h-14 mt-6 overflow-hidden flex items-center">
              <AnimatePresence>
                {step >= 4 && (
                  <motion.h1
                    initial={{ opacity: 0, y: 24, letterSpacing: '0.3em' }}
                    animate={{ opacity: 1, y: 0, letterSpacing: '0.25em' }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-sky-300 drop-shadow-[0_0_25px_rgba(167,139,250,0.5)]"
                  >
                    SHADO
                  </motion.h1>
                )}
              </AnimatePresence>
            </div>

            {/* Step 5: Reveal Tagline */}
            <div className="h-8 overflow-hidden flex items-center">
              <AnimatePresence>
                {step >= 5 && (
                  <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="text-sm sm:text-base font-light text-slate-400 tracking-wider"
                  >
                    Your People. Your Space.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CinematicIntro;
