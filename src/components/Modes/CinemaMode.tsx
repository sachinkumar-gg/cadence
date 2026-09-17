import React from 'react';
import { KineticStage } from '../KineticLyrics/KineticStage';
import { AmbientCorners } from '../AmbientCorners/AmbientCorners';

export const CinemaMode: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-oled flex items-center justify-center">
      {/* 4-Corner Music Reactive Ambient Blooms */}
      <AmbientCorners />

      {/* Kinetic Typography Stage */}
      <div className="relative z-10 w-full h-full min-h-screen flex items-center justify-center px-4 pt-12 pb-28">
        <KineticStage />
      </div>
    </div>
  );
};
