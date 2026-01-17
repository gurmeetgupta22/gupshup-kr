'use client';

import { supabase } from './supabase';

let swRegistration: ServiceWorkerRegistration | null = null;
let pushSubscription: PushSubscription | null = null;
let notificationListenersSetup = false;
let currentViewingChatId: string | null = null;
let currentUserId: string | null = null;

export function setCurrentViewingChat(chatId: string | null) {
  currentViewingChatId = chatId;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(userId: string) {
  if (!swRegistration || !userId) return null;
  
  try {
    const existingSubscription = await swRegistration.pushManager.getSubscription();
    if (existingSubscription) {
      pushSubscription = existingSubscription;
      await savePushSubscription(existingSubscription, userId);
      return existingSubscription;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key not found');
      return null;
    }

    const newSubscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    pushSubscription = newSubscription;
    await savePushSubscription(newSubscription, userId);
    console.log('Push notification subscription created');
    return newSubscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

async function savePushSubscription(subscription: PushSubscription, userId: string) {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId
      })
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url?: string, tag?: string) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, url, tag })
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

export async function requestNotificationPermission(userId?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    await initializeServiceWorker();
    if (userId) {
      currentUserId = userId;
      await subscribeToPush(userId);
    }
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await initializeServiceWorker();
    if (userId) {
      currentUserId = userId;
      await subscribeToPush(userId);
    }
  }
  return permission === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function showNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  
  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    if ('serviceWorker' in navigator && swRegistration) {
      await swRegistration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        ...options,
      });
    } else {
      new Notification(title, {
        icon: '/icon-192.png',
        ...options,
      });
    }
  } catch (error) {
    console.error('Failed to show notification:', error);
    try {
      new Notification(title, {
        icon: '/icon-192.png',
        ...options,
      });
    } catch (e) {
      console.error('Fallback notification also failed:', e);
    }
  }
}

export async function initializeServiceWorker() {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

export function setupNotificationListeners(userId: string, onNewMessage?: (msg: any) => void, onFriendRequest?: (req: any) => void) {
  if (typeof window === 'undefined') return () => {};
  if (notificationListenersSetup) return () => {};
  
  notificationListenersSetup = true;
  currentUserId = userId;
  console.log('Setting up notification listeners for user:', userId);

  if (Notification.permission === 'granted') {
    subscribeToPush(userId);
  }

  const messageChannel = supabase
    .channel(`user_messages_notif:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
    }, async (payload) => {
      const newMessage = payload.new as any;
      console.log('New message received:', newMessage);
      
      if (newMessage.sender_id === userId) return;
      
      const { data: chatParticipant } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('chat_id', newMessage.chat_id)
        .eq('user_id', userId)
        .single();
      
      if (!chatParticipant) return;
      
      const { data: sender } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', newMessage.sender_id)
        .single();
      
      const isViewingThisChat = currentViewingChatId === newMessage.chat_id && document.hasFocus();
      
      if (!isViewingThisChat) {
        console.log('Showing message notification');
        showNotification(`${sender?.display_name || 'Someone'} 💬`, {
          body: newMessage.content || 'Sent a message',
          tag: `message-${newMessage.id}`,
        });
      }
      
      onNewMessage?.(newMessage);
    })
    .subscribe((status) => {
      console.log('Message channel status:', status);
    });

  const friendRequestChannel = supabase
    .channel(`friend_requests:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'friendships',
      filter: `friend_id=eq.${userId}`,
    }, async (payload) => {
      const newRequest = payload.new as any;
      console.log('New friend request received:', newRequest);
      
      if (newRequest.status !== 'pending') return;
      
      const { data: sender } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', newRequest.user_id)
        .single();
      
      console.log('Showing friend request notification');
      showNotification(`Friend Request 👋`, {
        body: `${sender?.display_name || 'Someone'} wants to be your friend!`,
        tag: `friend-request-${newRequest.id}`,
      });
      
      onFriendRequest?.(newRequest);
    })
    .subscribe((status) => {
      console.log('Friend request channel status:', status);
    });

  const notifChannel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const notif = payload.new as any;
      console.log('New notification received:', notif);
      
      showNotification(notif.title || 'GupShup', {
        body: notif.body || notif.message,
        tag: `notif-${notif.id}`,
      });
    })
    .subscribe((status) => {
      console.log('Notifications channel status:', status);
    });

  return () => {
    console.log('Cleaning up notification listeners');
    notificationListenersSetup = false;
    currentUserId = null;
    messageChannel.unsubscribe();
    friendRequestChannel.unsubscribe();
    notifChannel.unsubscribe();
  };
}
