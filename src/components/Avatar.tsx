'use client';

import { motion } from 'framer-motion';

export interface AvatarConfig {
  emoji: string;
  bgColor: string;
  animation: 'bounce' | 'spin' | 'shake' | 'pulse' | 'wiggle' | 'float' | 'crazy' | 'chill';
}

export const AVATAR_EMOJIS = [
  '😎', '🤪', '💀', '👻', '🥶', '🤡', '😈', '🥸', '🤠', '👽', 
  '🤖', '💩', '🎃', '🦄', '🐸', '🦊', '🐻', '🐼', '🐨', '🦁',
  '🌚', '🌝', '🌈', '⚡', '🔥', '✨', '💜', '💙', '💚', '🖤'
];

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF69B4', '#00CED1', '#9370DB', '#20B2AA'
];

export const AVATAR_ANIMATIONS = [
  { id: 'bounce', label: '🦘 Bounce' },
  { id: 'spin', label: '🌀 Spin' },
  { id: 'shake', label: '🫨 Shake' },
  { id: 'pulse', label: '💓 Pulse' },
  { id: 'wiggle', label: '🐛 Wiggle' },
  { id: 'float', label: '🎈 Float' },
  { id: 'crazy', label: '🤯 Crazy' },
  { id: 'chill', label: '😌 Chill' },
];

export const defaultAvatarConfig: AvatarConfig = {
  emoji: '😎',
  bgColor: '#4ECDC4',
  animation: 'bounce',
};

const animationVariants = {
  bounce: {
    y: [0, -15, 0],
    transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
  },
  spin: {
    rotate: [0, 360],
    transition: { repeat: Infinity, duration: 2, ease: "linear" }
  },
  shake: {
    x: [-5, 5, -5, 5, 0],
    rotate: [-5, 5, -5, 5, 0],
    transition: { repeat: Infinity, duration: 0.5 }
  },
  pulse: {
    scale: [1, 1.2, 1],
    transition: { repeat: Infinity, duration: 1, ease: "easeInOut" }
  },
  wiggle: {
    rotate: [-10, 10, -10, 10, 0],
    transition: { repeat: Infinity, duration: 0.6 }
  },
  float: {
    y: [0, -10, 0],
    rotate: [0, 5, 0, -5, 0],
    transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
  },
  crazy: {
    rotate: [0, 360],
    scale: [1, 1.3, 0.8, 1.2, 1],
    x: [-10, 10, -10, 10, 0],
    transition: { repeat: Infinity, duration: 1 }
  },
  chill: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
  },
};

export function Avatar({ config, size = 100, className = "", showAnimation = true }: { 
  config: AvatarConfig | any, 
  size?: number, 
  className?: string,
  showAnimation?: boolean 
}) {
  // Handle legacy config format
  const isLegacyConfig = config && config.skinColor !== undefined;
  
  if (isLegacyConfig) {
    // Convert legacy config to new format
    const legacyEmoji = config.eyeType === 'happy' ? '😊' : 
                        config.eyeType === 'angry' ? '😠' : 
                        config.eyeType === 'sleepy' ? '😴' : 
                        config.eyeType === 'cool' ? '😎' : '🙂';
    
    return (
      <motion.div 
        className={`relative flex items-center justify-center rounded-full ${className}`} 
        style={{ 
          width: size, 
          height: size,
          backgroundColor: config.skinColor || '#4ECDC4',
          boxShadow: `0 0 20px ${config.skinColor || '#4ECDC4'}50`
        }}
        animate={showAnimation ? animationVariants.bounce : undefined}
      >
        <span style={{ fontSize: size * 0.55 }}>{legacyEmoji}</span>
      </motion.div>
    );
  }
  
  const avatarConfig = config as AvatarConfig || defaultAvatarConfig;
  const animation = showAnimation ? animationVariants[avatarConfig.animation] : undefined;

  return (
    <motion.div 
      className={`relative flex items-center justify-center rounded-full ${className}`} 
      style={{ 
        width: size, 
        height: size,
        backgroundColor: avatarConfig.bgColor,
        boxShadow: `0 0 ${size * 0.3}px ${avatarConfig.bgColor}60`
      }}
      animate={animation}
    >
      <span style={{ fontSize: size * 0.55 }}>{avatarConfig.emoji}</span>
    </motion.div>
  );
}
