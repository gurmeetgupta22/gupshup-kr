'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { motion } from 'framer-motion';

const FLOATING_EMOJIS = ['😎', '🔥', '💀', '✨', '👻', '💜', '⚡', '🎮'];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-blue-950/20" />
      
      {/* Grid */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Floating emojis */}
      {FLOATING_EMOJIS.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl pointer-events-none opacity-30"
          style={{ 
            left: `${10 + (i * 12)}%`, 
            top: `${20 + (i % 3) * 25}%` 
          }}
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 3 + i * 0.5,
            delay: i * 0.3
          }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />

      <div className="relative z-10">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
