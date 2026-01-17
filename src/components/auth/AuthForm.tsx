'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';

const CLICK_EMOJIS = ['😎', '🔥', '💀', '✨', '👻', '🤪', '💜', '⚡'];

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clickEmojis, setClickEmojis] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    const emoji = CLICK_EMOJIS[Math.floor(Math.random() * CLICK_EMOJIS.length)];
    const newEmoji = { id: Date.now(), x: e.clientX, y: e.clientY, emoji };
    setClickEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setClickEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 800);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        router.push('/profile-setup');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/chat');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Click emojis */}
      <AnimatePresence>
        {clickEmojis.map(e => (
          <motion.div
            key={e.id}
            className="fixed text-4xl pointer-events-none z-50"
            style={{ left: e.x - 20, top: e.y - 20 }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ 
              scale: [0, 1.3, 1, 0],
              rotate: [0, 15, -15, 0],
              y: [0, -60],
              opacity: [1, 1, 0.5, 0]
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {e.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onClick={handleClick}
      >
        <Card className="w-[420px] border-2 border-zinc-800 shadow-2xl bg-zinc-900/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <motion.div 
              className="flex justify-center mb-4"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <MessageCircle className="text-white w-9 h-9" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-black tracking-tight text-white">
              {mode === 'login' ? 'Welcome Back! 👋' : 'Join GupShup 🚀'}
            </CardTitle>
            <p className="text-sm text-zinc-500 mt-1">
              {mode === 'login' ? 'Log in to continue vibing' : 'Create your account and start chatting'}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email 📧"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 text-lg rounded-2xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password 🔐"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 text-lg rounded-2xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                >
                  {error} 😢
                </motion.p>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-full font-black text-lg bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-lg shadow-blue-500/30" 
                  disabled={loading}
                >
                  {loading ? '⏳ Processing...' : mode === 'login' ? 'Login ✨' : 'Sign Up 🎉'}
                </Button>
              </motion.div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2 pt-2 pb-6">
            <p className="text-sm text-zinc-500">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                onClick={() => router.push(mode === 'login' ? '/signup' : '/login')}
                className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </>
  );
}
