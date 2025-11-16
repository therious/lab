import type { LotteryGame, PredictionResult } from '../types';

// Import prediction function - we'll need to inline it for the worker
// or use a different approach

function generateRandomNumbers(
  count: number, 
  min: number, 
  max: number, 
  exclude: Set<number> = new Set()
): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!exclude.has(num)) {
      numbers.add(num);
    }
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hasBeenDrawn(
  numbers: number[],
  draws: { numbers: number[] }[]
): boolean {
  const sorted = [...numbers].sort((a, b) => a - b);
  return draws.some(draw => {
    const drawSorted = [...draw.numbers].sort((a, b) => a - b);
    return JSON.stringify(drawSorted) === JSON.stringify(sorted);
  });
}

function calculateNumberFrequencies(
  draws: { numbers: number[] }[],
  min: number,
  max: number
): Map<number, number> {
  const frequencies = new Map<number, number>();
  
  for (let num = min; num <= max; num++) {
    frequencies.set(num, 0);
  }
  
  draws.forEach(draw => {
    draw.numbers.forEach(num => {
      frequencies.set(num, (frequencies.get(num) || 0) + 1);
    });
  });
  
  return frequencies;
}

function calculatePairFrequencies(
  draws: { numbers: number[] }[]
): Map<string, number> {
  const pairFreq = new Map<string, number>();
  
  draws.forEach(draw => {
    const sorted = [...draw.numbers].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const pair = `${sorted[i]}-${sorted[j]}`;
        pairFreq.set(pair, (pairFreq.get(pair) || 0) + 1);
      }
    }
  });
  
  return pairFreq;
}

function scoreCombination(
  numbers: number[],
  game: LotteryGame,
  numberFreq: Map<number, number>,
  pairFreq: Map<string, number>
): number {
  let score = 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  
  const avgFreq = sorted.reduce((sum, num) => sum + (numberFreq.get(num) || 0), 0) / sorted.length;
  const maxFreq = Math.max(...Array.from(numberFreq.values()));
  const normalizedFreq = avgFreq / (maxFreq || 1);
  score += Math.abs(normalizedFreq - 0.5) < 0.3 ? 0.3 : 0.1;
  
  let pairScore = 0;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const pair = `${sorted[i]}-${sorted[j]}`;
      const freq = pairFreq.get(pair) || 0;
      pairScore += Math.min(freq / 10, 0.1);
    }
  }
  score += Math.min(pairScore / (sorted.length * (sorted.length - 1) / 2), 0.2);
  
  const spread = sorted[sorted.length - 1] - sorted[0];
  const range = game.mainNumbers.max - game.mainNumbers.min;
  const spreadRatio = spread / range;
  if (spreadRatio > 0.3 && spreadRatio < 0.8) {
    score += 0.2;
  }
  
  const oddCount = sorted.filter(n => n % 2 === 1).length;
  const evenCount = sorted.length - oddCount;
  const balance = Math.abs(oddCount - evenCount) / sorted.length;
  if (balance < 0.3) {
    score += 0.2;
  }
  
  const sum = sorted.reduce((a, b) => a + b, 0);
  const minSum = (game.mainNumbers.min * sorted.length);
  const maxSum = (game.mainNumbers.max * sorted.length);
  const sumRatio = (sum - minSum) / (maxSum - minSum);
  if (sumRatio > 0.3 && sumRatio < 0.7) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

