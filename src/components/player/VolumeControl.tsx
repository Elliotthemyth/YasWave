import React from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  accentColor?: string;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  accentColor = '#10b981',
}) => {
  const effectiveVolume = isMuted ? 0 : volume;

  const renderIcon = () => {
    if (isMuted || effectiveVolume === 0) {
      return <VolumeX size={17} className="text-neutral-400 hover:text-white" />;
    }
    if (effectiveVolume < 0.33) {
      return <Volume size={17} className="text-neutral-400 hover:text-white" />;
    }
    if (effectiveVolume < 0.66) {
      return <Volume1 size={17} className="text-neutral-400 hover:text-white" />;
    }
    return <Volume2 size={17} className="text-neutral-400 hover:text-white" />;
  };

  return (
    <div className="flex items-center gap-2 group select-none">
      <button
        onClick={onToggleMute}
        className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        aria-label="Toggle mute"
      >
        {renderIcon()}
      </button>

      <div className="relative w-20 md:w-24 h-4 flex items-center cursor-pointer">
        {/* Track bar */}
        <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden transition-all group-hover:h-1.5 relative">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.round(effectiveVolume * 100)}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>

        {/* Range slider */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={effectiveVolume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Volume level"
        />
      </div>
    </div>
  );
};
