import React from 'react';
import { Music2 } from 'lucide-react';
import { generateCoverArtPalette } from '../../utils/formatters';

interface CoverArtProps {
  url?: string;
  title: string;
  artist?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeClasses = {
  xs: 'w-8 h-8 text-[10px]',
  sm: 'w-10 h-10 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-24 h-24 text-base',
  xl: 'w-48 h-48 text-xl',
};

const roundedClasses = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export const CoverArt: React.FC<CoverArtProps> = ({
  url,
  title,
  artist = 'Unknown Artist',
  size = 'md',
  className = '',
  rounded = 'md',
}) => {
  const palette = generateCoverArtPalette(`${title}-${artist}`);
  const [imgError, setImgError] = React.useState(false);

  // If there's an image url and it hasn't errored
  if (url && !imgError) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden bg-neutral-900 shadow-md ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
      >
        <img
          src={url}
          alt={`${title} by ${artist}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Elegant algorithmic fallback cover
  return (
    <div
      className={`relative shrink-0 overflow-hidden shadow-inner flex flex-col items-center justify-center p-1.5 transition-transform ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      title={`${title} - ${artist}`}
    >
      <Music2
        className="opacity-75 drop-shadow-sm mb-0.5"
        style={{ color: palette.accent }}
        size={size === 'xl' ? 44 : size === 'lg' ? 28 : size === 'md' ? 18 : 14}
      />
      {size === 'xl' && (
        <span className="text-[11px] font-semibold text-white/70 text-center line-clamp-1 max-w-[90%] px-1">
          {artist}
        </span>
      )}
    </div>
  );
};
