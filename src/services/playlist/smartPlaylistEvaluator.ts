import { Track } from '../../types/track';
import {
  SmartPlaylistConfig,
  SmartRule,
  SmartRuleField,
  SmartRuleOperator,
  SmartSortField,
} from '../../types/playlist';

export interface SmartPlaylistPreset {
  id: string;
  name: string;
  description: string;
  iconName: 'Clock' | 'Flame' | 'Sparkles' | 'Compass' | 'Heart' | 'FileText' | 'Hourglass' | 'Radio';
  config: SmartPlaylistConfig;
}

/**
 * Evaluates whether an individual track satisfies a single smart rule.
 */
export function evaluateSmartRule(track: Track, rule: SmartRule, now = Date.now()): boolean {
  const { field, operator, value } = rule;

  switch (field) {
    case 'title':
    case 'artist':
    case 'album':
    case 'genre': {
      const trackVal = (track[field] || '').trim().toLowerCase();
      const targetVal = String(value ?? '').trim().toLowerCase();

      switch (operator) {
        case 'contains':
          return trackVal.includes(targetVal);
        case 'not_contains':
          return !trackVal.includes(targetVal);
        case 'is':
          return trackVal === targetVal;
        case 'is_not':
          return trackVal !== targetVal;
        case 'starts_with':
          return trackVal.startsWith(targetVal);
        default:
          return trackVal.includes(targetVal);
      }
    }

    case 'playCount': {
      const trackVal = track.playCount ?? 0;
      const targetVal = Number(value) || 0;

      switch (operator) {
        case 'greater_than':
          return trackVal > targetVal;
        case 'less_than':
          return trackVal < targetVal;
        case 'equals':
        case 'is':
          return trackVal === targetVal;
        case 'is_not':
          return trackVal !== targetVal;
        default:
          return trackVal >= targetVal;
      }
    }

    case 'duration': {
      const trackVal = track.duration || 0; // seconds
      const targetVal = Number(value) || 0;

      switch (operator) {
        case 'greater_than':
          return trackVal > targetVal;
        case 'less_than':
          return trackVal < targetVal;
        case 'equals':
        case 'is':
          return Math.round(trackVal) === Math.round(targetVal);
        default:
          return trackVal >= targetVal;
      }
    }

    case 'year': {
      const trackVal = track.year ?? 0;
      const targetVal = Number(value) || 0;

      switch (operator) {
        case 'greater_than':
          return trackVal > targetVal;
        case 'less_than':
          return trackVal > 0 && trackVal < targetVal;
        case 'equals':
        case 'is':
          return trackVal === targetVal;
        default:
          return trackVal === targetVal;
      }
    }

    case 'bpm': {
      const trackVal = track.bpm || 0;
      const targetVal = Number(value) || 0;

      switch (operator) {
        case 'greater_than':
          return trackVal > targetVal;
        case 'less_than':
          return trackVal > 0 && trackVal < targetVal;
        case 'equals':
        case 'is':
          return trackVal === targetVal;
        case 'is_not':
          return trackVal !== targetVal;
        default:
          return trackVal >= targetVal;
      }
    }

    case 'key': {
      const trackKey = (track.key || '').toLowerCase();
      const trackCamelot = (track.keyCamelot || '').toLowerCase();
      const target = String(value).toLowerCase().trim();

      switch (operator) {
        case 'contains':
          return trackKey.includes(target) || trackCamelot.includes(target);
        case 'is':
        case 'equals':
          return trackKey === target || trackCamelot === target;
        case 'is_not':
          return trackKey !== target && trackCamelot !== target;
        default:
          return trackKey.includes(target) || trackCamelot.includes(target);
      }
    }

    case 'dateAdded':
    case 'lastPlayedAt': {
      const trackTimestamp = track[field] || 0;

      switch (operator) {
        case 'in_last_days': {
          const days = Math.max(1, Number(value) || 30);
          const cutoff = now - days * 24 * 60 * 60 * 1000;
          return trackTimestamp >= cutoff;
        }
        case 'not_in_last_days': {
          const days = Math.max(1, Number(value) || 30);
          const cutoff = now - days * 24 * 60 * 60 * 1000;
          return trackTimestamp === 0 || trackTimestamp < cutoff;
        }
        case 'greater_than': {
          const targetVal = Number(value) || 0;
          return trackTimestamp > targetVal;
        }
        case 'less_than': {
          const targetVal = Number(value) || 0;
          return trackTimestamp < targetVal;
        }
        default:
          return true;
      }
    }

    case 'isFavorite': {
      const isFav = Boolean(track.isFavorite);
      const target = value === true || value === 'true';
      return operator === 'is_false' ? !isFav : target ? isFav : !isFav;
    }

    case 'hasLyrics': {
      const has = Boolean(track.lyrics && track.lyrics.trim().length > 0);
      const target = value === true || value === 'true';
      return operator === 'is_false' ? !has : target ? has : !has;
    }

    default:
      return true;
  }
}

