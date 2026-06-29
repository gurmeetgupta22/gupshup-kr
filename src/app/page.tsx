'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, User, X, Menu } from 'lucide-react';
import { Avatar, AvatarConfig, defaultAvatarConfig, AVATAR_EMOJIS, AVATAR_COLORS, AVATAR_ANIMATIONS } from '@/components/Avatar';

const FLOATING_EMOJIS = ['😎', '🔥', '💀', '✨', '👻', '🤪', '💜', '⚡', '🎮', '💙', '🌙', '🦋', '💫', '🫠', '😈', '🥶'];

const EMOJI_POSITIONS = [50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 100, 200, 300, 400, 500, 600];

function FloatingEmoji({ emoji, delay, duration, x }: { emoji: string; delay: number; duration: number; x: number }) {
  return (
    <motion.div
      className="absolute text-2xl md:text-4xl pointer-events-none select-none opacity-60"
      initial={{ y: '100vh', x: x % 100 + '%', opacity: 0, scale: 0, rotate: 0 }}
      animate={{ 
        y: '-20vh', 
        opacity: [0, 0.8, 0.6, 0],
        scale: [0.5, 1.2, 1, 0.8],
        rotate: [0, 20, -20, 0]
      }}
      transition={{ 
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: 3,
        ease: "easeOut"
      }}
      style={{ left: `${(x % 90) + 5}%` }}
    >
      {emoji}
    </motion.div>
  );
}

