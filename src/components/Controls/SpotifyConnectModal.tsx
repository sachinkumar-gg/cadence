import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { playerBridge } from '../../services/playerBridge';
import { X, Radio, Activity, Cpu, CheckCircle2, Music2, RefreshCw } from 'lucide-react';

interface EngineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EngineStatusModal: React.FC<EngineStatusModalProps> = ({ isOpen, onClose }) => {
  const { player, isSimulatorMode, hasSyncedLyrics, isLoadingLyrics, setSimulatorMode } = usePlayerStore();

  if (!isOpen) return null;

  const isNative = playerBridge.getIsNativeActive();
  const isConnected = playerBridge.getIsBridgeConnected();

  const getEngineBadge = () => {
    if (isSimulatorMode) {
      return {
        label: 'Simulator Engine',
        desc: 'Testing kinetic typography with built-in vibe tracks',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        dot: 'bg-amber-400',
      };
    }
    if (isNative) {
      return {
        label: 'macOS MediaRemote (Native)',
        desc: 'Zero-config push notifications via MediaRemote.framework',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        dot: 'bg-emerald-400',
      };
    }
    if (isConnected) {
      return {
        label: 'macOS Bridge (AppleScript / SSE)',
        desc: 'Real-time local AppleScript IPC for Spotify & Apple Music',
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        dot: 'bg-cyan-400',
      };
    }
    return {
      label: 'Waiting for Music Player',
      desc: 'Play any track in Spotify or Apple Music to start syncing',
      color: 'text-white/60 bg-white/5 border-white/10',
      dot: 'bg-white/40',
    };
  };

  const engine = getEngineBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg p-6 rounded-3xl bg-surface-dark/95 border border-white/15 shadow-2xl text-white flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Cadence Audio Engine</h3>
              <p className="text-xs text-white/50">Native macOS Media Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Status Card */}
        <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${engine.color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${engine.dot} animate-ping`} />
              <span className="text-xs font-bold uppercase tracking-wider">{engine.label}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono">
              60 FPS Clock
            </span>
          </div>
          <p className="text-xs text-white/70">{engine.desc}</p>
        </div>

        {/* Diagnostics & Specs */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Active Source
            </span>
            <span className="font-bold text-white truncate">
              {player.active ? player.source || 'MediaRemote' : 'Inactive'}
            </span>
            <span className="text-[11px] text-white/50 truncate">
              {player.title ? `${player.title}` : 'No track playing'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-pink-400" /> Sync Mechanism
            </span>
            <span className="font-bold text-white">Monotonic rAF</span>
            <span className="text-[11px] text-white/50">150ms drift snapping</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-amber-400" /> Lyrics Provider
            </span>
            <span className="font-bold text-white">LRCLIB (Exact Match)</span>
            <span className="text-[11px] text-white/50">
              {isLoadingLyrics
                ? 'Fetching...'
                : hasSyncedLyrics
                ? 'Word Interpolation Synced'
                : 'Instrumental / Plain'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auth Architecture
            </span>
            <span className="font-bold text-emerald-300">Zero OAuth</span>
            <span className="text-[11px] text-white/50">No tokens or client IDs</span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Simulator Mode</span>
            <span className="text-[11px] text-white/50">
              {isSimulatorMode
                ? 'Currently playing built-in demo track'
                : 'Listening to system audio via macOS'}
            </span>
          </div>
          <button
            onClick={() => setSimulatorMode(!isSimulatorMode)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isSimulatorMode
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isSimulatorMode ? 'Switch to Live' : 'Use Demo'}</span>
          </button>
        </div>

        <p className="text-[11px] text-white/40 text-center leading-relaxed">
          Running natively inside <strong className="text-white/60">Cadence.saver</strong>. No Spotify Developer account, redirect URIs, or token refreshing required.
        </p>
      </motion.div>
    </div>
  );
};

// Aliased for backward compatibility with imports
export const SpotifyConnectModal = EngineStatusModal;
