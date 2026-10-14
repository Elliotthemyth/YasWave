import React, { useState, useRef } from 'react';
import { formatTime } from '../../utils/formatters';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  accentColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  accentColor = '#10b981',
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition({
      x: e.clientX - rect.left,
      time: pos * duration,
    });
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(parseFloat(e.target.value));
  };

  const handleTouchStart = () => setIsScrubbing(true);
  const handleTouchEnd = () => {
    setIsScrubbing(false);
    onSeek(scrubValue);
  };

  return (
    <div className="w-full flex items-center gap-2.5 text-xs text-neutral-400 font-mono select-none">
      <span className="w-9 text-right tabular-nums text-neutral-400">
        {formatTime(displayTime)}
      </span>

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 py-2 flex items-center group cursor-pointer"
      >
        {/* Hover timestamp tooltip */}
        {hoverPosition && (
          <div
            className="absolute -top-6 px-1.5 py-0.5 rounded bg-neutral-900 border border-white/20 text-[10px] text-white tabular-nums shadow-lg pointer-events-none -translate-x-1/2"
            style={{ left: `${hoverPosition.x}px` }}
          >
            {formatTime(hoverPosition.time)}
          </div>
        )}

        {/* Track background */}
        <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden transition-all group-hover:h-1.5 relative">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>

        {/* Real HTML Range Input for accessibility and scrub */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={displayTime}
          onChange={handleInputChange}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Seek track position"
        />
      </div>

      <span className="w-9 text-left tabular-nums text-neutral-400">
        {formatTime(duration)}
      </span>
    </div>
  );
};