/**
 * Sorts matching tracks based on SmartSortField and direction.
 */
export function sortSmartTracks(
  tracks: Track[],
  sortBy: SmartSortField,
  direction: 'asc' | 'desc'
): Track[] {
  const sorted = [...tracks];
  const mult = direction === 'asc' ? 1 : -1;

  if (sortBy === 'random') {
    // Deterministic or pseudo-random shuffle
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
    return sorted;
  }

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'dateAdded':
        return mult * ((a.dateAdded || 0) - (b.dateAdded || 0));
      case 'playCount':
        return mult * ((a.playCount || 0) - (b.playCount || 0));
      case 'lastPlayedAt':
        return mult * ((a.lastPlayedAt || 0) - (b.lastPlayedAt || 0));
      case 'duration':
        return mult * ((a.duration || 0) - (b.duration || 0));
      case 'year':
        return mult * ((a.year || 0) - (b.year || 0));
      case 'title':
        return mult * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'artist':
        return mult * a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
      case 'album':
        return mult * a.album.localeCompare(b.album, undefined, { sensitivity: 'base' });
      case 'bpm':
        return mult * ((a.bpm || 0) - (b.bpm || 0));
      case 'key':
        return mult * (a.key || '').localeCompare(b.key || '');
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Evaluates a complete Smart Playlist configuration against the library tracks.
 */
export function evaluateSmartPlaylist(
  config: SmartPlaylistConfig | undefined,
  allTracks: Track[]
): Track[] {
  if (!config || !config.rules || config.rules.length === 0) {
    // If no rules, sort and limit all tracks
    const sorted = sortSmartTracks(allTracks, config?.sortBy || 'dateAdded', config?.sortDirection || 'desc');
    return config?.limit && config.limit > 0 ? sorted.slice(0, config.limit) : sorted;
  }

  const { matchStrategy = 'all', rules, sortBy = 'dateAdded', sortDirection = 'desc', limit } = config;
  const now = Date.now();

  const filtered = allTracks.filter((track) => {
    if (matchStrategy === 'all') {
      return rules.every((rule) => evaluateSmartRule(track, rule, now));
    } else {
      return rules.some((rule) => evaluateSmartRule(track, rule, now));
    }
  });

  const sorted = sortSmartTracks(filtered, sortBy, sortDirection);
  return limit && limit > 0 ? sorted.slice(0, limit) : sorted;
}

/**
 * Extracts all distinct genres present in the library, sorted alphabetically.
 */
export function extractLibraryGenres(tracks: Track[]): string[] {
  const genres = new Set<string>();
  for (const track of tracks) {
    if (track.genre && track.genre.trim()) {
      genres.add(track.genre.trim());
    }
  }
  return Array.from(genres).sort((a, b) => a.localeCompare(b));
}

/**
 * Generates ready-to-use smart playlist presets.
 */
export function getSmartPlaylistPresets(availableGenres: string[] = []): SmartPlaylistPreset[] {
  const primaryGenre = availableGenres[0] || 'Ambient';

  return [
    {
      id: 'recently_added',
      name: 'Recently Added',
      description: 'Songs imported to your library in the last 30 days',
      iconName: 'Clock',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-ra-1',
            field: 'dateAdded',
            operator: 'in_last_days',
            value: 30,
          },
        ],
        sortBy: 'dateAdded',
        sortDirection: 'desc',
        limit: 50,
      },
    },
    {
      id: 'heavy_rotation',
      name: 'Heavy Rotation',
      description: 'Your most played tracks with at least 1 listen',
      iconName: 'Flame',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-hr-1',
            field: 'playCount',
            operator: 'greater_than',
            value: 0,
          },
        ],
        sortBy: 'playCount',
        sortDirection: 'desc',
        limit: 50,
      },
    },
    {
      id: 'unplayed_discoveries',
      name: 'Unplayed Discoveries',
      description: 'Hidden gems in your library that you haven’t listened to yet',
      iconName: 'Compass',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-ud-1',
            field: 'playCount',
            operator: 'equals',
            value: 0,
          },
        ],
        sortBy: 'dateAdded',
        sortDirection: 'desc',
        limit: 50,
      },
    },
    {
      id: 'genre_spotlight',
      name: `${primaryGenre} Spotlight`,
      description: `All tracks belonging to the ${primaryGenre} genre`,
      iconName: 'Radio',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-gs-1',
            field: 'genre',
            operator: 'contains',
            value: primaryGenre,
          },
        ],
        sortBy: 'artist',
        sortDirection: 'asc',
        limit: 100,
      },
    },
    {
      id: 'favorites_collection',
      name: 'Favorite Selections',
      description: 'All your favorited tracks, sorted by most played',
      iconName: 'Heart',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-fc-1',
            field: 'isFavorite',
            operator: 'is_true',
            value: true,
          },
        ],
        sortBy: 'playCount',
        sortDirection: 'desc',
      },
    },
    {
      id: 'with_lyrics',
      name: 'Sing-Along (With Lyrics)',
      description: 'Tracks that have synced or plain text lyrics attached',
      iconName: 'FileText',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-wl-1',
            field: 'hasLyrics',
            operator: 'is_true',
            value: true,
          },
        ],
        sortBy: 'title',
        sortDirection: 'asc',
        limit: 50,
      },
    },
    {
      id: 'deep_listening',
      name: 'Deep Listening (4+ mins)',
      description: 'Extended and epic audio journeys longer than 4 minutes',
      iconName: 'Hourglass',
      config: {
        matchStrategy: 'all',
        rules: [
          {
            id: 'rule-dl-1',
            field: 'duration',
            operator: 'greater_than',
            value: 240, // 4 minutes
          },
        ],
        sortBy: 'duration',
        sortDirection: 'desc',
        limit: 50,
      },
    },
  ];
}

