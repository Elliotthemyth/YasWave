export type SmartRuleField =
  | 'title'
  | 'artist'
  | 'album'
  | 'genre'
  | 'playCount'
  | 'dateAdded'
  | 'lastPlayedAt'
  | 'duration'
  | 'year'
  | 'isFavorite'
  | 'hasLyrics'
  | 'bpm'
  | 'key';

export type SmartRuleOperator =
  | 'contains'
  | 'not_contains'
  | 'is'
  | 'is_not'
  | 'starts_with'
  | 'greater_than'
  | 'less_than'
  | 'equals'
  | 'in_last_days'
  | 'not_in_last_days'
  | 'is_true'
  | 'is_false';

export interface SmartRule {
  id: string;
  field: SmartRuleField;
  operator: SmartRuleOperator;
  value: string | number | boolean;
}

export type SmartMatchStrategy = 'all' | 'any';

export type SmartSortField =
  | 'dateAdded'
  | 'playCount'
  | 'lastPlayedAt'
  | 'title'
  | 'artist'
  | 'album'
  | 'duration'
  | 'year'
  | 'bpm'
  | 'key'
  | 'random';

export interface SmartPlaylistConfig {
  matchStrategy: SmartMatchStrategy; // 'all' (AND) or 'any' (OR)
  rules: SmartRule[];
  sortBy: SmartSortField;
  sortDirection: 'asc' | 'desc';
  limit?: number; // max tracks (e.g. 25, 50, 100, or undefined for all)
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  trackIds: string[]; // For manual playlists; for smart playlists, can cache or fallback
  coverArtUrl?: string;
  isPinned?: boolean;
  isSmart?: boolean;
  smartConfig?: SmartPlaylistConfig;
}

export type PlaylistSortOption = 'custom' | 'title' | 'artist' | 'album' | 'dateAdded' | 'duration';
export type SortDirection = 'asc' | 'desc';
