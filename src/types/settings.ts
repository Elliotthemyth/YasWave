export type AppTheme = 'dark' | 'light' | 'oled';
export type AccentColor = 'emerald' | 'violet' | 'cyan' | 'amber' | 'rose' | 'monochrome';
export type UIDensity = 'compact' | 'normal' | 'relaxed';

export interface UserPreferences {
  theme: AppTheme;
  accentColor: AccentColor;
  density: UIDensity;
  defaultVolume: number;
  rememberPlaybackPosition: boolean;
  enableVisualizer: boolean;
  visualizerMode: 'bars' | 'wave' | 'circle';
  dynamicCoverAccent: boolean;
  audioCrossfadeSeconds: number;
  lyricsSyncOffset: number; // default global offset in seconds
  showDesktopNotifications: boolean;
  hardwareAcceleration: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  accentColor: 'emerald',
  density: 'normal',
  defaultVolume: 0.8,
  rememberPlaybackPosition: true,
  enableVisualizer: true,
  visualizerMode: 'bars',
  dynamicCoverAccent: true,
  audioCrossfadeSeconds: 0,
  lyricsSyncOffset: 0,
  showDesktopNotifications: false,
  hardwareAcceleration: true,
};
