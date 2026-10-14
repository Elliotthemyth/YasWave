import React from 'react';
import { UserPreferences, AppTheme, AccentColor, UIDensity } from '../../types/settings';
import { APP_CONFIG } from '../../config/appConfig';
import { defaultRepository } from '../../services/storage/libraryRepository';
import {
  Palette,
  Sliders,
  Volume2,
  Trash2,
  Sparkles,
  Check,
  HardDrive,
  Info,
  Keyboard,
  ChevronRight,
} from 'lucide-react';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onReloadLibrary: () => void;
  onOpenShortcutsModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onUpdatePreferences,
  onReloadLibrary,
  onOpenShortcutsModal,
}) => {
  const handleClearData = async () => {
    if (
      window.confirm(
        'Warning: This will clear all stored tracks, playlists, and settings from IndexedDB. Are you sure?'
      )
    ) {
      await defaultRepository.clearAllData();
      onReloadLibrary();
    }
  };

  const accentOptions: AccentColor[] = ['emerald', 'violet', 'cyan', 'amber', 'rose', 'monochrome'];
  const themeOptions: { id: AppTheme; label: string; desc: string }[] = [
    { id: 'dark', label: 'Dark Charcoal', desc: 'Spotify-inspired dark surface' },
    { id: 'oled', label: 'OLED Midnight', desc: 'Pure true black background' },
    { id: 'light', label: 'Daylight', desc: 'Clean slate light theme' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 select-none pb-24">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Customize Nocturne&apos;s audio engine, visual identity, and desktop behavior.
        </p>
      </div>

      {/* Section 1: Appearance & Themes */}
      <div className="bg-neutral-900/40 rounded-2xl border border-white/5 p-6 space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <Palette size={18} className="text-emerald-400" />
          <h2 className="font-bold text-white text-base">Appearance & Themes</h2>
        </div>

        {/* Theme Mode */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
            Theme Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onUpdatePreferences({ theme: opt.id })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  preferences.theme === opt.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-neutral-200">{opt.label}</span>
                  {preferences.theme === opt.id && (
                    <Check size={16} className="text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color Palette */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
            Accent Color
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {accentOptions.map((acc) => {
              const info = APP_CONFIG.accentColors[acc];
              const isSelected = preferences.accentColor === acc;
              return (
                <button
                  key={acc}
                  onClick={() => onUpdatePreferences({ accentColor: acc })}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-white/40 bg-white/10 shadow-md'
                      : 'border-white/5 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: info.primary }}
                  >
                    {isSelected && <Check size={13} className="text-neutral-950 font-bold" />}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-300 truncate w-full text-center">
                    {info.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* UI Density */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
            Interface Density
          </label>
          <div className="flex items-center gap-2">
            {(['compact', 'normal', 'relaxed'] as UIDensity[]).map((d) => (
              <button
                key={d}
                onClick={() => onUpdatePreferences({ density: d })}
                className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                  preferences.density === d
                    ? 'bg-white text-neutral-950 font-bold shadow'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Audio Engine & Playback */}
      <div className="bg-neutral-900/40 rounded-2xl border border-white/5 p-6 space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
          <Volume2 size={18} className="text-emerald-400" />
          <h2 className="font-bold text-white text-base">Audio Engine & Playback</h2>
        </div>

        {/* Default Volume Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-neutral-300">Default Startup Volume</span>
            <span className="text-emerald-400 font-mono tabular-nums">
              {Math.round(preferences.defaultVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={preferences.defaultVolume}
            onChange={(e) =>
              onUpdatePreferences({ defaultVolume: parseFloat(e.target.value) })
            }
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Remember playback position toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-neutral-200">Remember Playback State</p>
            <p className="text-xs text-neutral-400">
              Restore current song and position when opening Nocturne
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.rememberPlaybackPosition}
            onChange={(e) =>
              onUpdatePreferences({ rememberPlaybackPosition: e.target.checked })
            }
            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
          />
        </div>

        {/* Real-time Visualizer setting */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-neutral-200">Audio Visualizer Engine</p>
            <p className="text-xs text-neutral-400">
              Enable real-time Web Audio AnalyserNode spectrum rendering
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.enableVisualizer}
            onChange={(e) =>
              onUpdatePreferences({ enableVisualizer: e.target.checked })
            }
            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Section 3: Linux Desktop Packaging & Tauri Architecture */}
      <div className="bg-neutral-900/40 rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
          <HardDrive size={18} className="text-emerald-400" />
          <h2 className="font-bold text-white text-base">Desktop Linux & Tauri 2 Integration</h2>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          Nocturne has been engineered from the ground up with a strict adapter boundary
          (<code className="text-emerald-400">BrowserFileAdapter</code> vs{' '}
          <code className="text-emerald-400">TauriFileAdapter</code>, and{' '}
          <code className="text-emerald-400">LibraryRepository</code>).
        </p>

        <div className="p-4 rounded-xl bg-neutral-950 font-mono text-xs text-neutral-300 space-y-2 border border-white/5 overflow-x-auto">
          <p className="text-emerald-400"># To compile as a native Linux desktop .deb / .AppImage:</p>
          <p>npm install --save-dev @tauri-apps/cli @tauri-apps/api</p>
          <p>npm run tauri init</p>
          <p>npm run tauri build</p>
        </div>
      </div>

      {/* Section 4: Keyboard Shortcuts & Accessibility */}
      <div className="bg-neutral-900/40 rounded-2xl border border-white/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Keyboard size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Keyboard Shortcuts</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Full list of keyboard interactions for playback, seeking, volume, and lyrics (Press <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-white/10 text-neutral-300 font-mono text-[10px]">?</kbd>)
            </p>
          </div>
        </div>

        {onOpenShortcutsModal && (
          <button
            onClick={onOpenShortcutsModal}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors shrink-0"
          >
            <span>View Shortcuts</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Section 5: Storage & Reset */}
      <div className="bg-neutral-900/40 rounded-2xl border border-rose-500/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-rose-300 text-sm">Reset Local Database</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Clear all cached metadata, playlists, and settings in your browser IndexedDB.
          </p>
        </div>

        <button
          onClick={handleClearData}
          className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-500/30 transition-colors"
        >
          <Trash2 size={14} />
          <span>Clear All Data</span>
        </button>
      </div>
    </div>
  );
};
