'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';

export function useChat(chatId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const reactChannelRef = useRef<any>(null);
  const receiptsChannelRef = useRef<any>(null);

  const mergeReactions = useCallback((msgs: any[], reactions: any[]) => {
    const reactionMap: Record<string, any[]> = {};
    for (const r of reactions) {
      if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
      reactionMap[r.message_id].push(r);
    }
    return msgs.map(m => ({ ...m, reactions: reactionMap[m.id] || [] }));
  }, []);

  const markMessagesAsRead = useCallback(async (currentUserId: string, messageIds: string[]) => {
    if (!chatId) return;

    // Update last_read_at and messages' read_by in DB via server-side API to bypass RLS restrictions
    try {
      const res = await fetch('/api/message/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', messageIds, userId: currentUserId, chatId })
      });
      if (!res.ok) {
        const resData = await res.json();
        console.error('markMessagesAsRead error:', resData.error);
      }
    } catch (err: any) {
      console.error('markMessagesAsRead error:', err.message);
    }

    // Update local state for optimistic UI
    if (messageIds.length > 0) {
      setMessages(prev => prev.map(msg =>
        messageIds.includes(msg.id)
          ? { 
              ...msg, 
              read_by: [...new Set([...(msg.read_by || []), currentUserId])],
              delivered_to: [...new Set([...(msg.delivered_to || []), currentUserId])] 
            }
          : msg
      ));
    }

    // Only broadcast if there were actually new unread messages being marked.
    // Broadcasting with an empty messageIds would cause the sender to update chatInfo.last_read_at
    // to "now", making "seen x ago" show "seen just now" after simply reopening a chat.
    if (messageIds.length > 0) {
      receiptsChannelRef.current?.send({
        type: 'broadcast',
        event: 'read',
        payload: { messageIds, userId: currentUserId, readAt: new Date().toISOString() }
      });
      window.dispatchEvent(new CustomEvent('refresh-chats'));
    }
  }, [chatId]);



  const fetchMessages = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      if (!chatId) return;

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, display_name, avatar_config)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('fetchMessages error details:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
        setMessages([]);
        setLoading(false);
        return;
      }

      const raw = (messagesData || []).filter((m: any) => m.is_deleted !== true);
      const msgIds = raw.map((m: any) => m.id);

      let reactionsData: any[] = [];
      if (msgIds.length > 0) {
        const { data: rd } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', msgIds);
        reactionsData = rd || [];
      }

      const merged = mergeReactions(raw, reactionsData);
      console.log('fetchMessages: reactions after merge:', merged.map((m: any) => ({ id: m.id, reactions: m.reactions })));

      const replyIds = raw.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
      if (replyIds.length > 0) {
        const { data: replyMessages } = await supabase
          .from('messages')
          .select('id, content, sender_id, message_type')
          .in('id', replyIds);
        if (replyMessages) {
          const senderIds = replyMessages.map(r => r.sender_id);
          const { data: replySenders } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', senderIds);
          console.log('replySenders query result:', replySenders, 'for senderIds:', senderIds);
          const senderMap: Record<string, string> = {};
          if (replySenders) {
            for (const s of replySenders) {
              senderMap[s.id] = s.display_name;
            }
          }
          const replyMap: Record<string, any> = {};
          for (const rm of replyMessages) {
            replyMap[rm.id] = {
              messageId: rm.id,
              senderId: rm.sender_id,
              senderName: senderMap[rm.sender_id] || 'Unknown',
              preview: rm.message_type === 'image' ? '📷 Photo' : rm.content.substring(0, 80)
            };
          }
          for (const m of merged) {
            if (m.reply_to_id && replyMap[m.reply_to_id]) {
              m.replyTo = replyMap[m.reply_to_id];
            }
          }
        }
      }

      try {
        const { data: deletedIds } = await supabase
          .from('deleted_messages')
          .select('message_id')
          .eq('user_id', currentUser?.id);

        const deletedSet = new Set(deletedIds?.map((d: any) => d.message_id) || []);
        setMessages(merged.filter((m: any) => !deletedSet.has(m.id)));
      } catch {
        setMessages(merged);
      }

      // Mark messages as read when chat is opened
      const unreadIds = raw
        .filter((m: any) => {
          const readBy = m.read_by || [];
          return !readBy.includes(currentUser?.id) && m.sender_id !== currentUser?.id;
        })
        .map((m: any) => m.id);

      if (currentUser?.id) {
        await markMessagesAsRead(currentUser.id, unreadIds);
      }
    } catch (err) {
      console.error('fetchMessages unexpected error:', err);
      setMessages([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [chatId, mergeReactions, markMessagesAsRead]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const msgChannel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT' && !payload.new.is_deleted) {
          const { data: newMessage } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(id, display_name, avatar_config)')
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            // Resolve replyTo for real-time incoming messages
            if (newMessage.reply_to_id) {
              const { data: originalMsg } = await supabase
                .from('messages')
                .select('id, content, sender_id, message_type')
                .eq('id', newMessage.reply_to_id)
                .single();

              if (originalMsg) {
                const { data: senderProfile } = await supabase
                  .from('profiles')
                  .select('id, display_name')
                  .eq('id', originalMsg.sender_id)
                  .single();

                newMessage.replyTo = {
                  messageId: originalMsg.id,
                  senderId: originalMsg.sender_id,
                  senderName: senderProfile?.display_name || 'Unknown',
                  preview: originalMsg.message_type === 'image' ? '📷 Photo' : originalMsg.content?.substring(0, 80)
                };
              }
            }

            setMessages(prev => {
              const tempIdx = prev.findIndex(m => m.id.startsWith('temp-') && m.content === newMessage.content && m.sender_id === newMessage.sender_id);
              if (tempIdx >= 0) {
                const copy = [...prev];
                copy[tempIdx] = newMessage;
                return copy;
              }
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            // If this is a message from someone else (receiver side)
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (newMessage.sender_id !== currentUser?.id) {
              const deliveredTo = [...new Set([...(newMessage.delivered_to || []), currentUser?.id].filter(Boolean))];
              
              // Call API route to update delivered_to bypassing RLS
              fetch('/api/message/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deliver', messageIds: [newMessage.id], userId: currentUser?.id })
              }).catch(() => {});

              // Update local message delivered_to for optimistic UI
              setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, delivered_to: deliveredTo } : m));

              // Broadcast delivery receipt to sender so they see "Delivered" in real-time
              receiptsChannelRef.current?.send({
                type: 'broadcast',
                event: 'delivered',
                payload: { messageId: newMessage.id, userId: currentUser?.id }
              });

              // If receiver is currently viewing this chat, mark it as read immediately
              if (chatId && currentUser?.id) {
                await markMessagesAsRead(currentUser.id, [newMessage.id]);
              }
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_deleted) {
            setMessages(prev => prev.filter(m => m.id !== payload.new.id));
          } else {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    const reactChannel = supabase
      .channel(`reactions:${chatId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const { messageId, userId, emoji, action, previousEmoji } = payload as { messageId: string; userId: string; emoji: string; action: 'add' | 'remove' | 'replace'; previousEmoji: string | null };
        setMessages(prev => prev.map(msg => {
          if (msg.id !== messageId) return msg;
          const reactions = msg.reactions ?? [];
          if (action === 'remove') {
            return { ...msg, reactions: reactions.filter((r: any) => !(r.user_id === userId && r.emoji === emoji)) };
          } else if (action === 'replace') {
            // Remove previous emoji from this user, add new one
            const filtered = reactions.filter((r: any) => r.user_id !== userId);
            return { ...msg, reactions: [...filtered, { message_id: messageId, user_id: userId, emoji }] };
          } else {
            // add — guard against duplicates
            const alreadyExists = reactions.some((r: any) => r.user_id === userId && r.emoji === emoji);
            if (alreadyExists) return msg;
            return { ...msg, reactions: [...reactions, { message_id: messageId, user_id: userId, emoji }] };
          }
        }));
      })
      .subscribe();
    reactChannelRef.current = reactChannel;

    // Broadcast channel for delivery/read receipts — ensures the sender sees status updates in real-time
    const receiptsChannel = supabase
      .channel(`receipts:${chatId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'delivered' }, ({ payload }) => {
        const { messageId, userId } = payload as { messageId: string; userId: string };
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            const newDelivered = [...new Set([...(m.delivered_to || []), userId])];
            return { ...m, delivered_to: newDelivered };
          }
          return m;
        }));
      })
      .on('broadcast', { event: 'read' }, ({ payload }) => {
        // The receiver broadcast their readAt timestamp — fire a window event so ChatWindow
        // can update chatInfo.last_read_at without a DB round-trip
        const { messageIds, userId, readAt } = payload as { messageIds: string[]; userId: string; readAt: string };
        if (readAt) {
          window.dispatchEvent(new CustomEvent('chat-participant-read', {
            detail: { chatId, userId, readAt }
          }));
        }
        if (messageIds && messageIds.length > 0) {
          setMessages(prev => prev.map(m => {
            if (messageIds.includes(m.id)) {
              const newReadBy = [...new Set([...(m.read_by || []), userId])];
              const newDelivered = [...new Set([...(m.delivered_to || []), userId])];
              return { ...m, read_by: newReadBy, delivered_to: newDelivered };
            }
            return m;
          }));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Now that the channel is live, fetch messages and send any pending delivery receipts
          fetchMessages();
        }
      });
    receiptsChannelRef.current = receiptsChannel;

    return () => {
      msgChannel.unsubscribe();
      reactChannel.unsubscribe();
      receiptsChannel.unsubscribe();
    };
  }, [chatId, fetchMessages]);

  const sendMessage = async (content: string, userId: string, messageType: string = 'text', replyToId?: string, replyTo?: { messageId: string; senderId: string; senderName: string; preview: string } | null) => {
    if (!chatId) return { error: new Error('No chat selected') };

    console.log('Sending message with replyTo:', replyTo);

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: userId,
      content,
      message_type: messageType,
      reply_to_id: replyToId || null,
      replyTo: replyTo,
      created_at: new Date().toISOString(),
      sender: null,
      reactions: [],
    };
    setMessages(prev => [...prev, tempMessage]);

    // Build insert object with only fields that exist in the database
    const insertData: any = {
      chat_id: chatId,
      sender_id: userId,
      content,
      message_type: messageType,
      reply_to_id: replyToId || null,
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(insertData)
      .select('*')
      .single();

    if (data) {
      // Attach replyTo to the saved message
      const savedMessage = { ...data, replyTo };
      setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));

      supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', userId)
        .then(({ data: participants }) => {
          if (participants && participants.length > 0) {
            supabase
              .from('profiles')
              .select('display_name')
              .eq('id', userId)
              .single()
              .then(({ data: senderProfile }) => {
                for (const p of participants) {
                  sendPushToUser(
                    p.user_id,
                    `${senderProfile?.display_name || 'Someone'} 💬`,
                    content.length > 100 ? content.substring(0, 100) + '...' : content,
                    `/chat`,
                    `message-${chatId}`
                  );
                }
              });
          }
        });
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      if (error) console.error('sendMessage error:', error);
    }
    return { error };
  };

  const addReaction = async (messageId: string, emoji: string, userId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const existingReaction = msg.reactions?.find((r: any) => r.user_id === userId);
    const prevMessages = [...messages];

    // WhatsApp-style: single reaction per user
    // If user already has a different reaction, remove it (replace)
    // If user taps same emoji, remove it (toggle off)
    let action = 'add';
    let previousEmoji = null;
    let newReactions = msg.reactions || [];

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // Toggle off
        action = 'remove';
        newReactions = newReactions.filter((r: any) => !(r.user_id === userId && r.emoji === emoji));
      } else {
        // Replace
        action = 'replace';
        previousEmoji = existingReaction.emoji;
        newReactions = newReactions.filter((r: any) => r.user_id !== userId);
        newReactions = [...newReactions, { message_id: messageId, user_id: userId, emoji }];
      }
    } else {
      // New reaction
      newReactions = [...newReactions, { message_id: messageId, user_id: userId, emoji }];
    }

    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));

    // Emit reaction event on persistent channel
    reactChannelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { messageId, userId, emoji, action, previousEmoji }
    });

    // Also update DB
    if (action === 'remove') {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    } else if (action === 'replace') {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);
      await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: userId, emoji });
    } else {
      await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: userId, emoji });
    }
  };

  const removeReaction = async (messageId: string, emoji: string, userId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const prevMessages = [...messages];
    const newReactions = (msg.reactions || []).filter((r: any) => !(r.user_id === userId && r.emoji === emoji));

    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));

    reactChannelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { messageId, userId, emoji, action: 'remove', previousEmoji: null }
    });

    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
  };

  const editMessage = async (messageId: string, newContent: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return { error: new Error('Message not found') };

    const elapsed = Date.now() - new Date(msg.created_at).getTime();
    const fifteenMin = 15 * 60 * 1000;
    if (elapsed > fifteenMin) {
      return { error: new Error('Can only edit messages within 15 minutes') };
    }

    const prevMessages = [...messages];
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, is_edited: true } : m));

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, is_edited: true })
      .eq('id', messageId);

    if (error) {
      setMessages(prevMessages);
      console.error('editMessage error:', error);
    }
    return { error };
  };

  const deleteMessage = async (messageId: string) => {
    const prevMessages = [...messages];
    setMessages(prev => prev.filter(m => m.id !== messageId));

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: 'This message was deleted' })
      .eq('id', messageId);

    if (error) {
      setMessages(prevMessages);
    }
    return { error };
  };

  const deleteForMe = async (messageId: string, userId: string) => {
    const prevMessages = [...messages];
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      const { error } = await supabase
        .from('deleted_messages')
        .insert({ message_id: messageId, user_id: userId });

      if (error) {
        setMessages(prevMessages);
      }
    } catch {
      setMessages(prevMessages);
    }
    return { error: null };
  };

  return { messages, loading, sendMessage, addReaction, removeReaction, editMessage, deleteMessage, deleteForMe };
}