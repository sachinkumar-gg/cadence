import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';

export const AmbientCorners: React.FC = () => {
  const { palette, player, settings } = usePlayerStore();
  const { ambientCorners, pulseIntensity } = settings;
  const [pulse, setPulse] = useState(1);

  // Subtle tempo pulse simulation when playing
  useEffect(() => {
    if (!player.isPlaying || !ambientCorners) return;

    const interval = setInterval(() => {
      setPulse((prev) => (prev === 1 ? 1.08 : 1));
    }, 1100);

    return () => clearInterval(interval);
  }, [player.isPlaying, ambientCorners]);

  if (!ambientCorners) return null;

  const baseOpacity = player.isPlaying ? 0.45 * pulseIntensity : 0.25 * pulseIntensity;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Top Left Corner Bloom */}
      <motion.div
        className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full filter blur-[120px] mix-blend-screen opacity-60"
        style={{
          background: `radial-gradient(circle, ${palette.primary} 0%, ${palette.secondary} 40%, transparent 70%)`,
        }}
        animate={{
          scale: [1, pulse, 1],
          opacity: [baseOpacity * 0.9, baseOpacity * 1.2, baseOpacity * 0.9],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Top Right Corner Bloom */}
      <motion.div
        className="absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full filter blur-[110px] mix-blend-screen opacity-50"
        style={{
          background: `radial-gradient(circle, ${palette.secondary} 0%, ${palette.primary} 50%, transparent 75%)`,
        }}
        animate={{
          scale: [1, pulse * 1.04, 1],
          opacity: [baseOpacity * 0.8, baseOpacity * 1.1, baseOpacity * 0.8],
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Bottom Left Corner Bloom */}
      <motion.div
        className="absolute -bottom-36 -left-36 w-[36rem] h-[36rem] rounded-full filter blur-[130px] mix-blend-screen opacity-50"
        style={{
          background: `radial-gradient(circle, ${palette.darkMuted} 0%, ${palette.primary} 45%, transparent 70%)`,
        }}
        animate={{
          scale: [pulse, 1, pulse],
          opacity: [baseOpacity * 0.8, baseOpacity * 1.15, baseOpacity * 0.8],
        }}
        transition={{
          duration: 4.0,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.0,
        }}
      />

      {/* Bottom Right Corner Bloom */}
      <motion.div
        className="absolute -bottom-32 -right-32 w-[38rem] h-[38rem] rounded-full filter blur-[120px] mix-blend-screen opacity-65"
        style={{
          background: `radial-gradient(circle, ${palette.primary} 0%, ${palette.secondary} 35%, transparent 70%)`,
        }}
        animate={{
          scale: [1, pulse * 1.06, 1],
          opacity: [baseOpacity * 0.9, baseOpacity * 1.25, baseOpacity * 0.9],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.5,
        }}
      />

      {/* Center Subtle Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 filter blur-[160px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${palette.darkMuted} 0%, transparent 65%)`,
        }}
      />
    </div>
  );
};
