import { useMemo } from 'react';
import type { LotteryGame } from '../types';
import './HeatMap.css';

interface HeatMapProps {
  game: LotteryGame;
}

/**
 * Calculate frequency of each number in historical draws
 */
function calculateFrequencies(
  draws: { numbers: number[] }[],
  min: number,
  max: number
): Map<number, number> {
  const frequencies = new Map<number, number>();
  
  // Initialize all numbers to 0
  for (let num = min; num <= max; num++) {
    frequencies.set(num, 0);
  }
  
  // Count occurrences
  draws.forEach(draw => {
    draw.numbers.forEach(num => {
      frequencies.set(num, (frequencies.get(num) || 0) + 1);
    });
  });
  
  return frequencies;
}

/**
 * Calculate bonus number frequencies
 */
function calculateBonusFrequencies(
  draws: { bonus?: number }[],
  min: number,
  max: number
): Map<number, number> {
  const frequencies = new Map<number, number>();
  
  for (let num = min; num <= max; num++) {
    frequencies.set(num, 0);
  }
  
  draws.forEach(draw => {
    if (draw.bonus !== undefined) {
      frequencies.set(draw.bonus, (frequencies.get(draw.bonus) || 0) + 1);
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

export function HeatMap({ game }: HeatMapProps) {
  const mainFrequencies = useMemo(() => {
    return calculateFrequencies(
      game.draws,
      game.mainNumbers.min,
      game.mainNumbers.max
    );
  }, [game.draws, game.mainNumbers.min, game.mainNumbers.max]);
  
  const bonusFrequencies = useMemo(() => {
    if (!game.bonusNumber) return null;
    return calculateBonusFrequencies(
      game.draws,
      game.bonusNumber.min,
      game.bonusNumber.max
    );
  }, [game.draws, game.bonusNumber]);
  
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
  
  return (
    <div className="heatmap-container">
      <div className="heatmap-section">
        <h3>Main Numbers Heat Map</h3>
        <p className="heatmap-subtitle">
          Frequency of numbers in {game.draws.length} historical draws
        </p>
        <div className="heatmap-grid">
          {mainNumbers.map(num => {
            const freq = mainFrequencies.get(num) || 0;
            const { bg, text } = getHeatColor(freq, mainMinFreq, mainMaxFreq);
            const percentage = mainMaxFreq > 0 
              ? ((freq / mainMaxFreq) * 100).toFixed(0) 
              : '0';
            
            return (
              <div
                key={num}
                className="heatmap-cell"
                style={{ backgroundColor: bg, color: text }}
                title={`Number ${num}: appeared ${freq} times (${percentage}% of max)`}
              >
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
            {bonusNumbers.map(num => {
              const freq = bonusFrequencies.get(num) || 0;
              const { bg, text } = getHeatColor(freq, bonusMinFreq, bonusMaxFreq);
              const percentage = bonusMaxFreq > 0 
                ? ((freq / bonusMaxFreq) * 100).toFixed(0) 
                : '0';
              
              return (
                <div
                  key={num}
                  className="heatmap-cell bonus-cell"
                  style={{ backgroundColor: bg, color: text }}
                  title={`${game.name === 'Powerball' ? 'Powerball' : game.name === 'Mega Millions' ? 'Mega Ball' : 'Bonus'} ${num}: appeared ${freq} times (${percentage}% of max)`}
                >
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

