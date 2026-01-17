'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { EmojiAvatar, EmojiAvatarConfig, defaultEmojiAvatarConfig, BASE_EMOJIS, BG_COLORS, MOODS, ACCESSORIES } from '@/components/EmojiAvatar';
import { VibeSelector } from '@/components/VibeSelector';
import { MessageCircle, X, LogOut, Sparkles, ArrowLeft, Palette, Save, Check, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { CHAT_BACKGROUNDS } from '@/lib/constants';
import { requestNotificationPermission, getNotificationPermission, initializeServiceWorker, setupNotificationListeners, setCurrentViewingChat } from '@/lib/notifications';

const EXTENDED_EMOJIS = [
  '😎', '🤪', '😈', '🥺', '💀', '👻', '🤡', '😭', '🥶', '🤓', '😴', '🫠', '🤑', '😇', '🤠', '👽',
  '🔥', '✨', '💖', '🌈', '⭐', '🎭', '🦋', '🍀', '🌙', '🎪', '🎨', '🎯', '🎮', '🎸', '🎤', '🎧'
];

const EXTENDED_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1',
  '#14B8A6', '#F97316', '#84CC16', '#A855F7', '#F43F5E', '#0EA5E9', '#22C55E', '#E11D48'
];

function ProfilePanel({ profile, userId, onClose, onUpdateProfile }: { profile: any; userId: string; onClose: () => void; onUpdateProfile: (updates: any) => Promise<void> }) {
  const [avatarConfig, setAvatarConfig] = useState<EmojiAvatarConfig>(
    profile.avatar_config || defaultEmojiAvatarConfig
  );
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const router = useRouter();

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleAvatarChange = (newConfig: EmojiAvatarConfig) => {
    setAvatarConfig(newConfig);
    setHasChanges(true);
    setSaved(false);
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleBioChange = (value: string) => {
    setBio(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdateProfile({ 
      avatar_config: avatarConfig,
      display_name: displayName,
      bio
    });
    setSaving(false);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission(userId);
    setNotifPermission(granted ? 'granted' : 'denied');
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
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-8">
        <div className="flex justify-between items-center mb-6 md:mb-10">
          <button onClick={onClose} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors md:hidden">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">Back</span>
          </button>
          <div className="hidden md:block">
            <h1 className="text-xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">YOUR PROFILE ✨</h1>
            <p className="text-zinc-500 font-medium text-sm md:text-base">Customize your vibe 🎨💫🔥</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-800 hidden md:flex">
            <X className="w-5 h-5 md:w-6 md:h-6 text-zinc-400" />
          </Button>
        </div>
        
        <div className="text-center mb-6 md:hidden">
          <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">YOUR PROFILE ✨</h1>
          <p className="text-zinc-500 font-medium text-sm">Customize your vibe 🎨💫🔥</p>
        </div>

        <div className="flex justify-center mb-6 md:mb-10 relative">
          <motion.div 
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 2, -2, 0],
              scale: [1, 1.02, 1]
            }} 
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <EmojiAvatar config={avatarConfig} size={140} className="md:w-[200px] md:h-[200px]" />
          </motion.div>
          <motion.div
            className="absolute -top-2 -right-2 text-2xl"
            animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            ✨
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -left-2 text-2xl"
            animate={{ y: [0, -5, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
          >
            🔥
          </motion.div>
          <motion.div
            className="absolute top-1/2 -right-6 text-xl"
            animate={{ x: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
          >
            💜
          </motion.div>
          <motion.div
            className="absolute top-0 -left-6 text-xl"
            animate={{ y: [0, -8, 0], rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 4 }}
          >
            ⭐
          </motion.div>
        </div>

        <div className="space-y-4 md:space-y-8 bg-zinc-900/50 backdrop-blur-sm rounded-2xl md:rounded-3xl p-4 md:p-6 border border-zinc-800 mb-4 md:mb-8">
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
            </motion.span>
            Avatar Vibes 🎭
          </h2>

          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Face 😜🤪👻</Label>
            <div className="grid grid-cols-8 gap-1.5 md:gap-2 max-h-40 overflow-y-auto p-1">
              {EXTENDED_EMOJIS.map((emoji, i) => (
                <motion.button 
                  key={emoji} 
                  onClick={() => handleAvatarChange({ ...avatarConfig, baseEmoji: emoji })} 
                  className={`text-lg md:text-2xl p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all ${avatarConfig.baseEmoji === emoji ? 'bg-blue-600 scale-110 shadow-lg shadow-blue-500/50' : 'bg-zinc-800 hover:bg-zinc-700'}`} 
                  whileHover={{ scale: 1.15, rotate: [0, 10, -10, 0] }} 
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Color 🎨🌈</Label>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              {EXTENDED_COLORS.map((color, i) => (
                <motion.button 
                  key={color} 
                  onClick={() => handleAvatarChange({ ...avatarConfig, bgColor: color })} 
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-4 transition-all ${avatarConfig.bgColor === color ? 'border-white scale-110' : 'border-transparent'}`} 
                  style={{ backgroundColor: color, boxShadow: avatarConfig.bgColor === color ? `0 0 20px ${color}` : 'none' }} 
                  whileHover={{ scale: 1.2, rotate: 180 }} 
                  whileTap={{ scale: 0.9 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.03, type: "spring" }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Energy ⚡💥</Label>
            <div className="grid grid-cols-5 gap-1.5 md:gap-2">
              {MOODS.map((mood, i) => (
                <motion.button 
                  key={mood} 
                  onClick={() => handleAvatarChange({ ...avatarConfig, mood })} 
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${avatarConfig.mood === mood ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`} 
                  whileHover={{ scale: 1.05, y: -2 }} 
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {mood}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Extras 💫✨</Label>
            <div className="grid grid-cols-6 gap-1.5 md:gap-2">
              {ACCESSORIES.map((acc, i) => (
                <motion.button 
                  key={acc} 
                  onClick={() => handleAvatarChange({ ...avatarConfig, accessory: acc })} 
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl text-base md:text-lg transition-all ${avatarConfig.accessory === acc ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-zinc-800 hover:bg-zinc-700'}`} 
                  whileHover={{ scale: 1.1, rotate: [0, 10, -10, 0] }} 
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring" }}
                >
                  {acc === 'none' ? '🚫' : acc === 'halo' ? '😇' : acc === 'fire' ? '🔥' : acc === 'sparkles' ? '✨' : acc === 'hearts' ? '💖' : '⭐'}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 bg-zinc-900/50 backdrop-blur-sm rounded-2xl md:rounded-3xl p-4 md:p-6 border border-zinc-800 mb-4 md:mb-8">
          <h2 className="text-lg md:text-xl font-black text-white">Profile Info 📝</h2>
          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Display Name</Label>
            <Input value={displayName} onChange={(e) => handleDisplayNameChange(e.target.value)} className="h-12 md:h-14 text-base md:text-lg font-bold rounded-xl md:rounded-2xl border-2 border-zinc-800 bg-zinc-900 text-white focus:border-blue-500" placeholder="Your name" />
          </div>
          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Bio</Label>
            <Input value={bio} onChange={(e) => handleBioChange(e.target.value)} className="h-12 md:h-14 text-base md:text-lg font-medium rounded-xl md:rounded-2xl border-2 border-zinc-800 bg-zinc-900 text-white focus:border-blue-500" placeholder="What's your vibe? ✨" />
          </div>
          <div className="space-y-2 md:space-y-3">
            <Label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">Current Vibe</Label>
            <VibeSelector currentVibe={profile.vibe_status || '✨ Chilling'} onUpdate={() => {}} userId={userId} />
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl md:rounded-3xl p-4 md:p-6 border border-zinc-800 mb-4 md:mb-8">
          <h2 className="text-lg md:text-xl font-black text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" /> Notifications 🔔
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300 font-medium">Push Notifications</p>
              <p className="text-xs text-zinc-500">Get notified of new messages and friend requests</p>
            </div>
            {notifPermission === 'granted' ? (
              <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                <Check className="w-4 h-4" /> Enabled
              </div>
            ) : notifPermission === 'denied' ? (
              <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                <BellOff className="w-4 h-4" /> Blocked
              </div>
            ) : (
              <Button onClick={handleEnableNotifications} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold">
                Enable
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4 mt-4">
          {hasChanges && (
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-xl shadow-green-500/30 flex items-center justify-center gap-2"
            >
              {saving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>⏳</motion.div>
              ) : saved ? (
                <>
                  <Check className="w-5 h-5" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Changes
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout} className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-bold border-2 border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300">
            <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Logout
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const { user, profile, loading, updateProfile } = useUser();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const initNotifications = async () => {
      await initializeServiceWorker();
      if (Notification.permission === 'default' && user?.id) {
        await requestNotificationPermission(user.id);
      } else if (Notification.permission === 'granted' && user?.id) {
        await requestNotificationPermission(user.id);
      }
    };
    if (user?.id) {
      initNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      const cleanup = setupNotificationListeners(user.id);
      return cleanup;
    }
  }, [user?.id]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId);
    setMobileView('chat');
  };

  const handleBackToSidebar = () => {
    setMobileView('sidebar');
    setSelectedChat(null);
  };

  const handleUpdateProfile = async (updates: any) => {
    await updateProfile(updates);
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-6xl"
        >
          💬
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="h-[100dvh] w-full bg-black flex overflow-hidden">
      <div className={`${mobileView === 'sidebar' ? 'flex' : 'hidden'} md:flex w-full md:w-auto`}>
        <ChatSidebar
            currentUserId={user.id}
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChat}
            onShowProfile={() => {
              setShowProfile(true);
              setMobileView('chat');
            }}
          />
      </div>

      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1`}>
          <AnimatePresence mode="wait">
            {showProfile ? (
              <ProfilePanel
                key="profile"
                profile={profile}
                userId={user.id}
                onClose={() => {
                  setShowProfile(false);
                  setMobileView('sidebar');
                }}
                onUpdateProfile={handleUpdateProfile}
              />
          ) : selectedChat ? (
            <ChatWindow
              key={selectedChat}
              chatId={selectedChat}
              currentUserId={user.id}
              onBack={handleBackToSidebar}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 hidden md:flex flex-col items-center justify-center bg-zinc-950"
            >
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="text-8xl mb-6"
              >
                💬
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-2">Select a Chat</h2>
              <p className="text-zinc-500 font-medium">Choose a conversation to start chatting ✨</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
