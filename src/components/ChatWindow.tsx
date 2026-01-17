'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { EmojiAvatar, defaultEmojiAvatarConfig } from './EmojiAvatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Smile, MoreVertical, Phone, Video, Heart, ArrowLeft, Palette, X, PhoneOff, VideoOff, Mic, MicOff, Maximize2, Minimize2, Plus, Reply, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { CHAT_BACKGROUNDS } from '@/lib/constants';
import { EmojiPicker } from './EmojiPicker';
import { UserProfileModal } from './UserProfileModal';
import { setCurrentViewingChat } from '@/lib/notifications';

const QUICK_REACTIONS = ['❤️', '😂', '🔥', '💀', '👀', '✨'];
const FLOATING_BG_EMOJIS = ['💬', '✨', '💜', '💙', '🔥', '😎', '💀', '👻', '⚡', '🎮', '💫', '🫠'];

type CallType = 'voice' | 'video' | null;
type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'denied';

function SwipeableMessage({ 
  children, 
  onSwipeReply,
  isMe
}: { 
  children: React.ReactNode; 
  onSwipeReply: () => void;
  isMe: boolean;
}) {
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, [0, 60], [0, 1]);
  const replyScale = useTransform(x, [0, 60], [0.5, 1]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    if (info.offset.x > 60) {
      onSwipeReply();
    }
  };

  return (
    <div className="relative">
      <motion.div
        className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-left-8'}`}
        style={{ opacity: replyOpacity, scale: replyScale }}
      >
        <Reply className="w-5 h-5 text-blue-400" />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function FloatingBgEmoji({ emoji, index }: { emoji: string; index: number }) {
  const randomX = useMemo(() => 5 + (index * 7.5) % 90, [index]);
  const randomDelay = useMemo(() => index * 0.7, [index]);
  const randomDuration = useMemo(() => 15 + (index % 5) * 3, [index]);
  
  return (
    <motion.div
      className="absolute text-3xl opacity-[0.06] pointer-events-none select-none"
      style={{ left: `${randomX}%` }}
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
}

function MinimizedCall({ 
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-950 to-black p-3">
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
}

function CallOverlay({ 
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[150px]" />
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
              🚫
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
              {callState === 'ringing' ? '📱 Ringing...' : callType === 'video' ? '📹 Video calling...' : '📞 Voice calling...'}
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
}

function IncomingCallOverlay({ 
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-blue-900/40" />
      
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
}

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
  const { messages, sendMessage, loading, addReaction, removeReaction, editMessage, deleteMessage } = useChat(chatId);
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [heartAnimations, setHeartAnimations] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editInput, setEditInput] = useState('');
  const [nickname, setNickname] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  
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

  const currentBg = CHAT_BACKGROUNDS.find(b => b.id === chatBackground) || CHAT_BACKGROUNDS[0];

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setCurrentViewingChat(chatId);
    return () => setCurrentViewingChat(null);
  }, [chatId]);

  useEffect(() => {
    async function fetchChatInfo() {
      const { data } = await supabase
        .from('chats')
        .select(`
          *,
          participants:chat_participants(
            user:profiles(*),
            nickname
          )
        `)
        .eq('id', chatId)
        .single();
      
      setChatInfo(data);
      
      const myParticipant = data?.participants?.find((p: any) => p.user?.id === currentUserId);
      if (myParticipant?.nickname) {
        setNickname(myParticipant.nickname);
      }
    }
    fetchChatInfo();
  }, [chatId, currentUserId]);

  const otherUser = chatInfo?.participants?.find((p: any) => p.user?.id !== currentUserId)?.user;

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const content = input;
    setInput('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);
    await sendMessage(content, currentUserId, 'text', replyId);
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent, msg: any) => {
    if (msg.sender_id === currentUserId) {
      setShowMessageActions(showMessageActions === msg.id ? null : msg.id);
    } else {
      const newHeart = { id: Date.now(), x: 'clientX' in e ? e.clientX : 0, y: 'clientY' in e ? e.clientY : 0 };
      setHeartAnimations(prev => [...prev, newHeart]);
      setTimeout(() => {
        setHeartAnimations(prev => prev.filter(h => h.id !== newHeart.id));
      }, 1000);
      handleReaction(msg.id, '❤️');
    }
  };

  const handleEdit = (msg: any) => {
    setEditingMessage(msg);
    setEditInput(msg.content);
    setShowMessageActions(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInput.trim()) return;
    await editMessage(editingMessage.id, editInput);
    setEditingMessage(null);
    setEditInput('');
  };

  const handleUnsend = async (msgId: string) => {
    await deleteMessage(msgId);
    setShowMessageActions(null);
  };

  const handleDoubleClick = (e: React.MouseEvent, msgId: string) => {
    const newHeart = { id: Date.now(), x: e.clientX, y: e.clientY };
    setHeartAnimations(prev => [...prev, newHeart]);
    setTimeout(() => {
      setHeartAnimations(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);
    
    handleReaction(msgId, '❤️');
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId);
    const existingReaction = msg?.reactions?.find(
      (r: any) => r.user_id === currentUserId && r.emoji === emoji
    );
    
    if (existingReaction) {
      await removeReaction(messageId, emoji, currentUserId);
    } else {
      await addReaction(messageId, emoji, currentUserId);
    }
    setActiveReactionMsg(null);
  };

  if (loading || !chatInfo) return (
    <div className="flex-1 flex items-center justify-center bg-black">
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
      className="flex-1 flex flex-col h-full bg-black relative overflow-hidden"
    >
      <video ref={localVideoRef} className="hidden" autoPlay muted playsInline />
      <video ref={remoteVideoRef} className="hidden" autoPlay playsInline />
      
      <div className={`absolute inset-0 ${currentBg.class}`} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[150px]" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FLOATING_BG_EMOJIS.map((emoji, i) => (
          <FloatingBgEmoji key={i} emoji={emoji} index={i} />
        ))}
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
              className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-400" /> Chat Background
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
                    className={`h-20 rounded-2xl ${bg.class} border-2 transition-all flex items-end justify-start p-3 ${chatBackground === bg.id ? 'border-blue-500 shadow-lg shadow-blue-500/30' : 'border-zinc-700'}`}
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

        <header className="p-3 md:p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80 backdrop-blur-xl z-10 relative flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="rounded-full hover:bg-zinc-800 text-zinc-400 md:hidden"
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
              <h3 className="font-black text-base md:text-lg text-white">{nickname || otherUser?.display_name}</h3>
              <p className="text-xs text-zinc-500 font-bold">{otherUser?.vibe_status || '✨ Vibing'}</p>
            </div>
          </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowBgPicker(true)} className="rounded-full hover:bg-zinc-800 text-zinc-400 hidden md:flex"><Palette className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => startCall('voice')} className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-green-400"><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => startCall('video')} className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-blue-400"><Video className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setShowBgPicker(true)} className="rounded-full hover:bg-zinc-800 text-zinc-400 md:hidden"><Palette className="w-5 h-5" /></Button>
        </div>
      </header>

        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 scroll-smooth"
          style={{ minHeight: 0 }}
        >
          <div className="space-y-4 max-w-4xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUserId;
                const reactions = msg.reactions || [];
                const groupedReactions = reactions.reduce((acc: Record<string, number>, r: any) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {});
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 md:gap-3`}
                  >
                      {!isMe && <EmojiAvatar config={msg.sender?.avatar_config || defaultEmojiAvatarConfig} size={32} className="mb-1 md:w-9 md:h-9 flex-shrink-0" />}
                      <SwipeableMessage 
                        onSwipeReply={() => setReplyingTo(msg)}
                        isMe={isMe}
                      >
                        <div 
                          className={`max-w-[75%] md:max-w-[70%] group relative min-w-0 ${Object.keys(groupedReactions).length > 0 ? 'mb-4' : ''}`}
                          onDoubleClick={(e) => handleDoubleTap(e, msg)}
                        >
                          {msg.reply_to && (
                            <div className={`mb-1 px-3 py-1.5 rounded-xl bg-zinc-800/50 border-l-2 border-blue-500 text-xs ${isMe ? 'ml-auto max-w-fit' : ''}`}>
                              <p className="text-zinc-400 font-bold text-[10px]">↩ {msg.reply_to.sender?.display_name || 'Someone'}</p>
                              <p className="text-zinc-300 truncate max-w-[200px]">{msg.reply_to.content}</p>
                            </div>
                          )}
                          <motion.div 
                            className={`p-3 md:p-4 rounded-2xl md:rounded-3xl text-sm font-medium shadow-lg relative break-words ${isMe 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-lg' 
                              : 'bg-zinc-900 text-white border border-zinc-800 rounded-bl-lg'
                            }`}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => setActiveReactionMsg(activeReactionMsg === msg.id ? null : msg.id)}
                          >
                              <span className="whitespace-pre-wrap break-all">{msg.content}</span>
                              {msg.is_edited && (
                                <span className="text-[9px] text-white/50 ml-2">(edited)</span>
                              )}
                        </motion.div>
                          
                          {Object.keys(groupedReactions).length > 0 && (
                            <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex gap-0.5 z-10`}>
                              {Object.entries(groupedReactions).map(([emoji, count]) => (
                                <span 
                                  key={emoji} 
                                  className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded-full border border-zinc-700 flex items-center gap-0.5 shadow-lg"
                                >
                                  {emoji}
                                  {(count as number) > 1 && <span className="text-[9px] text-zinc-400">{count as number}</span>}
                                </span>
                              ))}
                            </div>
                          )}
                      
                        <AnimatePresence>
                          {activeReactionMsg === msg.id && !isMe && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: 10 }}
                              className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-10 flex gap-1 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 shadow-xl z-20`}
                            >
                              {QUICK_REACTIONS.map((emoji) => {
                                const hasReacted = reactions.some((r: any) => r.user_id === currentUserId && r.emoji === emoji);
                                return (
                                  <motion.button
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                    className={`text-base p-1 rounded-lg transition-colors ${hasReacted ? 'bg-blue-600' : 'hover:bg-zinc-800'}`}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    {emoji}
                                  </motion.button>
                                );
                              })}
                              <motion.button
                                onClick={(e) => { e.stopPropagation(); setShowReactionPicker(msg.id); setActiveReactionMsg(null); }}
                                className="text-base p-1 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Plus className="w-4 h-4" />
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {showMessageActions === msg.id && isMe && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: 10 }}
                              className="absolute right-0 -top-12 flex gap-1 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 shadow-xl z-20"
                            >
                              <motion.button
                                onClick={(e) => { e.stopPropagation(); handleEdit(msg); }}
                                className="flex items-center gap-1 text-xs p-2 rounded-lg hover:bg-zinc-800 text-zinc-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </motion.button>
                              <motion.button
                                onClick={(e) => { e.stopPropagation(); handleUnsend(msg.id); }}
                                className="flex items-center gap-1 text-xs p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Trash2 className="w-3 h-3" /> Unsend
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <AnimatePresence>
                          {showReactionPicker === msg.id && (
                            <div className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-[340px] z-30`}>
                              <EmojiPicker
                                position="bottom"
                                onSelect={(emoji) => { handleReaction(msg.id, emoji); setShowReactionPicker(null); }}
                                onClose={() => setShowReactionPicker(null)}
                              />
                            </div>
                          )}
                        </AnimatePresence>
                      
                          <p className={`text-[10px] mt-1 font-bold text-zinc-600 uppercase tracking-widest ${isMe ? 'text-right' : 'text-left'} flex items-center justify-end gap-1`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && msg.read_at && (
                              <span className="text-blue-500 lowercase text-[9px] font-black">Seen</span>
                            )}
                          </p>
                    </div>
                      </SwipeableMessage>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <AnimatePresence>
          {editingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-400" /> Edit Message
                </h3>
                <Input
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white mb-4"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setEditingMessage(null)}>Cancel</Button>
                  <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-500">Save</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3 md:p-6 relative z-10 flex-shrink-0 bg-gradient-to-t from-black/50 to-transparent pt-6">
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-4xl mx-auto mb-2 px-4 py-2 bg-zinc-900 rounded-xl border-l-2 border-blue-500 flex justify-between items-center"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-blue-400 font-bold uppercase">Replying to {replyingTo.sender?.display_name || 'Someone'}</p>
                  <p className="text-xs text-zinc-400 truncate">{replyingTo.content}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="rounded-full w-6 h-6 ml-2">
                  <X className="w-4 h-4 text-zinc-400" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
            <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3 bg-zinc-900 p-1.5 md:p-2 rounded-full border-2 border-zinc-800 shadow-2xl focus-within:border-blue-500/50 transition-colors relative">
            <div className="relative">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowEmojis(!showEmojis)} 
                className="rounded-full hover:bg-zinc-800 w-9 h-9 md:w-10 md:h-10"
              >
                <Smile className="w-5 h-5 md:w-6 md:h-6 text-zinc-400" />
              </Button>
              <AnimatePresence>
                {showEmojis && (
                  <div className="absolute bottom-12 left-0 z-50">
                    <EmojiPicker
                      position="top"
                      onSelect={(emoji) => {
                        setInput(prev => prev + emoji);
                      }}
                      onClose={() => setShowEmojis(false)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something vibey... 💬"
            className="flex-1 border-none bg-transparent focus-visible:ring-0 text-base md:text-lg font-medium text-white placeholder:text-zinc-600"
          />
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              type="submit" 
              size="icon" 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-lg shadow-blue-500/30"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </Button>
          </motion.div>
        </form>
        <p className="text-center text-zinc-700 text-xs mt-2 md:mt-3 font-medium hidden md:block">Double-click messages to react ❤️ • Tap to add reactions</p>
        </div>

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
