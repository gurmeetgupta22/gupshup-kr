'use client';

import { useState } from 'react';
import { Avatar, AvatarConfig, defaultAvatarConfig, AVATAR_EMOJIS, AVATAR_COLORS, AVATAR_ANIMATIONS } from './Avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

export function AvatarEditor({ onSave, initialConfig }: { onSave: (config: AvatarConfig) => void, initialConfig?: AvatarConfig }) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig || defaultAvatarConfig);
  const [activeTab, setActiveTab] = useState<'emoji' | 'color' | 'animation'>('emoji');

  const updateConfig = (key: keyof AvatarConfig, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="flex flex-col md:flex-row gap-10 items-center md:items-start max-w-4xl w-full">
      {/* Preview */}
      <div className="flex flex-col items-center gap-8 p-10 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-[3rem] border-2 border-zinc-800 min-w-[280px]">
        <div className="relative">
          <div 
            className="absolute inset-0 blur-[60px] rounded-full opacity-50"
            style={{ backgroundColor: config.bgColor }}
          />
          <Avatar config={config} size={180} className="relative z-10" />
        </div>
        
        <div className="text-center">
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Your Vibe</p>
          <p className="text-2xl font-black text-white">{config.emoji} {AVATAR_ANIMATIONS.find(a => a.id === config.animation)?.label.split(' ')[1]}</p>
        </div>
        
        <Button 
          onClick={() => onSave(config)} 
          className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30 transition-all"
        >
          Save Avatar ✨
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 w-full space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-zinc-900 rounded-2xl">
          {[
            { id: 'emoji', label: '😎 Emoji' },
            { id: 'color', label: '🎨 Color' },
            { id: 'animation', label: '✨ Animation' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'emoji' && (
            <motion.div
              key="emoji"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                Pick Your Face
              </Label>
              <div className="grid grid-cols-6 gap-3">
                {AVATAR_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateConfig('emoji', emoji)}
                    className={`w-14 h-14 text-3xl rounded-2xl flex items-center justify-center transition-all ${
                      config.emoji === emoji 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30 scale-110' 
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'color' && (
            <motion.div
              key="color"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                Background Color
              </Label>
              <div className="grid grid-cols-5 gap-3">
                {AVATAR_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateConfig('bgColor', color)}
                    className={`w-14 h-14 rounded-2xl transition-all ${
                      config.bgColor === color 
                        ? 'ring-4 ring-white ring-offset-4 ring-offset-zinc-950 scale-110' 
                        : ''
                    }`}
                    style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}50` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'animation' && (
            <motion.div
              key="animation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                Pick Your Vibe
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {AVATAR_ANIMATIONS.map((anim) => (
                  <motion.button
                    key={anim.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateConfig('animation', anim.id as any)}
                    className={`p-4 rounded-2xl font-bold text-left transition-all ${
                      config.animation === anim.id 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {anim.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
