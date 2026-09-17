import React, { useState, useEffect } from 'react';
import { KineticStage } from '../KineticLyrics/KineticStage';
import { AmbientCorners } from '../AmbientCorners/AmbientCorners';
import { Lock, User } from 'lucide-react';

export const LockScreenSimulator: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-oled flex flex-col justify-between">
      {/* Ambient Corners */}
      <AmbientCorners />

      {/* macOS Lock Screen Header: Clock & Date */}
      <div className="relative z-20 pt-12 flex flex-col items-center justify-center select-none pointer-events-none">
        <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Locked</span>
        </div>
        <div className="text-white/80 font-medium text-lg tracking-wide drop-shadow-md">
          {dateString}
        </div>
        <div className="text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl my-1 font-jakarta">
          {hours}:{minutes}
        </div>
      </div>

      {/* Kinetic Stage (Centered in lower half of screen) */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center px-4 py-8">
        <KineticStage />
      </div>

      {/* Lock Screen User Profile Pill */}
      <div className="relative z-20 pb-28 flex flex-col items-center justify-center select-none pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-xl mb-2">
          <User className="w-6 h-6 text-white/80" />
        </div>
        <div className="text-xs font-semibold text-white/70">Touch ID or Enter Password to Unlock</div>
      </div>
    </div>
  );
};
