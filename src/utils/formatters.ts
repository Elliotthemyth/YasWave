/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
  
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bytes into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format timestamp into relative or short date
 */
export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Deterministically generate sleek dark gradient pairs based on track id/title
 */
export function generateCoverArtPalette(str: string): { from: string; to: string; accent: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { from: '#1e1b4b', to: '#312e81', accent: '#6366f1' }, // Indigo
    { from: '#064e3b', to: '#065f46', accent: '#10b981' }, // Emerald
    { from: '#4c0519', to: '#881337', accent: '#f43f5e' }, // Rose
    { from: '#172554', to: '#1e3a8a', accent: '#3b82f6' }, // Blue
    { from: '#451a03', to: '#78350f', accent: '#f59e0b' }, // Amber
    { from: '#3b0764', to: '#581c87', accent: '#a855f7' }, // Purple
    { from: '#164e63', to: '#155e75', accent: '#06b6d4' }, // Cyan
  ];

  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}
