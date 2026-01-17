'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

import { EmojiAvatar, EmojiAvatarConfig, defaultEmojiAvatarConfig, BASE_EMOJIS, BG_COLORS, MOODS, ACCESSORIES } from './EmojiAvatar';
import { VibeSelector } from './VibeSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, LogOut, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProfilePanel({ profile, userId, onClose }: { profile: any; userId: string; onClose: () => void }) {
  const [avatarConfig, setAvatarConfig] = useState<EmojiAvatarConfig>(
    profile.avatar_config || defaultEmojiAvatarConfig
  );
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({
          avatar_config: avatarConfig,
          display_name: displayName,
          bio,
        })
        .eq('id', userId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="flex-1 h-full bg-black/50 backdrop-blur-xl border-l border-zinc-800 overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              YOUR PROFILE ✨
            </h1>
            <p className="text-zinc-500 font-medium">Customize your vibe</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full hover:bg-zinc-800"
          >
            <X className="w-6 h-6 text-zinc-400" />
          </Button>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center mb-10">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <EmojiAvatar config={avatarConfig} size={200} />
          </motion.div>
        </div>

        {/* Avatar Customization */}
        <div className="space-y-8 bg-zinc-900/50 backdrop-blur-sm rounded-3xl p-6 border border-zinc-800 mb-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" /> Avatar Vibes
          </h2>

          {/* Emoji Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Face 😜</Label>
            <div className="grid grid-cols-8 gap-2">
              {BASE_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={() => setAvatarConfig({ ...avatarConfig, baseEmoji: emoji })}
                  className={`text-2xl p-2 rounded-xl transition-all ${avatarConfig.baseEmoji === emoji ? 'bg-blue-600 scale-110 shadow-lg shadow-blue-500/50' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Color 🎨</Label>
            <div className="flex gap-3 flex-wrap">
              {BG_COLORS.map((color) => (
                <motion.button
                  key={color}
                  onClick={() => setAvatarConfig({ ...avatarConfig, bgColor: color })}
                  className={`w-10 h-10 rounded-full border-4 transition-all ${avatarConfig.bgColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color, boxShadow: avatarConfig.bgColor === color ? `0 0 20px ${color}` : 'none' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Energy ⚡</Label>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((mood) => (
                <motion.button
                  key={mood}
                  onClick={() => setAvatarConfig({ ...avatarConfig, mood })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${avatarConfig.mood === mood ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {mood}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Accessory Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Extras 💫</Label>
            <div className="grid grid-cols-6 gap-2">
              {ACCESSORIES.map((acc) => (
                <motion.button
                  key={acc}
                  onClick={() => setAvatarConfig({ ...avatarConfig, accessory: acc })}
                  className={`px-3 py-2 rounded-xl text-lg transition-all ${avatarConfig.accessory === acc ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {acc === 'none' ? '🚫' : acc === 'halo' ? '😇' : acc === 'fire' ? '🔥' : acc === 'sparkles' ? '✨' : acc === 'hearts' ? '💖' : '⭐'}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="space-y-6 bg-zinc-900/50 backdrop-blur-sm rounded-3xl p-6 border border-zinc-800 mb-8">
          <h2 className="text-xl font-black text-white">Profile Info</h2>
          
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-14 text-lg font-bold rounded-2xl border-2 border-zinc-800 bg-zinc-900 text-white focus:border-blue-500"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Bio</Label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="h-14 text-lg font-medium rounded-2xl border-2 border-zinc-800 bg-zinc-900 text-white focus:border-blue-500"
              placeholder="What's your vibe? ✨"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Current Vibe</Label>
            <VibeSelector
              currentVibe={profile.vibe_status || '✨ Chilling'}
              onUpdate={() => {}}
              userId={userId}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform border-0 shadow-lg shadow-blue-500/30"
          >
            {saving ? 'Saving...' : saved ? 'Saved! ✅' : 'Save Changes 💾'}
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="h-14 px-6 rounded-2xl font-bold border-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