function ClickEmoji({ x, y, emoji }: { x: number; y: number; emoji: string }) {
  return (
    <motion.div
      className="fixed text-4xl md:text-5xl pointer-events-none z-50"
      style={{ left: x - 20, top: y - 20 }}
      initial={{ scale: 0, rotate: 0 }}
      animate={{ 
        scale: [0, 1.5, 1, 0],
        rotate: [0, 15, -15, 0],
        y: [0, -80],
        opacity: [1, 1, 0.5, 0]
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {emoji}
    </motion.div>
  );
}

function ProfilePanel({ onClose, avatarConfig, setAvatarConfig }: { 
  onClose: () => void; 
  avatarConfig: AvatarConfig;
  setAvatarConfig: (config: AvatarConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'color' | 'animation'>('emoji');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-3xl bg-gradient-to-br from-white to-amber-50 rounded-2xl md:rounded-[2rem] border-2 border-amber-200 p-4 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-6 md:right-6 w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors z-10"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <h2 className="text-xl md:text-3xl font-black text-gray-900 mb-4 md:mb-8 flex items-center gap-2 md:gap-3 pr-10">
          <span className="text-2xl md:text-4xl">🎨</span> Customize Your Vibe
        </h2>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          <div className="flex flex-col items-center gap-4 md:gap-6 p-4 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-amber-200 md:min-w-[220px]">
            <div className="relative">
              <div 
                className="absolute inset-0 blur-[30px] md:blur-[50px] rounded-full opacity-60"
                style={{ backgroundColor: avatarConfig.bgColor }}
              />
              <Avatar config={avatarConfig} size={100} className="relative z-10 md:w-[140px] md:h-[140px]" />
            </div>
            <div className="text-center">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Preview</p>
              <p className="text-sm md:text-lg font-black text-gray-900">
                {AVATAR_ANIMATIONS.find(a => a.id === avatarConfig.animation)?.label}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 md:space-y-6">
            <div className="flex gap-1 md:gap-2 p-1 bg-amber-50 rounded-xl">
              {[
                { id: 'emoji', label: '😎 Face' },
                { id: 'color', label: '🎨 Color' },
                { id: 'animation', label: '✨ Vibe' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 md:py-3 rounded-lg font-bold text-xs md:text-sm transition-all ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-gray-900'
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
                  className="grid grid-cols-6 gap-1.5 md:gap-2"
                >
                  {AVATAR_EMOJIS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, emoji })}
                      className={`w-10 h-10 md:w-12 md:h-12 text-lg md:text-2xl rounded-lg md:rounded-xl flex items-center justify-center transition-all ${
                        avatarConfig.emoji === emoji 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg scale-110' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {activeTab === 'color' && (
                <motion.div
                  key="color"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-5 gap-2 md:gap-3"
                >
                  {AVATAR_COLORS.map((color) => (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, bgColor: color })}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl transition-all ${
                        avatarConfig.bgColor === color 
                          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-white scale-110' 
                          : ''
                      }`}
                      style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}40` }}
                    />
                  ))}
                </motion.div>
              )}

              {activeTab === 'animation' && (
                <motion.div
                  key="animation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 gap-1.5 md:gap-2"
                >
                  {AVATAR_ANIMATIONS.map((anim) => (
                    <motion.button
                      key={anim.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, animation: anim.id as any })}
                      className={`p-2.5 md:p-4 rounded-lg md:rounded-xl font-bold text-left text-xs md:text-base transition-all ${
                        avatarConfig.animation === anim.id 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {anim.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs md:text-sm mt-4 md:mt-6">
          Sign up to save your avatar! 💾
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [clickEmojis, setClickEmojis] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(defaultAvatarConfig);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) router.push('/chat');
    });
  }, [router]);

  const handleClick = (e: React.MouseEvent) => {
    if (showProfile || showMobileMenu) return;
    const emoji = FLOATING_EMOJIS[Math.floor(Math.random() * FLOATING_EMOJIS.length)];
    const newEmoji = { id: Date.now(), x: e.clientX, y: e.clientY, emoji };
    setClickEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setClickEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 800);
  };

  if (user) return null;

  return (
    <div 
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-amber-50 overflow-x-hidden overflow-y-auto relative cursor-crosshair"
      onClick={handleClick}
    >
      <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50/40 pointer-events-none" />
      
      <div 
        className="fixed inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {FLOATING_EMOJIS.slice(0, 8).map((emoji, i) => (
          <FloatingEmoji 
            key={i} 
            emoji={emoji} 
            delay={i * 1.2} 
            duration={10 + (i % 6)}
            x={i * 12}
          />
        ))}
      </div>

      <AnimatePresence>
        {clickEmojis.map(e => (
          <ClickEmoji key={e.id} x={e.x} y={e.y} emoji={e.emoji} />
        ))}
      </AnimatePresence>

      <div className="fixed top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-blue-400/20 rounded-full blur-[100px] md:blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-40 md:w-80 h-40 md:h-80 bg-amber-400/25 rounded-full blur-[80px] md:blur-[120px] animate-pulse pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 w-full p-4 md:p-6 flex justify-between items-center z-40 backdrop-blur-md bg-white/70 border-b border-amber-200/60">
        <motion.div 
          className="flex items-center gap-2 md:gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <MessageCircle className="text-white w-5 h-5 md:w-7 md:h-7" />
          </div>
          <span className="text-xl md:text-3xl font-black tracking-tighter text-gray-900">GupShup</span>
          <span className="text-lg md:text-2xl hidden sm:block">💬</span>
        </motion.div>
        
        <button 
          className="md:hidden p-2 rounded-lg bg-white border border-amber-200"
          onClick={(e) => { e.stopPropagation(); setShowMobileMenu(!showMobileMenu); }}
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        <motion.div 
          className="hidden md:flex gap-4 items-center"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); setShowProfile(true); }}
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-amber-200 hover:border-amber-300 transition-colors"
          >
            <Avatar config={avatarConfig} size={32} />
            <span className="text-sm font-bold text-gray-600">Profile</span>
          </motion.button>

          <Button 
            variant="ghost" 
            onClick={(e) => { e.stopPropagation(); router.push('/login'); }}
            className="text-gray-600 hover:text-gray-900 hover:bg-amber-100 font-bold"
          >
            Login
          </Button>
          <Button 
            className="rounded-full px-8 font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 border-0"
            onClick={(e) => { e.stopPropagation(); router.push('/signup'); }}
          >
            Join Now 🚀
          </Button>
        </motion.div>
      </nav>

      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-2 right-2 z-50 bg-white/95 backdrop-blur-xl rounded-2xl border border-amber-200 p-4 flex flex-col gap-3 md:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowProfile(true); setShowMobileMenu(false); }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Avatar config={avatarConfig} size={32} />
              <span className="text-sm font-bold text-gray-900">Customize Avatar</span>
            </button>
            <Button 
              variant="ghost" 
              onClick={() => { router.push('/login'); setShowMobileMenu(false); }}
              className="w-full justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-bold"
            >
              Login
            </Button>
            <Button 
              className="w-full rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 border-0"
              onClick={() => { router.push('/signup'); setShowMobileMenu(false); }}
            >
              Join Now 🚀
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex flex-col items-center text-center px-3 md:px-4 max-w-5xl relative z-10 pt-28 md:pt-32 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-4 md:mb-8"
        >
          <motion.span 
            className="absolute -top-4 md:-top-8 -left-6 md:-left-16 text-2xl md:text-5xl"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            ✨
          </motion.span>
          <motion.span 
            className="absolute -top-2 md:-top-4 -right-4 md:-right-12 text-xl md:text-4xl"
            animate={{ rotate: [0, -15, 15, 0], y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            🔥
          </motion.span>
          <motion.span 
            className="absolute bottom-0 -left-8 md:-left-20 text-2xl md:text-5xl hidden sm:block"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          >
            💀
          </motion.span>
          <motion.span 
            className="absolute -bottom-4 md:-bottom-8 -right-6 md:-right-16 text-xl md:text-4xl"
            animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            😎
          </motion.span>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter leading-none mb-3 md:mb-6">
            <span className="bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 bg-clip-text text-transparent">CHATTING</span>
            <br />
            <span className="text-gray-400">IS FINALLY</span>
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">ALIVE.</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-base md:text-xl lg:text-2xl text-gray-500 mb-6 md:mb-10 max-w-2xl font-medium px-2"
        >
          Express yourself with <span className="text-blue-600">crazy avatars</span>, <span className="text-amber-600">vibe statuses</span>, and animations that actually slap 💅
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto px-2"
        >
          <Button
            size="lg"
            onClick={(e) => { e.stopPropagation(); router.push('/signup'); }}
            className="h-12 md:h-16 px-8 md:px-12 rounded-full text-base md:text-xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-gradient hover:scale-105 transition-transform shadow-2xl shadow-amber-500/40 border-0"
          >
            Get Started 🎉
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setShowProfile(true); }}
            className="h-12 md:h-16 px-8 md:px-12 rounded-full text-base md:text-xl font-bold border-2 border-gray-300 text-gray-900 hover:bg-amber-50 hover:border-amber-400 backdrop-blur-sm"
          >
            Customize Avatar 🎨
          </Button>
        </motion.div>

        <motion.div 
          className="mt-8 md:mt-16 flex flex-wrap justify-center gap-3 md:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[
            { emoji: '😎', bgColor: '#4ECDC4', animation: 'bounce' as const },
            { emoji: '🤪', bgColor: '#FF6B6B', animation: 'shake' as const },
            { emoji: '💀', bgColor: '#9370DB', animation: 'spin' as const },
            { emoji: '👻', bgColor: '#45B7D1', animation: 'float' as const },
            { emoji: '😈', bgColor: '#FF69B4', animation: 'crazy' as const },
            { emoji: '🥶', bgColor: '#85C1E9', animation: 'wiggle' as const },
          ].map((config, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              whileHover={{ scale: 1.1 }}
              onClick={(e) => { e.stopPropagation(); setAvatarConfig(config); setShowProfile(true); }}
              className="cursor-pointer"
            >
              <Avatar config={config} size={50} className="md:w-[70px] md:h-[70px]" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="mt-8 md:mt-12 flex flex-wrap justify-center gap-2 md:gap-4 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[
            { icon: '😜', label: "Crazy Avatars", color: "from-yellow-500/20 to-orange-500/20" },
            { icon: '⚡', label: "Real-time Vibes", color: "from-blue-500/20 to-cyan-500/20" },
            { icon: '💛', label: "Express Yourself", color: "from-amber-500/20 to-yellow-500/20" },
            { icon: '🔥', label: "No Cap Chat", color: "from-red-500/20 to-orange-500/20" }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-full bg-gradient-to-r ${item.color} border border-amber-200/60 backdrop-blur-sm cursor-pointer`}
            >
              <span className="text-lg md:text-2xl">{item.icon}</span>
              <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-gray-700">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 md:mt-16 text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest"
        >
          Click anywhere for ✨vibes✨
        </motion.p>
      </main>

      {/* Profile Panel */}
      <AnimatePresence>
        {showProfile && (
          <ProfilePanel 
            onClose={() => setShowProfile(false)} 
            avatarConfig={avatarConfig}
            setAvatarConfig={setAvatarConfig}
          />
        )}
      </AnimatePresence>
    </div>
  );
}