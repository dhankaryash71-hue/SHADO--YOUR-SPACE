import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ThemeToggle = ({ compact = false, showLabel = false }) => {
  const { theme, resolvedTheme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    { id: 'dark', label: 'Dark Mode', icon: Moon },
    { id: 'light', label: 'Light Mode', icon: Sun },
    { id: 'system', label: 'System Default', icon: Laptop },
  ];

  const currentIcon = resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />;

  if (compact) {
    // Single-click toggle between dark & light
    return (
      <button
        onClick={() => changeTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-xl border border-slate-700/40 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-violet-500 dark:hover:text-violet-400 transition-colors shadow-sm"
        title={`Current: ${theme}. Click to switch theme`}
        aria-label="Toggle Theme"
      >
        {currentIcon}
      </button>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-violet-500/50 hover:text-violet-500 transition-all shadow-sm"
        aria-expanded={isOpen}
      >
        <span className="text-violet-500 dark:text-violet-400">
          {theme === 'system' ? <Laptop size={15} /> : currentIcon}
        </span>
        {showLabel && (
          <span className="capitalize">{theme === 'system' ? 'System' : theme}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141d] p-1.5 shadow-xl z-50 backdrop-blur-md"
          >
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    changeTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-violet-500" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;
