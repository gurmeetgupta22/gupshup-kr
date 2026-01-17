'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const VIBES = [
  { label: 'Chilling', emoji: '✨' },
  { label: 'On Fire', emoji: '🔥' },
  { label: 'Low Power', emoji: '🌙' },
  { label: 'Vibing', emoji: '🎧' },
  { label: 'Caffeinated', emoji: '☕' },
  { label: 'Ghosting', emoji: '👻' },
  { label: 'Electric', emoji: '⚡' },
  { label: 'Dead Inside', emoji: '💀' },
  { label: 'Overthinking', emoji: '🧠' },
  { label: 'Main Character', emoji: '✨' },
];

export function VibeSelector({ currentVibe, onUpdate, userId }: { currentVibe: string, onUpdate: (vibe: string) => void, userId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = async (vibe: string) => {
    onUpdate(vibe);
    setIsOpen(false);
    await supabase.from('profiles').update({ vibe_status: vibe }).eq('id', userId);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-xs font-bold text-zinc-400 border border-zinc-700/50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>{currentVibe}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full left-0 mb-2 w-52 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-2 z-50 overflow-hidden"
            >
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-2">Set Your Vibe</p>
              <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                {VIBES.map((vibe) => (
                  <motion.button
                    key={vibe.label}
                    onClick={() => handleSelect(`${vibe.emoji} ${vibe.label}`)}
                    className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-zinc-800 transition-colors text-left group"
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-xl">{vibe.emoji}</span>
                    <span className="text-sm font-bold text-zinc-300">{vibe.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
