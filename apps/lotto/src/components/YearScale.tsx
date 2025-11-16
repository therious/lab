import { useMemo } from 'react';
import './YearScale.css';

interface YearScaleProps {
  startDate: string;
  endDate: string;
  height: number; // Height in pixels to match timeline height
}

export function YearScale({ startDate, endDate, height }: YearScaleProps) {
  const yearTicks = useMemo(() => {
    const ticks: Array<{ year: number; position: number; showLabel: boolean }> = [];
    const timelineStart = new Date(startDate);
    const timelineEnd = new Date(endDate);
    const startYear = timelineStart.getFullYear();
    const endYear = timelineEnd.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      const yearStart = new Date(year, 0, 1);
      
      // Use the start of the year, but clamp to our date range
      const tickDate = yearStart < timelineStart ? timelineStart : 
                      yearStart > timelineEnd ? timelineEnd : yearStart;
      
      const position = 1 - ((tickDate.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime()));
      
      // Only show label for years ending in 0 or 5
      const showLabel = year % 10 === 0 || year % 10 === 5;
      
      ticks.push({ year, position, showLabel });
    }
    
    return ticks;
  }, [startDate, endDate]);

  return (
    <>
      {/* Header placeholder to match timeline header structure */}
      <div className="timeline-header">
        <span className="timeline-number" style={{ visibility: 'hidden' }}>00</span>
        <span className="timeline-stats" style={{ visibility: 'hidden' }}>
          000
          <span className="most-recent" style={{ display: 'block', marginTop: '0.125rem' }}>
            {' '}• Jan 1
          </span>
        </span>
      </div>
      <div className="timeline-visualization">
        <div className="year-scale" style={{ height: `${height}px` }}>
          {yearTicks.map((tick, idx) => (
            <div
              key={idx}
              className="year-tick"
              style={{
                top: `${tick.position * 100}%`,
              }}
            >
              <div className="tick-line" />
              {tick.showLabel && (
                <div className="tick-label">{tick.year}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

