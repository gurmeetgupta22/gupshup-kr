'use client';

import { useEffect, useState, useCallback } from 'react';

export function usePushNotifications(userId: string | null) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return null;

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      const registration = await registerServiceWorker();
      if (!registration) return null;

      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        await saveSubscriptionToServer(existingSubscription, userId);
        return existingSubscription;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not found');
        return null;
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(newSubscription);
      await saveSubscriptionToServer(newSubscription, userId);
      return newSubscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }, [isSupported, userId, registerServiceWorker]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      setSubscription(null);

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, [subscription]);

  useEffect(() => {
    if (isSupported && userId && permission === 'granted') {
      subscribe();
    }
  }, [isSupported, userId, permission, subscribe]);

  return {
    isSupported,
    subscription,
    permission,
    subscribe,
    unsubscribe
  };
}

async function saveSubscriptionToServer(subscription: PushSubscription, userId: string) {
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
    console.error('Error saving subscription to server:', error);
  }
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

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string,
  tag?: string
) {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, url, tag })
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}
