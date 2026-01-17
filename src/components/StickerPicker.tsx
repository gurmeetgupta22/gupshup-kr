'use client';

import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_STICKERS = [
  '😂', '😭', '🥺', '💀', '🔥', '✨', '💜', '🫠', 
  '👀', '💅', '🤌', '⚡', '🦋', '🌙', '😈', '🥵',
  '🤡', '👻', '💙', '🖤', '❤️‍🔥', '🫶', '✌️', '🤙'
];

export function StickerPicker({ onSelect, onClose }: { onSelect: (url: string) => void, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-4 p-4 bg-zinc-950 rounded-3xl shadow-2xl border border-white/10 w-80 z-50 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
          <span>Emoji Stickers</span>
          <span>✨</span>
        </p>
        <button 
          onClick={onClose}
          className="text-white/30 hover:text-white text-xs font-bold"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
        {EMOJI_STICKERS.map((emoji, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-10 h-10 text-2xl rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-[10px] text-white/20 text-center">Double-tap messages to react ❤️</p>
      </div>
    </motion.div>
  );
}
