'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, memo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChat } from '@/hooks/useChat';
import { EmojiAvatar, defaultEmojiAvatarConfig } from './EmojiAvatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, ArrowLeft, Palette, X, PhoneOff, VideoOff, Mic, MicOff, Maximize2, Minimize2, Plus, Reply, Pencil, Trash2, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { CHAT_BACKGROUNDS } from '@/lib/constants';
import dynamic from 'next/dynamic';
import { ChatInput } from './ChatInput';

const EmojiPicker = dynamic(() => import('./EmojiPicker').then(mod => mod.EmojiPicker), { ssr: false });
const UserProfileModal = dynamic(() => import('./UserProfileModal').then(mod => mod.UserProfileModal), { ssr: false });
import { setCurrentViewingChat } from '@/lib/notifications';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const FLOATING_BG_EMOJIS = ['💬', '✨', '💜', '💙', '🔥', '😎', '💀', '👻', '⚡', '🎮', '💫', '🫠'];

type CallType = 'voice' | 'video' | null;
type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'denied';

const SwipeableMessage = memo(function SwipeableMessage({ 
  children, 
  onSwipeReply,
  isMe
}: { 
  children: React.ReactNode; 
  onSwipeReply: () => void;
  isMe: boolean;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartedRef = useRef(false);

  const MAX_DRAG = 80;
  const REPLY_THRESHOLD = 60;

  const applyTransform = (x: number) => {
    const clamped = Math.max(0, Math.min(x, MAX_DRAG));
    setTranslateX(clamped);
    if (elementRef.current) {
      elementRef.current.style.transform = `translateX(${clamped}px)`;
      elementRef.current.style.transition = isDragging ? 'none' : 'transform 0.2s ease-out';
    }
  };

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
    dragStartedRef.current = true;
    setIsDragging(true);
    if (elementRef.current) {
      elementRef.current.style.transition = 'none';
    }
  };

  const handleMove = (clientX: number) => {
    if (!dragStartedRef.current) return;
    const delta = clientX - startXRef.current;
    if (delta > 0) {
      applyTransform(delta);
    }
  };

  const handleEnd = () => {
    if (!dragStartedRef.current) return;
    dragStartedRef.current = false;
    setIsDragging(false);
    const triggeredReply = translateX >= REPLY_THRESHOLD;
    applyTransform(0);
    if (triggeredReply) {
      setTimeout(() => onSwipeReply(), 50);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartedRef.current) return;
    e.preventDefault();
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStartedRef.current) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseUp = () => handleEnd();
  const handleTouchEnd = () => handleEnd();
  const handleMouseLeave = () => handleEnd();
  const handleTouchCancel = () => handleEnd();

  return (
    <div className="relative" ref={elementRef}>
      <div
        className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-150 ${isMe ? '-left-8' : '-left-8'}`}
        style={{ 
          opacity: translateX > 20 ? Math.min(1, (translateX - 20) / 40) : 0,
          transform: `scale(${translateX > 20 ? Math.min(1, 0.5 + (translateX - 20) / 80) : 0.5})`
        }}
      >
        <Reply className="w-5 h-5 text-blue-400" />
      </div>
      <div
        ref={elementRef}
        className="max-w-full overflow-hidden"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={handleMouseLeave}
        onTouchCancel={handleTouchCancel}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {children}
      </div>
    </div>
  );
});

const FloatingBgEmoji = memo(function FloatingBgEmoji({ emoji, index }: { emoji: string; index: number }) {
  const randomX = useMemo(() => 5 + (index * 7.5) % 90, [index]);
  const randomDelay = useMemo(() => index * 0.7, [index]);
  const randomDuration = useMemo(() => 15 + (index % 5) * 3, [index]);
  
  return (
    <motion.div
      className="absolute text-3xl opacity-[0.06] pointer-events-none select-none"
      style={{ left: `${randomX}%`, willChange: 'transform' }}
      initial={{ y: '100%', opacity: 0 }}
      animate={{ 
        y: '-100%', 
        opacity: [0, 0.08, 0.06, 0],
        rotate: [0, 20, -20, 0],
        scale: [0.8, 1.2, 1, 0.8]
      }}
      transition={{ 
        duration: randomDuration,
        delay: randomDelay,
        repeat: Infinity,
        repeatDelay: 2,
        ease: "linear"
      }}
    >
      {emoji}
    </motion.div>
  );
});

const MinimizedCall = memo(function MinimizedCall({ 
  callType, 
  otherUser, 
  onMaximize, 
  onEndCall,
  localVideoRef,
  remoteVideoRef,
  isVideoOff
}: {
  callType: CallType;
  otherUser: any;
  onMaximize: () => void;
  onEndCall: () => void;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoOff: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      drag
      dragMomentum={false}
      className="fixed bottom-20 right-4 z-50 w-36 h-48 md:w-44 md:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border-2 border-zinc-700 bg-black cursor-move"
    >
      {callType === 'video' && !isVideoOff ? (
        <div className="relative w-full h-full">
          <video 
            ref={remoteVideoRef}
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
          />
          <video 
            ref={localVideoRef}
            autoPlay 
            muted 
            playsInline
            className="absolute bottom-2 right-2 w-12 h-16 object-cover rounded-lg border border-zinc-600"
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-950 to-black p-3">
          <EmojiAvatar config={otherUser?.avatar_config || defaultEmojiAvatarConfig} size={50} />
          <p className="text-white text-xs font-bold mt-2 truncate w-full text-center">{otherUser?.display_name}</p>
          <p className="text-green-400 text-[10px] font-bold flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Connected
          </p>
        </div>
      )}
      
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={onMaximize}
          className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center"
        >
          <Maximize2 className="w-3 h-3 text-white" />
        </button>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <button
          onClick={onEndCall}
          className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
        >
          <PhoneOff className="w-4 h-4 text-white" />
        </button>
      </div>
    </motion.div>
  );
});

const CallOverlay = memo(function CallOverlay({ 
  callType, 
  callState, 
  otherUser, 
  onEndCall,
  localVideoRef,
  remoteVideoRef,
  isMuted,
  onToggleMute,
  isVideoOff,
  onToggleVideo,
  onMinimize
}: { 
  callType: CallType;
  callState: CallState;
  otherUser: any;
  onEndCall: () => void;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  onMinimize: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localRef.current) {
      localRef.current.srcObject = localVideoRef.current.srcObject;
    }
  }, [localVideoRef.current?.srcObject]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteRef.current) {
      remoteRef.current.srcObject = remoteVideoRef.current.srcObject;
    }
  }, [remoteVideoRef.current?.srcObject]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-blue-950" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[150px]" />
      
      {callType === 'video' && callState === 'connected' && (
        <div className="absolute inset-0">
          <video 
            ref={remoteRef}
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
          />
          <video 
            ref={localRef}
            autoPlay 
            muted 
            playsInline
            className={`absolute bottom-24 right-4 w-28 h-36 md:w-40 md:h-52 object-cover rounded-2xl border-2 border-zinc-700 shadow-xl ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="absolute bottom-24 right-4 w-28 h-36 md:w-40 md:h-52 bg-zinc-900 rounded-2xl border-2 border-zinc-700 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-zinc-600" />
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        {callState === 'denied' ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-8xl mb-6"
            >
              ðŸš«
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-2">Permission Denied</h2>
            <p className="text-zinc-400 text-center mb-8 max-w-xs">
              {callType === 'video' ? 'Camera' : 'Microphone'} access was denied. Please enable it in your browser settings.
            </p>
          </>
        ) : callState === 'calling' || callState === 'ringing' ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mb-8"
            >
              <EmojiAvatar config={otherUser?.avatar_config || defaultEmojiAvatarConfig} size={120} />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-2">{otherUser?.display_name}</h2>
            <motion.p 
              className="text-zinc-400 mb-8"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {callState === 'ringing' ? 'ðŸ“± Ringing...' : callType === 'video' ? 'ðŸ“¹ Video calling...' : 'ðŸ“ž Voice calling...'}
            </motion.p>
          </>
        ) : (
          <>
            {callType === 'voice' && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mb-8"
                >
                  <EmojiAvatar config={otherUser?.avatar_config || defaultEmojiAvatarConfig} size={120} />
                </motion.div>
                <h2 className="text-2xl font-black text-white mb-2">{otherUser?.display_name}</h2>
              </>
            )}
            <p className="text-green-400 font-bold mb-8 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Connected
            </p>
          </>
        )}

        <div className="flex gap-4">
          {callState === 'connected' && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onMinimize}
                className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <Minimize2 className="w-6 h-6 text-white" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-zinc-800'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </motion.button>
              {callType === 'video' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOff ? 'bg-red-500' : 'bg-zinc-800'}`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                </motion.button>
              )}
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEndCall}
            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});

const IncomingCallOverlay = memo(function IncomingCallOverlay({ 
  otherUser, 
  callType, 
  onAnswer, 
  onDecline 
}: { 
  otherUser: any; 
  callType: CallType; 
  onAnswer: () => void; 
  onDecline: () => void; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-black to-blue-900/40" />
      
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="relative z-10 mb-8"
      >
        <EmojiAvatar config={otherUser?.avatar_config || defaultEmojiAvatarConfig} size={140} />
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center border-4 border-black">
          {callType === 'video' ? <Video className="w-6 h-6 text-white" /> : <Phone className="w-6 h-6 text-white" />}
        </div>
      </motion.div>

      <h2 className="relative z-10 text-3xl font-black text-white mb-2">{otherUser?.display_name}</h2>
      <p className="relative z-10 text-zinc-400 font-bold mb-12 animate-pulse uppercase tracking-widest">Incoming {callType} call...</p>

      <div className="relative z-10 flex gap-8">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onDecline}
          className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40"
        >
          <PhoneOff className="w-8 h-8 text-white" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onAnswer}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40"
        >
          {callType === 'video' ? <Video className="w-8 h-8 text-white" /> : <Phone className="w-8 h-8 text-white" />}
        </motion.button>
      </div>
    </motion.div>
  );
});

const MessageItem = memo(function MessageItem({
  msg, isMe, currentUserId, groupedReactions, isEditing, editingMessage,
  editInput, editError, highlightedMsgId,
  lastSentMessage, otherParticipant, handlePointerDown, handlePointerUp,
  handlePointerMove, handleContextMenu, setReplyingTo, handleSaveEdit, setEditingMessage, setEditError,
  handleReaction, handleReactionClick, scrollToMessage,
  getLastMessageStatus, setShowReactionUsers
}: {
  msg: any; isMe: boolean; currentUserId: string; groupedReactions: Record<string, number>;
  isEditing: boolean; editingMessage: any; editInput: string; editError: string | null;
  highlightedMsgId: string | null;
  lastSentMessage: any; otherParticipant: any;
  handlePointerDown: (e: React.PointerEvent, msg: any) => void;
  handlePointerUp: () => void;
  handlePointerMove: () => void;
  handleContextMenu: (e: React.MouseEvent, msg: any) => void;
  setReplyingTo: (msg: any) => void;
  handleSaveEdit: () => void;
  setEditingMessage: (msg: any) => void;
  setEditInput: (val: string) => void;
  setEditError: (err: string | null) => void;
  handleReaction: (messageId: string, emoji: string) => void;
  handleReactionClick: (msg: any, emoji: string) => void;
  scrollToMessage: (msgId: string) => void;
  getLastMessageStatus: (msg: any) => string;
  setShowReactionUsers: (data: any) => void;
}) {
  const reactions = msg.reactions || [];
  const editComposingRef = useRef(false);
  return (
    <React.Fragment>
      <motion.div
        data-msg-id={msg.id}
        initial={false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`transition-all duration-700 select-none ${highlightedMsgId === msg.id ? 'bg-amber-200/50 rounded-2xl -mx-2 px-2' : ''} ${isMe ? 'self-end flex flex-col items-end' : 'self-start flex items-end gap-2 md:gap-3'} min-w-0`}
        style={{ touchAction: 'manipulation' }}
        onPointerDown={(e) => handlePointerDown(e, msg)}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => handleContextMenu(e, msg)}
      >
        {!isMe && <EmojiAvatar config={msg.sender?.avatar_config || defaultEmojiAvatarConfig} size={32} className="mb-1 md:w-9 md:h-9 flex-shrink-0" />}
        <SwipeableMessage
          onSwipeReply={() => setReplyingTo(msg)}
          isMe={isMe}
        >
          <div
            className={`w-fit min-w-[60px] max-w-[75%] md:max-w-[65%] group relative ${isMe ? 'ml-auto' : ''} ${Object.keys(groupedReactions).length > 0 ? 'mb-6' : ''}`}
          >
            <motion.div
              className={`p-3 md:p-4 rounded-2xl md:rounded-3xl text-sm font-medium shadow-lg relative break-words ${isMe
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-lg'
                : 'bg-white text-gray-900 border border-amber-200 shadow-sm rounded-bl-lg'
              }`}
              whileHover={{ scale: 1.01 }}
            >
              {msg.replyTo && !isEditing && (
                <div
                  className="mb-2 px-3 py-2 rounded bg-black/5 border-l-[3px] border-amber-500 text-xs"
                  onClick={() => scrollToMessage(msg.replyTo.messageId)}
                  style={{ cursor: 'pointer' }}
                >
                  <p className="font-semibold text-[12px] text-amber-600 mb-0.5">{msg.replyTo.senderName}</p>
                  <p className="text-gray-500 text-[12px] line-clamp-2 overflow-hidden whitespace-pre-wrap">
                    {msg.replyTo.preview.startsWith('📷') ? '📷 Photo' : msg.replyTo.preview}
                  </p>
                </div>
              )}
              {isEditing ? (
                <div>
                    <div className="flex items-center gap-2">
                    <input
                      value={editInput}
                      onChange={(e) => { setEditInput(e.target.value); setEditError(null); }}
                      className="flex-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-sm text-gray-900 outline-none focus:border-amber-500"
                      autoFocus
                      onCompositionStart={() => { editComposingRef.current = true; }}
                      onCompositionEnd={() => { editComposingRef.current = false; }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !editComposingRef.current) handleSaveEdit(); if (e.key === 'Escape') setEditingMessage(null); }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors flex-shrink-0"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => { setEditingMessage(null); setEditError(null); }}
                      className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  {editError && (
                    <p className="text-red-400 text-[11px] mt-1">{editError}</p>
                  )}
                </div>
              ) : msg.message_type === 'image' ? (
                <img
                  src={msg.content}
                  alt="Shared image"
                  className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '300px' }}
                  onClick={(e) => { e.stopPropagation(); window.open(msg.content, '_blank'); }}
                  loading="lazy"
                />
              ) : (
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', display: 'block', maxWidth: '100%' }}>{msg.content}</span>
              )}
              {msg.is_edited && !isEditing && (
                <span className={`text-[9px] ml-2 ${isMe ? 'text-white/50' : 'text-gray-400'}`}>(edited)</span>
              )}
            </motion.div>

            {Object.keys(groupedReactions).length > 0 && (
              <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex gap-0.5 z-10`}>
                {Object.entries(groupedReactions).map(([emoji, count]) => {
                  const hasReacted = reactions.some((r: any) => r.user_id === currentUserId && r.emoji === emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => { e.stopPropagation(); handleReactionClick(msg, emoji); }}
                      onPointerDown={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        const badgeLongPress = setTimeout(() => {
                          const users = reactions.filter((r: any) => r.emoji === emoji);
                          supabase
                            .from('profiles')
                            .select('id, display_name')
                            .in('id', users.map((u: any) => u.user_id))
                            .then(({ data: profiles }) => {
                              setShowReactionUsers({
                                emoji,
                                users: (profiles || []).map((p: any) => ({ id: p.id, name: p.display_name }))
                              });
                            });
                        }, 500);
                        const handleUp = () => {
                          clearTimeout(badgeLongPress);
                          el.removeEventListener('pointerup', handleUp);
                          el.removeEventListener('pointerleave', handleUp);
                        };
                        el.addEventListener('pointerup', handleUp);
                        el.addEventListener('pointerleave', handleUp);
                      }}
                      className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 shadow-lg transition-colors ${hasReacted ? 'bg-amber-200 border-amber-500' : 'bg-white border-amber-200 hover:bg-amber-50'}`}
                    >
                      {emoji}
                      {(count as number) > 1 && <span className="text-[9px] text-amber-600">{count as number}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] mt-1 text-gray-400 flex items-center justify-end gap-1">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {isMe && msg.id === lastSentMessage?.id && (() => {
              const status = getLastMessageStatus(lastSentMessage);
              const colors = { seen: '#d97706', delivered: '#9ca3af', not_delivered: '#ef4444' };
              const getSeenTimeLabel = (lastReadAtStr?: string) => {
                if (!lastReadAtStr) return 'Seen';
                const date = new Date(lastReadAtStr);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                if (diffMins < 1) return 'Seen just now';
                if (diffMins < 60) return `Seen ${diffMins}m ago`;
                return `Seen ${diffHours}h ago`;
              };
              const labels = {
                seen: getSeenTimeLabel(otherParticipant?.last_read_at),
                delivered: 'Delivered',
                not_delivered: 'Not delivered'
              };
              return (
                <div className="flex items-center justify-end mt-0.5">
                  <span style={{ fontSize: '10px', lineHeight: 1, color: colors[status] }}>
                    {labels[status]}
                  </span>
                </div>
              );
            })()}
          </div>
        </SwipeableMessage>
      </motion.div>
    </React.Fragment>
  );
});

export function ChatWindow({ 
  chatId, 
  currentUserId, 
  onBack,
  chatBackground,
  onChangeBackground,
  initialCall
}: { 
  chatId: string; 
  currentUserId: string;
  onBack?: () => void;
  chatBackground?: string;
  onChangeBackground?: (bg: string) => void;
  initialCall?: { type: CallType; offer: any; from: string } | null;
}) {
  const { messages, sendMessage, loading, addReaction, editMessage, deleteMessage, deleteForMe } = useChat(chatId);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [heartAnimations, setHeartAnimations] = useState<{ id: number; x: number; y: number }[]>([]);
  const [contextMsg, setContextMsg] = useState<any>(null);
  const [reactionTrayMsg, setReactionTrayMsg] = useState<string | null>(null);
  const [reactionTrayPos, setReactionTrayPos] = useState<{ top: number; left: number } | null>(null);
  const lastTapRef = useRef<{ msgId: string; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActiveRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editInput, setEditInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledUpRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const [recentReactions, setRecentReactions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gupshup_recent_reactions') || '[]'); } catch { return []; }
  });
  const [showReactionUsers, setShowReactionUsers] = useState<{ emoji: string; users: { id: string; name: string }[] } | null>(null);
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const firstUnreadIndexRef = useRef<number>(-1);
  const dividerRef = useRef<HTMLDivElement>(null);

  const [callType, setCallType] = useState<CallType>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ type: CallType; offer: any; from: string } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<any>(null);
  const iceCandidatesBuffer = useRef<RTCIceCandidateInit[]>([]);
  const channelSubscribedRef = useRef(false);
  const pendingInitialCallRef = useRef(initialCall);

  const currentBg = useMemo(() => CHAT_BACKGROUNDS.find(b => b.id === chatBackground) || CHAT_BACKGROUNDS[0], [chatBackground]);
  const otherParticipant = useMemo(() => chatInfo?.participants?.find((p: any) => p.user?.id !== currentUserId), [chatInfo, currentUserId]);
  const otherUser = useMemo(() => otherParticipant?.user, [otherParticipant]);

  // Periodic tick to update seen status relative time
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Find the last sent message (newest message from current user)
  const lastSentMessage = useMemo(() => {
    if (!messages.length) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === currentUserId) {
        return messages[i];
      }
    }
    return null;
  }, [messages, currentUserId]);

  const getLastMessageStatus = useCallback((msg: any) => {
    if (!otherUser?.id || !msg) return 'not_delivered';
    if (msg.read_by?.includes(otherUser.id)) return 'seen';
    if (msg.delivered_to?.includes(otherUser.id)) return 'delivered';
    return 'not_delivered';
  }, [otherUser]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const scrollToMessage = useCallback((targetMsgId: string) => {
    const el = document.querySelector(`[data-msg-id="${targetMsgId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetMsgId);
      setTimeout(() => setHighlightedMsgId(null), 1200);
    }
  }, []);

  useEffect(() => {
    setCurrentViewingChat(chatId);
    firstUnreadIndexRef.current = -1;
    prevMessagesLengthRef.current = 0; // reset for new chat
    initialScrollDoneRef.current = false; // reset so the new chat opens at its own latest message
    return () => setCurrentViewingChat(null);
  }, [chatId]);

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      hasScrolledUpRef.current = scrollTop + clientHeight < scrollHeight - 50;
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [loading, chatInfo]);

  // Auto-scroll: useLayoutEffect for immediate scroll after DOM mutations
  useLayoutEffect(() => {
    // Don't do anything until the real chat UI (and its scroll container) is actually mounted.
    // Messages can finish loading before chatInfo does — if we ran this while the loading
    // spinner was still showing, messagesContainerRef.current would be null, the scroll
    // would silently no-op, and we'd never get a second chance to scroll to the bottom.
    if (loading || !chatInfo) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    if (!initialScrollDoneRef.current) {
      // Initial load (or first render after the loading screen clears): jump straight to the
      // latest message, no animation.
      if (messages.length > 0) {
        container.scrollTop = container.scrollHeight;
        initialScrollDoneRef.current = true;
        prevMessagesLengthRef.current = messages.length;
      }
      return;
    }

    if (messages.length > prevMessagesLengthRef.current) {
      // New message arrived: only auto-scroll if the user is already at the bottom
      prevMessagesLengthRef.current = messages.length;
      if (!hasScrolledUpRef.current && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, loading, chatInfo]);

  useEffect(() => {
    async function fetchChatInfo() {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select(`
            *,
            participants:chat_participants(
              user:profiles(*),
              nickname,
              last_read_at
            )
          `)
          .eq('id', chatId)
          .single();

        if (!error && data) {
          setChatInfo(data);
          
          const myParticipant = data?.participants?.find((p: any) => p.user?.id === currentUserId);
          if (myParticipant?.nickname) {
            setNickname(myParticipant.nickname);
          }
        }
      } catch (err) {
        console.error('fetchChatInfo error:', err);
      }
    }
    fetchChatInfo();
  }, [chatId, currentUserId]);

  // Listen for chat_participants updates (specifically last_read_at)
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat_participants:${chatId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setChatInfo((prev: any) => {
          if (!prev) return prev;
          const updatedParticipants = prev.participants?.map((p: any) => {
            if (p.user?.id === payload.new.user_id) {
              return { ...p, last_read_at: payload.new.last_read_at };
            }
            return p;
          });
          return { ...prev, participants: updatedParticipants };
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId]);

  // Listen for chat_cleared and chat_deleted events
  useEffect(() => {
    const channel = supabase.channel(`chat_events:${chatId}`, { config: { broadcast: { self: false } } });
    
    channel
      .on('broadcast', { event: 'chat_cleared' }, ({ payload }) => {
        if (payload.roomId === chatId) {
          // Clear messages locally
          setMessages([]);
        }
      })
      .on('broadcast', { event: 'chat_deleted' }, ({ payload }) => {
        if (payload.roomId === chatId && onBack) {
          onBack();
        }
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [chatId, currentUserId, onBack]);

  // Listen for real-time read receipts broadcast from receiver and update chatInfo immediately.
  // This allows getMessageStatus to show "seen" without waiting for a DB poll.
  useEffect(() => {
    if (!chatId) return;
    const handler = (e: Event) => {
      const { chatId: evtChatId, userId, readAt } = (e as CustomEvent).detail;
      if (evtChatId !== chatId) return;
      setChatInfo((prev: any) => {
        if (!prev) return prev;
        const updatedParticipants = prev.participants?.map((p: any) => {
          if (p.user?.id === userId) {
            return { ...p, last_read_at: readAt };
          }
          return p;
        });
        return { ...prev, participants: updatedParticipants };
      });
    };
    window.addEventListener('chat-participant-read', handler);
    return () => window.removeEventListener('chat-participant-read', handler);
  }, [chatId]);


  const createPeerConnection = useCallback(() => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ]
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, from: currentUserId }
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Don't immediately end call on disconnected as it might reconnect
        if (pc.connectionState === 'failed') endCall();
      }
    };

    return pc;
  }, [currentUserId]);

  const handleAnswer = useCallback(async (callData = incomingCall) => {
    if (!callData) return;
    
    setCallState('calling');
    try {
      const constraints = callData.type === 'video' 
        ? { video: true, audio: true }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      if (callData.type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      
      // Process buffered ICE candidates
      while (iceCandidatesBuffer.current.length > 0) {
        const candidate = iceCandidatesBuffer.current.shift();
        if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: { answer, from: currentUserId }
        });
      }

      setIncomingCall(null);
    } catch (err) {
      console.error('Failed to answer call:', err);
      setCallState('denied');
      setIncomingCall(null);
    }
  }, [incomingCall, currentUserId, createPeerConnection]);

  const endCall = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (callChannelRef.current && channelSubscribedRef.current) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: { from: currentUserId }
      });
    }

    setCallType(null);
    setCallState('idle');
    setIsMuted(false);
    setIsVideoOff(false);
    setIsMinimized(false);
    setIncomingCall(null);
  }, [currentUserId]);

  useEffect(() => {
    if (!chatId || !otherUser) return;

    const channel = supabase.channel(`call:${chatId}`, {
      config: {
        broadcast: { self: false }
      }
    });
    callChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from === currentUserId) return;
        
        setIncomingCall({ 
          type: payload.callType, 
          offer: payload.offer, 
          from: payload.from 
        });
        setCallType(payload.callType);
        setCallState('ringing');
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from === currentUserId) return;
        
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            
            while (iceCandidatesBuffer.current.length > 0) {
              const candidate = iceCandidatesBuffer.current.shift();
              if (candidate) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          } catch (err) {
            console.error('Error setting remote description:', err);
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from === currentUserId) return;
        
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        } else {
          iceCandidatesBuffer.current.push(payload.candidate);
        }
      })
      .on('broadcast', { event: 'decline-call' }, () => {
        endCall();
      })
      .on('broadcast', { event: 'end-call' }, () => {
        endCall();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelSubscribedRef.current = true;
          if (pendingInitialCallRef.current) {
            setIncomingCall(pendingInitialCallRef.current);
            setCallType(pendingInitialCallRef.current.type);
            setCallState('ringing');
            pendingInitialCallRef.current = null;
          }
        }
      });

    return () => {
      channelSubscribedRef.current = false;
      channel.unsubscribe();
    };
  }, [chatId, otherUser, currentUserId, endCall]);

  const handleDecline = () => {
    if (callChannelRef.current) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'decline-call',
        payload: { from: currentUserId }
      });
    }
    setIncomingCall(null);
    setCallType(null);
    setCallState('idle');
  };

  const startCall = async (type: 'voice' | 'video') => {
    setCallType(type);
    setCallState('calling');
    setIsMinimized(false);
    iceCandidatesBuffer.current = [];
    
    try {
      const constraints = type === 'video' 
        ? { video: true, audio: true }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerPayload = { offer, from: currentUserId, callType: type, chatId };
      
      if (callChannelRef.current && channelSubscribedRef.current) {
        await callChannelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: offerPayload
        });
      }

      if (otherUser?.id) {
        const globalChannel = supabase.channel(`global_calls:${otherUser.id}`);
        globalChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            globalChannel.send({
              type: 'broadcast',
              event: 'offer',
              payload: offerPayload
            });
          }
        });
      }
    } catch (err: any) {
      console.error('Permission denied:', err);
      setCallState('denied');
    }
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const handleSend = useCallback(async (content: string) => {
    const replyId = replyingTo?.id;
    let replyTo = null;
    if (replyId) {
      const replyMsg = messages.find(m => m.id === replyId);
      if (replyMsg) {
        let senderName = replyMsg.sender?.display_name || null;
        if (!senderName) {
          const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', replyMsg.sender_id).single();
          senderName = profile?.display_name || 'Unknown';
        }
        replyTo = {
          messageId: replyMsg.id,
          senderId: replyMsg.sender_id,
          senderName,
          preview: replyMsg.message_type === 'image' ? '📷 Photo' : replyMsg.content.substring(0, 80)
        };
      }
    }
    setReplyingTo(null);
    await sendMessage(content, currentUserId, 'text', replyId, replyTo);
  }, [replyingTo, messages, currentUserId, sendMessage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${chatId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      const replyId = replyingTo?.id;
      let replyTo = null;
      if (replyId) {
        const replyMsg = messages.find(m => m.id === replyId);
        if (replyMsg) {
          let senderName = replyMsg.sender?.display_name || null;
          if (!senderName) {
            const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', replyMsg.sender_id).single();
            senderName = profile?.display_name || 'Unknown';
          }
          replyTo = {
            messageId: replyMsg.id,
            senderId: replyMsg.sender_id,
            senderName,
            preview: replyMsg.message_type === 'image' ? 'ðŸ“· Photo' : replyMsg.content.substring(0, 80)
          };
        }
      }
      setReplyingTo(null);
      await sendMessage(publicUrl, currentUserId, 'image', replyId, replyTo);
    } catch (err: any) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleEdit = (msg: any) => {
    setEditingMessage(msg);
    setEditInput(msg.content);
    setContextMsg(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInput.trim()) return;
    setEditError(null);
    const result = await editMessage(editingMessage.id, editInput);
    if (result?.error) {
      setEditError(result.error.message);
      return;
    }
    setEditingMessage(null);
    setEditInput('');
  };

  const handleDeleteEveryone = async (msgId: string) => {
    await deleteMessage(msgId);
    setContextMsg(null);
  };

  const handleDeleteForMe = async (msgId: string) => {
    await deleteForMe(msgId, currentUserId);
    setContextMsg(null);
  };

  const chatInputRef = useRef<{ focus: () => void; openEmojiPicker?: () => void }>(null);
  const [pendingReactionMsgId, setPendingReactionMsgId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const closeContextMenu = useCallback(() => {
    setContextMsg(null);
    setContextMenuPos(null);
  }, []);

  const closeReactionTray = useCallback(() => {
    setReactionTrayMsg(null);
    setReactionTrayPos(null);
    setPendingReactionMsgId(null);
    if (!isMobile) chatInputRef.current?.focus();
  }, [isMobile]);

  const closeAll = useCallback(() => {
    setContextMsg(null);
    setContextMenuPos(null);
    setReactionTrayMsg(null);
    setReactionTrayPos(null);
    setPendingReactionMsgId(null);
    if (!isMobile) chatInputRef.current?.focus();
  }, [isMobile]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji, currentUserId);
    setRecentReactions(prev => {
      const updated = [emoji, ...prev.filter((e: string) => e !== emoji)].slice(0, 6);
      try { localStorage.setItem('gupshup_recent_reactions', JSON.stringify(updated)); } catch {}
      return updated;
    });
    closeAll();
  }, [addReaction, currentUserId, closeAll]);

  const handleReactionClick = useCallback((msg: any, emoji: string) => {
    addReaction(msg.id, emoji, currentUserId);
  }, [addReaction, currentUserId]);

  const calculateMenuPos = useCallback((msgEl: HTMLElement) => {
    const rect = msgEl.getBoundingClientRect();
    const popupW = 210;
    const popupH = 180;
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Vertical: align top of menu with top of bubble, clamped so it doesn't go off-screen bottom
    let top = Math.min(rect.top, viewportH - popupH - 8);
    top = Math.max(8, top);

    // Horizontal: prefer right of bubble, fallback to left if no room
    const rightLeft = rect.right + gap;
    const leftLeft = rect.left - popupW - gap;

    let left: number;
    if (rightLeft + popupW <= viewportW - 8) {
      left = rightLeft;
    } else if (leftLeft >= 8) {
      left = leftLeft;
    } else {
      // Last resort: right-align to viewport edge
      left = Math.max(8, viewportW - popupW - 8);
    }

    return { top, left, above: false };
  }, [isMobile]);

  const openContextMenu = useCallback((target: HTMLElement, msg: any) => {
    const msgEl = target.closest('[data-msg-id]') as HTMLElement || target;
    const pos = calculateMenuPos(msgEl);
    setContextMenuPos(pos);
    setContextMsg(msg);
  }, [calculateMenuPos]);

  const openReactionTrayAt = useCallback((msgEl: HTMLElement, msgId: string) => {
    const rect = msgEl.getBoundingClientRect();
    const trayW = 300;
    const trayH = 52;
    let left = rect.left + rect.width / 2 - trayW / 2;
    if (left < 8) left = 8;
    if (left + trayW > window.innerWidth - 8) left = window.innerWidth - trayW - 8;
    const above = rect.top > trayH + 14;
    const top = above ? rect.top - trayH - 8 : rect.bottom + 8;
    setReactionTrayPos({ top, left });
    setReactionTrayMsg(msgId);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, msg: any) => {
    // Only handle primary button (left click / touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Prevent browser focus/selection changes on touch to keep long press intact
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }

    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Cancel any in-flight long press
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressActiveRef.current = false;
    pointerMovedRef.current = false;

    if (lastTap && lastTap.msgId === msg.id && now - lastTap.time < 350) {
      // ── Double-tap: reaction tray ONLY ──
      lastTapRef.current = null;
      const target = e.currentTarget as HTMLElement;
      const msgEl = target.closest('[data-msg-id]') as HTMLElement || target;
      openReactionTrayAt(msgEl, msg.id);
      return;
    }

    lastTapRef.current = { msgId: msg.id, time: now };

    // ── Long press: reaction tray + context menu ──
    const target = e.currentTarget as HTMLElement;
    longPressTimerRef.current = setTimeout(() => {
      if (pointerMovedRef.current) return; // cancelled by movement
      longPressActiveRef.current = true;
      const msgEl = target.closest('[data-msg-id]') as HTMLElement || target;
      openReactionTrayAt(msgEl, msg.id);
      openContextMenu(msgEl, msg);
    }, 480);
  }, [openReactionTrayAt, openContextMenu]);

  const handlePointerUp = useCallback(() => {
    // Cancel long press if pointer released before threshold
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerMove = useCallback(() => {
    // Mark as moved so long press doesn't fire after dragging/scrolling
    pointerMovedRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const msgEl = target.closest('[data-msg-id]') as HTMLElement || target;
    openContextMenu(msgEl, msg);
    openReactionTrayAt(msgEl, msg.id);
  }, [openContextMenu, openReactionTrayAt]);

  useEffect(() => {
    if (!contextMsg) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    const handleScroll = () => closeAll();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll(); };
    let lastOuterHeight = window.outerHeight;
    const handleResize = () => {
      const outerChanged = Math.abs(window.outerHeight - lastOuterHeight) > 30;
      if (outerChanged) {
        lastOuterHeight = window.outerHeight;
        closeAll();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMsg, closeAll]);

  // Dismiss reaction tray when shown alone (double-tap): outside click + escape
  useEffect(() => {
    if (!reactionTrayMsg || contextMsg) return;
    const trayOpenedAt = Date.now();
    const handleClickOutside = (e: MouseEvent) => {
      if (Date.now() - trayOpenedAt < 200) return;
      const trayEl = document.querySelector('[data-reaction-tray]');
      if (trayEl && !trayEl.contains(e.target as Node)) {
        closeReactionTray();
      }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeReactionTray(); };
    const timer = setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
    document.addEventListener('keydown', handleEsc);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [reactionTrayMsg, contextMsg, closeReactionTray]);

  const floatingEmojis = useMemo(() => {
    const emojis = isMobile ? FLOATING_BG_EMOJIS.slice(0, 6) : FLOATING_BG_EMOJIS;
    return emojis.map((emoji, i) => (
      <FloatingBgEmoji key={i} emoji={emoji} index={i} />
    ));
  }, [isMobile]);

  if (loading || !chatInfo) return (
    <div className="flex-1 flex items-center justify-center bg-amber-50">
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="text-5xl"
      >
        ⏳
      </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-amber-50 relative overflow-hidden"
    >
      <video ref={localVideoRef} className="hidden" autoPlay muted playsInline />
      <video ref={remoteVideoRef} className="hidden" autoPlay playsInline />
      
      <div className={`absolute inset-0 ${currentBg.class}`} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/8 rounded-full" style={{ filter: `blur(${isMobile ? 60 : 150}px)` }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-400/8 rounded-full" style={{ filter: `blur(${isMobile ? 60 : 150}px)` }} />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingEmojis}
      </div>

      <AnimatePresence>
        {showBgPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBgPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 border border-amber-200 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-500" /> Chat Background
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowBgPicker(false)} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CHAT_BACKGROUNDS.map(bg => (
                  <motion.button
                    key={bg.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { onChangeBackground?.(bg.id); setShowBgPicker(false); }}
                    className={`h-20 rounded-2xl ${bg.class} border-2 transition-all flex items-end justify-start p-3 ${chatBackground === bg.id ? 'border-amber-500 shadow-lg shadow-amber-400/30' : 'border-amber-200'}`}
                  >
                    <span className="text-xs font-bold text-white/80">{bg.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        <AnimatePresence>
          {incomingCall && (
            <IncomingCallOverlay
              otherUser={otherUser}
              callType={incomingCall.type}
              onAnswer={handleAnswer}
              onDecline={handleDecline}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {callType && !isMinimized && (
          <CallOverlay
            callType={callType}
            callState={callState}
            otherUser={otherUser}
            onEndCall={endCall}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            isVideoOff={isVideoOff}
            onToggleVideo={toggleVideo}
            onMinimize={() => setIsMinimized(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callType && isMinimized && callState === 'connected' && (
          <MinimizedCall
            callType={callType}
            otherUser={otherUser}
            onMaximize={() => setIsMinimized(false)}
            onEndCall={endCall}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            isVideoOff={isVideoOff}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {heartAnimations.map(heart => (
          <motion.div
            key={heart.id}
            className="fixed text-5xl pointer-events-none z-50"
            style={{ left: heart.x - 25, top: heart.y - 25 }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.5, 1], y: -100, opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>

        <header className="p-3 md:p-4 border-b border-amber-200 flex justify-between items-center bg-amber-50/90 backdrop-blur-xl z-10 relative flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="rounded-full hover:bg-amber-100 text-amber-600 md:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserProfile(true)}
              className="cursor-pointer"
            >
              <EmojiAvatar config={otherUser?.avatar_config || defaultEmojiAvatarConfig} size={44} className="md:w-[52px] md:h-[52px]" />
            </motion.div>
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowUserProfile(true)}
            >
              <h3 className="font-black text-base md:text-lg text-gray-900">{nickname || otherUser?.display_name}</h3>
              <p className="text-xs text-ziamber-600 font-bold">{otherUser?.vibe_status || 'âœ¨ Vibing'}</p>
            </div>
          </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowBgPicker(true)} className="rounded-full hover:bg-amber-100 text-amber-500 hidden md:flex"><Palette className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => startCall('voice')} className="rounded-full hover:bg-amber-100 text-amber-500 hover:text-green-500"><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => startCall('video')} className="rounded-full hover:bg-amber-100 text-amber-500 hover:text-amber-600"><Video className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setShowBgPicker(true)} className="rounded-full hover:bg-amber-100 text-amber-500 md:hidden"><Palette className="w-5 h-5" /></Button>
        </div>
      </header>

        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 scroll-smooth"
          style={{ minHeight: 0 }}
        >
          <div className="flex flex-col max-w-4xl mx-auto" style={{ gap: '16px' }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUserId;
                const reactions = msg.reactions || [];
                const groupedReactions = reactions.reduce((acc: Record<string, number>, r: any) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {});
                const isEditing = editingMessage?.id === msg.id;
                return (
                  <React.Fragment key={msg.id}>
                    {i === firstUnreadIndexRef.current && firstUnreadIndexRef.current !== -1 && (
                      <div key="unread-divider" ref={dividerRef} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 16px'
                      }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(245,158,11,0.5)' }} />
                        <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500, whiteSpace: 'nowrap' }}>New Messages</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(245,158,11,0.5)' }} />
                      </div>
                    )}
                    <MessageItem
                      msg={msg}
                      isMe={isMe}
                      currentUserId={currentUserId}
                      groupedReactions={groupedReactions}
                      isEditing={isEditing}
                      editingMessage={editingMessage}
                      editInput={editInput}
                      editError={editError}
                      highlightedMsgId={highlightedMsgId}
                      lastSentMessage={lastSentMessage}
                      otherParticipant={otherParticipant}
                      handlePointerDown={handlePointerDown}
                      handlePointerUp={handlePointerUp}
                      handlePointerMove={handlePointerMove}
                      handleContextMenu={handleContextMenu}
                      setReplyingTo={setReplyingTo}
                      handleSaveEdit={handleSaveEdit}
                      setEditingMessage={setEditingMessage}
                      setEditInput={setEditInput}
                      setEditError={setEditError}
                      handleReaction={handleReaction}
                      handleReactionClick={handleReactionClick}
                      scrollToMessage={scrollToMessage}
                      getLastMessageStatus={getLastMessageStatus}
                      setShowReactionUsers={setShowReactionUsers}
                    />
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <AnimatePresence>
          {contextMsg && contextMenuPos && (
            <motion.div
              ref={contextMenuRef}
              style={{ position: 'fixed', top: contextMenuPos.top, left: contextMenuPos.left, zIndex: 9999 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl overflow-hidden" style={{ width: '200px' }}>
                <div className="py-1">
                  <button
                    onClick={() => { setReplyingTo(contextMsg); closeContextMenu(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-800 text-sm font-medium transition-colors"
                  >
                    <Reply className="w-4 h-4 text-amber-500" /> Reply
                  </button>
                  <button
                    onClick={() => {
                      const msgEl = document.querySelector(`[data-msg-id="${contextMsg.id}"]`) as HTMLElement;
                      if (msgEl) openReactionTrayAt(msgEl, contextMsg.id);
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-800 text-sm font-medium transition-colors"
                  >
                    <Smile className="w-4 h-4 text-yellow-400" /> React
                  </button>
                  {contextMsg.sender_id === currentUserId && (Date.now() - new Date(contextMsg.created_at).getTime()) < 15 * 60 * 1000 && (
                    <button
                      onClick={() => { handleEdit(contextMsg); closeContextMenu(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-800 text-sm font-medium transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-green-400" /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => { handleDeleteForMe(contextMsg.id); closeContextMenu(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 text-gray-800 text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" /> Delete for me
                  </button>
                  {contextMsg.sender_id === currentUserId && (
                    <button
                      onClick={() => {
                        if (confirm('Delete for everyone? This cannot be undone.')) {
                          handleDeleteEveryone(contextMsg.id);
                        }
                        closeContextMenu();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-500 text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" /> Delete for everyone
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reactionTrayMsg && reactionTrayPos && (
            <motion.div
              data-reaction-tray
              style={{ position: 'fixed', top: reactionTrayPos.top, left: reactionTrayPos.left, zIndex: 9999 }}
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
            >
              <div className="bg-white rounded-full border border-amber-200 shadow-xl px-1.5 py-1 flex items-center gap-0.5">
                {[...new Set([...recentReactions, ...QUICK_REACTIONS])].slice(0, 6).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(reactionTrayMsg, emoji)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors text-xl active:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="w-px h-6 bg-amber-200 mx-0.5" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Store which message we're reacting to, then trigger ChatInput's emoji picker
                    const msgId = reactionTrayMsg;
                    setPendingReactionMsgId(msgId);
                    // Close tray UI but keep pendingReactionMsgId so the emoji picker
                    // result goes to the reaction handler instead of the text input
                    setReactionTrayMsg(null);
                    setReactionTrayPos(null);
                    // Programmatically click the emoji button inside ChatInput
                    chatInputRef.current?.openEmojiPicker?.();
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors text-xl text-amber-500 active:scale-110"
                >
                  +
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ChatInput
          ref={chatInputRef}
          onSend={handleSend}
          onImageUpload={handleImageUpload}
          uploadingImage={uploadingImage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onEmojiSelect={pendingReactionMsgId ? (emoji: string) => {
            handleReaction(pendingReactionMsgId, emoji);
            setPendingReactionMsgId(null);
          } : undefined}
        />

        <AnimatePresence>
          {showReactionUsers && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReactionUsers(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xl min-w-[200px] max-w-[300px]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-center text-2xl mb-3">{showReactionUsers.emoji}</p>
                <div className="flex flex-col gap-1.5">
                  {showReactionUsers.users.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-50">
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-gray-900 font-medium">{u.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUserProfile && otherUser && (
            <UserProfileModal
              user={otherUser}
              currentUserId={currentUserId}
              chatId={chatId}
              onClose={() => setShowUserProfile(false)}
              onNicknameChange={(newNickname) => setNickname(newNickname)}
            />
          )}
        </AnimatePresence>
      </motion.div>
  );
}