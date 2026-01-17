'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { EmojiAvatar, EmojiAvatarConfig, defaultEmojiAvatarConfig, BASE_EMOJIS, BG_COLORS, MOODS, ACCESSORIES } from '@/components/EmojiAvatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export default function ProfileSetupPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<EmojiAvatarConfig>(defaultEmojiAvatarConfig);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
      setUser(user);
    });
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          display_name: displayName,
          avatar_config: avatarConfig,
          vibe_status: '✨ New Here',
        });

      if (error) throw error;
      router.push('/chat');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-blue-950/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px]" />
      
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="max-w-2xl w-full relative z-10">
        {/* Progress indicator */}
        <div className="flex justify-center gap-3 mb-10">
          {[1, 2].map((s) => (
            <motion.div
              key={s}
              className={`w-16 h-2 rounded-full ${step >= s ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-zinc-800'}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: step === s ? 1.1 : 1 }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
            >
              <div className="text-center">
                <motion.h1 
                  className="text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  WHO ARE YOU? 🤔
                </motion.h1>
                <p className="text-zinc-500 text-lg">Pick a name that matches your energy fr fr</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Display Name</Label>
                  <Input
                    placeholder="e.g. Chill Guy 😎"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-16 text-2xl font-bold rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500">Username</Label>
                  <Input
                    placeholder="@username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-16 text-2xl font-bold rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!username || !displayName}
                  className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 border-0 shadow-lg shadow-blue-500/30"
                >
                  NEXT: PICK YOUR VIBE <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <motion.h1 
                  className="text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  PICK YOUR VIBE ✨
                </motion.h1>
                <p className="text-zinc-500 text-lg">Design your emoji avatar (it's gonna be iconic)</p>
              </div>

              {/* Avatar Preview */}
              <div className="mb-10">
                <EmojiAvatar config={avatarConfig} size={180} />
              </div>

              {/* Customization Options */}
              <div className="w-full space-y-8 bg-zinc-900/50 backdrop-blur-sm rounded-3xl p-6 border border-zinc-800">
                {/* Emoji Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <span>Choose Your Face</span> <span className="text-lg">😜</span>
                  </Label>
                  <div className="grid grid-cols-8 gap-2">
                    {BASE_EMOJIS.map((emoji) => (
                      <motion.button
                        key={emoji}
                        onClick={() => setAvatarConfig({ ...avatarConfig, baseEmoji: emoji })}
                        className={`text-3xl p-2 rounded-xl transition-all ${avatarConfig.baseEmoji === emoji ? 'bg-blue-600 scale-110 shadow-lg shadow-blue-500/50' : 'bg-zinc-800 hover:bg-zinc-700'}`}
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
                  <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <span>Vibe Color</span> <span className="text-lg">🎨</span>
                  </Label>
                  <div className="flex gap-3 flex-wrap">
                    {BG_COLORS.map((color) => (
                      <motion.button
                        key={color}
                        onClick={() => setAvatarConfig({ ...avatarConfig, bgColor: color })}
                        className={`w-12 h-12 rounded-full border-4 transition-all ${avatarConfig.bgColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                        style={{ backgroundColor: color, boxShadow: avatarConfig.bgColor === color ? `0 0 20px ${color}` : 'none' }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mood Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <span>Energy Level</span> <span className="text-lg">⚡</span>
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {MOODS.map((mood) => (
                      <motion.button
                        key={mood}
                        onClick={() => setAvatarConfig({ ...avatarConfig, mood })}
                        className={`px-3 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${avatarConfig.mood === mood ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
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
                  <Label className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <span>Extras</span> <span className="text-lg">💫</span>
                  </Label>
                  <div className="grid grid-cols-6 gap-2">
                    {ACCESSORIES.map((acc) => (
                      <motion.button
                        key={acc}
                        onClick={() => setAvatarConfig({ ...avatarConfig, accessory: acc })}
                        className={`px-3 py-2 rounded-xl text-sm font-bold capitalize transition-all ${avatarConfig.accessory === acc ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {acc === 'none' ? '🚫' : acc === 'halo' ? '😇' : acc === 'fire' ? '🔥' : acc === 'sparkles' ? '✨' : acc === 'hearts' ? '💖' : '⭐'}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 w-full mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 rounded-2xl font-bold text-lg border-2 border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <ArrowLeft className="mr-2 w-5 h-5" /> Back
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-[2] h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform border-0 shadow-lg shadow-blue-500/30"
                >
                  {loading ? 'Saving...' : "LET'S GO 🚀"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
