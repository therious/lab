export interface LotteryDraw {
  date: string; // ISO date string YYYY-MM-DD
  numbers: number[];
  bonus?: number; // Mega Ball or Powerball
}

export interface LotteryGame {
  name: string;
  mainNumbers: {
    count: number;
    min: number;
    max: number;
  };
  bonusNumber?: {
    min: number;
    max: number;
  };
  draws: LotteryDraw[];
}

export interface ScoreBreakdown {
  numberFrequency: number; // 0-0.3
  pairFrequency: number; // 0-0.2
  numberSpread: number; // 0-0.2
  oddEvenBalance: number; // 0-0.2
  sumDistribution: number; // 0-0.1
}

export interface PredictionResult {
  numbers: number[];
  bonus?: number;
  confidence: number; // 0-1 score indicating how "likely" this combination seems
  reasoning: string;
  handPickedMain?: number[]; // Numbers that were manually selected
  handPickedBonus?: number; // Bonus number that was manually selected
  scoreBreakdown?: ScoreBreakdown; // Detailed breakdown of confidence factors
}

