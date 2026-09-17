import React from 'react';
import { motion } from 'framer-motion';
import { LyricLine } from '../../types/lyrics';
import { KineticWord } from './KineticWord';

interface KineticLineProps {
  line: LyricLine;
  lineIndex: number;
  activeLineIndex: number;
  activeWordIndex: number;
  fontSizeClass: string;
}

export const KineticLine: React.FC<KineticLineProps> = ({
  line,
  lineIndex,
  activeLineIndex,
  activeWordIndex,
  fontSizeClass,
}) => {
  const lineDistance = lineIndex - activeLineIndex;
  const isCurrentLine = lineDistance === 0;
  const isPastLine = lineDistance < 0;

  // Calculate dynamic scale, opacity and y-offset for fluid kinetic perspective
  let scale = 1;
  let opacity = 0.2;
  let blur = '0px';

  if (isCurrentLine) {
    scale = 1.08;
    opacity = 1.0;
  } else if (lineDistance === -1) {
    scale = 0.88;
    opacity = 0.45;
    blur = '0.5px';
  } else if (lineDistance === -2) {
    scale = 0.76;
    opacity = 0.2;
    blur = '1.5px';
  } else if (lineDistance === 1) {
    scale = 0.92;
    opacity = 0.45;
  } else if (lineDistance === 2) {
    scale = 0.82;
    opacity = 0.25;
  } else if (Math.abs(lineDistance) > 3) {
    opacity = 0.05;
    scale = 0.7;
    blur = '3px';
  }

  // Slight organic horizontal wave shift depending on line index
  const waveX = Math.sin(lineIndex * 1.2) * (isCurrentLine ? 8 : 4);

  return (
    <motion.div
      layout="position"
      className={`my-3 md:my-5 flex flex-wrap items-center justify-center text-center transition-all ${fontSizeClass}`}
      style={{
        filter: `blur(${blur})`,
      }}
      animate={{
        scale,
        opacity,
        x: waveX,
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 26,
        mass: 0.8,
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 md:gap-x-3.5 gap-y-1.5 max-w-4xl px-4">
        {line.words.map((word, wIdx) => {
          const isWordActive = isCurrentLine && wIdx === activeWordIndex;
          const isPastWord = isPastLine || (isCurrentLine && wIdx < activeWordIndex);

          return (
            <KineticWord
              key={word.id}
              word={word}
              isLineActive={isCurrentLine}
              isWordActive={isWordActive}
              isPastWord={isPastWord}
              wordIndex={wIdx}
            />
          );
        })}
      </div>
    </motion.div>
  );
};
