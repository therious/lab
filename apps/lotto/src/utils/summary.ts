import type { PredictionResult } from '../types';

export interface LotterySummary {
  gameName: string;
  timestamp: string;
  prediction: PredictionResult;
  gameConfig: {
    mainNumbers: { count: number; min: number; max: number };
    bonusNumber?: { min: number; max: number };
  };
}

/**
 * Format a prediction result as a human-readable summary
 */
export function formatPredictionSummary(summary: LotterySummary): string {
  const { gameName, timestamp, prediction, gameConfig } = summary;
  const date = new Date(timestamp).toLocaleString();
  
  let output = `\n${'='.repeat(60)}\n`;
  output += `${gameName.toUpperCase()} - Lottery Number Selection Summary\n`;
  output += `${'='.repeat(60)}\n\n`;
  output += `Generated: ${date}\n\n`;
  
  // Main numbers
  output += `Main Numbers (${gameConfig.mainNumbers.count} numbers from ${gameConfig.mainNumbers.min}-${gameConfig.mainNumbers.max}):\n`;
  output += `  ${prediction.numbers.map(n => n.toString().padStart(2, '0')).join(' - ')}\n\n`;
  
  // Bonus number if applicable
  if (prediction.bonus !== undefined && gameConfig.bonusNumber) {
    const bonusName = gameName === 'Powerball' ? 'Powerball' : gameName === 'Mega Millions' ? 'Mega Ball' : 'Bonus';
    output += `${bonusName} (${gameConfig.bonusNumber.min}-${gameConfig.bonusNumber.max}):\n`;
    output += `  ${prediction.bonus.toString().padStart(2, '0')}\n\n`;
  }
  
  // Hand-picked numbers if any
  if (prediction.handPickedMain && prediction.handPickedMain.length > 0) {
    output += `Hand-Picked Main Numbers:\n`;
    output += `  ${prediction.handPickedMain.map(n => n.toString().padStart(2, '0')).join(' - ')}\n\n`;
  }
  
  if (prediction.handPickedBonus !== undefined) {
    const bonusName = gameName === 'Powerball' ? 'Powerball' : gameName === 'Mega Millions' ? 'Mega Ball' : 'Bonus';
    output += `Hand-Picked ${bonusName}:\n`;
    output += `  ${prediction.handPickedBonus.toString().padStart(2, '0')}\n\n`;
  }
  
  // Confidence and reasoning
  output += `Confidence Score: ${(prediction.confidence * 100).toFixed(1)}%\n\n`;
  output += `Reasoning:\n`;
  output += `  ${prediction.reasoning}\n\n`;
  
  // Score breakdown if available
  if (prediction.scoreBreakdown) {
    output += `Score Breakdown:\n`;
    output += `  Number Frequency: ${(prediction.scoreBreakdown.numberFrequency * 100).toFixed(1)}%\n`;
    output += `  Pair Frequency: ${(prediction.scoreBreakdown.pairFrequency * 100).toFixed(1)}%\n`;
    output += `  Number Spread: ${(prediction.scoreBreakdown.numberSpread * 100).toFixed(1)}%\n`;
    output += `  Odd/Even Balance: ${(prediction.scoreBreakdown.oddEvenBalance * 100).toFixed(1)}%\n`;
    output += `  Sum Distribution: ${(prediction.scoreBreakdown.sumDistribution * 100).toFixed(1)}%\n\n`;
  }
  
  output += `${'='.repeat(60)}\n\n`;
  
  return output;
}

/**
 * Save a summary to localStorage for a specific game
 */
export function saveSummaryToStorage(gameName: string, summary: LotterySummary): void {
  const key = `lotto_summary_${gameName.toLowerCase().replace(/\s+/g, '_')}`;
  const summaries = getSummariesFromStorage(gameName);
  summaries.push(summary);
  
  // Keep only the last 10 summaries per game
  const trimmed = summaries.slice(-10);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

/**
 * Get all saved summaries for a specific game
 */
export function getSummariesFromStorage(gameName: string): LotterySummary[] {
  const key = `lotto_summary_${gameName.toLowerCase().replace(/\s+/g, '_')}`;
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as LotterySummary[];
  } catch {
    return [];
  }
}

/**
 * Get all summaries for all games
 */
export function getAllSummaries(): Record<string, LotterySummary[]> {
  return {
    powerball: getSummariesFromStorage('Powerball'),
    megamillions: getSummariesFromStorage('Mega Millions'),
    lotto: getSummariesFromStorage('Lotto'),
  };
}

/**
 * Get total count of all summaries across all games
 */
export function getTotalSummaryCount(): number {
  const all = getAllSummaries();
  return all.powerball.length + all.megamillions.length + all.lotto.length;
}

/**
 * Format all summaries for a game as a single human-readable document
 */
export function formatAllSummariesForGame(gameName: string): string {
  const summaries = getSummariesFromStorage(gameName);
  if (summaries.length === 0) {
    return `No saved summaries for ${gameName}.\n`;
  }
  
  let output = `\n${'='.repeat(60)}\n`;
  output += `ALL SAVED SUMMARIES FOR ${gameName.toUpperCase()}\n`;
  output += `${'='.repeat(60)}\n\n`;
  output += `Total summaries: ${summaries.length}\n\n`;
  
  summaries.forEach((summary, index) => {
    output += `\n--- Summary ${index + 1} of ${summaries.length} ---\n`;
    output += formatPredictionSummary(summary);
  });
  
  return output;
}

/**
 * Download summaries as a text file
 */
export function downloadSummariesAsFile(gameName: string): void {
  const content = formatAllSummariesForGame(gameName);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${gameName.toLowerCase().replace(/\s+/g, '_')}_summaries_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clear all summaries for a specific game
 */
export function clearSummariesForGame(gameName: string): void {
  const key = `lotto_summary_${gameName.toLowerCase().replace(/\s+/g, '_')}`;
  localStorage.removeItem(key);
}

