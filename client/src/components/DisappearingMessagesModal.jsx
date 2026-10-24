import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, X, Shield, Sparkles } from 'lucide-react';

const TIMER_OPTIONS = [
  { id: 'OFF', label: 'Off', description: 'Messages stay in the chat permanently' },
  { id: '5m', label: '5 minutes', description: 'Fast ephemerality for sensitive notes' },
  { id: '1h', label: '1 hour', description: 'Short discussions and temporary tasks' },
  { id: '24h', label: '24 hours', description: 'Daily active conversations' },
  { id: '7d', label: '7 days', description: 'Weekly retention for regular check-ins' },
  { id: '90d', label: '90 days', description: 'Quarterly automatic cleanup' },
];

export const DisappearingMessagesModal = ({
  isOpen,
  onClose,
  currentTimer = 'OFF',
  onSave,
  loading,
}) => {
  const [selectedTimer, setSelectedTimer] = useState(currentTimer);

  useEffect(() => {
    setSelectedTimer(currentTimer || 'OFF');
  }, [currentTimer, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedTimer);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10131d] shadow-2xl p-6 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-600/10 text-violet-500 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Disappearing Messages
                </h3>
                <span className="text-[11px] text-slate-400">
                  Automatic expiration for new messages
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            When enabled, all new messages sent in this conversation will automatically disappear for everyone after the chosen time.
          </p>

          {/* Options List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {TIMER_OPTIONS.map((option) => {
              const isSelected = selectedTimer === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedTimer(option.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-500/80 bg-violet-500/10 text-violet-600 dark:text-violet-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>{option.label}</span>
                      {option.id !== 'OFF' && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-violet-500/10 text-violet-500 font-semibold">
                          Timer
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {option.description}
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notice */}
          <div className="mt-4 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Shield size={14} className="text-violet-500 shrink-0" />
            <span>Expired messages are permanently wiped from the database.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Update Setting</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DisappearingMessagesModal;
