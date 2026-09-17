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
  const slotSpacing = fontSize === 'massive' ? 105 : fontSize === 'large' ? 90 : 75;

  // Dynamic scale factor based on word character length so words never overflow the screen
  const wordLength = word.word.length;
  let wordScaleMultiplier = 1.0;
  if (wordLength > 11) {
    wordScaleMultiplier = 0.58;
  } else if (wordLength > 8) {
    wordScaleMultiplier = 0.70;
  } else if (wordLength > 5) {
    wordScaleMultiplier = 0.82;
  } else if (wordLength > 3) {
    wordScaleMultiplier = 0.92;
  }

  // 🌀 3D FISHEYE LENS / BARREL WARP CALCULATIONS:
  let scale = 1.0;
  let rotateX = 0;
  let translateZ = 0;
  let opacity = 0.7;
  let yPos = distance * slotSpacing;
  let blur = '0px';

  if (isCurrent) {
    // ACTIVE WORD: Dead center (y = 0), proportional scale, 3D forward bulge, 100% luminous white
    scale = 1.35 * wordScaleMultiplier;
    rotateX = 0;
    translateZ = 80;
    opacity = 1.0;
    yPos = 0;
  } else if (Math.abs(distance) === 1) {
    // Immediate neighbors (above/below): rotated along 3D cylinder
    scale = 0.78 * wordScaleMultiplier;
    rotateX = distance > 0 ? -22 : 22;
    translateZ = -20;
    opacity = 0.65;
    yPos = distance > 0 ? slotSpacing * 0.92 : -slotSpacing * 0.92;
  } else if (Math.abs(distance) === 2) {
    // 2nd neighbors: Warped into distance
    scale = 0.55 * wordScaleMultiplier;
    rotateX = distance > 0 ? -38 : 38;
    translateZ = -70;
    opacity = 0.35;
    yPos = distance > 0 ? slotSpacing * 1.65 : -slotSpacing * 1.65;
    blur = '0.5px';
  } else if (Math.abs(distance) === 3) {
    // 3rd neighbors
    scale = 0.38 * wordScaleMultiplier;
    rotateX = distance > 0 ? -52 : 52;
    translateZ = -120;
    opacity = 0.15;
    yPos = distance > 0 ? slotSpacing * 2.25 : -slotSpacing * 2.25;
    blur = '1.5px';
  } else {
    // Out of view
    scale = 0.25;
    rotateX = distance > 0 ? -65 : 65;
    translateZ = -180;
    opacity = 0.0;
    yPos = distance > 0 ? slotSpacing * 2.8 : -slotSpacing * 2.8;
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
        className={`relative max-w-[85vw] inline-flex items-center justify-center transition-all duration-300 ${
          isPill
            ? isCurrent
              ? 'px-6 py-2.5 md:px-8 md:py-3.5 rounded-3xl bg-white text-black font-black shadow-[0_15px_45px_rgba(255,255,255,0.45)]'
              : 'px-4 py-1.5 md:px-6 md:py-2 rounded-3xl bg-white/20 text-white font-bold border border-white/25 backdrop-blur-md'
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
