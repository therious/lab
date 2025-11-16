import { useMemo } from 'react';
import type { LotteryGame } from '../types';
import { getNumberDrawHistory, getNumberIntroductionDate } from '../utils/combinationFrequencies';
import './NumberHistoryTimeline.css';

interface NumberHistoryTimelineProps {
  number: number;
  game: LotteryGame;
  gameName: string;
  isBonus?: boolean;
  uniformStartDate?: string; // Earliest date across all numbers for uniform scaling
  uniformEndDate?: string; // Latest date across all numbers for uniform scaling
  show?: boolean; // Whether to show the timeline (after animation completes)
}

export function NumberHistoryTimeline({
  number,
  game,
  gameName,
  isBonus = false,
  uniformStartDate,
  uniformEndDate,
  show = true,
}: NumberHistoryTimelineProps) {
  // All hooks must be called unconditionally before any early returns
  const { drawDates, introductionDate, startDate, endDate } = useMemo(() => {
    const introductionDate = getNumberIntroductionDate(gameName, number, isBonus);
    const drawDates = getNumberDrawHistory(game, number, gameName, isBonus);
    
    // Use uniform dates if provided, otherwise use number-specific dates
    const startDate = uniformStartDate || introductionDate;
    const endDate = uniformEndDate || (game.draws.length > 0
      ? game.draws.reduce((latest, draw) => draw.date > latest ? draw.date : latest, game.draws[0].date)
      : null);
    
    return { drawDates, introductionDate, startDate, endDate };
  }, [number, game, gameName, isBonus, uniformStartDate, uniformEndDate]);

  // All hooks must be called before any conditional returns
  const timelineData = useMemo(() => {
    if (!startDate || !endDate || !introductionDate) {
      return null;
    }

    // Create a vertical timeline from uniform start to end date
    const timelineStart = new Date(startDate);
    const timelineEnd = new Date(endDate);
    const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Create points for EVERY draw date, not just samples
    const drawPoints: Array<{ date: string; hasDraw: boolean; position: number }> = [];
    
    // Add a point for each actual draw date
    drawDates.forEach(drawDate => {
      const drawDateObj = new Date(drawDate);
      
      // Only include draws on or after the number's introduction date
      if (drawDate < introductionDate) {
        return;
      }
      
      // Calculate position: 0% = top (most recent), 100% = bottom (oldest)
      const position = 1 - ((drawDateObj.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime()));
      
      drawPoints.push({ 
        date: drawDate, 
        hasDraw: true, 
        position: Math.max(0, Math.min(1, position)) // Clamp between 0 and 1
      });
    });
    
    // Also add background sample points for the timeline bar (to show the full range)
    const backgroundPoints: Array<{ date: string; hasDraw: boolean; position: number }> = [];
    const sampleCount = Math.min(300, totalDays);
    const step = Math.max(1, Math.floor(totalDays / sampleCount));
    
    for (let i = 0; i <= totalDays; i += step) {
      const currentDate = new Date(timelineStart);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Only include points on or after the number's introduction date
      if (dateStr < introductionDate) {
        continue;
      }
      
      // Position: 0% = top (most recent/end date), 100% = bottom (oldest/start date)
      const position = 1 - (i / totalDays);
      
      // Check if this point already has a draw (to avoid duplicates)
      const hasDraw = drawPoints.some(dp => {
        const dpDate = new Date(dp.date);
        const diffDays = Math.abs((dpDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 0.5; // Within half a day
      });
      
      if (!hasDraw) {
        backgroundPoints.push({ date: dateStr, hasDraw: false, position });
      }
    }
    
    // Combine draw points and background points, sort by position
    const allPoints = [...drawPoints, ...backgroundPoints].sort((a, b) => a.position - b.position);
    
    // Calculate the position where the number was introduced (as a percentage from top)
    const introDateObj = new Date(introductionDate);
    const introPosition = 1 - ((introDateObj.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime()));
    
    return {
      timelinePoints: allPoints,
      introPosition,
    };
  }, [startDate, endDate, introductionDate, drawDates]);

  // Early return after all hooks
  if (!show || !startDate || !endDate || !introductionDate || !timelineData) {
    return null;
  }

  const { timelinePoints, introPosition } = timelineData;
  const frequency = drawDates.length;
  const mostRecentDraw = drawDates[0] || null;

  return (
    <div className="number-history-timeline">
      <div className="timeline-header">
        <span className="timeline-number">{number}</span>
        <span className="timeline-stats">
          {frequency}
          {mostRecentDraw && (
            <span className="most-recent">
              {' '}• {new Date(mostRecentDraw).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              })}
            </span>
          )}
        </span>
      </div>
      <div className="timeline-visualization">
        <div className="timeline-bar-vertical">
          {timelinePoints.map((point, idx) => (
            <div
              key={idx}
              className={`timeline-point ${point.hasDraw ? 'has-draw' : ''}`}
              style={{
                top: `${point.position * 100}%`,
              }}
              title={point.hasDraw ? `Drawn on ${point.date}` : `No draw on ${point.date}`}
            />
          ))}
          {/* Checkerboard pattern for unused portion (before number was introduced) */}
          {introPosition < 1 && (
            <div 
              className="timeline-unused"
              style={{
                top: `${introPosition * 100}%`,
                height: `${(1 - introPosition) * 100}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
