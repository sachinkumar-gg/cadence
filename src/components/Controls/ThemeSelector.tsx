import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { FontTheme, DisplayMode } from '../../types/player';
import { Sparkles, SunDim, Monitor, Layout, Lock } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const {
    settings,
    setFontTheme,
    setFontSize,
    setDisplayMode,
    toggleDynamicEmojis,
    toggleAmbientCorners,
  } = usePlayerStore();

  const fonts: { id: FontTheme; label: string }[] = [
    { id: 'syne', label: 'Syne' },
    { id: 'clash', label: 'Clash' },
    { id: 'cabinet', label: 'Cabinet' },
    { id: 'dela', label: 'Dela Gothic' },
    { id: 'jakarta', label: 'Jakarta' },
    { id: 'inter', label: 'Inter' },
  ];

  const fontSizes: { id: 'small' | 'medium' | 'large' | 'massive'; label: string }[] = [
    { id: 'small', label: 'S' },
    { id: 'medium', label: 'M' },
    { id: 'large', label: 'L' },
    { id: 'massive', label: 'XL' },
  ];

  const displayModes: { id: DisplayMode; label: string; icon: React.ReactNode }[] = [
    { id: 'cinema', label: 'Cinema', icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'wallpaper', label: 'Home/Wallpaper', icon: <Layout className="w-3.5 h-3.5" /> },
    { id: 'lockscreen', label: 'Lock Screen', icon: <Lock className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-4 rounded-3xl bg-surface-dark/90 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-3 min-w-[280px]">
      {/* Display Mode Selection */}
      <div>
        <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1.5 block">
          Display Mode
        </label>
        <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-2xl">
          {displayModes.map((m) => (
            <button
              key={m.id}
              onClick={() => setDisplayMode(m.id)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition ${
                settings.displayMode === m.id
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {m.icon}
              <span>{m.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Family Selection */}
      <div>
        <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1.5 block">
          Kinetic Typography Font
        </label>
        <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-2xl">
          {fonts.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontTheme(f.id)}
              className={`py-1 px-2 rounded-xl text-xs font-semibold transition truncate ${
                settings.font === f.id
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size Selection */}
      <div>
        <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1.5 block">
          Size
        </label>
        <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-2xl">
          {fontSizes.map((s) => (
            <button
              key={s.id}
              onClick={() => setFontSize(s.id)}
              className={`py-1 text-xs font-bold transition rounded-xl ${
                settings.fontSize === s.id
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="pt-1 border-t border-white/10 flex flex-col gap-2">
        <button
          onClick={toggleDynamicEmojis}
          className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/5 text-xs text-white/80 transition"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Dynamic Contextual Emojis</span>
          </div>
          <div
            className={`w-8 h-4.5 rounded-full p-0.5 transition ${
              settings.dynamicEmojis ? 'bg-pink-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                settings.dynamicEmojis ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>

        <button
          onClick={toggleAmbientCorners}
          className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/5 text-xs text-white/80 transition"
        >
          <div className="flex items-center gap-2">
            <SunDim className="w-3.5 h-3.5 text-amber-400" />
            <span>Music-Reactive Ambient Corners</span>
          </div>
          <div
            className={`w-8 h-4.5 rounded-full p-0.5 transition ${
              settings.ambientCorners ? 'bg-amber-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                settings.ambientCorners ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>

        {/* Direct Spotify Lyrics Sync (sp_dc) */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
              Direct Spotify Lyrics (sp_dc)
            </label>
            {settings.spDcCookie && (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                ● Official Sync
              </span>
            )}
          </div>
          <input
            type="password"
            placeholder="Paste your Spotify sp_dc cookie..."
            defaultValue={settings.spDcCookie}
            onBlur={(e) => usePlayerStore.getState().setSpDcCookie(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/70 transition"
          />
          <p className="text-[10px] text-white/40 leading-tight">
            Optional: For 1:1 official Spotify lyrics, copy <code className="text-white/60">sp_dc</code> from open.spotify.com cookies.
          </p>
        </div>
      </div>
    </div>
  );
};
