'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { motion } from 'framer-motion';

const FLOATING_EMOJIS = ['🔥', '💬', '💜', '⚡', '🎮', '😈'];

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FFF8EA] p-4">

      {/* Main warm background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9EE] via-[#FFF7E5] to-[#FFF4D9]" />

      {/* Soft orange glow */}
      <div className="absolute left-1/4 top-1/3 h-[450px] w-[450px] rounded-full bg-orange-300/20 blur-[180px]" />

      {/* Yellow glow */}
      <div className="absolute right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-yellow-300/20 blur-[180px]" />

      {/* Pink glow */}
      <div className="absolute top-1/2 left-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-300/10 blur-[160px]" />

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,170,0,.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,170,0,.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating Emojis */}
      {FLOATING_EMOJIS.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-60 pointer-events-none"
          style={{
            left: `${10 + i * 15}%`,
            top: `${15 + (i % 3) * 28}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
          }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Extra radial lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,180,60,0.08),transparent_70%)]" />

      {/* Auth Form */}
      <div className="relative z-10">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}