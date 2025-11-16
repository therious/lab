import { useMemo, useState } from 'react';
import type { LotteryGame } from '../types';
import { getRangeForDate, getRangeChangeDates } from '../data/historicalRanges';
import './HeatMap.css';

type SortOrder = 'numeric' | 'frequency' | 'recent';

interface HeatMapProps {
  game: LotteryGame;
  filterDate?: string; // Only show draws from this date onwards
  onFilterDateChange?: (date: string | undefined) => void;
  selectedMainNumbers?: Set<number>;
  selectedBonusNumbers?: Set<number>;
  onMainNumberToggle?: (num: number) => void;
  onBonusNumberToggle?: (num: number) => void;
}

/**
 * Calculate frequency of each number in historical draws
 * Only counts numbers that were valid at the time of the draw
 */
function calculateFrequencies(
  draws: { numbers: number[]; date: string }[],
  gameName: string,
  min: number,
  max: number,
  filterDate?: string
): Map<number, number> {
  const frequencies = new Map<number, number>();
  
  // Initialize all numbers to 0
  for (let num = min; num <= max; num++) {
    frequencies.set(num, 0);
  }
  
  // Count occurrences, only considering draws where the number was valid
  draws.forEach(draw => {
    // If filtering by date, skip draws outside the range
    if (filterDate && draw.date < filterDate) {
      return;
    }
    
    const range = getRangeForDate(gameName, draw.date);
    if (!range) {
      return;
    }
    
    draw.numbers.forEach(num => {
      // Only count if the number was valid at the time of the draw
      if (num >= range.mainMin && num <= range.mainMax && num >= min && num <= max) {
        frequencies.set(num, (frequencies.get(num) || 0) + 1);
      }
    });
  });
  
  return frequencies;
}

/**
 * Calculate bonus number frequencies
 * Only counts numbers that were valid at the time of the draw
 */
function calculateBonusFrequencies(
  draws: { bonus?: number; date: string }[],
  gameName: string,
  min: number,
  max: number,
  filterDate?: string
): Map<number, number> {
  const frequencies = new Map<number, number>();
  
  for (let num = min; num <= max; num++) {
    frequencies.set(num, 0);
  }
  
  draws.forEach(draw => {
    // If filtering by date, skip draws outside the range
    if (filterDate && draw.date < filterDate) {
      return;
    }
    
    if (draw.bonus !== undefined) {
      const range = getRangeForDate(gameName, draw.date);
      if (range) {
        // Only count if the bonus number was valid at the time of the draw
        if (draw.bonus >= range.bonusMin && draw.bonus <= range.bonusMax && 
            draw.bonus >= min && draw.bonus <= max) {
          frequencies.set(draw.bonus, (frequencies.get(draw.bonus) || 0) + 1);
        }
      }
    }
  });
  
  return frequencies;
}

/**
 * Convert RGB to Lab color space for luminosity calculation
 */
function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  // Normalize RGB to 0-1
  r = r / 255;
  g = g / 255;
  b = b / 255;
  
  // Convert to linear RGB
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  // Convert to XYZ (using D65 illuminant)
  let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  
  // Convert to Lab
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
  
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);
  
  return { l, a, b: bLab };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h < 1/6) {
    r = c; g = x; b = 0;
  } else if (h < 2/6) {
    r = x; g = c; b = 0;
  } else if (h < 3/6) {
    r = 0; g = c; b = x;
  } else if (h < 4/6) {
    r = 0; g = x; b = c;
  } else if (h < 5/6) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

/**
 * Get color based on frequency using HSL interpolation (cyan to red)
 * Returns both background color and text color
 */
