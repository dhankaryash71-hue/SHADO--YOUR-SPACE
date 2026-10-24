import React from 'react';
import { motion } from 'framer-motion';

export const LogoIcon = ({ size = 38, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_0_12px_rgba(139,92,246,0.45)] ${className}`}
    >
      <defs>
        <linearGradient id="shado-grad-primary" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="shado-grad-shadow" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Background shadow facet evoking speech bubble */}
      <path
        d="M28 20 C28 14.477 32.477 10 38 10 L72 10 C83.046 10 92 18.954 92 30 L92 56 C92 67.046 83.046 76 72 76 L48 76 L26 92 L30 76 C23.373 76 18 70.627 18 64 L18 30 C18 24.477 22.477 20 28 20 Z"
        fill="url(#shado-grad-shadow)"
        className="opacity-40"
      />

      {/* Main Stylized 'S' Fused with Chat Bubble Shape */}
      <path
        d="M68 24 C56 18 38 20 32 28 C26 36 32 44 46 47 C62 50 68 56 64 68 C60 80 44 82 30 76 L24 86 C40 94 66 92 74 78 C82 64 72 54 58 50 C44 46 38 42 42 34 C46 26 58 24 66 30 L68 24 Z"
        fill="url(#shado-grad-primary)"
      />

      {/* Glowing accent focal node */}
      <circle cx="70" cy="28" r="4.5" fill="#38bdf8" className="animate-pulse" />
      <circle cx="28" cy="80" r="3" fill="#c084fc" />
    </svg>
  );
};

export const Logo = ({ size = 'md', showTagline = false, className = '' }) => {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const currentIconSize = iconSizes[size] || iconSizes.md;
  const currentTextSize = textSizes[size] || textSizes.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <LogoIcon size={currentIconSize} />
      </motion.div>
      <div>
        <div className={`font-black tracking-widest leading-none ${currentTextSize} text-gradient`}>
          SHADO
        </div>
        {showTagline && (
          <div className="text-[11px] tracking-wider text-slate-400 font-medium mt-1">
            Your People. Your Space.
          </div>
        )}
      </div>
    </div>
  );
};

export default Logo;
