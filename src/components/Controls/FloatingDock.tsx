import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { OffsetCalibrator } from './OffsetCalibrator';
import { ThemeSelector } from './ThemeSelector';
import { SpotifyConnectModal } from './SpotifyConnectModal';
import { MOCK_TRACKS } from '../../services/mockData';
import {
  Play,
  Pause,
  Sliders,
  Maximize,
  Minimize,
  ChevronDown,
  Music2,
  Sparkles,
} from 'lucide-react';

export const FloatingDock: React.FC = () => {
  const {
    player,
    isSimulatorMode,
    selectedMockTrackId,
    selectMockTrack,
    setPlayerState,
    setSimulatorMode,
  } = usePlayerStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const togglePlay = () => {
    setPlayerState({ isPlaying: !player.isPlaying });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto w-fit z-50 flex flex-col items-center gap-3">
      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="mb-1"
          >
            <ThemeSelector />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Tracks Picker Drawer */}
      <AnimatePresence>
        {showDemoMenu && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="p-3 rounded-2xl bg-surface-dark/95 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-1.5 min-w-[260px]"
          >
            <div className="text-[10px] uppercase font-bold tracking-wider text-white/40 px-2 mb-1">
              Curated Vibe Tracks
            </div>
            {MOCK_TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSimulatorMode(true);
                  selectMockTrack(t.id);
                  setShowDemoMenu(false);
                }}
                className={`flex items-center gap-3 p-2 rounded-xl text-left transition ${
                  selectedMockTrackId === t.id && isSimulatorMode
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <img
                  src={t.artworkUrl}
                  alt={t.title}
                  className="w-9 h-9 rounded-lg object-cover shadow"
                />
                <div className="truncate">
                  <div className="text-xs truncate font-medium">{t.title}</div>
                  <div className="text-[11px] text-white/40 truncate">{t.artist}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphism Dock */}
      <motion.div
        className="flex items-center gap-2 md:gap-3 px-3.5 py-2.5 rounded-full bg-surface-dark/85 border border-white/10 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Album Artwork & Track Info */}
        <div className="flex items-center gap-2.5 pl-1 pr-2">
          <div className="relative group">
            {player.artworkUrl ? (
              <img
                src={player.artworkUrl}
                alt={player.title}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 shadow"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <Music2 className="w-4 h-4 text-white/60" />
              </div>
            )}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-dark ${
                player.source === 'Spotify'
                  ? 'bg-emerald-500'
                  : player.source === 'Apple Music'
                  ? 'bg-red-500'
                  : 'bg-pink-500'
              }`}
              title={`Source: ${player.source || 'Local'}`}
            />
          </div>

          <div className="flex flex-col text-left max-w-[140px] md:max-w-[200px]">
            <span className="text-xs md:text-sm font-bold text-white truncate leading-tight">
              {player.title || 'Cadence'}
            </span>
            <span className="text-[11px] text-white/50 truncate leading-tight">
              {player.artist || 'Waiting for music...'}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Playback Controls */}
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
          title={player.isPlaying ? 'Pause' : 'Play'}
        >
          {player.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Track Selector Dropdown Button */}
        <button
          onClick={() => {
            setShowDemoMenu(!showDemoMenu);
            setShowSettings(false);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition ${
            showDemoMenu
              ? 'bg-white/20 text-white'
              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
          }`}
          title="Choose track vibe"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span className="hidden sm:inline">Vibe</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {/* Timing Calibration */}
        <div className="hidden sm:block">
          <OffsetCalibrator />
        </div>

        {/* Audio Engine Status Pill */}
        <button
          onClick={() => setShowSpotifyModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
            isSimulatorMode
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
              : player.source === 'MediaRemote'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
              : player.source === 'Spotify'
              ? 'bg-[#1ED760]/15 border-[#1ED760]/30 text-[#1ED760] hover:bg-[#1ED760]/25'
              : player.source === 'Apple Music'
              ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
          }`}
          title="Cadence Audio Engine Status & Diagnostics"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isSimulatorMode
                ? 'bg-amber-400'
                : player.isPlaying
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-white/40'
            }`}
          />
          <span className="hidden sm:inline">
            {isSimulatorMode
              ? 'Demo'
              : player.source || 'Engine'}
          </span>
        </button>


        <div className="h-6 w-px bg-white/10" />

        {/* Settings Button */}
        <button
          onClick={() => {
            setShowSettings(!showSettings);
            setShowDemoMenu(false);
          }}
          className={`p-2 rounded-full transition ${
            showSettings
              ? 'bg-white/20 text-white'
              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
          }`}
          title="Typography & Visual Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Cinema Mode'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </motion.div>

      {/* Spotify Connect Modal */}
      <SpotifyConnectModal
        isOpen={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
      />
    </div>
  );
};