function getHeatColor(frequency: number, minFreq: number, maxFreq: number): { bg: string; text: string } {
  if (maxFreq === minFreq) {
    // All numbers have same frequency - use medium cyan
    const [r, g, b] = hslToRgb(180, 1.0, 0.5);
    const lab = rgbToLab(r, g, b);
    return {
      bg: `rgb(${r}, ${g}, ${b})`,
      text: lab.l > 50 ? '#000000' : '#ffffff',
    };
  }
  
  // Normalize frequency to 0-1 range
  const normalized = (frequency - minFreq) / (maxFreq - minFreq);
  
  // Interpolate hue from cyan (180°) to red (0°/360°)
  // Going the shorter way around the hue wheel: 180° -> 0°
  const hue = 180 - (normalized * 180);
  
  // Keep saturation and lightness constant
  const saturation = 1.0; // Fully saturated
  const lightness = 0.5;
  
  // Convert HSL to RGB
  const [r, g, b] = hslToRgb(hue, saturation, lightness);
  
  // Calculate Lab luminosity to determine text color
  const lab = rgbToLab(r, g, b);
  
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    text: lab.l > 50 ? '#000000' : '#ffffff',
  };
}

export function HeatMap({ 
  game, 
  filterDate, 
  onFilterDateChange,
  selectedMainNumbers = new Set(),
  selectedBonusNumbers = new Set(),
  onMainNumberToggle,
  onBonusNumberToggle,
}: HeatMapProps) {
  const mainFrequencies = useMemo(() => {
    return calculateFrequencies(
      game.draws,
      game.name,
      game.mainNumbers.min,
      game.mainNumbers.max,
      filterDate
    );
  }, [game.draws, game.name, game.mainNumbers.min, game.mainNumbers.max, filterDate]);
  
  const bonusFrequencies = useMemo(() => {
    if (!game.bonusNumber) return null;
    return calculateBonusFrequencies(
      game.draws,
      game.name,
      game.bonusNumber.min,
      game.bonusNumber.max,
      filterDate
    );
  }, [game.draws, game.name, game.bonusNumber, filterDate]);
  
  const rangeChangeDates = useMemo(() => {
    const allDates = getRangeChangeDates(game.name);
    if (game.draws.length === 0) {
      return allDates;
    }
    
    // Find the actual date range of the loaded data
    const drawDates = game.draws.map(d => d.date).sort();
    const earliestDraw = drawDates[0];
    const latestDraw = drawDates[drawDates.length - 1];
    
    // Only include range changes that are relevant to the loaded data
    // Include:
    // 1. The first range change (even if before earliest draw, it applies to earliest data)
    // 2. Any range change that falls within the data range (between earliest and latest)
    // 3. Any range change before latest draw (they affect draws in our data)
    const relevantDates = allDates.filter((date, index) => {
      // Always include the first range (applies to earliest draws)
      if (index === 0) {
        return true;
      }
      
      // Include if the change date is on or before the latest draw
      // (it affects some portion of our data)
      return date <= latestDraw;
    });
    
    return relevantDates;
  }, [game.name, game.draws]);
  
  // Calculate min/max for color scaling
  const mainFreqValues = Array.from(mainFrequencies.values());
  const mainMinFreq = Math.min(...mainFreqValues);
  const mainMaxFreq = Math.max(...mainFreqValues);
  
  const bonusMinFreq = bonusFrequencies
    ? Math.min(...Array.from(bonusFrequencies.values()))
    : 0;
  const bonusMaxFreq = bonusFrequencies
    ? Math.max(...Array.from(bonusFrequencies.values()))
    : 0;
  
  // Organize numbers into grid (10 columns for better display)
  const mainNumbers = Array.from(
    { length: game.mainNumbers.max - game.mainNumbers.min + 1 },
    (_, i) => game.mainNumbers.min + i
  );
  
  const bonusNumbers = game.bonusNumber
    ? Array.from(
        { length: game.bonusNumber.max - game.bonusNumber.min + 1 },
        (_, i) => game.bonusNumber!.min + i
      )
    : [];
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('numeric');
  
  const filteredDrawsCount = filterDate
    ? game.draws.filter(d => d.date >= filterDate).length
    : game.draws.length;
  
  // Calculate most recent draw date for each number
  const mainNumberLastSeen = useMemo(() => {
    const lastSeen = new Map<number, string>();
    const filteredDraws = filterDate 
      ? game.draws.filter(d => d.date >= filterDate)
      : game.draws;
    
    filteredDraws.forEach(draw => {
      const range = getRangeForDate(game.name, draw.date);
      if (!range) return;
      
      draw.numbers.forEach(num => {
        if (num >= range.mainMin && num <= range.mainMax) {
          const current = lastSeen.get(num);
          if (!current || draw.date > current) {
            lastSeen.set(num, draw.date);
          }
        }
      });
    });
    
    return lastSeen;
  }, [game.draws, game.name, filterDate]);
  
  const bonusNumberLastSeen = useMemo(() => {
    if (!game.bonusNumber) return new Map<number, string>();
    
    const lastSeen = new Map<number, string>();
    const filteredDraws = filterDate 
      ? game.draws.filter(d => d.date >= filterDate)
      : game.draws;
    
    filteredDraws.forEach(draw => {
      if (draw.bonus === undefined) return;
      const range = getRangeForDate(game.name, draw.date);
      if (!range) return;
      
      if (draw.bonus >= range.bonusMin && draw.bonus <= range.bonusMax) {
        const current = lastSeen.get(draw.bonus);
        if (!current || draw.date > current) {
          lastSeen.set(draw.bonus, draw.date);
        }
      }
    });
    
    return lastSeen;
  }, [game.draws, game.name, game.bonusNumber, filterDate]);
  
  // Sort main numbers based on selected order
  const sortedMainNumbers = useMemo(() => {
    const numbers = [...mainNumbers];
    
    switch (sortOrder) {
      case 'numeric':
        return numbers.sort((a, b) => a - b);
      
      case 'frequency':
        return numbers.sort((a, b) => {
          const freqA = mainFrequencies.get(a) || 0;
          const freqB = mainFrequencies.get(b) || 0;
          if (freqB !== freqA) return freqB - freqA;
          return a - b; // Tie-breaker: numeric
        });
      
      case 'recent':
        return numbers.sort((a, b) => {
          const dateA = mainNumberLastSeen.get(a) || '';
          const dateB = mainNumberLastSeen.get(b) || '';
          if (dateB !== dateA) return dateB.localeCompare(dateA);
          return a - b; // Tie-breaker: numeric
        });
      
      default:
        return numbers;
    }
  }, [mainNumbers, sortOrder, mainFrequencies, mainNumberLastSeen]);
  
  // Sort bonus numbers based on selected order
  const sortedBonusNumbers = useMemo(() => {
    if (!bonusNumbers.length) return [];
    
    const numbers = [...bonusNumbers];
    
    switch (sortOrder) {
      case 'numeric':
        return numbers.sort((a, b) => a - b);
      
      case 'frequency':
        return numbers.sort((a, b) => {
          const freqA = bonusFrequencies?.get(a) || 0;
          const freqB = bonusFrequencies?.get(b) || 0;
          if (freqB !== freqA) return freqB - freqA;
          return a - b;
        });
      
      case 'recent':
        return numbers.sort((a, b) => {
          const dateA = bonusNumberLastSeen.get(a) || '';
          const dateB = bonusNumberLastSeen.get(b) || '';
          if (dateB !== dateA) return dateB.localeCompare(dateA);
          return a - b;
        });
      
      default:
        return numbers;
    }
  }, [bonusNumbers, sortOrder, bonusFrequencies, bonusNumberLastSeen]);
  
  return (
    <div className="heatmap-container">
      <div className="heatmap-controls">
        {rangeChangeDates.length > 1 && (
          <div className="heatmap-filter">
            <label htmlFor="date-filter">Show draws from:</label>
            <select
              id="date-filter"
              value={filterDate || ''}
              onChange={(e) => {
                onFilterDateChange?.(e.target.value || undefined);
              }}
            >
              <option value="">All time</option>
              {rangeChangeDates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="heatmap-filter">
          <span className="heatmap-filter-label">Sort by:</span>
          <div className="heatmap-radio-group">
            <label className="heatmap-radio">
              <input
                type="radio"
                name="sort-order"
                value="numeric"
                checked={sortOrder === 'numeric'}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              />
              <span>Numeric</span>
            </label>
            <label className="heatmap-radio">
              <input
                type="radio"
                name="sort-order"
                value="frequency"
                checked={sortOrder === 'frequency'}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              />
              <span>Frequency</span>
            </label>
            <label className="heatmap-radio">
              <input
                type="radio"
                name="sort-order"
                value="recent"
                checked={sortOrder === 'recent'}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              />
              <span>Most Recent</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="heatmap-section">
        <h3>Main Numbers Heat Map</h3>
        <p className="heatmap-subtitle">
          Frequency of numbers in {filteredDrawsCount} historical draws
          {filterDate && ` (from ${new Date(filterDate).toLocaleDateString()})`}
        </p>
        <div className="heatmap-grid">
          {sortedMainNumbers.map(num => {
            const freq = mainFrequencies.get(num) || 0;
            const { bg, text } = getHeatColor(freq, mainMinFreq, mainMaxFreq);
            const percentage = mainMaxFreq > 0 
              ? ((freq / mainMaxFreq) * 100).toFixed(0) 
              : '0';
            
            const isSelected = selectedMainNumbers.has(num);
            const lastSeen = mainNumberLastSeen.get(num);
            const lastSeenDate = lastSeen 
              ? new Date(lastSeen).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })
              : 'Never';
            
            return (
              <div
                key={num}
                className={`heatmap-cell ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: bg, color: text }}
                title={`Number ${num}: appeared ${freq} times (${percentage}% of max). Last seen: ${lastSeenDate}`}
                onClick={() => onMainNumberToggle?.(num)}
              >
                {isSelected && <span className="heatmap-checkmark">✓</span>}
                <span className="heatmap-number">{num}</span>
                <span className="heatmap-count">{freq}</span>
              </div>
            );
          })}
        </div>
        <div className="heatmap-legend">
          <span className="legend-cold">Cold (Low Frequency)</span>
          <div className="legend-gradient"></div>
          <span className="legend-hot">Hot (High Frequency)</span>
        </div>
      </div>
      
      {game.bonusNumber && bonusFrequencies && (
        <div className="heatmap-section">
          <h3>Bonus Number Heat Map</h3>
          <p className="heatmap-subtitle">
            Frequency of {game.name === 'Powerball' ? 'Powerball' : game.name === 'Mega Millions' ? 'Mega Ball' : 'Bonus'} numbers
          </p>
          <div className="heatmap-grid bonus-grid">
            {sortedBonusNumbers.map(num => {
              const freq = bonusFrequencies.get(num) || 0;
              const { bg, text } = getHeatColor(freq, bonusMinFreq, bonusMaxFreq);
              const percentage = bonusMaxFreq > 0 
                ? ((freq / bonusMaxFreq) * 100).toFixed(0) 
                : '0';
              
              const isSelected = selectedBonusNumbers.has(num);
              const lastSeen = bonusNumberLastSeen.get(num);
              const lastSeenDate = lastSeen 
                ? new Date(lastSeen).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : 'Never';
              
              return (
                <div
                  key={num}
                  className={`heatmap-cell bonus-cell ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: bg, color: text }}
                  title={`${game.name === 'Powerball' ? 'Powerball' : game.name === 'Mega Millions' ? 'Mega Ball' : 'Bonus'} ${num}: appeared ${freq} times (${percentage}% of max). Last seen: ${lastSeenDate}`}
                  onClick={() => onBonusNumberToggle?.(num)}
                >
                  {isSelected && <span className="heatmap-checkmark">✓</span>}
                  <span className="heatmap-number">{num}</span>
                  <span className="heatmap-count">{freq}</span>
                </div>
              );
            })}
          </div>
          <div className="heatmap-legend">
            <span className="legend-cold">Cold (Low Frequency)</span>
            <div className="legend-gradient"></div>
            <span className="legend-hot">Hot (High Frequency)</span>
          </div>
        </div>
      )}
    </div>
  );
}

