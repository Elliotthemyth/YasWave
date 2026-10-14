/**
 * Utility functions for matching and scoring lyrics candidate results
 * against current audio track metadata.
 */

// Normalize strings for fuzzy comparison: lowercase, strip punctuation, extra spaces
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Jaccard word similarity between two strings (0.0 to 1.0)
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const wordsA = new Set(normA.split(' '));
  const wordsB = new Set(normB.split(' '));

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

export interface MatchScoreParams {
  trackTitle: string;
  trackArtist: string;
  trackAlbum?: string;
  trackDuration?: number;
  candidateTitle: string;
  candidateArtist: string;
  candidateAlbum?: string;
  candidateDuration?: number;
  hasSyncedLyrics: boolean;
  isInstrumental: boolean;
}

/**
 * Compute a composite match score (0 - 100) for a candidate lyrics result.
 */
export function calculateLyricsMatchScore(params: MatchScoreParams): {
  score: number;
  durationDiff: number;
  isConfident: boolean;
} {
  const titleSim = stringSimilarity(params.trackTitle, params.candidateTitle);
  const artistSim = stringSimilarity(params.trackArtist, params.candidateArtist);

  let durationDiff = 0;
  let durationScore = 1.0;

  if (params.trackDuration && params.trackDuration > 0 && params.candidateDuration && params.candidateDuration > 0) {
    durationDiff = Math.abs(params.trackDuration - params.candidateDuration);
    if (durationDiff <= 2) {
      durationScore = 1.0;
    } else if (durationDiff <= 5) {
      durationScore = 0.9;
    } else if (durationDiff <= 10) {
      durationScore = 0.7;
    } else if (durationDiff <= 20) {
      durationScore = 0.4;
    } else {
      durationScore = Math.max(0, 1 - durationDiff / 40);
    }
  }

  let albumScore = 0.5;
  if (params.trackAlbum && params.candidateAlbum) {
    albumScore = stringSimilarity(params.trackAlbum, params.candidateAlbum);
  }

  // Weights: Title (40%), Artist (30%), Duration (20%), Album (10%)
  let totalScore =
    titleSim * 40 +
    artistSim * 30 +
    durationScore * 20 +
    albumScore * 10;

  // Bonus for synchronized lyrics
  if (params.hasSyncedLyrics) {
    totalScore = Math.min(100, totalScore + 5);
  }

  // Penalty if duration is drastically off (> 30s)
  if (durationDiff > 30) {
    totalScore = Math.max(0, totalScore - 30);
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, totalScore)));
  // Confident if score is >= 75 and title similarity is solid
  const isConfident = finalScore >= 75 && titleSim >= 0.6;

  return {
    score: finalScore,
    durationDiff: Math.round(durationDiff),
    isConfident,
  };
}
