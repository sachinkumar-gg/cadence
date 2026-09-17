import React from 'react';
import { motion } from 'framer-motion';
import { WordToken } from '../../types/lyrics';
import { usePlayerStore } from '../../store/usePlayerStore';

interface KineticWordProps {
  word: WordToken;
  isLineActive: boolean;
  isWordActive: boolean;
  isPastWord: boolean;
  wordIndex: number;
}

export const KineticWord: React.FC<KineticWordProps> = ({
  word,
  isLineActive,
  isWordActive,
  isPastWord,
}) => {
  const { palette, settings } = usePlayerStore();
  const { dynamicEmojis } = settings;

  // Determine badge styling based on active status and word token
  const showBadge = word.badgeStyle !== 'none' && (isLineActive || isPastWord);

  // Badge background and text colors
  let badgeClasses = '';
  let badgeStyleInline: React.CSSProperties = {};

  if (showBadge) {
    if (word.badgeStyle === 'pill' || word.badgeStyle === 'highlight') {
      badgeClasses = 'inline-flex items-center px-3 py-1 rounded-2xl mx-1 font-bold shadow-lg';
      badgeStyleInline = {
        backgroundColor: isWordActive ? palette.primary : 'rgba(255, 255, 255, 0.12)',
        color: isWordActive ? '#000000' : palette.primary,
        transform: isWordActive ? `rotate(${word.tiltAngle}deg) scale(1.08)` : `rotate(${word.tiltAngle * 0.5}deg)`,
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    } else if (word.badgeStyle === 'bracket') {
      badgeClasses = 'inline-block px-1 font-semibold';
      badgeStyleInline = {
        color: isWordActive ? palette.accent : palette.secondary,
        transform: isWordActive ? `rotate(${word.tiltAngle}deg) scale(1.05)` : 'none',
      };
    }
  }

  // Active word color styling
  const getWordColor = () => {
    if (showBadge && (word.badgeStyle === 'pill' || word.badgeStyle === 'highlight')) {
      return undefined; // handled by badgeStyleInline
    }
    if (isWordActive) {
      return palette.primary;
    }
    if (isLineActive) {
      return isPastWord ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)';
    }
    return 'rgba(255, 255, 255, 0.25)';
  };

  return (
    <motion.span
      className={`relative inline-flex items-center whitespace-nowrap select-none transition-colors duration-200 ${badgeClasses}`}
      style={{
        ...badgeStyleInline,
        color: getWordColor(),
      }}
      animate={{
        scale: isWordActive ? 1.06 : 1,
        y: isWordActive ? -2 : 0,
        rotate: isWordActive && !showBadge ? word.tiltAngle : undefined,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {/* Optional brackets */}
      {word.badgeStyle === 'bracket' && <span className="opacity-40 mr-0.5">[</span>}

      <span className="tracking-tight">{word.word}</span>

      {word.badgeStyle === 'bracket' && <span className="opacity-40 ml-0.5">]</span>}

      {/* Contextual Emoji Accent (like "wait ⌛" or "minute ⏰" in screenshot) */}
      {dynamicEmojis && word.emojiAccent && (
        <motion.span
          className="ml-1.5 text-base md:text-xl inline-block origin-center filter drop-shadow-md"
          initial={{ scale: 0, rotate: -20 }}
          animate={{
            scale: isLineActive || isPastWord ? 1 : 0.7,
            rotate: isWordActive ? [0, -10, 10, 0] : 0,
            opacity: isLineActive ? 1 : 0.4,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {word.emojiAccent}
        </motion.span>
      )}
    </motion.span>
  );
};
