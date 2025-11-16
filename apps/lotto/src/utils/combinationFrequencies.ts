import type { LotteryGame } from '../types';
import { getRangeForDate, historicalRanges } from '../data/historicalRanges';

/**
 * Calculate frequency of number combinations of a given size
 * Returns a map where keys are sorted combination strings (e.g., "7-23-45")
 * and values are the count of times that combination appeared
 */
export function calculateCombinationFrequencies(
  game: LotteryGame,
  combinationSize: number,
  filterDate?: string
): Map<string, number> {
  const frequencies = new Map<string, number>();
  
  // Filter draws by date if provided
  const draws = filterDate 
    ? game.draws.filter(draw => draw.date >= filterDate)
    : game.draws;
  
  draws.forEach(draw => {
    const sorted = [...draw.numbers].sort((a, b) => a - b);
    
    // Generate all combinations of the specified size
    generateCombinations(sorted, combinationSize).forEach(combo => {
      const key = combo.join('-');
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
    });
  });
  
  return frequencies;
}

/**
 * Generate all combinations of a given size from an array
 */
export function generateCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (size > arr.length) return [];
  
  const combinations: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === size) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return combinations;
}

/**
 * Get the date when a number first became available (based on historical ranges)
 */
export function getNumberIntroductionDate(
  gameName: string,
  number: number,
  isBonus: boolean = false
): string | null {
  const ranges = historicalRanges[gameName];
  
  if (!ranges || ranges.length === 0) {
    return null;
  }
  
  // Find the earliest date when this number was in range
  // Sort by date to find the earliest
  const sortedRanges = [...ranges].sort((a, b) => a.date.localeCompare(b.date));
  
  for (const entry of sortedRanges) {
    if (isBonus) {
      if (number >= entry.range.bonusMin && number <= entry.range.bonusMax) {
        return entry.date;
      }
    } else {
      if (number >= entry.range.mainMin && number <= entry.range.mainMax) {
        return entry.date;
      }
    }
  }
  
  return null;
}

/**
 * Get all dates when a number was drawn, sorted most recent first
 */
export function getNumberDrawHistory(
  game: LotteryGame,
  number: number,
  gameName: string,
  isBonus: boolean = false
): string[] {
  const introductionDate = getNumberIntroductionDate(gameName, number, isBonus);
  
  // Filter draws to only include those where:
  // 1. The number was actually drawn
  // 2. The draw date is on or after the introduction date
  const relevantDraws = game.draws
    .filter(draw => {
      if (isBonus) {
        if (draw.bonus !== number) return false;
      } else {
        if (!draw.numbers.includes(number)) return false;
      }
      if (introductionDate && draw.date < introductionDate) return false;
      return true;
    })
    .map(draw => draw.date)
    .sort((a, b) => b.localeCompare(a)); // Most recent first
  
  return relevantDraws;
}

/**
 * Get the earliest introduction date and latest draw date for uniform scaling
 */
export function getUniformTimelineRange(
  game: LotteryGame,
  gameName: string,
  numbers: number[],
  isBonus: boolean = false
): { earliestDate: string; latestDate: string } | null {
  if (game.draws.length === 0) return null;
  
  // Find earliest introduction date among all numbers
  let earliestDate: string | null = null;
  for (const num of numbers) {
    const introDate = getNumberIntroductionDate(gameName, num, isBonus);
    if (introDate && (!earliestDate || introDate < earliestDate)) {
      earliestDate = introDate;
    }
  }
  
  // Find latest draw date
  const latestDate = game.draws.reduce((latest, draw) => 
    draw.date > latest ? draw.date : latest, 
    game.draws[0].date
  );
  
  if (!earliestDate) return null;
  
  return { earliestDate, latestDate };
}

/**
 * Get top N most frequent combinations
 */
export function getTopCombinations(
  frequencies: Map<string, number>,
  topN: number = 20
): Array<{ combination: number[]; frequency: number }> {
  return Array.from(frequencies.entries())
    .map(([key, freq]) => ({
      combination: key.split('-').map(Number),
      frequency: freq,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, topN);
}

/**
 * Get all dates when a specific combination of numbers appeared together
 */
export function getCombinationDrawDates(
  game: LotteryGame,
  combination: number[],
  combinationSize: number,
  filterDate?: string
): string[] {
  const dates: string[] = [];
  const sortedCombo = [...combination].sort((a, b) => a - b);
  const comboKey = sortedCombo.join('-');
  
  // Filter draws by date if provided
  const draws = filterDate 
    ? game.draws.filter(draw => draw.date >= filterDate)
    : game.draws;
  
  draws.forEach(draw => {
    const sorted = [...draw.numbers].sort((a, b) => a - b);
    
    // Generate all combinations of the specified size from this draw
    const drawCombos = generateCombinations(sorted, combinationSize);
    
    // Check if this draw contains our combination
    const hasCombo = drawCombos.some(combo => {
      const key = combo.join('-');
      return key === comboKey;
    });
    
    if (hasCombo) {
      dates.push(draw.date);
    }
  });
  
  // Sort most recent first
  return dates.sort((a, b) => b.localeCompare(a));
}
