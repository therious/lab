export interface NumberRange {
  mainMin: number;
  mainMax: number;
  bonusMin: number;
  bonusMax: number;
}

export interface HistoricalRangeChange {
  date: string; // ISO date string YYYY-MM-DD - effective from this date
  range: NumberRange;
}

export interface GameHistoricalRanges {
  [gameName: string]: HistoricalRangeChange[];
}

/**
 * Historical number range changes for each lottery game
 * Dates are when the change became effective
 */
export const historicalRanges: GameHistoricalRanges = {
  'Mega Millions': [
    {
      date: '2002-05-15',
      range: { mainMin: 1, mainMax: 52, bonusMin: 1, bonusMax: 52 },
    },
    {
      date: '2005-06-22',
      range: { mainMin: 1, mainMax: 56, bonusMin: 1, bonusMax: 46 },
    },
    {
      date: '2013-10-19',
      range: { mainMin: 1, mainMax: 75, bonusMin: 1, bonusMax: 15 },
    },
    {
      date: '2017-10-28',
      range: { mainMin: 1, mainMax: 70, bonusMin: 1, bonusMax: 25 },
    },
    {
      date: '2025-04-08',
      range: { mainMin: 1, mainMax: 70, bonusMin: 1, bonusMax: 24 },
    },
  ],
  'Powerball': [
    {
      date: '1992-04-22',
      range: { mainMin: 1, mainMax: 45, bonusMin: 1, bonusMax: 45 },
    },
    {
      date: '1997-11-05',
      range: { mainMin: 1, mainMax: 49, bonusMin: 1, bonusMax: 42 },
    },
    {
      date: '2001-03-07',
      range: { mainMin: 1, mainMax: 49, bonusMin: 1, bonusMax: 42 },
    },
    {
      date: '2002-10-09',
      range: { mainMin: 1, mainMax: 53, bonusMin: 1, bonusMax: 42 },
    },
    {
      date: '2005-08-28',
      range: { mainMin: 1, mainMax: 55, bonusMin: 1, bonusMax: 42 },
    },
    {
      date: '2009-01-07',
      range: { mainMin: 1, mainMax: 59, bonusMin: 1, bonusMax: 39 },
    },
    {
      date: '2009-01-15',
      range: { mainMin: 1, mainMax: 59, bonusMin: 1, bonusMax: 35 },
    },
    {
      date: '2015-10-07',
      range: { mainMin: 1, mainMax: 69, bonusMin: 1, bonusMax: 26 },
    },
  ],
  'Lotto': [
    // Assume Lotto has always been the same (no historical changes)
    {
      date: '2001-01-01',
      range: { mainMin: 1, mainMax: 59, bonusMin: 1, bonusMax: 59 },
    },
  ],
};

/**
 * Get the valid number range for a given game and date
 */
export function getRangeForDate(
  gameName: string,
  date: string
): NumberRange | null {
  const ranges = historicalRanges[gameName];
  if (!ranges || ranges.length === 0) {
    return null;
  }

  // Find the most recent range change that applies to this date
  // Ranges are sorted by date (oldest first)
  let applicableRange = ranges[0].range;

  for (let i = ranges.length - 1; i >= 0; i--) {
    if (date >= ranges[i].date) {
      applicableRange = ranges[i].range;
      break;
    }
  }

  return applicableRange;
}

/**
 * Get all date boundaries where ranges changed
 */
export function getRangeChangeDates(gameName: string): string[] {
  const ranges = historicalRanges[gameName];
  if (!ranges) {
    return [];
  }
  return ranges.map(r => r.date);
}

