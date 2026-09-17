import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { KineticWordBlock } from './KineticWordBlock';
import { Music, Sparkles } from 'lucide-react';

export const KineticStage: React.FC = () => {
  const {
    allWords,
    activeWordGlobalIndex,
    player,
    settings,
    isLoadingLyrics,
  } = usePlayerStore();
  const { font, fontSize } = settings;

  const getFontFamily = () => {
    switch (font) {
      case 'syne':
        return 'font-syne font-extrabold';
      case 'clash':
        return 'font-clash font-bold';
      case 'cabinet':
        return 'font-cabinet font-black';
      case 'dela':
        return 'font-["Dela_Gothic_One"] font-normal';
      case 'jakarta':
        return 'font-jakarta font-extrabold';
      case 'inter':
      default:
        return 'font-inter font-bold';
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-3xl md:text-5xl';
      case 'medium':
        return 'text-4xl md:text-6xl';
      case 'large':
        return 'text-5xl md:text-7xl';
      case 'massive':
      default:
        return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight';
    }
  };

  // Window of nearby visible words around the active focal word
  const visibleRange = 4;
  const startIndex = Math.max(0, activeWordGlobalIndex - visibleRange);
  const endIndex = Math.min(allWords.length, activeWordGlobalIndex + visibleRange + 1);
  const visibleWords = allWords.slice(startIndex, endIndex);

  return (
    <div
      className={`relative w-full h-full min-h-screen flex items-center justify-center overflow-hidden select-none ${getFontFamily()}`}
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      <AnimatePresence mode="wait">
        {isLoadingLyrics ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center gap-4 text-center px-6 z-20"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-pink-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-pink-400 animate-pulse" />
            </div>
            <p className="text-xl md:text-2xl text-white font-bold tracking-wide">
              Syncing lyrics for <span className="text-pink-400">{player.title || 'track'}</span>...
            </p>
          </motion.div>
        ) : !player.active || (!player.isPlaying && allWords.length === 0) ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center justify-center gap-4 text-center px-6 max-w-lg z-20"
          >
            <div className="p-5 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl">
              <Music className="w-10 h-10 text-white animate-bounce" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Ready for Cadence
            </h2>
            <p className="text-sm md:text-base text-white/80 leading-relaxed">
              Play any track on <span className="text-white font-semibold">Spotify</span> or{' '}
              <span className="text-white font-semibold">Apple Music</span>, or pick a vibe below.
            </p>
          </motion.div>
        ) : allWords.length === 0 ? (
          <motion.div
            key="no-lyrics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 text-center px-6 z-20"
          >
            <span className="text-5xl md:text-6xl animate-pulse">🎵</span>
            <p className="text-2xl md:text-3xl text-white font-bold tracking-tight">
              {player.title}
            </p>
            <p className="text-lg text-white/80 font-medium">{player.artist}</p>
            <span className="text-xs uppercase tracking-widest text-white/50 px-3 py-1 rounded-full border border-white/20 mt-2">
              Instrumental / No synced lyrics
            </span>
          </motion.div>
        ) : (
          <div
            key="words-lens"
            className={`relative w-full h-full min-h-screen flex items-center justify-center ${getFontSizeClass()}`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {visibleWords.map((word) => (
              <KineticWordBlock
                key={word.id}
                word={word}
                wordIndex={word.globalIndex}
                activeWordGlobalIndex={activeWordGlobalIndex}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
