import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😎', '🥳', '🤩', '🤔', '🤫', '🤭', '😮', '😴'],
  Gestures: ['👍', '👎', '👏', '🙌', '✌️', '🤞', '🤝', '👊', '🔥', '✨', '⚡', '💯', '🙏', '💪', '👋', '🎉', '🚀'],
  Hearts: ['❤️', '💜', '💙', '🖤', '🤍', '💖', '💘', '💕', '💔', '❣️', '😍', '🥰'],
  Reactions: ['👀', '💡', '💬', '🧠', '👑', '💎', '🎯', '⭐', '☕', '🍕', '🍻', '🎈'],
};

export const EmojiPicker = ({ onSelect, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('Smileys');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute bottom-14 left-0 z-50 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#151824]/95 backdrop-blur-xl shadow-2xl p-3"
      >
        {/* Category Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2 gap-1 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                activeTab === cat
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto pr-1">
          {EMOJI_CATEGORIES[activeTab].map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="h-9 w-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-transform active:scale-90 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiPicker;
