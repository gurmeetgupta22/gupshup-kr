'use client';

import { useCallback } from 'react';

export default function OfflinePage() {
  const reload = useCallback(() => window.location.reload(), []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="text-7xl">💬</div>
        <h1 className="text-2xl font-bold text-white">You're offline</h1>
        <p className="text-zinc-400">
          Check your internet connection and try again. Your chats will sync
          automatically when you're back online.
        </p>
        <button
          onClick={reload}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
