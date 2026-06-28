'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { EmojiAvatar, defaultEmojiAvatarConfig } from './EmojiAvatar';
import { VibeSelector } from './VibeSelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, User, Bell, Check, X, MessageSquare, Users, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { sendPushToUser } from '@/lib/notifications';

type TabType = 'chats' | 'friends' | 'notifications';

export function ChatSidebar({ 
  onSelectChat, 
  selectedChatId, 
  currentUserId,
  onShowProfile 
}: { 
  onSelectChat: (id: string) => void, 
  selectedChatId: string | null, 
  currentUserId: string,
  onShowProfile: () => void 
}) {
  const [chats, setChats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: any } | null>(null);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();
      setProfile(data);
    }
    fetchProfile();
  }, [currentUserId]);

  useEffect(() => {
    fetchFriends();
    fetchNotifications();

    const friendsSub = supabase
      .channel('friendships_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchFriends();
      })
      .subscribe();

    const notifSub = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      friendsSub.unsubscribe();
      notifSub.unsubscribe();
    };
  }, [currentUserId]);

  async function fetchFriends() {
    const { data: sentAccepted } = await supabase
      .from('friendships')
      .select('friend_id, profiles!friendships_friend_id_fkey(*)')
      .eq('user_id', currentUserId)
      .eq('status', 'accepted');

    const { data: receivedAccepted } = await supabase
      .from('friendships')
      .select('user_id, profiles!friendships_user_id_fkey(*)')
      .eq('friend_id', currentUserId)
      .eq('status', 'accepted');

    const friendsList: any[] = [];
    sentAccepted?.forEach(f => f.profiles && friendsList.push(f.profiles));
    receivedAccepted?.forEach(f => f.profiles && friendsList.push(f.profiles));
    setFriends(friendsList);

    const { data: pending } = await supabase
      .from('friendships')
      .select('*, profiles!friendships_user_id_fkey(*)')
      .eq('friend_id', currentUserId)
      .eq('status', 'pending');

    setPendingRequests(pending || []);
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.read).length || 0);
  }

  const fetchChats = useCallback(async () => {
    const { data: participantData } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', currentUserId);

    if (participantData && participantData.length > 0) {
      const chatIds = participantData.map(d => d.chat_id);

      const { data: chatsData } = await supabase
        .from('chats')
        .select(`
          *,
          participants:chat_participants(
            user:profiles(*)
          )
        `)
        .in('id', chatIds)
        .order('updated_at', { ascending: false, nullsLast: true });

      // Fetch last_read_at for current user from chat_participants
      const { data: lastReadData } = await supabase
        .from('chat_participants')
        .select('chat_id, last_read_at')
        .in('chat_id', chatIds)
        .eq('user_id', currentUserId);

      const lastReadMap: Record<string, string> = {};
      lastReadData?.forEach(p => {
        if (p.last_read_at) lastReadMap[p.chat_id] = p.last_read_at;
      });

      // Count messages created after last_read_at (messages not yet seen by current user)
      const { data: messagesData } = await supabase
        .from('messages')
        .select('chat_id, created_at')
        .in('chat_id', chatIds)
        .neq('sender_id', currentUserId);

      const unreadMap: Record<string, number> = {};
      messagesData?.forEach(m => {
        const lastReadAt = lastReadMap[m.chat_id];
        if (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt)) {
          unreadMap[m.chat_id] = (unreadMap[m.chat_id] || 0) + 1;
        }
      });

      // Fetch last message for each chat
      const { data: lastMessagesData } = await supabase
        .from('messages')
        .select('chat_id, content, message_type, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      // Get latest message per chat
      const lastMessageMap: Record<string, { content: string; message_type: string; created_at: string }> = {};
      lastMessagesData?.forEach(m => {
        if (!lastMessageMap[m.chat_id]) {
          lastMessageMap[m.chat_id] = {
            content: m.content,
            message_type: m.message_type,
            created_at: m.created_at
          };
        }
      });

      const seenUsers = new Set<string>();
      const uniqueChats = chatsData?.filter(chat => {
        const otherUser = chat.participants?.find((p: any) => p.user?.id !== currentUserId)?.user;
        if (!otherUser || seenUsers.has(otherUser.id)) return false;
        seenUsers.add(otherUser.id);
        return true;
      }).map(chat => {
        const lastMsg = lastMessageMap[chat.id];
        return {
          ...chat,
          unreadCount: chat.id === selectedChatId ? 0 : (unreadMap[chat.id] || 0),
          lastMessage: lastMsg ? {
            content: lastMsg.message_type === 'image' ? '📷 Photo' : (!lastMsg.content || lastMsg.content === 'This message was deleted' ? 'This message was deleted' : lastMsg.content.length > 60 ? lastMsg.content.substring(0, 60) + '...' : lastMsg.content),
            timestamp: lastMsg.created_at,
            message_type: lastMsg.message_type,
          } : null
        };
      });

      // Sort: unread chats first, then by last_message_timestamp desc
      uniqueChats?.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        const aTime = a.lastMessage?.timestamp || a.updated_at || 0;
        const bTime = b.lastMessage?.timestamp || b.updated_at || 0;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChats(uniqueChats || []);
    } else {
      setChats([]);
    }
  }, [currentUserId, selectedChatId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const showContextMenu = (e: React.MouseEvent | React.TouchEvent, chat: any) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setContextMenu({ x: clientX, y: clientY, chat });
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleLongPress = (e: React.PointerEvent, chat: any) => {
    longPressTimer.current = setTimeout(() => {
      const clientX = e.clientX;
      const clientY = e.clientY;
      setContextMenu({ x: clientX, y: clientY, chat });
    }, 500);
  };

  const clearContextMenu = () => {
    setContextMenu(null);
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleClearChat = async (chatId: string, otherUserName: string) => {
    if (!confirm(`Clear all messages with ${otherUserName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (res.ok) {
        // Emit WebSocket event to other participant
        window.dispatchEvent(new CustomEvent('chat-cleared', { detail: { roomId: chatId } }));
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: null } : c));
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to clear chat:', data.error || res.statusText);
        alert('Failed to clear chat. Please try again.');
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
      alert('Failed to clear chat. Please try again.');
    }
    clearContextMenu();
  };

  const handleDeleteChat = async (chatId: string, otherUserName: string) => {
    if (!confirm(`Delete chat with ${otherUserName}? This will remove the conversation entirely.`)) return;
    try {
      const res = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('chat-deleted', { detail: { roomId: chatId } }));
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (selectedChatId === chatId) {
          onSelectChat(null);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to delete chat:', data.error || res.statusText);
        alert('Failed to delete chat. Please try again.');
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Failed to delete chat. Please try again.');
    }
    clearContextMenu();
  };

  useEffect(() => {
    fetchChats();

    const sub = supabase
      .channel('chats_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => fetchChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => fetchChats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Real-time: increment unread count for new messages when chat is NOT open
        if (selectedChatId !== payload.new.chat_id) {
          setChats(prev => prev.map(c => {
            if (c.id === payload.new.chat_id && payload.new.sender_id !== currentUserId) {
              return { ...c, unreadCount: (c.unreadCount || 0) + 1 };
            }
            return c;
          }));
        }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('Chats list subscription status:', status);
        }
      });

    const handleRefresh = () => fetchChats();
    window.addEventListener('refresh-chats', handleRefresh);

    return () => { sub.unsubscribe(); window.removeEventListener('refresh-chats', handleRefresh); };
  }, [currentUserId, friends, fetchChats, selectedChatId]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        clearContextMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  // Listen for chat_cleared and chat_deleted events from other tabs/participants
  useEffect(() => {
    const handleChatCleared = (e: CustomEvent) => {
      const { roomId } = e.detail;
      setChats(prev => prev.map(c => c.id === roomId ? { ...c, lastMessage: null } : c));
    };
    const handleChatDeleted = (e: CustomEvent) => {
      const { roomId } = e.detail;
      setChats(prev => prev.filter(c => c.id !== roomId));
      if (selectedChatId === roomId) {
        onSelectChat(null);
      }
    };
    window.addEventListener('chat-cleared', handleChatCleared as EventListener);
    window.addEventListener('chat-deleted', handleChatDeleted as EventListener);
    return () => {
      window.removeEventListener('chat-cleared', handleChatCleared as EventListener);
      window.removeEventListener('chat-deleted', handleChatDeleted as EventListener);
    };
  }, [selectedChatId, onSelectChat]);

  // Real-time unread count updates via WebSocket broadcasts
  useEffect(() => {
    const channel = supabase.channel(`sidebar_receipts:${currentUserId}`, { config: { broadcast: { self: false } } });
    
    channel
      .on('broadcast', { event: 'delivery_receipt' }, () => {
        // Refresh chats to update unread counts
        fetchChats();
      })
      .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
        const { roomId, seenMessageIds } = payload as { roomId: string; seenMessageIds: string[] };
        setChats(prev => prev.map(c => {
          if (c.id === roomId) {
            return { ...c, unreadCount: Math.max(0, (c.unreadCount || 0) - seenMessageIds.length) };
          }
          return c;
        }));
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [currentUserId, fetchChats]);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length < 2) {
      setSearchResults([]);
      setFriendshipStatuses({});
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${val}%,display_name.ilike.%${val}%`)
      .neq('id', currentUserId)
      .limit(5);

    setSearchResults(data || []);

    if (data && data.length > 0) {
      const statuses: Record<string, string> = {};
      for (const user of data) {
        const { data: sent } = await supabase
          .from('friendships')
          .select('status')
          .eq('user_id', currentUserId)
          .eq('friend_id', user.id)
          .single();

        const { data: received } = await supabase
          .from('friendships')
          .select('status')
          .eq('user_id', user.id)
          .eq('friend_id', currentUserId)
          .single();

        if (sent) {
          statuses[user.id] = sent.status === 'accepted' ? 'friends' : 'pending_sent';
        } else if (received) {
          statuses[user.id] = received.status === 'accepted' ? 'friends' : 'pending_received';
        } else {
          statuses[user.id] = 'none';
        }
      }
      setFriendshipStatuses(statuses);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    const { error } = await supabase.from('friendships').insert({
      user_id: currentUserId,
      friend_id: friendId,
      status: 'pending'
    });

    if (!error) {
      const { data: myProfile } = await supabase.from('profiles').select('display_name').eq('id', currentUserId).single();
      
      await supabase.from('notifications').insert({
        user_id: friendId,
        type: 'friend_request',
        title: 'New Friend Request! 🎉',
        body: `${myProfile?.display_name || 'Someone'} wants to be your friend`,
        data: { from_user_id: currentUserId }
      });

      sendPushToUser(
        friendId,
        'Friend Request 👋',
        `${myProfile?.display_name || 'Someone'} wants to be your friend!`,
        '/chat',
        `friend-request-${currentUserId}`
      );

      setFriendshipStatuses(prev => ({ ...prev, [friendId]: 'pending_sent' }));
    }
  };

  const acceptFriendRequest = async (friendshipId: string, fromUserId: string) => {
    await supabase.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', friendshipId);
    
    const { data: myProfile } = await supabase.from('profiles').select('display_name').eq('id', currentUserId).single();
    
    await supabase.from('notifications').insert({
      user_id: fromUserId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted! 🎊',
      body: `${myProfile?.display_name || 'Someone'} accepted your friend request`,
      data: { user_id: currentUserId }
    });

    sendPushToUser(
      fromUserId,
      'Friend Request Accepted! 🎊',
      `${myProfile?.display_name || 'Someone'} accepted your friend request`,
      '/chat',
      `friend-accepted-${currentUserId}`
    );

    fetchFriends();
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchFriends();
  };

  const startChatWithFriend = async (friendId: string) => {
    const { data: myChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', currentUserId);

    const { data: friendChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', friendId);

    if (myChats && friendChats) {
      const myChatsIds = myChats.map(c => c.chat_id);
      const friendChatsIds = friendChats.map(c => c.chat_id);
      const commonChatId = myChatsIds.find(id => friendChatsIds.includes(id));
      
      if (commonChatId) {
        const { data: chatData } = await supabase
          .from('chats')
          .select('is_group')
          .eq('id', commonChatId)
          .maybeSingle();
        
        if (chatData && !chatData.is_group) {
          onSelectChat(commonChatId);
          setActiveTab('chats');
          return;
        }
      }
    }

    const chatId = crypto.randomUUID();
    const { error: chatError } = await supabase
      .from('chats')
      .insert({ id: chatId, is_group: false });

    if (chatError) return;

    await supabase.from('chat_participants').insert([
      { chat_id: chatId, user_id: currentUserId },
      { chat_id: chatId, user_id: friendId }
    ]);

    onSelectChat(chatId);
    setActiveTab('chats');
    setTimeout(() => fetchChats(), 100);
  };

  const markNotificationRead = async (notifId: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
    fetchNotifications();
  };

  const markAllNotificationsRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', currentUserId);
    fetchNotifications();
  };

  return (
    <div className="w-full md:w-80 h-full flex flex-col bg-zinc-950 border-r border-zinc-800 relative z-20">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">GUPSHUP</h2>
          <span className="text-2xl">💬</span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-11 h-12 rounded-2xl bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeTab === 'chats' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            <MessageSquare className="w-4 h-4" /> Chats
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'friends' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> Friends
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">{pendingRequests.length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('notifications'); markAllNotificationsRead(); }}
            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'notifications' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">{unreadCount}</span>
            )}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {searchResults.length > 0 ? (
            <motion.div 
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 space-y-2"
            >
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Search Results 🔍</p>
              {searchResults.map(user => {
                const status = friendshipStatuses[user.id] || 'none';
                return (
                  <motion.div
                    key={user.id}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <EmojiAvatar config={user.avatar_config || defaultEmojiAvatarConfig} size={44} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-white truncate">{user.display_name}</p>
                      <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
                    </div>
                    {status === 'friends' ? (
                      <Button
                        size="sm"
                        onClick={() => startChatWithFriend(user.id)}
                        className="h-8 px-3 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold"
                      >
                        Message 💬
                      </Button>
                    ) : status === 'pending_sent' ? (
                      <span className="text-xs text-yellow-400 font-bold">Pending ⏳</span>
                    ) : status === 'pending_received' ? (
                      <span className="text-xs text-blue-400 font-bold">Accept in Friends</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequest(user.id)}
                        className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold"
                      >
                        <UserPlus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : activeTab === 'chats' ? (
            <motion.div 
              key="chats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 space-y-2"
            >
              {chats.length === 0 ? (
                <div className="text-center py-10">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl mb-4">👻</motion.div>
                  <p className="text-zinc-500 font-medium">No chats yet</p>
                  <p className="text-zinc-600 text-sm">Add friends to start chatting!</p>
                </div>
              ) : (
                chats.map(chat => {
                  const otherParticipant = chat.participants?.find((p: any) => p.user?.id !== currentUserId)?.user;
                  if (!otherParticipant) return null;

return (
                    <motion.button
                      key={chat.id}
                      onClick={() => { onSelectChat(chat.id); setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c)); }}
                      onContextMenu={(e) => { e.preventDefault(); showContextMenu(e, chat); }}
                      onMouseDown={(e) => { if (e.button === 0) { longPressTimer.current = setTimeout(() => showContextMenu(e, chat), 500); } }}
                      onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      onTouchStart={(e) => { longPressTimer.current = setTimeout(() => showContextMenu(e, chat), 500); }}
                      onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedChatId === chat.id ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'hover:bg-zinc-900 border border-transparent'}`}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                        <EmojiAvatar config={otherParticipant.avatar_config || defaultEmojiAvatarConfig} size={50} />
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-black text-white truncate">{otherParticipant.display_name}</p>
                            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                              <p className={`text-sm truncate max-w-full ${chat.lastMessage?.content === 'This message was deleted' ? 'text-zinc-600 italic' : 'text-zinc-500'}`}>{chat.lastMessage?.content || otherParticipant.vibe_status || '✨ Vibing'}</p>
                            {chat.lastMessage?.timestamp && (
                              <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-shrink-0">
                                {formatTime(chat.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedChatId !== chat.id && chat.unreadCount > 0 && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="min-w-6 h-6 px-1.5 bg-blue-600 rounded-full flex items-center justify-center"
                            >
                              <span className="text-xs font-black text-white">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
                            </motion.div>
                          )}
                    </motion.button>
                );
                })
              )}
            </motion.div>
          ) : activeTab === 'friends' ? (
            <motion.div 
              key="friends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 space-y-4"
            >
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest px-2">Pending Requests 📩</p>
                  {pendingRequests.map(req => (
                    <motion.div
                      key={req.id}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <EmojiAvatar config={req.profiles?.avatar_config || defaultEmojiAvatarConfig} size={44} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-white truncate">{req.profiles?.display_name}</p>
                        <p className="text-xs text-zinc-500 truncate">@{req.profiles?.username}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" onClick={() => acceptFriendRequest(req.id, req.user_id)} className="h-8 w-8 rounded-full bg-green-600 hover:bg-green-500">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" onClick={() => rejectFriendRequest(req.id)} className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-500">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Your Friends 👥</p>
                {friends.length === 0 ? (
                  <div className="text-center py-6">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl mb-3">🔍</motion.div>
                    <p className="text-zinc-500 font-medium text-sm">No friends yet</p>
                    <p className="text-zinc-600 text-xs">Search for users above!</p>
                  </div>
                ) : (
                  friends.map(friend => (
                    <motion.button
                      key={friend.id}
                      onClick={() => startChatWithFriend(friend.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 transition-all border border-zinc-800"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <EmojiAvatar config={friend.avatar_config || defaultEmojiAvatarConfig} size={44} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-white truncate">{friend.display_name}</p>
                        <p className="text-xs text-zinc-500 truncate">{friend.vibe_status || '✨ Vibing'}</p>
                      </div>
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 space-y-2"
            >
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Notifications 🔔</p>
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl mb-4">🔕</motion.div>
                  <p className="text-zinc-500 font-medium">No notifications</p>
                  <p className="text-zinc-600 text-sm">You're all caught up!</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <motion.div
                    key={notif.id}
                    className={`w-full p-4 rounded-2xl border transition-all ${notif.read ? 'bg-zinc-900/30 border-zinc-800' : 'bg-blue-500/10 border-blue-500/30'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {notif.type === 'friend_request' ? '👋' : notif.type === 'friend_accepted' ? '🎉' : '💬'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm">{notif.title}</p>
                        <p className="text-xs text-zinc-400">{notif.body}</p>
                        <p className="text-xs text-zinc-600 mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.95 }}
            onClick={onShowProfile}
            className="cursor-pointer"
          >
            {profile && <EmojiAvatar config={profile.avatar_config || defaultEmojiAvatarConfig} size={48} />}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.display_name}</p>
            <VibeSelector
              currentVibe={profile?.vibe_status || '✨ Chilling'}
              onUpdate={(vibe) => setProfile({ ...profile, vibe_status: vibe })}
              userId={currentUserId}
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onShowProfile} 
            className="rounded-full hover:bg-zinc-800"
          >
            <User className="w-5 h-5 text-zinc-400" />
          </Button>
        </div>
      </div>
      {contextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed z-[100] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: `translate(${(contextMenu.x + 170 > window.innerWidth ? -170 : 0)}px, ${(contextMenu.y + 100 > window.innerHeight ? -100 : 0)}px)`
          }}
        >
          <button
            onClick={() => handleClearChat(contextMenu.chat.id, contextMenu.chat.participants?.find((p: any) => p.user?.id !== currentUserId)?.user?.display_name || 'them')}
            className="w-full px-4 py-2 text-left text-white hover:bg-zinc-800 text-sm flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-zinc-400" /> Clear Chat
          </button>
          <hr className="border-zinc-800 my-1" />
          <button
            onClick={() => handleDeleteChat(contextMenu.chat.id, contextMenu.chat.participants?.find((p: any) => p.user?.id !== currentUserId)?.user?.display_name || 'them')}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 text-sm flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Chat
          </button>
        </motion.div>
      )}
    </div>
  );
}