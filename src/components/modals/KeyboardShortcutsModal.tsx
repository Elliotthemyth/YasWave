import React, { useState, useMemo } from 'react';
import { Search, X, Keyboard, Command, Sparkles, Music, Sliders, Layout, HelpCircle } from 'lucide-react';

export type ShortcutCategory =
  | 'All'
  | 'Playback'
  | 'Lyrics & Persian'
  | 'Overlays & Visuals'
  | 'Navigation'
  | 'System';

export interface ShortcutItem {
  id: string;
  category: Exclude<ShortcutCategory, 'All'>;
  keys: string[];
  description: string;
  detail?: string;
}

export const SHORTCUTS_LIST: ShortcutItem[] = [
  // Playback
  {
    id: 'play-pause',
    category: 'Playback',
    keys: ['Space'],
    description: 'Play / Pause playback',
    detail: 'Toggle between playing and pausing the active audio track',
  },
  {
    id: 'next-track',
    category: 'Playback',
    keys: ['N'],
    description: 'Next track',
    detail: 'Skip forward to the next song in the queue or playlist',
  },
  {
    id: 'prev-track',
    category: 'Playback',
    keys: ['P'],
    description: 'Previous track',
    detail: 'Return to start of current song or jump to previous track',
  },
  {
    id: 'seek-back',
    category: 'Playback',
    keys: ['←'],
    description: 'Seek backward 5 seconds',
    detail: 'Fine-grain rewind during playback',
  },
  {
    id: 'seek-fwd',
    category: 'Playback',
    keys: ['→'],
    description: 'Seek forward 5 seconds',
    detail: 'Fine-grain fast-forward during playback',
  },
  {
    id: 'seek-back-large',
    category: 'Playback',
    keys: ['Shift', '←'],
    description: 'Seek backward 15 seconds',
    detail: 'Quickly rewind sections of longer tracks',
  },
  {
    id: 'seek-fwd-large',
    category: 'Playback',
    keys: ['Shift', '→'],
    description: 'Seek forward 15 seconds',
    detail: 'Quickly jump ahead through the song',
  },
  {
    id: 'vol-up',
    category: 'Playback',
    keys: ['↑'],
    description: 'Increase volume (+5%)',
    detail: 'Step-by-step volume increase',
  },
  {
    id: 'vol-down',
    category: 'Playback',
    keys: ['↓'],
    description: 'Decrease volume (-5%)',
    detail: 'Step-by-step volume decrease',
  },
  {
    id: 'mute',
    category: 'Playback',
    keys: ['M'],
    description: 'Toggle mute / unmute',
    detail: 'Instantly silence or restore audio volume',
  },
  {
    id: 'shuffle',
    category: 'Playback',
    keys: ['S'],
    description: 'Toggle shuffle mode',
    detail: 'Randomize playback order for the current queue',
  },
  {
    id: 'repeat',
    category: 'Playback',
    keys: ['R'],
    description: 'Cycle repeat mode',
    detail: 'Cycle through Repeat Off → Repeat All → Repeat One Track',
  },

  // Lyrics & Persian Translation
  {
    id: 'lyrics-toggle',
    category: 'Lyrics & Persian',
    keys: ['L'],
    description: 'Open / close synchronized lyrics screen',
    detail: 'Shows real-time LRC synced lyrics with line-by-line Persian translation',
  },
  {
    id: 'lyrics-click-seek',
    category: 'Lyrics & Persian',
    keys: ['Click Line'],
    description: 'Jump audio to lyric timestamp',
    detail: 'Clicking any synchronized lyric line immediately seeks the track there',
  },
  {
    id: 'lyrics-offset',
    category: 'Lyrics & Persian',
    keys: ['+', '-'],
    description: 'Adjust lyrics synchronization offset',
    detail: 'Fine-tune timing shift by ±0.2s for perfect vocal alignment',
  },
  {
    id: 'lyrics-edit-fa',
    category: 'Lyrics & Persian',
    keys: ['Edit Icon'],
    description: 'Edit Persian line translation',
    detail: 'Hover over any lyric row to customize or override the Persian translation',
  },

  // Overlays & Visuals
  {
    id: 'visualizer-toggle',
    category: 'Overlays & Visuals',
    keys: ['V'],
    description: 'Toggle real-time audio visualizer',
    detail: 'Interactive Web Audio AnalyserNode frequency spectrum & waveform canvas',
  },
  {
    id: 'queue-toggle',
    category: 'Overlays & Visuals',
    keys: ['Q'],
    description: 'Open / close playback queue drawer',
    detail: 'Inspect up-next tracks, remove items, or clear future queue',
  },
  {
    id: 'context-menu',
    category: 'Overlays & Visuals',
    keys: ['Right Click'],
    description: 'Open track context menu',
    detail: 'Quick access to play next, add to playlist, edit metadata, or delete',
  },

  // Navigation
  {
    id: 'search-ctrl-f',
    category: 'Navigation',
    keys: ['Ctrl', 'F'],
    description: 'Focus search bar',
    detail: 'Quickly find songs, artists, and albums (Cmd+F on macOS)',
  },
  {
    id: 'search-slash',
    category: 'Navigation',
    keys: ['/'],
    description: 'Quick search shortcut',
    detail: 'Immediate jump to music search when not focused on an input field',
  },

  // System
  {
    id: 'shortcuts-help',
    category: 'System',
    keys: ['?'],
    description: 'Open this Keyboard Shortcuts dialog',
    detail: 'Shift + / displays this searchable reference guide anytime',
  },
  {
    id: 'close-overlay',
    category: 'System',
    keys: ['Esc'],
    description: 'Close active dialog, modal, or overlay',
    detail: 'Dismisses lyrics, visualizer, queue, modals, and context menus',
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory>('All');

  const categories: ShortcutCategory[] = [
    'All',
    'Playback',
    'Lyrics & Persian',
    'Overlays & Visuals',
    'Navigation',
    'System',
  ];

  const categoryIcons: Record<string, React.ReactNode> = {
    Playback: <Music size={13} className="text-emerald-400" />,
    'Lyrics & Persian': <Sparkles size={13} className="text-indigo-400" />,
    'Overlays & Visuals': <Sliders size={13} className="text-cyan-400" />,
    Navigation: <Layout size={13} className="text-amber-400" />,
    System: <HelpCircle size={13} className="text-neutral-400" />,
  };

  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS_LIST.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.description.toLowerCase().includes(q) ||
        (item.detail && item.detail.toLowerCase().includes(q)) ||
        item.keys.some((k) => k.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = { All: SHORTCUTS_LIST.length };
    SHORTCUTS_LIST.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Keyboard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-100 text-sm">Keyboard Shortcuts</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-neutral-300">
                  {SHORTCUTS_LIST.length} actions
                </span>
              </div>
              <p className="text-xs text-neutral-400">Quickly control Nocturne with your keyboard</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-white/5 space-y-3 bg-neutral-950/30 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts by action, key, or category (e.g. Space, Next, Persian, Seek)..."
              className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 shadow-inner"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = countsByCategory[cat] ?? 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500 text-neutral-950 font-bold shadow'
                      : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {cat !== 'All' && categoryIcons[cat]}
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-neutral-950/20 text-neutral-900 font-extrabold' : 'bg-white/5 text-neutral-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredShortcuts.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <p className="text-neutral-400 text-sm font-semibold">No shortcuts match &ldquo;{search}&rdquo;</p>
              <p className="text-neutral-500 text-xs">Try searching for &quot;play&quot;, &quot;seek&quot;, &quot;lyrics&quot;, &quot;volume&quot;, or &quot;persian&quot;.</p>
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-xs group"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-200 group-hover:text-white transition-colors">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-neutral-500 px-2 py-0.5 rounded bg-white/5 font-medium">
                      {item.category}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                      {item.detail}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.keys.map((k, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-neutral-500 text-[10px] font-bold">+</span>}
                      <kbd className="min-w-6 px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-white/20 text-neutral-100 font-mono text-[11px] font-semibold text-center shadow-md">
                        {k === 'Ctrl' ? (
                          <span className="flex items-center gap-1">
                            <Command size={11} className="inline opacity-80" />
                            <span>Ctrl</span>
                          </span>
                        ) : (
                          k
                        )}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950/80 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-white/20 text-neutral-200 font-mono text-[10px] font-bold">?</kbd>
            <span>anytime to toggle this guide</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