/**
 * Generates a concise human-readable description for a Smart Playlist rule configuration.
 */
export function describeSmartPlaylistRules(config: SmartPlaylistConfig): string {
  if (!config.rules || config.rules.length === 0) {
    return 'All library tracks';
  }

  const parts: string[] = [];

  for (const rule of config.rules) {
    switch (rule.field) {
      case 'genre':
        parts.push(`Genre ${rule.operator === 'is' ? 'is' : 'contains'} "${rule.value}"`);
        break;
      case 'artist':
        parts.push(`Artist ${rule.operator === 'is' ? 'is' : 'contains'} "${rule.value}"`);
        break;
      case 'album':
        parts.push(`Album ${rule.operator === 'is' ? 'is' : 'contains'} "${rule.value}"`);
        break;
      case 'title':
        parts.push(`Title contains "${rule.value}"`);
        break;
      case 'playCount':
        if (rule.operator === 'equals' && Number(rule.value) === 0) {
          parts.push('Unplayed (0 plays)');
        } else {
          parts.push(`Plays ${rule.operator.replace('_', ' ')} ${rule.value}`);
        }
        break;
      case 'dateAdded':
        if (rule.operator === 'in_last_days') {
          parts.push(`Added in last ${rule.value} days`);
        } else {
          parts.push(`Date added ${rule.operator.replace('_', ' ')}`);
        }
        break;
      case 'lastPlayedAt':
        if (rule.operator === 'in_last_days') {
          parts.push(`Played in last ${rule.value} days`);
        } else {
          parts.push('Recently played');
        }
        break;
      case 'duration':
        parts.push(`Duration ${rule.operator === 'greater_than' ? '>' : '<'} ${Math.round(Number(rule.value) / 60)}m`);
        break;
      case 'isFavorite':
        parts.push(rule.operator === 'is_false' ? 'Not favorited' : 'Favorited');
        break;
      case 'hasLyrics':
        parts.push(rule.operator === 'is_false' ? 'Without lyrics' : 'Has lyrics');
        break;
      case 'year':
        parts.push(`Year ${rule.operator.replace('_', ' ')} ${rule.value}`);
        break;
      case 'bpm':
        parts.push(`BPM ${rule.operator.replace('_', ' ')} ${rule.value}`);
        break;
      case 'key':
        parts.push(`Key ${rule.operator === 'is' ? 'is' : 'contains'} "${rule.value}"`);
        break;
      default:
        parts.push(`${rule.field} ${rule.operator}`);
    }
  }

  const joiner = config.matchStrategy === 'any' ? ' OR ' : ' AND ';
  let summary = parts.join(joiner);

  if (config.limit && config.limit > 0) {
    summary += ` · Limit ${config.limit}`;
  }

  return summary;
}
