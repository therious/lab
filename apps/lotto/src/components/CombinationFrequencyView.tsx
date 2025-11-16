import { useMemo, useState } from 'react';
import type { LotteryGame } from '../types';
import { calculateCombinationFrequencies, getTopCombinations, getCombinationDrawDates } from '../utils/combinationFrequencies';
import './CombinationFrequencyView.css';

interface CombinationFrequencyViewProps {
  game: LotteryGame;
  predictedNumbers: number[];
  filterDate?: string;
  maxDisplay?: number;
}

export function CombinationFrequencyView({
  game,
  predictedNumbers,
  filterDate,
  maxDisplay = 20,
}: CombinationFrequencyViewProps) {
  const [hoveredCombination, setHoveredCombination] = useState<{
    combination: number[];
    size: number;
  } | null>(null);
  const [hoverDates, setHoverDates] = useState<string[]>([]);

  // Generate all combinations from the predicted numbers
  const predictedCombinations = useMemo(() => {
    const sorted = [...predictedNumbers].sort((a, b) => a - b);
    const combos: Map<number, number[][]> = new Map();
    
    // Generate combinations of size 2, 3, 4, 5, and 6 (if applicable)
    for (let size = 2; size <= Math.min(6, predictedNumbers.length); size++) {
      const sizeCombos = generateCombinationsFromArray(sorted, size);
      combos.set(size, sizeCombos);
    }
    
    return combos;
  }, [predictedNumbers]);

  // Calculate frequencies only for combinations that appear in the prediction
  const [pairFreq, tripletFreq, quadFreq, quintFreq, sextetFreq] = useMemo(() => {
    const allFreq = calculateCombinationFrequencies(game, 2, filterDate);
    const pairFreq = new Map<string, number>();
    const tripletFreq = new Map<string, number>();
    const quadFreq = new Map<string, number>();
    const quintFreq = new Map<string, number>();
    const sextetFreq = game.mainNumbers.count >= 6 ? new Map<string, number>() : null;
    
    // Only include frequencies for combinations that are in the prediction
    const pairCombos = predictedCombinations.get(2) || [];
    pairCombos.forEach(combo => {
      const key = combo.join('-');
      pairFreq.set(key, allFreq.get(key) || 0);
    });
    
    if (predictedCombinations.has(3)) {
      const allTripletFreq = calculateCombinationFrequencies(game, 3, filterDate);
      const tripletCombos = predictedCombinations.get(3) || [];
      tripletCombos.forEach(combo => {
        const key = combo.join('-');
        tripletFreq.set(key, allTripletFreq.get(key) || 0);
      });
    }
    
    if (predictedCombinations.has(4)) {
      const allQuadFreq = calculateCombinationFrequencies(game, 4, filterDate);
      const quadCombos = predictedCombinations.get(4) || [];
      quadCombos.forEach(combo => {
        const key = combo.join('-');
        quadFreq.set(key, allQuadFreq.get(key) || 0);
      });
    }
    
    if (predictedCombinations.has(5)) {
      const allQuintFreq = calculateCombinationFrequencies(game, 5, filterDate);
      const quintCombos = predictedCombinations.get(5) || [];
      quintCombos.forEach(combo => {
        const key = combo.join('-');
        quintFreq.set(key, allQuintFreq.get(key) || 0);
      });
    }
    
    if (sextetFreq && predictedCombinations.has(6)) {
      const allSextetFreq = calculateCombinationFrequencies(game, 6, filterDate);
      const sextetCombos = predictedCombinations.get(6) || [];
      sextetCombos.forEach(combo => {
        const key = combo.join('-');
        sextetFreq.set(key, allSextetFreq.get(key) || 0);
      });
    }
    
    return [pairFreq, tripletFreq, quadFreq, quintFreq, sextetFreq];
  }, [game, filterDate, predictedCombinations]);

  // Helper to generate combinations from an array
  function generateCombinationsFromArray<T>(arr: T[], size: number): T[][] {
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

  // Get combinations from frequencies, sorted by frequency
  const getCombinationsFromFreq = (
    frequencies: Map<string, number>
  ): Array<{ combination: number[]; frequency: number }> => {
    return Array.from(frequencies.entries())
      .map(([key, freq]) => ({
        combination: key.split('-').map(Number),
        frequency: freq,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  };

  const handleCombinationHover = (combination: number[], size: number) => {
    setHoveredCombination({ combination, size });
    const dates = getCombinationDrawDates(game, combination, size, filterDate);
    setHoverDates(dates);
  };

  const handleCombinationLeave = () => {
    setHoveredCombination(null);
    setHoverDates([]);
  };

  const relevantPairs = getCombinationsFromFreq(pairFreq);
  const relevantTriplets = getCombinationsFromFreq(tripletFreq);
  const relevantQuads = getCombinationsFromFreq(quadFreq);
  const relevantQuints = getCombinationsFromFreq(quintFreq);
  const relevantSextets = sextetFreq ? getCombinationsFromFreq(sextetFreq) : [];

  const renderCombinationList = (
    items: Array<{ combination: number[]; frequency: number }>,
    title: string,
    size: number
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="combination-group">
        <h4>{title}</h4>
        <div className="combination-list">
          {items.map((item, idx) => {
            const isHovered = hoveredCombination?.combination.join('-') === item.combination.join('-') &&
                             hoveredCombination?.size === size;
            
            return (
              <div
                key={idx}
                className={`combination-item ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => handleCombinationHover(item.combination, size)}
                onMouseLeave={handleCombinationLeave}
              >
                <span className="combination-numbers">
                  {item.combination.map((num, i) => (
                    <span key={i}>
                      <span className="predicted-number">
                        {num}
                      </span>
                      {i < item.combination.length - 1 && <span className="separator">-</span>}
                    </span>
                  ))}
                </span>
                <span className="combination-frequency">{item.frequency}</span>
                {isHovered && hoverDates.length > 0 && (
                  <div className="combination-dates-tooltip">
                    <div className="tooltip-header">Appeared on:</div>
                    <div className="tooltip-dates">
                      {hoverDates.slice(0, 10).map((date, dateIdx) => (
                        <div key={dateIdx} className="tooltip-date">
                          {new Date(date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      ))}
                      {hoverDates.length > 10 && (
                        <div className="tooltip-more">
                          ... and {hoverDates.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="combination-frequency-view">
      <h3>Combination Frequencies</h3>
      <p className="subtitle">
        Historical frequency of number combinations appearing together
        {filterDate && ` (from ${new Date(filterDate).toLocaleDateString()})`}
      </p>
      <p className="hint">
        Showing only combinations from your prediction. Hover over any combination to see dates when it appeared.
      </p>
      
      {renderCombinationList(relevantPairs, 'Pairs (2 numbers)', 2)}
      {renderCombinationList(relevantTriplets, 'Triplets (3 numbers)', 3)}
      {renderCombinationList(relevantQuads, 'Quadruplets (4 numbers)', 4)}
      {renderCombinationList(relevantQuints, 'Quintuplets (5 numbers)', 5)}
      {relevantSextets.length > 0 && renderCombinationList(relevantSextets, 'Sextuplets (6 numbers)', 6)}
    </div>
  );
}

