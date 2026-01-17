'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';

export function useChat(chatId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

    const fetchMessages = useCallback(async () => {
      if (!chatId) return;
      
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*),
          reactions:message_reactions(*),
          reply_to:reply_to_id(id, content, sender:profiles(display_name))
        `)
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      setLoading(false);

      // Mark unread messages as read
      const { data: { user } } = await supabase.auth.getUser();
      const unreadIds = data
        ?.filter(m => !m.read_at && m.sender_id !== user?.id)
        .map(m => m.id);

      if (unreadIds && unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    }, [chatId]);

    useEffect(() => {
      if (!chatId) return;

      fetchMessages();

      const messagesSubscription = supabase
        .channel(`chat:${chatId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        }, async (payload) => {
          if (payload.eventType === 'INSERT') {
              const { data: newMessage } = await supabase
                .from('messages')
                .select('*, sender:profiles(*), reactions:message_reactions(*), reply_to:reply_to_id(id, content, sender:profiles(display_name))')
                .eq('id', payload.new.id)
                .single();
            
            if (newMessage) {
              setMessages(prev => {
                const exists = prev.some(m => m.id === newMessage.id || (m.id.startsWith('temp-') && m.content === newMessage.content && m.sender_id === newMessage.sender_id));
                if (exists) {
                  return prev.map(m => {
                    if (m.id === newMessage.id) return m;
                    if (m.id.startsWith('temp-') && m.content === newMessage.content && m.sender_id === newMessage.sender_id) {
                      return newMessage;
                    }
                    return m;
                  });
                }
                return [...prev, newMessage];
              });

              // Mark as read if it's from someone else
              const { data: { user } } = await supabase.auth.getUser();
              if (newMessage.sender_id !== user?.id) {
                await supabase
                  .from('messages')
                  .update({ read_at: new Date().toISOString() })
                  .eq('id', newMessage.id);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
          }
        })
        .subscribe();

    const reactionsSubscription = supabase
      .channel(`reactions:${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  }, [chatId, fetchMessages]);

  const sendMessage = async (content: string, userId: string, messageType: string = 'text') => {
    if (!chatId) return;
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: userId,
      content,
      message_type: messageType,
      created_at: new Date().toISOString(),
      sender: null,
      reactions: [],
    };
    setMessages(prev => [...prev, tempMessage]);
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: userId,
        content,
        message_type: messageType,
      })
      .select('*, sender:profiles(*), reactions:message_reactions(*)')
      .single();
    
    if (data && !error) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', userId);
      
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          sendPushToUser(
            participant.user_id,
            `${senderProfile?.display_name || 'Someone'} 💬`,
            content.length > 100 ? content.substring(0, 100) + '...' : content,
            `/chat`,
            `message-${chatId}`
          );
        }
      }
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    return { error };
  };

  const addReaction = async (messageId: string, emoji: string, userId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const newReaction = { message_id: messageId, user_id: userId, emoji };
        return { ...msg, reactions: [...(msg.reactions || []), newReaction] };
      }
      return msg;
    }));

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });

    if (error) {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { 
            ...msg, 
            reactions: (msg.reactions || []).filter(
              (r: any) => !(r.user_id === userId && r.emoji === emoji)
            ) 
          };
        }
        return msg;
      }));
    }
  };

  const removeReaction = async (messageId: string, emoji: string, userId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { 
          ...msg, 
          reactions: (msg.reactions || []).filter(
            (r: any) => !(r.user_id === userId && r.emoji === emoji)
          ) 
        };
      }
      return msg;
    }));

    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
  };

  return { messages, loading, sendMessage, addReaction, removeReaction };
}
