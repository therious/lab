export interface SongInfo {
  title: string;
  artist: string;
  variation?: string;
  key?: string;
  bpm?: number;
  displayText: string;
}

export function parseSongString(songString: string): SongInfo {
  // Format: "Song Title (Artist) [Key, BPM]" or "Song Title (Artist) [Key]" or "Song Title (Artist) - variation"
  const bracketMatch = songString.match(/\[([^\]]+)]/);
  let key: string | undefined;
  let bpm: number | undefined;

  if (bracketMatch) {
    const bracketContent = bracketMatch[1];
    const parts = bracketContent.split(',').map(p => p.trim());
    key = parts[0] || undefined;
    if (parts.length > 1) {
      const bpmMatch = parts[1].match(/(\d+)/);
      if (bpmMatch) {
        bpm = parseInt(bpmMatch[1], 10);
      }
    }
  }

  // Remove bracket content from string for parsing title/artist
  let cleanedString = songString.replace(/\s*\[[^\]]+]\s*/, '');

  // Check for variation (e.g., " - variation")
  let variation: string | undefined;
  const variationMatch = cleanedString.match(/^(.+?)\s*-\s*(.+)$/);
  if (variationMatch && !variationMatch[1].includes('(')) {
    // Only if it's not part of the artist name
    cleanedString = variationMatch[1];
    variation = variationMatch[2];
  }

  // Parse title and artist
  const match = cleanedString.match(/^(.+?)\s*\(([^)]+)\)(?:\s*-\s*(.+))?$/);

  if (match) {
    return {
      title: match[1].trim(),
      artist: match[2].trim(),
      variation: variation || match[3]?.trim(),
      key,
      bpm,
      displayText: songString // Keep original for display
    };
  }

  // Fallback if no parentheses
  return {
    title: cleanedString,
    artist: '',
    variation,
    key,
    bpm,
    displayText: songString
  };
}

export function formatSongString(title: string, artist: string, key?: string, bpm?: number, variation?: string): string {
  let result = `${title} (${artist})`;
  if (variation) {
    result += ` - ${variation}`;
  }
  if (key || bpm) {
    const parts: string[] = [];
    if (key) parts.push(key);
    if (bpm) parts.push(`${bpm} BPM`);
    result += ` [${parts.join(', ')}]`;
  }
  return result;
}

