import React from 'react';
import { motion } from 'framer-motion';
import { WordToken } from '../../types/lyrics';
import { usePlayerStore } from '../../store/usePlayerStore';

interface KineticWordBlockProps {
  word: WordToken;
  wordIndex: number;
  activeWordGlobalIndex: number;
}

export const KineticWordBlock: React.FC<KineticWordBlockProps> = ({
  word,
  wordIndex,
  activeWordGlobalIndex,
}) => {
  const { palette, settings } = usePlayerStore();
  const { dynamicEmojis, fontSize } = settings;

  const distance = wordIndex - activeWordGlobalIndex;
  const isCurrent = distance === 0;

  // Step spacing between vertical word slots based on current font size
  const slotSpacing = fontSize === 'massive' ? 140 : fontSize === 'large' ? 115 : 90;

  // 🌀 3D FISHEYE LENS / BARREL WARP CALCULATIONS:
  let scale = 1.0;
  let rotateX = 0;
  let translateZ = 0;
  let opacity = 0.7;
  let yPos = distance * slotSpacing;
  let blur = '0px';

  if (isCurrent) {
    // ACTIVE WORD: Dead center (y = 0), Massive 1.85x scale, 3D forward bulge, 100% luminous white
    scale = 1.85;
    rotateX = 0;
    translateZ = 140;
    opacity = 1.0;
    yPos = 0;
  } else if (Math.abs(distance) === 1) {
    // Immediate neighbors (above/below): 50% size of active word, rotated along 3D cylinder
    scale = 0.95;
    rotateX = distance > 0 ? -24 : 24;
    translateZ = -20;
    opacity = 0.70;
    yPos = distance > 0 ? slotSpacing * 0.95 : -slotSpacing * 0.95;
  } else if (Math.abs(distance) === 2) {
    // 2nd neighbors: Warped into distance
    scale = 0.65;
    rotateX = distance > 0 ? -42 : 42;
    translateZ = -90;
    opacity = 0.40;
    yPos = distance > 0 ? slotSpacing * 1.75 : -slotSpacing * 1.75;
    blur = '0.5px';
  } else if (Math.abs(distance) === 3) {
    // 3rd neighbors
    scale = 0.45;
    rotateX = distance > 0 ? -58 : 58;
    translateZ = -160;
    opacity = 0.18;
    yPos = distance > 0 ? slotSpacing * 2.4 : -slotSpacing * 2.4;
    blur = '1.5px';
  } else {
    // Out of view
    scale = 0.3;
    rotateX = distance > 0 ? -70 : 70;
    translateZ = -220;
    opacity = 0.0;
    yPos = distance > 0 ? slotSpacing * 3.0 : -slotSpacing * 3.0;
    blur = '3px';
  }

  // Pill badge style (like "minute ⏰" in screenshot)
  const isPill = word.badgeStyle === 'pill' || word.isSpecialEmphasis;
  const tiltAngle = isCurrent ? word.tiltAngle : word.tiltAngle * 0.4;
  const waveX = Math.sin(wordIndex * 1.6) * (isCurrent ? 14 : 6);

  return (
    <motion.div
      layout="position"
      className="absolute inset-0 m-auto w-fit h-fit flex items-center justify-center select-none origin-center pointer-events-none"
      style={{
        transformStyle: 'preserve-3d',
        filter: `blur(${blur})`,
      }}
      animate={{
        scale,
        opacity,
        rotateX,
        z: translateZ,
        x: waveX,
        y: yPos,
      }}
      transition={{
        type: 'spring',
        stiffness: 360,
        damping: 26,
        mass: 0.6,
      }}
    >
      <div
        className={`relative inline-flex items-center justify-center transition-all duration-300 ${
          isPill
            ? isCurrent
              ? 'px-8 py-3 md:px-10 md:py-4 rounded-3xl bg-white text-black font-black shadow-[0_15px_45px_rgba(255,255,255,0.45)]'
              : 'px-5 py-2 md:px-7 md:py-2.5 rounded-3xl bg-white/20 text-white font-bold border border-white/25 backdrop-blur-md'
            : isCurrent
            ? 'text-white font-black drop-shadow-[0_0_40px_rgba(255,255,255,0.8)]'
            : 'text-white/80 font-bold drop-shadow-md'
        }`}
        style={{
          transform: `rotate(${tiltAngle}deg)`,
          backgroundColor: isPill && isCurrent ? palette.primary || '#FFFFFF' : undefined,
          color: isPill && isCurrent ? '#050507' : undefined,
        }}
      >
        {/* Word Text */}
        <span className="tracking-tight lowercase leading-none whitespace-nowrap">
          {word.word}
        </span>

        {/* Dynamic Contextual Emoji (e.g. ⏳, ⏰, 🔥, ❤️) */}
        {dynamicEmojis && word.emojiAccent && (
          <motion.span
            className="ml-2.5 md:ml-4 text-2xl md:text-5xl inline-block origin-center filter drop-shadow-lg"
            animate={{
              scale: isCurrent ? [1, 1.3, 1.15] : 0.85,
              rotate: isCurrent ? [0, -14, 14, 0] : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 18,
            }}
          >
            {word.emojiAccent}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};
