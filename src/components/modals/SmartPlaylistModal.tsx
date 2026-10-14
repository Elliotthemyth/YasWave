import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Clock,
  Flame,
  Compass,
  Radio,
  Heart,
  FileText,
  Hourglass,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Music,
} from 'lucide-react';
import { Track } from '../../types/track';
import {
  Playlist,
  SmartPlaylistConfig,
  SmartRule,
  SmartRuleField,
  SmartRuleOperator,
  SmartSortField,
} from '../../types/playlist';
import {
  evaluateSmartPlaylist,
  extractLibraryGenres,
  getSmartPlaylistPresets,
  SmartPlaylistPreset,
} from '../../services/playlist/smartPlaylistEvaluator';
import { formatTime } from '../../utils/formatters';

interface SmartPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onSave: (name: string, description: string, config: SmartPlaylistConfig) => void;
  editingPlaylist?: Playlist | null;
}

export const SmartPlaylistModal: React.FC<SmartPlaylistModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onSave,
  editingPlaylist,
}) => {
  const libraryGenres = useMemo(() => extractLibraryGenres(tracks), [tracks]);
  const presets = useMemo(() => getSmartPlaylistPresets(libraryGenres), [libraryGenres]);

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [matchStrategy, setMatchStrategy] = useState<'all' | 'any'>('all');
  const [rules, setRules] = useState<SmartRule[]>([
    {
      id: `rule-${Date.now()}-1`,
      field: 'genre',
      operator: 'contains',
      value: libraryGenres[0] || 'Ambient',
    },
  ]);
  const [sortBy, setSortBy] = useState<SmartSortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number | undefined>(50);
  const [showPreviewList, setShowPreviewList] = useState(false);

  // Populate state when opening in edit mode or create mode
  useEffect(() => {
    if (editingPlaylist && editingPlaylist.isSmart && editingPlaylist.smartConfig) {
      setName(editingPlaylist.name);
      setDescription(editingPlaylist.description || '');
      setMatchStrategy(editingPlaylist.smartConfig.matchStrategy || 'all');
      setRules(
        editingPlaylist.smartConfig.rules.length > 0
          ? editingPlaylist.smartConfig.rules
          : [
              {
                id: `rule-${Date.now()}-1`,
                field: 'genre',
                operator: 'contains',
                value: libraryGenres[0] || 'Ambient',
              },
            ]
      );
      setSortBy(editingPlaylist.smartConfig.sortBy || 'dateAdded');
      setSortDirection(editingPlaylist.smartConfig.sortDirection || 'desc');
      setLimit(editingPlaylist.smartConfig.limit);
      setActiveTab('custom');
    } else if (isOpen && !editingPlaylist) {
      // Default to first preset
      const defaultPreset = presets[0];
      setName(defaultPreset.name);
      setDescription(defaultPreset.description);
      setMatchStrategy(defaultPreset.config.matchStrategy);
      setRules(defaultPreset.config.rules);
      setSortBy(defaultPreset.config.sortBy);
      setSortDirection(defaultPreset.config.sortDirection);
      setLimit(defaultPreset.config.limit);
      setActiveTab('presets');
    }
  }, [isOpen, editingPlaylist, presets, libraryGenres]);

  // Current config object constructed from UI state
  const currentConfig: SmartPlaylistConfig = useMemo(
    () => ({
      matchStrategy,
      rules,
      sortBy,
      sortDirection,
      limit,
    }),
    [matchStrategy, rules, sortBy, sortDirection, limit]
  );

  // Live evaluation of matching tracks
  const matchingTracks = useMemo(() => {
    return evaluateSmartPlaylist(currentConfig, tracks);
  }, [currentConfig, tracks]);

  const totalDuration = useMemo(
    () => matchingTracks.reduce((acc, t) => acc + (t.duration || 0), 0),
    [matchingTracks]
  );

  if (!isOpen) return null;

  // Preset Selection
  const applyPreset = (preset: SmartPlaylistPreset) => {
    setName(preset.name);
    setDescription(preset.description);
    setMatchStrategy(preset.config.matchStrategy);
    setRules(preset.config.rules.map((r, i) => ({ ...r, id: `rule-p-${Date.now()}-${i}` })));
    setSortBy(preset.config.sortBy);
    setSortDirection(preset.config.sortDirection);
    setLimit(preset.config.limit);
  };

  // Rule operations
  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        field: 'genre',
        operator: 'contains',
        value: libraryGenres[0] || '',
      },
    ]);
  };

  const handleUpdateRule = (id: string, updates: Partial<SmartRule>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };

        // Adjust default operator and value when field changes
        if (updates.field && updates.field !== r.field) {
          switch (updates.field) {
            case 'genre':
              updated.operator = 'contains';
              updated.value = libraryGenres[0] || 'Ambient';
              break;
            case 'artist':
            case 'album':
            case 'title':
              updated.operator = 'contains';
              updated.value = '';
              break;
            case 'playCount':
              updated.operator = 'greater_than';
              updated.value = 0;
              break;
            case 'duration':
              updated.operator = 'greater_than';
              updated.value = 240; // 4 minutes
              break;
            case 'dateAdded':
            case 'lastPlayedAt':
              updated.operator = 'in_last_days';
              updated.value = 30;
              break;
            case 'isFavorite':
            case 'hasLyrics':
              updated.operator = 'is_true';
              updated.value = true;
              break;
            case 'year':
              updated.operator = 'greater_than';
              updated.value = 2020;
              break;
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(name.trim(), description.trim(), currentConfig);
    onClose();
  };

  const renderPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Clock':
        return <Clock size={18} className="text-emerald-400" />;
      case 'Flame':
        return <Flame size={18} className="text-amber-400" />;
      case 'Compass':
        return <Compass size={18} className="text-cyan-400" />;
      case 'Radio':
        return <Radio size={18} className="text-purple-400" />;
      case 'Heart':
        return <Heart size={18} className="text-rose-400 fill-rose-400/20" />;
      case 'FileText':
        return <FileText size={18} className="text-blue-400" />;
      case 'Hourglass':
        return <Hourglass size={18} className="text-indigo-400" />;
      default:
        return <Sparkles size={18} className="text-emerald-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-base">
                {editingPlaylist ? 'Edit Smart Playlist Rules' : 'Create Smart Playlist'}
              </h3>
              <p className="text-xs text-neutral-400">
                Automatically populates tracks using dynamic library metadata rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 px-6 pt-3 shrink-0 bg-neutral-950/40 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'presets'
                ? 'border-emerald-400 text-white bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'presets' ? 'text-emerald-400' : ''} />
            <span>Quick Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'custom'
                ? 'border-emerald-400 text-white bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers size={14} className={activeTab === 'custom' ? 'text-emerald-400' : ''} />
            <span>Rule Builder ({rules.length})</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Playlist Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Recently Added, Electronic Haven"
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of this dynamic playlist..."
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Select a Starting Preset
                </span>
                <span className="text-[11px] text-neutral-400">
                  Select to apply rule template, then customize further
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((preset) => {
                  const isCurrent = name === preset.name;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 group relative ${
                        isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/40'
                          : 'bg-neutral-950/60 border-white/5 hover:border-white/20 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                        {renderPresetIcon(preset.iconName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {preset.name}
                          </span>
                          {isCurrent && <Check size={14} className="text-emerald-400 shrink-0 ml-1" />}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {libraryGenres.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-medium text-neutral-400 block mb-2">
                    Quick Genre Selection from Your Library:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {libraryGenres.slice(0, 10).map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          setName(`${genre} Mix`);
                          setDescription(`All tracks tagged under ${genre}`);
                          setMatchStrategy('all');
                          setRules([
                            {
                              id: `rule-g-${Date.now()}`,
                              field: 'genre',
                              operator: 'contains',
                              value: genre,
                            },
                          ]);
                          setSortBy('artist');
                          setSortDirection('asc');
                          setLimit(100);
                        }}
                        className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30 border border-white/10 text-xs text-neutral-300 hover:text-emerald-300 transition-all font-mono"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CUSTOM RULES BUILDER */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              {/* Match Strategy Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-white/10">
                <span className="text-xs text-neutral-300 font-medium">Match tracks that satisfy:</span>
                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setMatchStrategy('all')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      matchStrategy === 'all'
                        ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    ALL Rules (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchStrategy('any')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      matchStrategy === 'any'
                        ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    ANY Rule (OR)
                  </button>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2.5">
                {rules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-neutral-950/80 border border-white/10 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-2.5"
                  >
                    <span className="text-[11px] font-mono text-neutral-500 w-5 shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Field Selector */}
                    <select
                      value={rule.field}
                      onChange={(e) =>
                        handleUpdateRule(rule.id, { field: e.target.value as SmartRuleField })
                      }
                      className="bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 shrink-0 font-medium"
                    >
                      <option value="genre">Genre</option>
                      <option value="playCount">Play Count</option>
                      <option value="dateAdded">Date Added</option>
                      <option value="artist">Artist</option>
                      <option value="title">Track Title</option>
                      <option value="album">Album</option>
                      <option value="duration">Duration (Seconds)</option>
                      <option value="year">Release Year</option>
                      <option value="lastPlayedAt">Last Played</option>
                      <option value="isFavorite">Favorite</option>
                      <option value="hasLyrics">Has Lyrics</option>
                    </select>

                    {/* Operator Selector */}
                    <select
                      value={rule.operator}
                      onChange={(e) =>
                        handleUpdateRule(rule.id, { operator: e.target.value as SmartRuleOperator })
                      }
                      className="bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 shrink-0"
                    >
                      {rule.field === 'genre' ||
                      rule.field === 'artist' ||
                      rule.field === 'album' ||
                      rule.field === 'title' ? (
                        <>
                          <option value="contains">contains</option>
                          <option value="not_contains">does not contain</option>
                          <option value="is">is exactly</option>
                          <option value="is_not">is not</option>
                          <option value="starts_with">starts with</option>
                        </>
                      ) : rule.field === 'playCount' ||
                        rule.field === 'duration' ||
                        rule.field === 'year' ? (
                        <>
                          <option value="greater_than">is greater than (&gt;)</option>
                          <option value="less_than">is less than (&lt;)</option>
                          <option value="equals">is equal to (=)</option>
                        </>
                      ) : rule.field === 'dateAdded' || rule.field === 'lastPlayedAt' ? (
                        <>
                          <option value="in_last_days">in the last (days)</option>
                          <option value="not_in_last_days">older than (days)</option>
                        </>
                      ) : (
                        <>
                          <option value="is_true">is true / yes</option>
                          <option value="is_false">is false / no</option>
                        </>
                      )}
                    </select>

                    {/* Value Input */}
                    {rule.field === 'isFavorite' || rule.field === 'hasLyrics' ? (
                      <span className="text-xs text-neutral-400 italic px-2">
                        {rule.operator === 'is_true' ? 'Active' : 'Not Active'}
                      </span>
                    ) : rule.field === 'genre' && libraryGenres.length > 0 ? (
                      <div className="flex-1 min-w-[120px] flex items-center gap-1.5">
                        <input
                          type="text"
                          value={String(rule.value || '')}
                          onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                          placeholder="Type or pick below..."
                          className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    ) : (
                      <input
                        type={
                          rule.field === 'playCount' ||
                          rule.field === 'duration' ||
                          rule.field === 'year' ||
                          rule.field === 'dateAdded' ||
                          rule.field === 'lastPlayedAt'
                            ? 'number'
                            : 'text'
                        }
                        value={String(rule.value ?? '')}
                        onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                        placeholder="Value..."
                        className="flex-1 min-w-[100px] bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                      />
                    )}

                    {/* Delete Rule button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      disabled={rules.length <= 1}
                      className="p-1.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:text-neutral-500 disabled:hover:bg-transparent transition-colors ml-auto"
                      title="Remove condition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Rule Button */}
              <button
                type="button"
                onClick={handleAddRule}
                className="w-full py-2 border border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={14} />
                <span>Add Another Condition</span>
              </button>

              {/* Sorting and Limits */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-white/10 space-y-3">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                  Sort & Limit Options
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Sort Tracks By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SmartSortField)}
                      className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="dateAdded">Date Added</option>
                      <option value="playCount">Play Count</option>
                      <option value="lastPlayedAt">Last Played</option>
                      <option value="title">Title</option>
                      <option value="artist">Artist</option>
                      <option value="album">Album</option>
                      <option value="duration">Duration</option>
                      <option value="year">Year</option>
                      <option value="random">Random Order</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Sort Direction</label>
                    <select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                      className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="desc">Descending (Highest / Newest)</option>
                      <option value="asc">Ascending (Lowest / Oldest)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Track Limit</label>
                    <select
                      value={limit || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLimit(val === 0 ? undefined : val);
                      }}
                      className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="0">No Limit (All matching)</option>
                      <option value="25">Max 25 Tracks</option>
                      <option value="50">Max 50 Tracks</option>
                      <option value="100">Max 100 Tracks</option>
                      <option value="250">Max 250 Tracks</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Bar */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">
                  Live Library Match: {matchingTracks.length} tracks
                </span>
                <span className="text-xs text-emerald-400/60 font-mono">
                  ({formatTime(totalDuration)})
                </span>
              </div>

              {matchingTracks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreviewList((prev) => !prev)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <span>{showPreviewList ? 'Hide Songs' : 'View Matching Songs'}</span>
                  {showPreviewList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            {/* Collapsible preview list */}
            {showPreviewList && matchingTracks.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pr-1 border-t border-emerald-500/10 pt-2">
                {matchingTracks.slice(0, 15).map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-black/30 text-neutral-300 font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-neutral-500 text-[10px] w-4">{i + 1}</span>
                      <Music size={12} className="text-emerald-400 shrink-0" />
                      <span className="text-white font-sans font-medium truncate">{t.title}</span>
                      <span className="text-neutral-400 font-sans truncate">· {t.artist}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 shrink-0">
                      {t.genre && <span className="px-1 bg-white/5 rounded">{t.genre}</span>}
                      <span>{t.playCount || 0} plays</span>
                      <span>{formatTime(t.duration)}</span>
                    </div>
                  </div>
                ))}
                {matchingTracks.length > 15 && (
                  <p className="text-[11px] text-neutral-400 text-center py-1">
                    + {matchingTracks.length - 15} more tracks in library
                  </p>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-white/10 flex items-center justify-between shrink-0 bg-neutral-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>{editingPlaylist ? 'Save Rule Changes' : 'Create Smart Playlist'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
