'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmojiAvatar, EmojiAvatarConfig, defaultEmojiAvatarConfig } from './EmojiAvatar';
import { supabase } from '@/lib/supabase';

interface UserProfileModalProps {
  user: {
    id: string;
    display_name: string;
    username: string;
    bio?: string;
    avatar_config?: EmojiAvatarConfig;
    vibe_status?: string;
  };
  currentUserId: string;
  chatId?: string;
  onClose: () => void;
  onNicknameChange?: (nickname: string) => void;
}

export function UserProfileModal({ user, currentUserId, chatId, onClose, onNicknameChange }: UserProfileModalProps) {
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [savedNickname, setSavedNickname] = useState('');

  useEffect(() => {
    async function fetchNickname() {
      if (chatId) {
        const { data } = await supabase
          .from('chat_participants')
          .select('nickname')
          .eq('chat_id', chatId)
          .eq('user_id', currentUserId)
          .single();
        
        if (data?.nickname) {
          setNickname(data.nickname);
          setSavedNickname(data.nickname);
        }
      } else {
        const { data } = await supabase
          .from('user_nicknames')
          .select('nickname')
          .eq('user_id', currentUserId)
          .eq('target_user_id', user.id)
          .single();
        
        if (data?.nickname) {
          setNickname(data.nickname);
          setSavedNickname(data.nickname);
        }
      }
    }
    fetchNickname();
  }, [currentUserId, user.id, chatId]);

  const handleSaveNickname = async () => {
    if (nickname.trim() === savedNickname) {
      setIsEditingNickname(false);
      return;
    }

    if (chatId) {
      await supabase
        .from('chat_participants')
        .update({ nickname: nickname.trim() || null })
        .eq('chat_id', chatId)
        .eq('user_id', currentUserId);
      
      setSavedNickname(nickname.trim());
      onNicknameChange?.(nickname.trim());
    } else {
      if (nickname.trim()) {
        const { data: existing } = await supabase
          .from('user_nicknames')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('target_user_id', user.id)
          .single();

        if (existing) {
          await supabase
            .from('user_nicknames')
            .update({ nickname: nickname.trim(), updated_at: new Date().toISOString() })
            .eq('user_id', currentUserId)
            .eq('target_user_id', user.id);
        } else {
          await supabase
            .from('user_nicknames')
            .insert({
              user_id: currentUserId,
              target_user_id: user.id,
              nickname: nickname.trim()
            });
        }
        setSavedNickname(nickname.trim());
      } else {
        await supabase
          .from('user_nicknames')
          .delete()
          .eq('user_id', currentUserId)
          .eq('target_user_id', user.id);
        setSavedNickname('');
      }
    }
    setIsEditingNickname(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="mb-6"
          >
            <EmojiAvatar config={user.avatar_config || defaultEmojiAvatarConfig} size={120} />
          </motion.div>

          <h2 className="text-2xl font-black text-white mb-1">{user.display_name}</h2>
          <p className="text-zinc-500 font-medium mb-2">@{user.username}</p>
          
          {user.vibe_status && (
            <motion.p 
              className="text-sm font-bold text-blue-400 mb-4 px-4 py-1.5 bg-blue-500/10 rounded-full"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {user.vibe_status}
            </motion.p>
          )}

          {user.bio && (
            <div className="w-full bg-zinc-800/50 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Bio</p>
              <p className="text-zinc-300 text-sm">{user.bio}</p>
            </div>
          )}

          <div className="w-full bg-zinc-800/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your Nickname for them</p>
              {!isEditingNickname && (
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-zinc-400" />
                </button>
              )}
            </div>
            
            {isEditingNickname ? (
              <div className="flex gap-2">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Set a nickname..."
                  className="flex-1 h-10 bg-zinc-900 border-zinc-700 text-white rounded-xl"
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleSaveNickname}
                  className="h-10 w-10 rounded-xl bg-green-600 hover:bg-green-500"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <p className="text-zinc-300 text-sm">
                {savedNickname || <span className="text-zinc-600 italic">No nickname set</span>}
              </p>
            )}
            <p className="text-xs text-zinc-600 mt-2">Only visible to you</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
