'use client';

import { motion } from 'framer-motion';

export interface EmojiAvatarConfig {
  baseEmoji: string;
  bgColor: string;
  mood: 'chill' | 'hype' | 'sleepy' | 'chaotic' | 'mysterious';
  accessory: 'none' | 'halo' | 'fire' | 'sparkles' | 'hearts' | 'stars';
}

export const defaultEmojiAvatarConfig: EmojiAvatarConfig = {
  baseEmoji: '😎',
  bgColor: '#3B82F6',
  mood: 'chill',
  accessory: 'none',
};

const MOOD_ANIMATIONS = {
  chill: {
    animate: { rotate: [0, 5, -5, 0] },
    transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
  },
  hype: {
    animate: { scale: [1, 1.2, 1], y: [0, -10, 0] },
    transition: { repeat: Infinity, duration: 0.5, ease: "easeInOut" }
  },
  sleepy: {
    animate: { rotate: [0, -10, 0], y: [0, 3, 0] },
    transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
  },
  chaotic: {
    animate: { rotate: [0, 360], scale: [1, 1.1, 0.9, 1] },
    transition: { repeat: Infinity, duration: 1, ease: "linear" }
  },
  mysterious: {
    animate: { opacity: [1, 0.5, 1], scale: [1, 1.05, 1] },
    transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
  }
};

const ACCESSORY_ELEMENTS: Record<string, { emoji: string; positions: { top: string; left: string; rotate: number }[] }> = {
  none: { emoji: '', positions: [] },
  halo: { emoji: '👼', positions: [{ top: '-30%', left: '25%', rotate: 0 }] },
  fire: { emoji: '🔥', positions: [{ top: '-20%', left: '-20%', rotate: -20 }, { top: '-20%', left: '70%', rotate: 20 }] },
  sparkles: { emoji: '✨', positions: [{ top: '-15%', left: '-15%', rotate: 0 }, { top: '-15%', left: '75%', rotate: 0 }, { top: '70%', left: '80%', rotate: 0 }] },
  hearts: { emoji: '💖', positions: [{ top: '-20%', left: '60%', rotate: 15 }, { top: '60%', left: '-15%', rotate: -15 }] },
  stars: { emoji: '⭐', positions: [{ top: '-15%', left: '-10%', rotate: 0 }, { top: '-10%', left: '80%', rotate: 0 }, { top: '75%', left: '70%', rotate: 0 }] }
};

export function EmojiAvatar({ 
  config, 
  size = 80, 
  className = "",
  onClick
}: { 
  config: EmojiAvatarConfig, 
  size?: number, 
  className?: string,
  onClick?: () => void 
}) {
  const moodAnimation = MOOD_ANIMATIONS[config.mood];
  const accessory = ACCESSORY_ELEMENTS[config.accessory];

  return (
    <motion.div 
      className={`relative flex items-center justify-center cursor-pointer ${className}`} 
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-50"
        style={{ backgroundColor: config.bgColor }}
      />
      
      {/* Background circle */}
      <motion.div 
        className="absolute inset-0 rounded-full shadow-2xl"
        style={{ 
          background: `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor}88)`,
          boxShadow: `0 0 30px ${config.bgColor}66`
        }}
        {...moodAnimation}
      />

      {/* Main emoji */}
      <motion.span 
        className="relative z-10 select-none"
        style={{ fontSize: size * 0.55 }}
        {...moodAnimation}
      >
        {config.baseEmoji}
      </motion.span>

      {/* Accessory emojis */}
      {accessory.positions.map((pos, i) => (
        <motion.span
          key={i}
          className="absolute z-20 select-none"
          style={{ 
            top: pos.top, 
            left: pos.left, 
            fontSize: size * 0.3,
            transform: `rotate(${pos.rotate}deg)`
          }}
          animate={{ 
            y: [0, -5, 0],
            rotate: [pos.rotate - 5, pos.rotate + 5, pos.rotate - 5]
          }}
          transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
        >
          {accessory.emoji}
        </motion.span>
      ))}
    </motion.div>
  );
}

export const BASE_EMOJIS = ['😎', '🤪', '😈', '🥺', '💀', '👻', '🤡', '😭', '🥶', '🤓', '😴', '🫠', '🤑', '😇', '🤠', '👽'];
export const BG_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'];
export const MOODS: EmojiAvatarConfig['mood'][] = ['chill', 'hype', 'sleepy', 'chaotic', 'mysterious'];
export const ACCESSORIES: EmojiAvatarConfig['accessory'][] = ['none', 'halo', 'fire', 'sparkles', 'hearts', 'stars'];