function predictNumbers(
  game: LotteryGame,
  maxCandidates: number = 10000,
  preselectedMain: Set<number> = new Set(),
  preselectedBonus?: Set<number>
): PredictionResult {
  const draws = game.draws;
  
  if (draws.length === 0) {
    const numbers = preselectedMain.size > 0
      ? Array.from(preselectedMain).slice(0, game.mainNumbers.count).sort((a, b) => a - b)
      : generateRandomNumbers(
          game.mainNumbers.count,
          game.mainNumbers.min,
          game.mainNumbers.max
        );
    return {
      numbers,
      bonus: game.bonusNumber
        ? (preselectedBonus && preselectedBonus.size > 0
            ? Array.from(preselectedBonus)[0]
            : generateRandomNumber(game.bonusNumber.min, game.bonusNumber.max))
        : undefined,
      confidence: 0.5,
      reasoning: 'No historical data available. Generated random numbers.',
      handPickedMain: preselectedMain.size > 0 ? Array.from(preselectedMain).sort((a, b) => a - b) : undefined,
      handPickedBonus: preselectedBonus && preselectedBonus.size > 0 ? Array.from(preselectedBonus)[0] : undefined,
    };
  }
  
  const numberFreq = calculateNumberFrequencies(
    draws,
    game.mainNumbers.min,
    game.mainNumbers.max
  );
  const pairFreq = calculatePairFrequencies(draws);
  
  // Handle preselected numbers
  const handPickedMain = Array.from(preselectedMain).sort((a, b) => a - b);
  const remainingCount = game.mainNumbers.count - preselectedMain.size;
  
  if (preselectedMain.size > game.mainNumbers.count) {
    const trimmed = Array.from(preselectedMain).slice(0, game.mainNumbers.count).sort((a, b) => a - b);
    return {
      numbers: trimmed,
      bonus: undefined,
      confidence: 0.5,
      reasoning: 'Too many numbers preselected. Using first selections.',
      handPickedMain: trimmed,
    };
  }
  
  const candidates: Array<{ numbers: number[]; score: number }> = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < maxCandidates; i++) {
    let numbers: number[];
    
    if (preselectedMain.size > 0) {
      const remaining = generateRandomNumbers(
        remainingCount,
        game.mainNumbers.min,
        game.mainNumbers.max,
        preselectedMain
      );
      numbers = [...handPickedMain, ...remaining].sort((a, b) => a - b);
    } else {
      numbers = generateRandomNumbers(
        game.mainNumbers.count,
        game.mainNumbers.min,
        game.mainNumbers.max
      );
    }
    
    const key = JSON.stringify([...numbers].sort((a, b) => a - b));
    
    if (seen.has(key) || hasBeenDrawn(numbers, draws)) {
      continue;
    }
    
    seen.add(key);
    const score = scoreCombination(numbers, game, numberFreq, pairFreq);
    candidates.push({ numbers, score });
  }
  
  candidates.sort((a, b) => b.score - a.score);
  
  const best = candidates[0] || {
    numbers: preselectedMain.size > 0
      ? (() => {
          const remaining = generateRandomNumbers(
            remainingCount,
            game.mainNumbers.min,
            game.mainNumbers.max,
            preselectedMain
          );
          return [...handPickedMain, ...remaining].sort((a, b) => a - b);
        })()
      : generateRandomNumbers(
          game.mainNumbers.count,
          game.mainNumbers.min,
          game.mainNumbers.max
        ),
    score: 0.5,
  };
  
  let bonus: number | undefined;
  let handPickedBonus: number | undefined;
  
  if (game.bonusNumber) {
    if (preselectedBonus && preselectedBonus.size > 0) {
      bonus = Array.from(preselectedBonus)[0];
      handPickedBonus = bonus;
    } else {
      const bonusFreq = new Map<number, number>();
      draws.forEach(draw => {
        if (draw.bonus !== undefined) {
          bonusFreq.set(draw.bonus, (bonusFreq.get(draw.bonus) || 0) + 1);
        }
      });
      
      const bonusCandidates = Array.from(bonusFreq.entries())
        .map(([num, freq]) => ({ num, freq }))
        .sort((a, b) => {
          const aDist = Math.abs(a.freq - draws.length / (game.bonusNumber!.max - game.bonusNumber!.min + 1));
          const bDist = Math.abs(b.freq - draws.length / (game.bonusNumber!.max - game.bonusNumber!.min + 1));
          return aDist - bDist;
        });
      
      bonus = bonusCandidates[0]?.num || generateRandomNumber(
        game.bonusNumber.min,
        game.bonusNumber.max
      );
    }
  }
  
  return {
    numbers: best.numbers.sort((a, b) => a - b),
    bonus,
    confidence: best.score,
    reasoning: `Based on ${draws.length} historical draws, this combination has not been drawn before and shows balanced frequency patterns.`,
    handPickedMain: preselectedMain.size > 0 ? handPickedMain : undefined,
    handPickedBonus,
  };
}

// Web Worker message handler
self.onmessage = (event: MessageEvent<{ 
  game: LotteryGame; 
  maxCandidates: number;
  preselectedMain?: number[];
  preselectedBonus?: number[];
}>) => {
  const { game, maxCandidates, preselectedMain, preselectedBonus } = event.data;
  
  try {
    const preselectedMainSet = preselectedMain ? new Set(preselectedMain) : new Set<number>();
    const preselectedBonusSet = preselectedBonus ? new Set(preselectedBonus) : undefined;
    const result = predictNumbers(game, maxCandidates, preselectedMainSet, preselectedBonusSet);
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
