import { useState, useEffect, useRef } from 'react';
import type { LotteryGame, PredictionResult } from './types';
import { powerballData } from './data/powerball';
import { megamillionsData } from './data/megamillions';
import { lottoData } from './data/lotto';
import { predictNumbers } from './utils/prediction';
import { HeatMap } from './components/HeatMap';
import { CombinationFrequencyView } from './components/CombinationFrequencyView';
import { NumberHistoryTimeline } from './components/NumberHistoryTimeline';
import { YearScale } from './components/YearScale';
import { getUniformTimelineRange } from './utils/combinationFrequencies';
import { saveSummaryToStorage, getSummariesFromStorage, formatPredictionSummary, getAllSummaries, type LotterySummary } from './utils/summary';
import { PrintTickets } from './components/PrintTickets';
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
  const [selectedMainNumbers, setSelectedMainNumbers] = useState<Set<number>>(new Set());
  const [selectedBonusNumbers, setSelectedBonusNumbers] = useState<Set<number>>(new Set());
  const [workerProgress, setWorkerProgress] = useState<{
    progress: number;
    status: string;
    candidatesFound: number;
    estimatedSecondsRemaining: number;
  } | null>(null);
  const [predictionWithAnimation, setPredictionWithAnimation] = useState<{
    prediction: PredictionResult;
    dropOrder: number[];
    showReordering: boolean;
    originalNumbers: number[]; // Original sorted numbers for final positioning
  } | null>(null);
  const [predictionKey, setPredictionKey] = useState<number>(0);
  const [showTimelines, setShowTimelines] = useState<boolean>(false);
  const [showPrintTickets, setShowPrintTickets] = useState<boolean>(false);
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
    // Reset filter date and selections when game changes
    setHeatmapFilterDate(undefined);
    setSelectedMainNumbers(new Set());
    setSelectedBonusNumbers(new Set());
  }, [selectedGame]);

  const handlePredict = (event: React.MouseEvent<HTMLButtonElement>) => {
    const game = games[selectedGame];
    if (!game) return;

    // Check for Control+Click or Command+Click to show most recent winning numbers
    if (event.ctrlKey || event.metaKey) {
      // Immediately clear previous prediction display and force remount
      setPrediction(null);
      setPredictionWithAnimation(null);
      setWorkerProgress(null);
      setShowTimelines(false);
      setPredictionKey(prev => prev + 1); // Force React to remount the component
      
      if (game.draws.length === 0) {
        return; // No draws available
      }
      
      // Get the most recent draw by finding the one with the latest date
      const mostRecent = game.draws.reduce((latest, current) => {
        return current.date > latest.date ? current : latest;
      }, game.draws[0]);
      
      // Create a prediction result from the actual draw
      const actualResult: PredictionResult = {
        numbers: mostRecent.numbers,
        bonus: mostRecent.bonus,
        confidence: 1.0,
        reasoning: 'Most recent actual winning numbers from the database.',
        handPickedMain: undefined,
        handPickedBonus: undefined,
      };
      
      setPrediction(actualResult);
      
      // Save summary automatically
      const summary: LotterySummary = {
        gameName: game.name,
        timestamp: new Date().toISOString(),
        prediction: actualResult,
        gameConfig: {
          mainNumbers: game.mainNumbers,
          bonusNumber: game.bonusNumber,
        },
      };
      saveSummaryToStorage(game.name, summary);
      
      // Shuffle the numbers themselves for random order
      const shuffledNumbers = [...mostRecent.numbers];
      for (let i = shuffledNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
      }
      
      setPredictionWithAnimation({
        prediction: { ...actualResult, numbers: shuffledNumbers },
        dropOrder: mostRecent.numbers.map((_: number, idx: number) => idx), // Fill positions left to right
        showReordering: false,
        originalNumbers: mostRecent.numbers, // Keep original sorted for final order
      });
      
      const totalDropTime = (mostRecent.numbers.length + (mostRecent.bonus !== undefined ? 1 : 0)) * 600 + 1500; // 600ms delay + 1.5s animation duration
      setTimeout(() => {
        setPredictionWithAnimation(prev => prev ? { ...prev, showReordering: true } : null);
        // Show timelines after reordering animation completes (1.5s)
        setTimeout(() => {
          setShowTimelines(true);
        }, 1500);
      }, totalDropTime);
      
      return; // Exit early, don't run prediction
    }

      // Immediately clear previous prediction display and force remount
      setPrediction(null);
      setPredictionWithAnimation(null);
      setWorkerProgress(null);
      setShowTimelines(false);
      setPredictionKey(prev => prev + 1); // Force React to remount the component
    setIsComputing(true);

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
        if (event.data.type === 'progress') {
          // Handle progress updates
          setWorkerProgress({
            progress: event.data.progress,
            status: event.data.status,
            candidatesFound: event.data.candidatesFound,
            estimatedSecondsRemaining: event.data.estimatedSecondsRemaining,
          });
          return;
        }
        
        if (event.data.success) {
          const result = event.data.result;
          setPrediction(result);
          
          // Save summary automatically
          const summary: LotterySummary = {
            gameName: game.name,
            timestamp: new Date().toISOString(),
            prediction: result,
            gameConfig: {
              mainNumbers: game.mainNumbers,
              bonusNumber: game.bonusNumber,
            },
          };
          saveSummaryToStorage(game.name, summary);
          
          // Shuffle the numbers themselves (not the indices) for random order
          const shuffledNumbers = [...result.numbers];
          for (let i = shuffledNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
          }
          
          setPredictionWithAnimation({
            prediction: { ...result, numbers: shuffledNumbers },
            dropOrder: result.numbers.map((_: number, idx: number) => idx), // Fill positions left to right
            showReordering: false,
            originalNumbers: result.numbers, // Keep original sorted for final order
          });
          
          // After all numbers drop, trigger reordering
          const totalDropTime = (result.numbers.length + (result.bonus !== undefined ? 1 : 0)) * 600 + 1500; // 600ms delay + 1.5s animation duration
          setTimeout(() => {
            setPredictionWithAnimation(prev => prev ? { ...prev, showReordering: true } : null);
            // Show timelines after reordering animation completes (1.5s)
            setTimeout(() => {
              setShowTimelines(true);
            }, 1500);
          }, totalDropTime);
        } else {
          console.error('Worker error:', event.data.error);
          // Fallback to main thread
          const result = predictNumbers(
            game, 
            10000,
            selectedMainNumbers,
            selectedBonusNumbers
          );
          setPrediction(result);
          
          // Save summary automatically
          const summary: LotterySummary = {
            gameName: game.name,
            timestamp: new Date().toISOString(),
            prediction: result,
            gameConfig: {
              mainNumbers: game.mainNumbers,
              bonusNumber: game.bonusNumber,
            },
          };
          saveSummaryToStorage(game.name, summary);
          
          // Shuffle the numbers themselves for random order
          const shuffledNumbers = [...result.numbers];
          for (let i = shuffledNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
          }
          
          setPredictionWithAnimation({
            prediction: { ...result, numbers: shuffledNumbers },
            dropOrder: result.numbers.map((_: number, idx: number) => idx), // Fill positions left to right
            showReordering: false,
            originalNumbers: result.numbers, // Keep original sorted for final order
          });
          
          const totalDropTime = (result.numbers.length + (result.bonus !== undefined ? 1 : 0)) * 600 + 1500; // 600ms delay + 1.5s animation duration
          setTimeout(() => {
            setPredictionWithAnimation(prev => prev ? { ...prev, showReordering: true } : null);
            // Show timelines after reordering animation completes (1.5s)
            setTimeout(() => {
              setShowTimelines(true);
            }, 1500);
          }, totalDropTime);
        }
        setIsComputing(false);
        setWorkerProgress(null);
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Fallback to main thread
          const result = predictNumbers(
            game, 
            10000,
            selectedMainNumbers,
            selectedBonusNumbers
          );
          setPrediction(result);
          
          // Save summary automatically
          const summary: LotterySummary = {
            gameName: game.name,
            timestamp: new Date().toISOString(),
            prediction: result,
            gameConfig: {
              mainNumbers: game.mainNumbers,
              bonusNumber: game.bonusNumber,
            },
          };
          saveSummaryToStorage(game.name, summary);
          
          // Shuffle the numbers themselves for random order
        const shuffledNumbers = [...result.numbers];
        for (let i = shuffledNumbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
        }
        
        setPredictionWithAnimation({
          prediction: { ...result, numbers: shuffledNumbers },
          dropOrder: result.numbers.map((_, idx) => idx), // Fill positions left to right
          showReordering: false,
          originalNumbers: result.numbers, // Keep original sorted for final order
        });
        
        const totalDropTime = (result.numbers.length + (result.bonus !== undefined ? 1 : 0)) * 2000; // 2 seconds per number
        setTimeout(() => {
          setPredictionWithAnimation(prev => prev ? { ...prev, showReordering: true } : null);
        }, totalDropTime);
        
        setIsComputing(false);
        setWorkerProgress(null);
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ 
        game, 
        maxCandidates: 50000,
        preselectedMain: Array.from(selectedMainNumbers),
        preselectedBonus: Array.from(selectedBonusNumbers),
      });
      workerRef.current = worker;
    } else {
      // Use main thread - show simple progress
      setWorkerProgress({
        progress: 0,
        status: 'Computing on main thread...',
        candidatesFound: 0,
        estimatedSecondsRemaining: 0,
      });
      
      setTimeout(() => {
        // Simulate progress for main thread computation
        const progressSteps = [25, 50, 75];
        let stepIndex = 0;
        
        const progressInterval = setInterval(() => {
          if (stepIndex < progressSteps.length) {
            setWorkerProgress({
              progress: progressSteps[stepIndex],
              status: 'Generating and evaluating combinations...',
              candidatesFound: 0,
              estimatedSecondsRemaining: 0,
            });
            stepIndex++;
          } else {
            clearInterval(progressInterval);
          }
        }, 200);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          const result = predictNumbers(
            game, 
            10000,
            selectedMainNumbers,
            selectedBonusNumbers
          );
          setPrediction(result);
          
          // Save summary automatically
          const summary: LotterySummary = {
            gameName: game.name,
            timestamp: new Date().toISOString(),
            prediction: result,
            gameConfig: {
              mainNumbers: game.mainNumbers,
              bonusNumber: game.bonusNumber,
            },
          };
          saveSummaryToStorage(game.name, summary);
          
          // Shuffle the numbers themselves for random order
          const shuffledNumbers = [...result.numbers];
          for (let i = shuffledNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
          }
          
          setPredictionWithAnimation({
            prediction: { ...result, numbers: shuffledNumbers },
            dropOrder: result.numbers.map((_: number, idx: number) => idx), // Fill positions left to right
            showReordering: false,
            originalNumbers: result.numbers, // Keep original sorted for final order
          });
          
          const totalDropTime = (result.numbers.length + (result.bonus !== undefined ? 1 : 0)) * 600 + 1500; // 600ms delay + 1.5s animation duration
          setTimeout(() => {
            setPredictionWithAnimation(prev => prev ? { ...prev, showReordering: true } : null);
            // Show timelines after reordering animation completes (1.5s)
            setTimeout(() => {
              setShowTimelines(true);
            }, 1500);
          }, totalDropTime);
          
          setIsComputing(false);
          setWorkerProgress(null);
        }, 1000);
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePredict}
              disabled={isComputing}
              className="predict-button"
              title="Click to generate prediction. Control/Command+Click to show most recent winning numbers."
            >
              {isComputing ? 'Computing...' : 'Generate Prediction'}
            </button>
            
            <button
              onClick={() => {
                // Defer state update to avoid blocking click handler
                requestAnimationFrame(() => {
                  setShowPrintTickets(true);
                });
              }}
              className="print-tickets-button"
              title="Print all saved lottery number selections"
            >
              🖨️ Print Tickets
            </button>
          </div>
          
          {isComputing && (
            <div className="computation-progress">
              {workerProgress ? (
                <>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${workerProgress.progress}%` }}
                    ></div>
                  </div>
                  <div className="progress-info">
                    <div className="progress-status">{workerProgress.status}</div>
                    <div className="progress-details">
                      {workerProgress.candidatesFound > 0 && (
                        <span>{workerProgress.candidatesFound} valid combinations found</span>
                      )}
                      {workerProgress.estimatedSecondsRemaining > 0 && (
                        <span className="progress-time">
                          ~{workerProgress.estimatedSecondsRemaining}s remaining
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="progress-status">Initializing computation...</div>
              )}
            </div>
          )}
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

            {(prediction || predictionWithAnimation) && (() => {
              // Calculate uniform timeline range for all numbers
              const currentPrediction = prediction || predictionWithAnimation?.prediction;
              const uniformRange = currentPrediction && game
                ? getUniformTimelineRange(
                    game,
                    game.name,
                    currentPrediction.numbers,
                    false
                  )
                : null;
              // Range for bonus number when it appears as bonus only
              const uniformBonusRange = currentPrediction?.bonus !== undefined && game
                ? getUniformTimelineRange(
                    game,
                    game.name,
                    [currentPrediction.bonus],
                    true
                  )
                : null;
              // Range for bonus number when it appears in any position (main or bonus)
              const uniformBonusAllRange = currentPrediction?.bonus !== undefined && game
                ? getUniformTimelineRange(
                    game,
                    game.name,
                    [currentPrediction.bonus],
                    false
                  )
                : null;
              
              const savedSummaries = getSummariesFromStorage(game.name);
              
              return (
              <div className="prediction-result" key={`prediction-${predictionKey}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>Predicted Numbers</h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        const summary: LotterySummary = {
                          gameName: game.name,
                          timestamp: new Date().toISOString(),
                          prediction: currentPrediction!,
                          gameConfig: {
                            mainNumbers: game.mainNumbers,
                            bonusNumber: game.bonusNumber,
                          },
                        };
                        saveSummaryToStorage(game.name, summary);
                        alert(`Summary saved! Total saved: ${savedSummaries.length + 1}`);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                      }}
                    >
                      💾 Save Summary
                    </button>
                    {savedSummaries.length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            const content = savedSummaries.map(s => formatPredictionSummary(s)).join('\n');
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${game.name.toLowerCase().replace(/\s+/g, '_')}_summaries_${new Date().toISOString().split('T')[0]}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                          }}
                        >
                          📥 Download ({savedSummaries.length})
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="numbers-display-wrapper">
                  <div className="numbers-display">
                  {predictionWithAnimation ? (
                    <>
                      <div className="main-numbers">
                        {/* Render in sorted order so timelines align correctly */}
                        {[...predictionWithAnimation.originalNumbers].sort((a, b) => a - b).map((num, sortedIdx) => {
                      const isHandPicked = prediction?.handPickedMain?.includes(num);
                      
                      // Find where this number was in the shuffled order (for drop animation)
                      const shuffledIdx = predictionWithAnimation.prediction.numbers.indexOf(num);
                      // Each ball drops into the next position from left to right
                      // The drop delay is based on when it should appear in its shuffled order
                      const dropDelay = shuffledIdx * 600; // 600ms = 40% of 1.5s animation (when ball first hits bottom)
                      
                      // During drop phase: balls fill positions left to right in shuffled order
                      // After reordering: balls are in sorted order
                      const finalOrder = sortedIdx; // Final sorted position
                      const dropPosition = shuffledIdx; // Position it drops into (left to right)
                      
                      // Determine arc direction: if moving right, arc above; if moving left, arc below
                      const isMovingRight = finalOrder > dropPosition;
                      const arcDirection = isMovingRight ? 1 : -1;
                      
                      // Calculate X offset for drop position (left to right)
                      const dropXOffset = (dropPosition - finalOrder) * (60 + 12); // 60px ball + 12px gap
                      
                      return (
                        <div key={`${num}-${sortedIdx}`} className="number-ball-wrapper">
                          <span 
                            className={`number-ball ${isHandPicked ? 'hand-picked' : ''} ${predictionWithAnimation.showReordering ? 'reordering' : ''}`}
                            title={isHandPicked ? 'Hand-picked number' : 'Predicted number'}
                            style={{
                              '--drop-delay': `${dropDelay}ms`,
                              '--drop-x': `${dropXOffset}px`,
                              '--final-order': finalOrder,
                              '--initial-order': dropPosition,
                              '--arc-direction': arcDirection,
                            } as React.CSSProperties}
                          >
                            {num}
                            {isHandPicked && <span className="hand-picked-indicator">★</span>}
                          </span>
                          {game && uniformRange && (
                            <NumberHistoryTimeline
                              number={num}
                              game={game}
                              gameName={game.name}
                              uniformStartDate={uniformRange.earliestDate}
                              uniformEndDate={uniformRange.latestDate}
                              show={!predictionWithAnimation || showTimelines}
                            />
                          )}
                        </div>
                      );
                    })}
                      {predictionWithAnimation.prediction.bonus !== undefined && (
                        <>
                          {/* Plus sign indicator with graph for all occurrences */}
                          <div className="number-ball-wrapper">
                            <span 
                              className="number-ball bonus-indicator"
                              style={{
                                '--appear-delay': `${predictionWithAnimation.prediction.numbers.length * 600 + 600}ms`, // Appear when bonus ball hits baseline (40% of 1.5s = 600ms)
                              } as React.CSSProperties}
                            >
                              +
                            </span>
                            {game && uniformBonusAllRange && (
                              <NumberHistoryTimeline
                                number={predictionWithAnimation.prediction.bonus}
                                game={game}
                                gameName={game.name}
                                isBonus={false}
                                uniformStartDate={uniformBonusAllRange.earliestDate}
                                uniformEndDate={uniformBonusAllRange.latestDate}
                                show={!predictionWithAnimation || showTimelines}
                              />
                            )}
                          </div>
                          {/* Bonus ball with graph for bonus-only occurrences */}
                          <div className="number-ball-wrapper">
                            <span 
                              className={`number-ball bonus ${prediction?.handPickedBonus !== undefined ? 'hand-picked' : ''}`}
                              title={prediction?.handPickedBonus !== undefined ? 'Hand-picked bonus number' : 'Bonus number'}
                              style={{
                                '--drop-delay': `${predictionWithAnimation.prediction.numbers.length * 600}ms`, // Always last, 600ms per main number
                              } as React.CSSProperties}
                            >
                              {predictionWithAnimation.prediction.bonus}
                              {prediction?.handPickedBonus !== undefined && (
                                <span className="hand-picked-indicator">★</span>
                              )}
                            </span>
                            {game && uniformBonusRange && (
                              <NumberHistoryTimeline
                                number={predictionWithAnimation.prediction.bonus}
                                game={game}
                                gameName={game.name}
                                isBonus={true}
                                uniformStartDate={uniformBonusRange.earliestDate}
                                uniformEndDate={uniformBonusRange.latestDate}
                                show={!predictionWithAnimation || showTimelines}
                              />
                            )}
                          </div>
                        </>
                      )}
                      </div>
                    </>
                  ) : prediction ? (
                    <>
                      <div className="main-numbers">
                        {prediction.numbers.map((num, idx) => {
                          const isHandPicked = prediction.handPickedMain?.includes(num);
                          return (
                            <div key={idx} className="number-ball-wrapper">
                              <span 
                                className={`number-ball ${isHandPicked ? 'hand-picked' : ''}`}
                                title={isHandPicked ? 'Hand-picked number' : 'Predicted number'}
                              >
                                {num}
                                {isHandPicked && <span className="hand-picked-indicator">★</span>}
                              </span>
                              {game && uniformRange && (
                                <NumberHistoryTimeline
                                  number={num}
                                  game={game}
                                  gameName={game.name}
                                  uniformStartDate={uniformRange.earliestDate}
                                  uniformEndDate={uniformRange.latestDate}
                                  show={true}
                                />
                              )}
                            </div>
                          );
                        })}
                        {prediction.bonus !== undefined && (
                          <>
                            {/* Plus sign indicator with graph for all occurrences */}
                            <div className="number-ball-wrapper">
                              <span className="number-ball bonus-indicator">
                                +
                              </span>
                              {game && uniformBonusAllRange && (
                                <NumberHistoryTimeline
                                  number={prediction.bonus}
                                  game={game}
                                  gameName={game.name}
                                  isBonus={false}
                                  uniformStartDate={uniformBonusAllRange.earliestDate}
                                  uniformEndDate={uniformBonusAllRange.latestDate}
                                  show={true}
                                />
                              )}
                            </div>
                            {/* Bonus ball with graph for bonus-only occurrences */}
                            <div className="number-ball-wrapper">
                              <span 
                                className={`number-ball bonus ${prediction.handPickedBonus !== undefined ? 'hand-picked' : ''}`}
                                title={prediction.handPickedBonus !== undefined ? 'Hand-picked bonus number' : 'Bonus number'}
                              >
                                {prediction.bonus}
                                {prediction.handPickedBonus !== undefined && (
                                  <span className="hand-picked-indicator">★</span>
                                )}
                              </span>
                              {game && uniformBonusRange && (
                                <NumberHistoryTimeline
                                  number={prediction.bonus}
                                  game={game}
                                  gameName={game.name}
                                  isBonus={true}
                                  uniformStartDate={uniformBonusRange.earliestDate}
                                  uniformEndDate={uniformBonusRange.latestDate}
                                  show={true}
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  ) : null}
                  </div>
                  {/* Shared year scale - only show when timelines are shown */}
                  {uniformRange && (!predictionWithAnimation || showTimelines) && (
                    <div className="number-ball-wrapper">
                      <div className="year-scale-placeholder" />
                      <div className="year-scale-container">
                        <YearScale
                          startDate={uniformRange.earliestDate}
                          endDate={uniformRange.latestDate}
                          height={300}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {prediction && (
                  <>
                    <div className="prediction-meta">
                      <div className="confidence">
                        <strong>Confidence Score:</strong>{' '}
                        {(prediction.confidence * 100).toFixed(1)}%
                        <span className="confidence-note">
                          {' '}(Relative quality score, not probability)
                        </span>
                      </div>
                      {prediction.scoreBreakdown && (
                        <div className="score-breakdown">
                          <div className="breakdown-title">Score Breakdown:</div>
                          <div className="breakdown-factors">
                            <div className="breakdown-factor">
                              <span className="factor-label">Number Frequency:</span>
                              <span className="factor-value">{(prediction.scoreBreakdown.numberFrequency * 100).toFixed(0)}%</span>
                            </div>
                            <div className="breakdown-factor">
                              <span className="factor-label">Pair Frequency:</span>
                              <span className="factor-value">{(prediction.scoreBreakdown.pairFrequency * 100).toFixed(0)}%</span>
                            </div>
                            <div className="breakdown-factor">
                              <span className="factor-label">Number Spread:</span>
                              <span className="factor-value">{(prediction.scoreBreakdown.numberSpread * 100).toFixed(0)}%</span>
                            </div>
                            <div className="breakdown-factor">
                              <span className="factor-label">Odd/Even Balance:</span>
                              <span className="factor-value">{(prediction.scoreBreakdown.oddEvenBalance * 100).toFixed(0)}%</span>
                            </div>
                            <div className="breakdown-factor">
                              <span className="factor-label">Sum Distribution:</span>
                              <span className="factor-value">{(prediction.scoreBreakdown.sumDistribution * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="reasoning">{prediction.reasoning}</p>
                    </div>
                    {game && (
                      <CombinationFrequencyView
                        game={game}
                        predictedNumbers={prediction.numbers}
                        filterDate={heatmapFilterDate}
                      />
                    )}
                  </>
                )}
      </div>
            );
            })()}

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
                selectedMainNumbers={selectedMainNumbers}
                selectedBonusNumbers={selectedBonusNumbers}
                onMainNumberToggle={(num) => {
                  const newSet = new Set(selectedMainNumbers);
                  if (newSet.has(num)) {
                    newSet.delete(num);
                  } else {
                    newSet.add(num);
                  }
                  setSelectedMainNumbers(newSet);
                }}
                onBonusNumberToggle={(num) => {
                  const newSet = new Set(selectedBonusNumbers);
                  if (newSet.has(num)) {
                    newSet.delete(num);
                  } else {
                    newSet.add(num);
                  }
                  setSelectedBonusNumbers(newSet);
                }}
              />
            </aside>
          )}
        </div>
      </main>
      
      {showPrintTickets && (
        <PrintTickets
          summaries={getAllSummaries()}
          onClose={() => setShowPrintTickets(false)}
        />
      )}
    </div>
  );
}

export default App;
