/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useLibrary } from './hooks/useLibrary';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Track } from './types/track';
import { DesktopTitleBar } from './components/layout/DesktopTitleBar';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { NowPlayingBar } from './components/player/NowPlayingBar';
import { QueueDrawer } from './components/player/QueueDrawer';
import { VisualizerOverlay } from './components/visualizer/VisualizerOverlay';
import { LyricsModal } from './components/lyrics/LyricsModal';
import { LyricsEditorModal } from './components/lyrics/LyricsEditorModal';
import { LyricsDiscoveryModal } from './components/lyrics/LyricsDiscoveryModal';
import { LyricsSyncStudioModal } from './components/lyrics/LyricsSyncStudioModal';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileFullPlayerModal } from './components/player/MobileFullPlayerModal';
import { EditTrackModal } from './components/modals/EditTrackModal';
import { CreatePlaylistModal } from './components/modals/CreatePlaylistModal';
import { SmartPlaylistModal } from './components/modals/SmartPlaylistModal';
import { ImportModal } from './components/modals/ImportModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { LyricsSearchModal } from './components/lyrics/LyricsSearchModal';
import { ContextMenu, ContextMenuProps } from './components/common/ContextMenu';
import { Playlist, SmartPlaylistConfig } from './types/playlist';

// Views
import { HomeView } from './components/views/HomeView';
import { LibraryView } from './components/views/LibraryView';
import { PlaylistDetailView } from './components/views/PlaylistDetailView';
import { FavoritesView } from './components/views/FavoritesView';
import { RecentlyPlayedView } from './components/views/RecentlyPlayedView';
import { SearchView } from './components/views/SearchView';
import { SettingsView } from './components/views/SettingsView';
import { DiagnosticsView } from './components/views/DiagnosticsView';

