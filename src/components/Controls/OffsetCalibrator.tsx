import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Plus, Minus, RotateCcw } from 'lucide-react';

export const OffsetCalibrator: React.FC = () => {
  const { settings, setOffsetMs } = usePlayerStore();
  const { offsetMs } = settings;

  const adjustOffset = (delta: number) => {
    setOffsetMs(offsetMs + delta);
  };

  const resetOffset = () => {
    setOffsetMs(0);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
      <span className="text-white/50 font-medium select-none">Sync:</span>
      <button
        onClick={() => adjustOffset(-50)}
        className="p-1 rounded-full hover:bg-white/10 active:scale-90 transition text-white/70 hover:text-white"
        title="Earlier (-50ms)"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span
        className={`font-mono font-semibold min-w-[52px] text-center ${
          offsetMs === 0 ? 'text-white/60' : offsetMs > 0 ? 'text-emerald-400' : 'text-amber-400'
        }`}
      >
        {offsetMs > 0 ? `+${offsetMs}` : offsetMs}ms
      </span>

      <button
        onClick={() => adjustOffset(50)}
        className="p-1 rounded-full hover:bg-white/10 active:scale-90 transition text-white/70 hover:text-white"
        title="Later (+50ms)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {offsetMs !== 0 && (
        <button
          onClick={resetOffset}
          className="p-1 ml-0.5 rounded-full hover:bg-white/10 active:scale-90 transition text-white/40 hover:text-white"
          title="Reset offset to 0ms"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
