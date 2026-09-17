import React, { useEffect } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import { globalClock } from './services/clock';
import { playerBridge } from './services/playerBridge';
import { CinemaMode } from './components/Modes/CinemaMode';
import { WallpaperMode } from './components/Modes/WallpaperMode';
import { LockScreenSimulator } from './components/Modes/LockScreenSimulator';
import { FloatingDock } from './components/Controls/FloatingDock';

export const App: React.FC = () => {
  const {
    player,
    isSimulatorMode,
    settings,
    setPlayerState,
    updateActiveLyrics,
    setOffsetMs,
    setSimulatorMode,
  } = usePlayerStore();

  const { displayMode, offsetMs } = settings;

  // 1. Subscribe to Native Screen Saver / SSE Bridge
  useEffect(() => {
    const unsubscribe = playerBridge.subscribe((state) => {
      if (state && state.active) {
        setSimulatorMode(false);
        setPlayerState(state);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setPlayerState, setSimulatorMode]);


  // 3. High-precision requestAnimationFrame Clock Loop (smooth animation frames)
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      if (player.isPlaying) {
        const currentTime = globalClock.getTime();
        updateActiveLyrics(currentTime);

        if (isSimulatorMode && currentTime >= player.duration && player.duration > 0) {
          globalClock.seek(0);
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [player.isPlaying, player.duration, isSimulatorMode, updateActiveLyrics]);

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === ' ') {
        e.preventDefault();
        setPlayerState({ isPlaying: !player.isPlaying });
      } else if (e.key === '[') {
        setOffsetMs(offsetMs - 50);
      } else if (e.key === ']') {
        setOffsetMs(offsetMs + 50);
      } else if (e.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player.isPlaying, offsetMs, setPlayerState, setOffsetMs]);

  return (
    <div className="relative w-screen h-screen min-h-screen bg-oled text-white overflow-hidden select-none">
      {/* Active Display Mode View */}
      {displayMode === 'cinema' && <CinemaMode />}
      {displayMode === 'wallpaper' && <WallpaperMode />}
      {displayMode === 'lockscreen' && <LockScreenSimulator />}

      {/* Floating Glassmorphism Controller Dock */}
      <FloatingDock />
    </div>
  );
};

export default App;