export default function App() {
  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
  const [viewHistory, setViewHistory] = useState<{ view: ActiveView; playlistId?: string }[]>([
    { view: 'home' },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Overlays state
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isSmartPlaylistModalOpen, setIsSmartPlaylistModalOpen] = useState(false);
  const [editingSmartPlaylist, setEditingSmartPlaylist] = useState<Playlist | null>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isLyricsSearchModalOpen, setIsLyricsSearchModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editingLyricsTrack, setEditingLyricsTrack] = useState<Track | null>(null);

  // Mobile & Studio Overlays
  const [isMobilePlayerExpanded, setIsMobilePlayerExpanded] = useState(false);
  const [isLyricsDiscoveryOpen, setIsLyricsDiscoveryOpen] = useState(false);
  const [isSyncStudioOpen, setIsSyncStudioOpen] = useState(false);
  const [syncStudioInitialLyrics, setSyncStudioInitialLyrics] = useState<string | undefined>();

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: Track;
  } | null>(null);

  // Themes
  const { preferences, updatePreferences, activeAccent } = useTheme();

  // Library
  const {
    tracks,
    playlists,
    isImporting,
    importProgress,
    importFiles,
    toggleFavorite,
    updateTrack,
    deleteTrack,
    recordTrackPlayed,
    createPlaylist,
    createSmartPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    analyzeTrackAudio,
    reloadData,
  } = useLibrary();

  // Audio Playback Engine
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    error,
    queue,
    history,
    currentIndex,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    cycleRepeatMode,
    toggleShuffle,
    setQueue,
    playTrackAtIndex,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = useAudioEngine();

  // Navigation handlers
  const handleSelectView = useCallback((view: ActiveView, playlistId?: string) => {
    setActiveView(view);
    setSelectedPlaylistId(playlistId);
    setViewHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, { view, playlistId }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleNavigateBack = useCallback(() => {
    if (historyIndex > 0) {
      const prev = viewHistory[historyIndex - 1];
      setHistoryIndex((i) => i - 1);
      setActiveView(prev.view);
      setSelectedPlaylistId(prev.playlistId);
    }
  }, [historyIndex, viewHistory]);

  const handleNavigateForward = useCallback(() => {
    if (historyIndex < viewHistory.length - 1) {
      const next = viewHistory[historyIndex + 1];
      setHistoryIndex((i) => i + 1);
      setActiveView(next.view);
      setSelectedPlaylistId(next.playlistId);
    }
  }, [historyIndex, viewHistory]);

  // Track playback handlers
  const handlePlayTrack = useCallback(
    async (track: Track, trackList: Track[]) => {
      const idx = trackList.findIndex((t) => t.id === track.id);
      await setQueue(trackList, idx >= 0 ? idx : 0, true);
      recordTrackPlayed(track.id);
    },
    [setQueue, recordTrackPlayed]
  );

  const handleShuffleAll = useCallback(
    async (trackList: Track[]) => {
      if (trackList.length === 0) return;
      if (!isShuffle) {
        toggleShuffle();
      }
      const randomStart = Math.floor(Math.random() * trackList.length);
      await setQueue(trackList, randomStart, true);
      recordTrackPlayed(trackList[randomStart].id);
    },
    [isShuffle, toggleShuffle, setQueue, recordTrackPlayed]
  );

  // Context Menu trigger
  const handleOpenContextMenu = useCallback((e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      track,
    });
  }, []);

  const handleCloseAllOverlays = useCallback(() => {
    setIsQueueOpen(false);
    setIsLyricsOpen(false);
    setIsVisualizerOpen(false);
    setIsImportModalOpen(false);
    setIsCreatePlaylistOpen(false);
    setIsSmartPlaylistModalOpen(false);
    setEditingSmartPlaylist(null);
    setIsShortcutsModalOpen(false);
    setIsLyricsSearchModalOpen(false);
    setEditingTrack(null);
    setEditingLyricsTrack(null);
    setContextMenu(null);
  }, []);

  // Smart playlist saving / updating
  const handleSaveSmartPlaylist = useCallback(
    async (name: string, description: string, config: SmartPlaylistConfig) => {
      if (editingSmartPlaylist) {
        await updatePlaylist(editingSmartPlaylist.id, {
          name,
          description,
          smartConfig: config,
        });
        setEditingSmartPlaylist(null);
      } else {
        const pl = await createSmartPlaylist(name, description, config);
        handleSelectView('playlist_detail', pl.id);
      }
    },
    [editingSmartPlaylist, updatePlaylist, createSmartPlaylist, handleSelectView]
  );

  const handleCreateStaticSnapshot = useCallback(
    async (name: string, description: string, trackIds: string[]) => {
      const pl = await createPlaylist(name, description);
      for (const trackId of trackIds) {
        await addTrackToPlaylist(pl.id, trackId);
      }
      handleSelectView('playlist_detail', pl.id);
    },
    [createPlaylist, addTrackToPlaylist, handleSelectView]
  );

  // Keyboard accessibility
  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onSeek: seekRelative,
    onVolumeChange: (delta) => setVolume(volume + delta),
    onToggleMute: toggleMute,
    onPlayNext: playNext,
    onPlayPrevious: playPrevious,
    onToggleShuffle: toggleShuffle,
    onCycleRepeat: cycleRepeatMode,
    onToggleQueue: () => setIsQueueOpen((prev) => !prev),
    onFocusSearch: () => handleSelectView('search'),
    onCloseOverlay: handleCloseAllOverlays,
    onToggleLyrics: () => setIsLyricsOpen((prev) => !prev),
    onToggleVisualizer: () => setIsVisualizerOpen((prev) => !prev),
    onOpenShortcuts: () => setIsShortcutsModalOpen(true),
  });

  // Studio & Discovery handlers
  const handleOpenSyncStudio = useCallback((track: Track, initialText?: string) => {
    setSyncStudioInitialLyrics(initialText ?? track.lyrics);
    setIsSyncStudioOpen(true);
  }, []);

  const handleSaveStudioLyrics = useCallback(
    (trackId: string, lrcContent: string) => {
      updateTrack(trackId, { lyrics: lrcContent, lyricsOffset: 0 });
    },
    [updateTrack]
  );

  const handleSaveDiscoveryLyrics = useCallback(
    (trackId: string, lrcText: string, persianTranslations?: Record<string, string>) => {
      updateTrack(trackId, {
        lyrics: lrcText,
        lyricsOffset: 0,
        ...(persianTranslations ? { persianTranslations } : {}),
      });
    },
    [updateTrack]
  );

  // Current active playlist object
  const currentPlaylist = playlists.find((pl) => pl.id === selectedPlaylistId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none">
      {/* 1. Linux Desktop Title Bar */}
      <DesktopTitleBar
        onClose={() => {
          window.close?.();
        }}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* 2. Middle Work Area: Left Sidebar + Center Main Views */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar
          activeView={activeView}
          selectedPlaylistId={selectedPlaylistId}
          playlists={playlists}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onSelectView={handleSelectView}
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          onOpenSmartPlaylist={() => {
            setEditingSmartPlaylist(null);
            setIsSmartPlaylistModalOpen(true);
          }}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        />

        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-neutral-900/40">
          <TopNav
            activeView={activeView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigateBack={handleNavigateBack}
            onNavigateForward={handleNavigateForward}
            canNavigateBack={historyIndex > 0}
            canNavigateForward={historyIndex < viewHistory.length - 1}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onToggleVisualizer={() => setIsVisualizerOpen((v) => !v)}
            onToggleLyrics={() => setIsLyricsOpen((l) => !l)}
            isVisualizerOpen={isVisualizerOpen}
            isLyricsOpen={isLyricsOpen}
            onSelectView={handleSelectView}
          />

          {/* Scrollable View Container (with bottom padding for mobile mini-player & bottom nav) */}
          <main className="flex-1 overflow-y-auto relative pb-32 md:pb-6">
            {activeView === 'home' && (
              <HomeView
                tracks={tracks}
                playlists={playlists}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
                onOpenContextMenu={handleOpenContextMenu}
                onSelectView={handleSelectView}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}

            {activeView === 'library' && (
              <LibraryView
                tracks={tracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
                onOpenContextMenu={handleOpenContextMenu}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onShuffleAll={handleShuffleAll}
              />
            )}

            {activeView === 'playlist_detail' && currentPlaylist && (
              <PlaylistDetailView
                playlist={currentPlaylist}
                allTracks={tracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
                onOpenContextMenu={handleOpenContextMenu}
                onShufflePlaylist={handleShuffleAll}
                onUpdatePlaylist={updatePlaylist}
                onDeletePlaylist={(id) => {
                  deletePlaylist(id);
                  handleSelectView('home');
                }}
                onRemoveTrackFromPlaylist={removeTrackFromPlaylist}
                onEditSmartRules={(pl) => {
                  setEditingSmartPlaylist(pl);
                  setIsSmartPlaylistModalOpen(true);
                }}
                onCreateStaticSnapshot={handleCreateStaticSnapshot}
              />
            )}

            {activeView === 'favorites' && (
              <FavoritesView
                tracks={tracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
                onOpenContextMenu={handleOpenContextMenu}
                onShuffleAll={handleShuffleAll}
              />
            )}

            {activeView === 'recently_played' && (
              <RecentlyPlayedView
                tracks={tracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
                onOpenContextMenu={handleOpenContextMenu}
              />
            )}

            {activeView === 'search' && (
              <SearchView
                tracks={tracks}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
                onOpenContextMenu={handleOpenContextMenu}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView
                preferences={preferences}
                onUpdatePreferences={updatePreferences}
                onReloadLibrary={reloadData}
                onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
              />
            )}

            {activeView === 'diagnostics' && <DiagnosticsView />}
          </main>
        </div>
      </div>

      {/* 3. Persistent Now Playing Bar */}
      <NowPlayingBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLoading={isLoading}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        error={error}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onToggleShuffle={toggleShuffle}
        onCycleRepeatMode={cycleRepeatMode}
        onToggleFavorite={toggleFavorite}
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        onToggleLyrics={() => setIsLyricsOpen((prev) => !prev)}
        onToggleVisualizer={() => setIsVisualizerOpen((prev) => !prev)}
        onExpandMobilePlayer={() => setIsMobilePlayerExpanded(true)}
        isQueueOpen={isQueueOpen}
        isLyricsOpen={isLyricsOpen}
        isVisualizerOpen={isVisualizerOpen}
        accentColor={activeAccent.primary}
      />

      {/* 3.1 Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeView={activeView}
        onSelectView={handleSelectView}
        onOpenLyrics={() => setIsLyricsOpen(true)}
        accentColor={activeAccent.primary}
      />

      {/* 3.2 Mobile Full Screen Expanded Player */}
      <MobileFullPlayerModal
        isOpen={isMobilePlayerExpanded}
        onClose={() => setIsMobilePlayerExpanded(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLoading={isLoading}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onToggleShuffle={toggleShuffle}
        onCycleRepeatMode={cycleRepeatMode}
        onToggleFavorite={toggleFavorite}
        onOpenLyrics={() => {
          setIsMobilePlayerExpanded(false);
          setIsLyricsOpen(true);
        }}
        onOpenQueue={() => {
          setIsMobilePlayerExpanded(false);
          setIsQueueOpen(true);
        }}
        onOpenVisualizer={() => {
          setIsMobilePlayerExpanded(false);
          setIsVisualizerOpen(true);
        }}
        onOpenSyncStudio={
          currentTrack
            ? () => {
                setIsMobilePlayerExpanded(false);
                handleOpenSyncStudio(currentTrack);
              }
            : undefined
        }
        accentColor={activeAccent.primary}
      />

      {/* 4. Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        history={history}
        currentIndex={currentIndex}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrackAtIndex={playTrackAtIndex}
        onRemoveFromQueue={removeFromQueue}
        onClearQueue={clearQueue}
      />

      {/* 5. Real-Time Audio Visualizer Modal */}
      <VisualizerOverlay
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        accentColor={activeAccent.primary}
      />

      {/* 6. Synced Lyrics Modal with Persian Translation & Controls */}
      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onSeek={seek}
        onUpdateTrackLyrics={(trackId, lyrics, offset, persianTranslations, provider) => {
          updateTrack(trackId, {
            lyrics,
            lyricsOffset: offset,
            persianTranslations,
            lyricsProvider: provider,
          });
        }}
        onOpenLyricsEditor={(track) => setEditingLyricsTrack(track)}
        onOpenLyricsSearch={() => setIsLyricsSearchModalOpen(true)}
        onOpenLyricsDiscovery={() => setIsLyricsDiscoveryOpen(true)}
        onOpenSyncStudio={handleOpenSyncStudio}
        accentColor={activeAccent.primary}
      />

      {/* 7. Lyrics Editor Modal */}
      <LyricsEditorModal
        isOpen={editingLyricsTrack !== null}
        onClose={() => setEditingLyricsTrack(null)}
        track={editingLyricsTrack}
        currentTime={currentTime}
        onSave={(trackId, lyrics) => {
          updateTrack(trackId, { lyrics });
        }}
      />

      {/* 8. Track Metadata Editor Modal */}
      <EditTrackModal
        isOpen={editingTrack !== null}
        onClose={() => setEditingTrack(null)}
        track={editingTrack}
        onSave={(trackId, updates) => {
          updateTrack(trackId, updates);
        }}
        onAnalyzeAudio={analyzeTrackAudio}
      />

      {/* 9. Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreate={(name, desc) => {
          createPlaylist(name, desc).then((pl) => {
            handleSelectView('playlist_detail', pl.id);
          });
        }}
        onOpenSmartPlaylist={() => {
          setEditingSmartPlaylist(null);
          setIsSmartPlaylistModalOpen(true);
        }}
      />

      {/* 10. Local File Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onFilesSelected={importFiles}
        isImporting={isImporting}
        importProgress={importProgress}
      />

      {/* 11. Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={contextMenu.track}
          playlists={playlists}
          currentPlaylistId={selectedPlaylistId}
          onClose={() => setContextMenu(null)}
          onPlayNow={(t) => handlePlayTrack(t, [t])}
          onPlayNext={playNextInQueue}
          onAddToQueue={addToQueue}
          onAddToPlaylist={addTrackToPlaylist}
          onRemoveFromPlaylist={removeTrackFromPlaylist}
          onToggleFavorite={toggleFavorite}
          onEditMetadata={(t) => setEditingTrack(t)}
          onAnalyzeAudio={analyzeTrackAudio}
          onDeleteTrack={deleteTrack}
        />
      )}

      {/* 12. Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* 13. Online Lyrics Search & Candidate Selector (LRCLIB) */}
      <LyricsSearchModal
        isOpen={isLyricsSearchModalOpen}
        onClose={() => setIsLyricsSearchModalOpen(false)}
        currentTrack={currentTrack}
        onSelectCandidate={(candidate) => {
          if (!currentTrack) return;
          const raw = candidate.syncedLyrics || candidate.plainLyrics || '';
          updateTrack(currentTrack.id, {
            lyrics: raw,
            lyricsOffset: 0,
            lyricsProvider: candidate.source,
          });
        }}
      />

      {/* 14. Smart Playlist Builder & Rules Editor Modal */}
      <SmartPlaylistModal
        isOpen={isSmartPlaylistModalOpen}
        onClose={() => {
          setIsSmartPlaylistModalOpen(false);
          setEditingSmartPlaylist(null);
        }}
        tracks={tracks}
        editingPlaylist={editingSmartPlaylist}
        onSave={handleSaveSmartPlaylist}
      />

      {/* 15. In-App Lyrics Discovery & Browser Modal */}
      <LyricsDiscoveryModal
        isOpen={isLyricsDiscoveryOpen}
        onClose={() => setIsLyricsDiscoveryOpen(false)}
        currentTrack={currentTrack}
        onSaveLyrics={handleSaveDiscoveryLyrics}
        onOpenSyncStudio={handleOpenSyncStudio}
        accentColor={activeAccent.primary}
      />

      {/* 16. Graphical Lyrics Synchronization Studio Modal */}
      <LyricsSyncStudioModal
        isOpen={isSyncStudioOpen}
        onClose={() => {
          setIsSyncStudioOpen(false);
          setSyncStudioInitialLyrics(undefined);
        }}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onSaveLyrics={handleSaveStudioLyrics}
        initialLyricsText={syncStudioInitialLyrics}
        accentColor={activeAccent.primary}
      />
    </div>
  );
}
