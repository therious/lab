import React, {useState} from 'react';
import styled from 'styled-components';

const TimelineContainer = styled.div`
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
`;

const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    opacity: 0.8;
  }
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const TimelineTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

const TimeRemaining = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const ChartContainer = styled.div`
  position: relative;
  width: 100%;
  height: 300px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1rem;
  background: #fafafa;
`;

const YAxisLeft = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  color: #666;
`;

const YAxisRight = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  color: #666;
  text-align: right;
`;

const ChartArea = styled.div`
  position: absolute;
  left: 50px;
  right: 50px;
  top: 0;
  bottom: 0;
  padding: 0.5rem;
`;

const CumulativeLine = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

const BarGroup = styled.g`
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

interface VoteTimelineProps {
  voteTimestamps: string[];
  votingStart: string;
  votingEnd: string;
  totalVotes: number;
}

export function VoteTimeline({voteTimestamps, votingStart, votingEnd, totalVotes}: VoteTimelineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const now = new Date();
  const start = new Date(votingStart);
  const end = new Date(votingEnd);
  const timeRemaining = Math.max(0, end.getTime() - now.getTime());
  
  // Calculate time remaining with days, hours, minutes, and seconds
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  // Format number with comma grouping for thousands
  const formatNumber = (n: number) => n.toLocaleString('en-US');
  
  // Format time remaining string with appropriate granularity
  const formatTimeRemaining = () => {
    if (daysRemaining > 0) {
      return `${formatNumber(daysRemaining)} day${daysRemaining !== 1 ? 's' : ''}, ${formatNumber(hoursRemaining)} hour${hoursRemaining !== 1 ? 's' : ''}`;
    } else if (hoursRemaining >= 12) {
      return `${formatNumber(hoursRemaining)} hour${hoursRemaining !== 1 ? 's' : ''}, ${formatNumber(minutesRemaining)} minute${minutesRemaining !== 1 ? 's' : ''}`;
    } else if (hoursRemaining > 0) {
      // Less than 12 hours - show minutes
      return `${formatNumber(hoursRemaining)} hour${hoursRemaining !== 1 ? 's' : ''}, ${formatNumber(minutesRemaining)} minute${minutesRemaining !== 1 ? 's' : ''}`;
    } else if (minutesRemaining >= 10) {
      // Less than 1 hour, at least 10 minutes - show minutes only
      return `${formatNumber(minutesRemaining)} minute${minutesRemaining !== 1 ? 's' : ''}`;
    } else {
      // Less than 10 minutes - show minutes and seconds
      return `${formatNumber(minutesRemaining)} minute${minutesRemaining !== 1 ? 's' : ''}, ${formatNumber(secondsRemaining)} second${secondsRemaining !== 1 ? 's' : ''}`;
    }
  };
  
  // Parse timestamps and group by time period
  const parsedTimestamps = voteTimestamps.map(ts => new Date(ts)).filter(d => !isNaN(d.getTime()));
  
  // Determine time granularity based on election duration
  const electionDuration = end.getTime() - start.getTime();
  const daysDuration = electionDuration / (1000 * 60 * 60 * 24);
  
  let timeUnit: 'minute' | 'hour' | 'day' = 'day';
  let unitMs = 1000 * 60 * 60 * 24; // days
  
  if (daysDuration <= 1) {
    timeUnit = 'minute';
    unitMs = 1000 * 60; // minutes
  } else if (daysDuration <= 7) {
    timeUnit = 'hour';
    unitMs = 1000 * 60 * 60; // hours
  }
  
  // Group votes by time period
  const voteGroups: Map<number, number> = new Map();
  let cumulative = 0;
  const cumulativeData: Array<{time: number; cumulative: number}> = [];
  
  parsedTimestamps.forEach(timestamp => {
    const timeFromStart = timestamp.getTime() - start.getTime();
    const period = Math.floor(timeFromStart / unitMs);
    voteGroups.set(period, (voteGroups.get(period) || 0) + 1);
    cumulative++;
    cumulativeData.push({time: timeFromStart, cumulative});
  });
  
  // Calculate max values for scaling
  const maxVolume = Math.max(...Array.from(voteGroups.values()), 1);
  const maxCumulative = Math.max(totalVotes, 1);
  const totalPeriods = Math.ceil(electionDuration / unitMs);
  
  // Use nice round numbers for axis labels (calculate before using)
  const niceMaxVolume = Math.ceil(maxVolume / 5) * 5 || 5;
  const niceMaxCumulative = Math.ceil(maxCumulative / 5) * 5 || 5;
  
  // Chart dimensions
  const chartWidth = 100;
  const chartHeight = 100;
  const padding = 5;
  const plotWidth = chartWidth - (padding * 2);
  const plotHeight = chartHeight - (padding * 2);
  
  // Build cumulative line path
  const cumulativePath = cumulativeData.length > 0
    ? cumulativeData.map((point, idx) => {
        const x = padding + (point.time / electionDuration) * plotWidth;
        const y = padding + plotHeight - (point.cumulative / niceMaxCumulative) * plotHeight;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      }).join(' ')
    : '';
  
  // Build bar chart data
  const bars: Array<{x: number; width: number; height: number; count: number}> = [];
  for (let i = 0; i <= totalPeriods; i++) {
    const count = voteGroups.get(i) || 0;
    if (count > 0 || i === 0 || i === totalPeriods) {
      const x = padding + (i / Math.max(totalPeriods, 1)) * plotWidth;
      const width = Math.max(plotWidth / Math.max(totalPeriods, 1), 0.5);
      const height = (count / niceMaxVolume) * plotHeight * 0.8; // Use 80% of height for bars
      bars.push({x, width, height, count});
    }
  }
  
  // Generate Y-axis labels with better scaling
  const leftAxisLabels: number[] = [];
  const rightAxisLabels: number[] = [];
  
  for (let i = 0; i <= 5; i++) {
    leftAxisLabels.push(Math.round((i / 5) * niceMaxVolume));
    rightAxisLabels.push(Math.round((i / 5) * niceMaxCumulative));
  }
  
  // Generate X-axis tickmarks based on time unit
  const xAxisTicks: Array<{time: number; label: string}> = [];
  const numTicks = Math.min(totalPeriods + 1, 10); // Max 10 ticks
  
  for (let i = 0; i <= numTicks; i++) {
    const period = Math.floor((i / numTicks) * totalPeriods);
    const timeMs = start.getTime() + (period * unitMs);
    const tickDate = new Date(timeMs);
    
    let label = '';
    if (timeUnit === 'day') {
      label = tickDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    } else if (timeUnit === 'hour') {
      label = tickDate.toLocaleTimeString('en-US', {hour: 'numeric', hour12: true});
    } else {
      label = tickDate.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});
    }
    
    xAxisTicks.push({time: period, label});
  }
  
  // Handle edge case: if no vote data available, show empty chart
  if (parsedTimestamps.length === 0) {
    return (
      <TimelineContainer>
        <TimelineHeader onClick={() => setIsCollapsed(!isCollapsed)}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <CollapseButton>{isCollapsed ? '▶' : '▼'}</CollapseButton>
            <TimelineTitle>Vote Timeline</TimelineTitle>
          </div>
          <TimeRemaining>
            {timeRemaining > 0 ? (
              <>Time Remaining: {formatTimeRemaining()}</>
            ) : (
              <>Voting Closed</>
            )}
          </TimeRemaining>
        </TimelineHeader>
        {!isCollapsed && (
          <ChartContainer>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999'}}>
              Awaiting election data - timeline will appear once vote activity is available
            </div>
          </ChartContainer>
        )}
      </TimelineContainer>
    );
  }
  
  return (
    <TimelineContainer>
      <TimelineHeader onClick={() => setIsCollapsed(!isCollapsed)}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <CollapseButton>{isCollapsed ? '▶' : '▼'}</CollapseButton>
          <TimelineTitle>Vote Timeline</TimelineTitle>
        </div>
        <TimeRemaining>
          {timeRemaining > 0 ? (
            <>Time Remaining: {formatTimeRemaining()}</>
          ) : (
            <>Voting Closed</>
          )}
        </TimeRemaining>
      </TimelineHeader>
      
      {!isCollapsed && (
      <ChartContainer>
        <YAxisLeft>
          {leftAxisLabels.reverse().map((label, idx) => (
            <div key={idx} style={{flex: 1, display: 'flex', alignItems: idx === 0 ? 'flex-start' : idx === leftAxisLabels.length - 1 ? 'flex-end' : 'center'}}>
              {label}
            </div>
          ))}
        </YAxisLeft>
        
        <ChartArea>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{width: '100%', height: '100%'}}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map(i => {
              const y = padding + (i / 5) * plotHeight;
              return (
                <line
                  key={i}
                  x1={padding}
                  y1={y}
                  x2={padding + plotWidth}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeWidth="0.5"
                />
              );
            })}
            
            {/* X-axis tickmarks */}
            {xAxisTicks.map((tick, idx) => {
              const x = padding + (tick.time / Math.max(totalPeriods, 1)) * plotWidth;
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={padding + plotHeight}
                    x2={x}
                    y2={padding + plotHeight + 2}
                    stroke="#666"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding + plotHeight + 8}
                    textAnchor="middle"
                    fontSize="2"
                    fill="#666"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}
            
            {/* Bars for vote volume */}
            {bars.map((bar, idx) => (
              <BarGroup key={idx}>
                <rect
                  x={bar.x}
                  y={padding + plotHeight - bar.height}
                  width={bar.width}
                  height={bar.height}
                  fill="#2196f3"
                  opacity="0.6"
                />
                {bar.count > 0 && (
                  <title>{bar.count} vote{bar.count !== 1 ? 's' : ''}</title>
                )}
              </BarGroup>
            ))}
            
            {/* Cumulative line */}
            {cumulativePath && (
              <path
                d={cumulativePath}
                fill="none"
                stroke="#4caf50"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </ChartArea>
        
        <YAxisRight>
          {rightAxisLabels.reverse().map((label, idx) => (
            <div key={idx} style={{flex: 1, display: 'flex', alignItems: idx === 0 ? 'flex-start' : idx === rightAxisLabels.length - 1 ? 'flex-end' : 'center', justifyContent: 'flex-end'}}>
              {label}
            </div>
          ))}
        </YAxisRight>
      </ChartContainer>
      )}
      
      {!isCollapsed && (
      <div style={{marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', display: 'flex', justifyContent: 'space-between'}}>
        <span>Left: Votes per {timeUnit}</span>
        <span>Right: Cumulative Total</span>
      </div>
      )}
    </TimelineContainer>
  );
}

