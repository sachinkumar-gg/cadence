import React from 'react';
import { KineticStage } from '../KineticLyrics/KineticStage';
import { AmbientCorners } from '../AmbientCorners/AmbientCorners';
import { Folder, HardDrive, Wifi, Battery, Search } from 'lucide-react';

export const WallpaperMode: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-oled">
      {/* Ambient Corners */}
      <AmbientCorners />

      {/* Simulated macOS Menu Bar */}
      <div className="absolute top-0 inset-x-0 h-7 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 flex items-center justify-between text-xs text-white/80 z-30 pointer-events-none">
        <div className="flex items-center gap-4 font-semibold">
          <span className="text-sm"></span>
          <span className="font-bold">Cadence</span>
          <span className="text-white/60 font-normal hidden sm:inline">File</span>
          <span className="text-white/60 font-normal hidden sm:inline">Edit</span>
          <span className="text-white/60 font-normal hidden sm:inline">Lyrics</span>
        </div>
        <div className="flex items-center gap-3.5 text-white/70">
          <Search className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
          <span className="font-medium text-xs">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Simulated Desktop Icons */}
      <div className="absolute top-12 right-6 flex flex-col gap-6 z-20 pointer-events-none opacity-60">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg">
            <HardDrive className="w-6 h-6 text-black/70" />
          </div>
          <span className="text-[11px] font-medium text-white/80 drop-shadow">Macintosh HD</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
            <Folder className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-medium text-white/80 drop-shadow">Projects</span>
        </div>
      </div>

      {/* Kinetic Stage (Centered) */}
      <div className="relative z-10 w-full h-full min-h-screen flex items-center justify-center pt-8 pb-24">
        <KineticStage />
      </div>
    </div>
  );
};
