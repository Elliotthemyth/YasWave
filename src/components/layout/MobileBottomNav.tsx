import React from 'react';
import { Home, Search, Library, Mic2, Settings } from 'lucide-react';
import { ActiveView } from './Sidebar';

interface MobileBottomNavProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenLyrics: () => void;
  accentColor?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onSelectView,
  onOpenLyrics,
  accentColor = '#19bebe',
}) => {
  const navItems = [
    { id: 'home' as ActiveView, label: 'Home', icon: Home },
    { id: 'library' as ActiveView, label: 'Library', icon: Library },
    { id: 'search' as ActiveView, label: 'Search', icon: Search },
    { id: 'lyrics' as const, label: 'Lyrics', icon: Mic2, isAction: true },
    { id: 'settings' as ActiveView, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-800/80 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] select-none">
      <div className="flex items-center justify-around w-full max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isAction && activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isAction) {
                  onOpenLyrics();
                } else {
                  onSelectView(item.id as ActiveView);
                }
              }}
              className="flex-1 py-1 px-1 flex flex-col items-center justify-center min-h-[48px] active:scale-95 transition-transform cursor-pointer"
            >
              <div
                className={`px-3 py-1 rounded-full transition-all flex items-center justify-center ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={isActive ? { color: accentColor } : { color: '#94a3b8' }}
                />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 ${
                  isActive ? 'font-bold' : 'text-neutral-400'
                }`}
                style={isActive ? { color: accentColor } : undefined}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
