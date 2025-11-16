import { useState, useEffect, useRef } from 'react';
import type { LotteryGame, PredictionResult } from './types';
import { powerballData } from './data/powerball';
import { megamillionsData } from './data/megamillions';
import { lottoData } from './data/lotto';
import { predictNumbers } from './utils/prediction';
import { HeatMap } from './components/HeatMap';
import './App.css';

const games: Record<string, LotteryGame> = {
  powerball: powerballData,
  megamillions: megamillionsData,
  lotto: lottoData,
};

function App() {
  const [selectedGame, setSelectedGame] = useState<string>('powerball');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [useWorker, setUseWorker] = useState(true);
  const [heatmapFilterDate, setHeatmapFilterDate] = useState<string | undefined>(undefined);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);
  
  useEffect(() => {
    // Reset filter date when game changes
    setHeatmapFilterDate(undefined);
  }, [selectedGame]);

  const handlePredict = () => {
    const game = games[selectedGame];
    if (!game) return;

    setIsComputing(true);
    setPrediction(null);

    if (useWorker) {
      // Use Web Worker for computation
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      const worker = new Worker(
        new URL('./worker/predictionWorker.ts', import.meta.url),
        { type: 'module' }
      ) as Worker;

      worker.onmessage = (event) => {
        if (event.data.success) {
          setPrediction(event.data.result);
        } else {
          console.error('Worker error:', event.data.error);
          // Fallback to main thread
          const result = predictNumbers(game, 10000);
          setPrediction(result);
        }
        setIsComputing(false);
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Fallback to main thread
        const result = predictNumbers(game, 10000);
        setPrediction(result);
        setIsComputing(false);
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ game, maxCandidates: 50000 });
      workerRef.current = worker;
    } else {
      // Use main thread
      setTimeout(() => {
        const result = predictNumbers(game, 10000);
        setPrediction(result);
        setIsComputing(false);
      }, 0);
    }
  };

  const game = games[selectedGame];

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎰 Lottery Number Predictor</h1>
        <p className="subtitle">
          Predict winning combinations based on historical data analysis
        </p>
      </header>

      <main className="app-main">
        <div className="main-content-wrapper">
          <div className="main-content">
            <div className="controls">
              <div className="control-group">
                <label htmlFor="game-select">Select Game:</label>
                <select
                  id="game-select"
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                >
                  <option value="powerball">Powerball</option>
                  <option value="megamillions">Mega Millions</option>
                  <option value="lotto">Lotto</option>
                </select>
              </div>

              <div className="control-group">
                <label>
                  <input
                    type="checkbox"
                    checked={useWorker}
                    onChange={(e) => setUseWorker(e.target.checked)}
                  />
                  Use Worker Thread (for better performance)
                </label>
              </div>

              <button
                onClick={handlePredict}
                disabled={isComputing}
                className="predict-button"
              >
                {isComputing ? 'Computing...' : 'Generate Prediction'}
              </button>
            </div>

        {game && (() => {
          const drawDates = game.draws.map(d => d.date).sort();
          const earliestDraw = drawDates.length > 0 ? drawDates[0] : null;
          const latestDraw = drawDates.length > 0 ? drawDates[drawDates.length - 1] : null;
          
          return (
            <div className="game-info">
              <h2>{game.name}</h2>
              <div className="game-details">
                <p>
                  Main Numbers: {game.mainNumbers.count} numbers from{' '}
                  {game.mainNumbers.min} to {game.mainNumbers.max}
                </p>
                {game.bonusNumber && (
                  <p>
                    Bonus Number: {game.bonusNumber.min} to {game.bonusNumber.max}
                  </p>
                )}
                <p>Historical Draws: {game.draws.length}</p>
                {earliestDraw && latestDraw && (
                  <p>
                    Includes drawings from{' '}
                    {new Date(earliestDraw).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}{' '}
                    to{' '}
                    {new Date(latestDraw).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

            {prediction && (
              <div className="prediction-result">
                <h2>Predicted Numbers</h2>
                <div className="numbers-display">
                  <div className="main-numbers">
                    {prediction.numbers.map((num, idx) => (
                      <span key={idx} className="number-ball">
                        {num}
                      </span>
                    ))}
                  </div>
                  {prediction.bonus !== undefined && (
                    <div className="bonus-number">
                      <span className="number-ball bonus">⭐ {prediction.bonus}</span>
                    </div>
                  )}
                </div>
                <div className="prediction-meta">
                  <div className="confidence">
                    <strong>Confidence Score:</strong>{' '}
                    {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                  <p className="reasoning">{prediction.reasoning}</p>
                </div>
              </div>
            )}

            <div className="disclaimer">
              <p>
                <strong>Disclaimer:</strong> This tool analyzes historical patterns
                but does not guarantee winning. Lottery numbers are drawn randomly,
                and each combination has equal probability. This is for entertainment
                purposes only.
              </p>
            </div>
          </div>

          {game && (
            <aside className="heatmap-sidebar">
              <HeatMap 
                game={game} 
                filterDate={heatmapFilterDate}
                onFilterDateChange={setHeatmapFilterDate}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
