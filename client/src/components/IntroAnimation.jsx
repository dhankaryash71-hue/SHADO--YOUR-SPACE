import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mic, Video, Wifi, Sparkles } from 'lucide-react';
import { LogoIcon } from './Logo';

export const IntroAnimation = ({ onComplete }) => {
  // Stages: 'chats' (0-0.7s), 'voice' (0.7-1.4s), 'video' (1.4-2.0s), 'logo' (2.0-2.5s), 'exit' (2.5-3.0s)
  const [stage, setStage] = useState('chats');

  useEffect(() => {
    // Respect reduced motion accessibility
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    const t1 = setTimeout(() => setStage('voice'), 700);
    const t2 = setTimeout(() => setStage('video'), 1400);
    const t3 = setTimeout(() => setStage('logo'), 2000);
    const t4 = setTimeout(() => setStage('exit'), 2500);
    const t5 = setTimeout(() => onComplete?.(), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B12] overflow-hidden select-none">
      {/* Subtle Ambient Violet & Soft Blue Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[15%] left-[20%] w-[550px] h-[550px] rounded-full bg-[#8B5CF6]/20 blur-[130px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[15%] right-[20%] w-[450px] h-[450px] rounded-full bg-[#60A5FA]/15 blur-[120px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      </div>

      <AnimatePresence mode="wait">
        {/* ======================================================== */}
        {/* 1. 0.0 – 0.7s: ANIMATED CHATS                            */}
        {/* ======================================================== */}
        {stage === 'chats' && (
          <motion.div
            key="chats-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-sm px-6 flex flex-col space-y-3"
          >
            {/* Bubble 1: "Hey!" (smooth entry from left) */}
            <motion.div
              initial={{ opacity: 0, x: -35, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="self-start px-4 py-2.5 rounded-2xl rounded-bl-xs bg-[#161826] border border-slate-800 text-[#FFFFFF] text-sm font-medium shadow-lg"
            >
              Hey! 👋
            </motion.div>

            {/* Bubble 2: "What's up?" (smooth entry from right) */}
            <motion.div
              initial={{ opacity: 0, x: 35, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="self-end px-4 py-2.5 rounded-2xl rounded-br-xs bg-[#8B5CF6] text-white text-sm font-medium shadow-[0_0_20px_rgba(139,92,246,0.35)]"
            >
              What's up?
            </motion.div>

            {/* Bubble 3: "Let's connect." (entry from left) */}
            <motion.div
              initial={{ opacity: 0, x: -35, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="self-start px-4 py-2.5 rounded-2xl rounded-bl-xs bg-[#161826] border border-slate-800 text-[#FFFFFF] text-sm font-medium shadow-lg flex items-center gap-1.5"
            >
              <span>Let's connect.</span>
              <Sparkles size={14} className="text-[#8B5CF6]" />
            </motion.div>

            {/* Bubble 4: Animated 3-dot typing indicator (from right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.45 }}
              className="self-end px-3.5 py-2 rounded-2xl rounded-br-xs bg-[#1c1f30] border border-slate-800 flex items-center gap-1 shadow-md"
            >
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: 0 }}
                className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
              />
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: 0.12 }}
                className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
              />
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: 0.24 }}
                className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
              />
            </motion.div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* 2. 0.7 – 1.4s: VOICE CALL                                */}
        {/* ======================================================== */}
        {stage === 'voice' && (
          <motion.div
            key="voice-stage"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-72 p-6 rounded-3xl border border-slate-800/80 bg-[#121422]/90 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-4"
          >
            {/* Avatar with Pulsing Violet Ring */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 0.65, repeat: Infinity, ease: 'easeOut' }}
                className="absolute -inset-2 rounded-full border-2 border-[#8B5CF6]"
              />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#8B5CF6] via-indigo-600 to-[#60A5FA] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/30">
                A
              </div>
            </div>

            {/* Connecting text */}
            <div>
              <div className="text-sm font-bold text-[#FFFFFF]">Alex Rivera</div>
              <div className="text-xs text-[#8B5CF6] font-medium tracking-wide flex items-center justify-center gap-1 mt-0.5">
                <span>Connecting</span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  ...
                </motion.span>
              </div>
            </div>

            {/* Animated Sound-Wave Indicator (5 vertical bars) */}
            <div className="flex items-center gap-1 h-6">
              {[0.4, 0.8, 1, 0.6, 0.3].map((height, i) => (
                <motion.span
                  key={i}
                  animate={{ scaleY: [height * 0.4, height, height * 0.4] }}
                  transition={{ duration: 0.35, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                  className="w-1 bg-[#8B5CF6] rounded-full h-full origin-center"
                />
              ))}
            </div>

            {/* Minimal Icons: Mic & Phone */}
            <div className="flex items-center gap-3 pt-1">
              <div className="p-2.5 rounded-full bg-[#1c1f30] text-[#A1A1AA] border border-slate-800">
                <Mic size={15} />
              </div>
              <div className="p-2.5 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <Phone size={15} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* 3. 1.4 – 2.0s: VIDEO CALL                                */}
        {/* ======================================================== */}
        {stage === 'video' && (
          <motion.div
            key="video-stage"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-80 rounded-3xl border border-slate-800/80 bg-[#121422]/90 backdrop-blur-xl shadow-2xl p-4 overflow-hidden space-y-3"
          >
            {/* Top Video Status Bar */}
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>HD Connected</span>
              </div>
              <div className="flex items-center gap-1">
                <Wifi size={13} className="text-[#8B5CF6]" />
                <Video size={13} className="text-[#60A5FA]" />
              </div>
            </div>

            {/* Main Video Screen with Two Abstract Avatars */}
            <div className="relative h-36 rounded-2xl bg-gradient-to-br from-[#1a1c2d] to-[#0d0f1a] border border-slate-800 flex items-center justify-center overflow-hidden">
              {/* Primary User Avatar */}
              <div className="flex flex-col items-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#60A5FA] flex items-center justify-center text-white font-bold text-base shadow-md">
                  A
                </div>
                <span className="text-[11px] text-[#A1A1AA] font-medium">Alex Rivera</span>
              </div>

              {/* Picture-in-Picture Secondary Avatar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="absolute bottom-2.5 right-2.5 w-11 h-14 rounded-xl bg-[#23273c] border border-slate-700/80 shadow-lg flex items-center justify-center"
              >
                <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
                  Y
                </div>
              </motion.div>
            </div>

            {/* Subtle Audio Waves */}
            <div className="flex items-center justify-center gap-1 py-0.5">
              {[0.5, 0.9, 0.4, 0.8, 0.6, 1, 0.4].map((h, i) => (
                <motion.span
                  key={i}
                  animate={{ scaleY: [0.3, h, 0.3] }}
                  transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                  className="w-1 h-3 bg-[#60A5FA] rounded-full origin-center"
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* 4. 2.0 – 2.5s: SHADO LOGO REVEAL & LIGHT SWEEP           */}
        {/* ======================================================== */}
        {(stage === 'logo' || stage === 'exit') && (
          <motion.div
            key="logo-stage"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center space-y-4"
          >
            {/* Glowing Logo Icon */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-4 rounded-full bg-[#8B5CF6]/30 blur-2xl pointer-events-none"
              />
              <LogoIcon size={80} />
            </div>

            {/* Title with Subtle Light Sweep Effect */}
            <div className="relative overflow-hidden">
              <h1 className="text-4xl sm:text-5xl font-black tracking-[0.25em] text-[#FFFFFF] drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]">
                SHADO
              </h1>
              {/* Violet Light Sweep */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 0.45, delay: 0.05, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 pointer-events-none"
              />
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="text-sm sm:text-base font-light text-[#A1A1AA] tracking-wider"
            >
              Your People. Your Space.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntroAnimation;
