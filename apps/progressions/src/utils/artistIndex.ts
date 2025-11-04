import { ChordProgression } from '../types';
import { parseSongString } from './songUtils';

export interface ArtistIndex {
  [artist: string]: {
    progressions: ChordProgression[];
    songCount: number;
  };
}

/**
 * Creates an index of progressions by artist
 */
export function createArtistIndex(progressions: ChordProgression[]): ArtistIndex {
  const index: ArtistIndex = {};

  progressions.forEach(progression => {
    progression.songs.forEach(songString => {
      const song = parseSongString(songString);
      if (song.artist) {
        const artistLower = song.artist.toLowerCase();
        if (!index[artistLower]) {
          index[artistLower] = {
            progressions: [],
            songCount: 0
          };
        }
        
        // Only add progression if not already in the list for this artist
        if (!index[artistLower].progressions.some(p => p.name === progression.name)) {
          index[artistLower].progressions.push(progression);
        }
        index[artistLower].songCount++;
      }
    });
  });

  return index;
}

/**
 * Finds all artists that match a search query
 */
export function findMatchingArtists(index: ArtistIndex, query: string): string[] {
  if (!query.trim()) {
    return [];
  }

  const queryLower = query.toLowerCase();
  return Object.keys(index).filter(artist => 
    artist.includes(queryLower)
  );
}

/**
 * Filters progressions to only those that have songs by the matching artist
 */
export function filterProgressionsByArtist(
  progressions: ChordProgression[],
  artistQuery: string
): ChordProgression[] {
  if (!artistQuery.trim()) {
    return progressions;
  }

  const queryLower = artistQuery.toLowerCase();
  
  return progressions.filter(progression => {
    return progression.songs.some(songString => {
      const song = parseSongString(songString);
      return song.artist && song.artist.toLowerCase().includes(queryLower);
    });
  });
}

/**
 * Sorts songs in a progression to put matching artist songs first
 */
export function sortSongsByArtist(
  songs: string[],
  artistQuery: string
): string[] {
  if (!artistQuery.trim()) {
    return songs;
  }

  const queryLower = artistQuery.toLowerCase();
  
  const matching: string[] = [];
  const nonMatching: string[] = [];

  songs.forEach(songString => {
    const song = parseSongString(songString);
    if (song.artist && song.artist.toLowerCase().includes(queryLower)) {
      matching.push(songString);
    } else {
      nonMatching.push(songString);
    }
  });

  return [...matching, ...nonMatching];
}

