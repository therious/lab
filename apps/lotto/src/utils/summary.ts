export interface LotterySummary {
  gameName: string;
  timestamp: string;
  numbers: number[];
  bonus?: number;
}

/**
 * Save the most recent summary to sessionStorage for a specific game (overwrites previous)
 */
export function saveSummaryToStorage(gameName: string, summary: LotterySummary): void {
  const key = `lotto_summary_${gameName.toLowerCase().replace(/\s+/g, '_')}`;
  sessionStorage.setItem(key, JSON.stringify(summary));
}

/**
 * Get the saved summary for a specific game (returns single summary or null)
 */
export function getSummaryFromStorage(gameName: string): LotterySummary | null {
  const key = `lotto_summary_${gameName.toLowerCase().replace(/\s+/g, '_')}`;
  const stored = sessionStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as LotterySummary;
  } catch {
    return null;
  }
}

/**
 * Get all summaries for all games (returns single summary per game or null)
 */
export function getAllSummaries(): Record<string, LotterySummary | null> {
  return {
    powerball: getSummaryFromStorage('Powerball'),
    megamillions: getSummaryFromStorage('Mega Millions'),
    lotto: getSummaryFromStorage('Lotto'),
  };
}

/**
 * Get count of saved tickets across all games
 */
export function getSavedTicketsCount(): number {
  const allSummaries = getAllSummaries();
  return (allSummaries.powerball ? 1 : 0) + 
         (allSummaries.megamillions ? 1 : 0) + 
         (allSummaries.lotto ? 1 : 0);
}

