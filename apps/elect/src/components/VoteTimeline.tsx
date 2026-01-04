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
  user-select: none;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
`;

const ToggleButton = styled.button<{$active: boolean}>`
  padding: 0.25rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: ${props => props.$active ? '#007bff' : 'white'};
  color: ${props => props.$active ? 'white' : '#333'};
  cursor: pointer;
  font-size: 0.85rem;
  
  &:hover {
    background: ${props => props.$active ? '#0056b3' : '#f5f5f5'};
  }
`;

const ScaleSelect = styled.select`
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  
  &:hover {
    background: #f5f5f5;
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
  bottom: 40px; /* Space for rotated X-axis labels */
  padding: 0.5rem;
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

type TimelineMode = 'overview' | 'realtime';
type TimeScale = '5min' | '1hr' | '1day' | 'whole';

export function VoteTimeline({voteTimestamps, votingStart, votingEnd, totalVotes}: VoteTimelineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mode, setMode] = useState<TimelineMode>('overview');
  const [scale, setScale] = useState<TimeScale>('whole');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time for realtime mode
  React.useEffect(() => {
    if (mode === 'realtime' && !isCollapsed) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000); // Update every second for realtime mode
      
      return () => clearInterval(interval);
    }
  }, [mode, isCollapsed]);
  
  const now = currentTime;
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
  
  // Calculate time window for realtime mode
  const getTimeWindow = (scale: TimeScale): {windowStart: Date; windowEnd: Date} => {
    let windowEnd = new Date(now);
    let windowStart: Date;
    
    switch (scale) {
      case '5min':
        windowStart = new Date(windowEnd.getTime() - 5 * 60 * 1000);
        break;
      case '1hr':
        windowStart = new Date(windowEnd.getTime() - 60 * 60 * 1000);
        break;
      case '1day':
        windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'whole':
      default:
        windowStart = new Date(start);
        windowEnd = new Date(end);
        break;
    }
    
    // Clamp to election bounds
    if (windowStart < start) windowStart = new Date(start);
    if (windowEnd > end) windowEnd = new Date(end);
    
    return {windowStart, windowEnd};
  };
  
  // Filter timestamps based on mode and scale
  const {windowStart, windowEnd} = mode === 'realtime' ? getTimeWindow(scale) : {windowStart: start, windowEnd: end};
  const filteredTimestamps = parsedTimestamps.filter(ts => {
    const tsTime = ts.getTime();
    return tsTime >= windowStart.getTime() && tsTime <= windowEnd.getTime();
  });
  
  // Determine time granularity based on selected window
  const windowDuration = windowEnd.getTime() - windowStart.getTime();
  const daysDuration = windowDuration / (1000 * 60 * 60 * 24);
  
  let timeUnit: 'minute' | 'hour' | 'day' = 'day';
  let unitMs = 1000 * 60 * 60 * 24; // days
  
  if (daysDuration <= 1) {
    timeUnit = 'minute';
    unitMs = 1000 * 60; // minutes
  } else if (daysDuration <= 7) {
    timeUnit = 'hour';
    unitMs = 1000 * 60 * 60; // hours
  }
  
  // For realtime mode with short scales, use finer granularity
  if (mode === 'realtime') {
    if (scale === '5min') {
      timeUnit = 'minute';
      unitMs = 1000 * 60;
    } else if (scale === '1hr') {
      timeUnit = 'minute';
      unitMs = 1000 * 60;
    } else if (scale === '1day') {
      timeUnit = 'hour';
      unitMs = 1000 * 60 * 60;
    }
  }
  
  // Group votes by time period (relative to window start)
  const voteGroups: Map<number, number> = new Map();
  let cumulative = 0;
  const cumulativeData: Array<{time: number; cumulative: number}> = [];
  
  // For cumulative, we need to count votes from election start, not window start
  const votesBeforeWindow = parsedTimestamps.filter(ts => ts.getTime() < windowStart.getTime()).length;
  cumulative = votesBeforeWindow;
  
  filteredTimestamps.forEach(timestamp => {
    const timeFromWindowStart = timestamp.getTime() - windowStart.getTime();
    const period = Math.floor(timeFromWindowStart / unitMs);
    voteGroups.set(period, (voteGroups.get(period) || 0) + 1);
    cumulative++;
    // For cumulative line, use time from election start
    const timeFromElectionStart = timestamp.getTime() - start.getTime();
    cumulativeData.push({time: timeFromElectionStart, cumulative});
  });
  
  // Calculate max values for scaling
  const maxVolume = Math.max(...Array.from(voteGroups.values()), 1);
  const maxCumulative = mode === 'realtime' && scale !== 'whole' 
    ? Math.max(cumulative, 1) 
    : Math.max(totalVotes, 1);
  const totalPeriods = Math.ceil(windowDuration / unitMs);
  
  // Use nice round numbers for axis labels (calculate before using)
  const niceMaxVolume = Math.ceil(maxVolume / 5) * 5 || 5;
  const niceMaxCumulative = Math.ceil(maxCumulative / 5) * 5 || 5;
  
  // Get actual chart dimensions from container
  const chartAreaRef = React.useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = React.useState({width: 800, height: 250});
  
  React.useEffect(() => {
    const updateDimensions = () => {
      if (chartAreaRef.current) {
        const rect = chartAreaRef.current.getBoundingClientRect();
        setChartDimensions({
          width: Math.max(rect.width - 20, 400), // Account for padding
          height: Math.max(rect.height - 20, 200)
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isCollapsed]);
  
  // Chart dimensions - use actual pixel dimensions for higher resolution
  const chartWidth = chartDimensions.width;
  const chartHeight = chartDimensions.height;
  const padding = {top: 10, right: 10, bottom: 30, left: 10}; // Extra bottom padding for X-axis labels
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  
  // Build cumulative line path (always relative to election start for consistency)
  const electionDuration = end.getTime() - start.getTime();
  const cumulativePath = cumulativeData.length > 0
    ? cumulativeData.map((point, idx) => {
        const x = padding.left + (point.time / electionDuration) * plotWidth;
        const y = padding.top + plotHeight - (point.cumulative / niceMaxCumulative) * plotHeight;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')
    : '';
  
  // Build bar chart data (relative to window start for realtime mode)
  const bars: Array<{x: number; width: number; height: number; count: number}> = [];
  for (let i = 0; i <= totalPeriods; i++) {
    const count = voteGroups.get(i) || 0;
    if (count > 0 || i === 0 || i === totalPeriods) {
      const x = padding.left + (i / Math.max(totalPeriods, 1)) * plotWidth;
      const width = Math.max(plotWidth / Math.max(totalPeriods, 1), 1);
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
  
  // Generate X-axis tickmarks based on time unit with better formatting
  const xAxisTicks: Array<{time: number; label: string; fullLabel: string}> = [];
  // Calculate optimal number of ticks based on chart width (aim for ~100px spacing)
  const optimalTickSpacing = 100;
  const numTicks = Math.min(Math.max(3, Math.floor(plotWidth / optimalTickSpacing)), 12);
  
  for (let i = 0; i <= numTicks; i++) {
    const period = Math.floor((i / numTicks) * totalPeriods);
    const timeMs = windowStart.getTime() + (period * unitMs);
    const tickDate = new Date(timeMs);
    
    let label = '';
    let fullLabel = '';
    
    if (timeUnit === 'day') {
      label = tickDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
      fullLabel = tickDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    } else if (timeUnit === 'hour') {
      const hour = tickDate.getHours();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      label = `${hour12}${ampm}`;
      fullLabel = tickDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' ' + label;
    } else {
      const hour = tickDate.getHours();
      const minute = tickDate.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      label = `${hour12}:${minute.toString().padStart(2, '0')}${ampm}`;
      fullLabel = tickDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' ' + label;
    }
    
    xAxisTicks.push({time: period, label, fullLabel});
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
      <TimelineHeader>
        <HeaderLeft onClick={() => setIsCollapsed(!isCollapsed)}>
          <CollapseButton>{isCollapsed ? '▶' : '▼'}</CollapseButton>
          <TimelineTitle>Vote Timeline</TimelineTitle>
        </HeaderLeft>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          {!isCollapsed && (
            <ModeToggle>
              <ToggleButton
                $active={mode === 'overview'}
                onClick={(e) => {
                  e.stopPropagation();
                  setMode('overview');
                  setScale('whole');
                }}
              >
                Overview
              </ToggleButton>
              <ToggleButton
                $active={mode === 'realtime'}
                onClick={(e) => {
                  e.stopPropagation();
                  setMode('realtime');
                  if (scale === 'whole') setScale('1hr');
                }}
              >
                Real-time
              </ToggleButton>
              {mode === 'realtime' && (
                <ScaleSelect
                  value={scale}
                  onChange={(e) => {
                    e.stopPropagation();
                    setScale(e.target.value as TimeScale);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="5min">Last 5 min</option>
                  <option value="1hr">Last hour</option>
                  <option value="1day">Last day</option>
                  <option value="whole">Whole election</option>
                </ScaleSelect>
              )}
            </ModeToggle>
          )}
          <TimeRemaining>
            {timeRemaining > 0 ? (
              <>Time Remaining: {formatTimeRemaining()}</>
            ) : (
              <>Voting Closed</>
            )}
          </TimeRemaining>
        </div>
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
        
        <ChartArea ref={chartAreaRef}>
          <svg width={chartWidth} height={chartHeight} style={{display: 'block'}}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map(i => {
              const y = padding.top + (i / 5) * plotHeight;
              return (
                <line
                  key={i}
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* X-axis tickmarks with rotated labels */}
            {xAxisTicks.map((tick, idx) => {
              const x = padding.left + (idx / Math.max(numTicks, 1)) * plotWidth;
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={padding.top + plotHeight}
                    x2={x}
                    y2={padding.top + plotHeight + 5}
                    stroke="#666"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={padding.top + plotHeight + 25}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#666"
                    transform={`rotate(-45 ${x} ${padding.top + plotHeight + 25})`}
                    style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}
                  >
                    {tick.label}
                  </text>
                  {/* Full label on hover */}
                  <title>{tick.fullLabel}</title>
                </g>
              );
            })}
            
            {/* Bars for vote volume */}
            {bars.map((bar, idx) => (
              <BarGroup key={idx}>
                <rect
                  x={bar.x}
                  y={padding.top + plotHeight - bar.height}
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
            
            {/* Cumulative line - make it more visible */}
            {cumulativePath && (
              <path
                d={cumulativePath}
                fill="none"
                stroke="#4caf50"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'}}
              />
            )}
            
            {/* Cumulative line points for better visibility (only in overview mode) */}
            {mode === 'overview' && cumulativeData.map((point, idx) => {
              const x = padding.left + (point.time / electionDuration) * plotWidth;
              const y = padding.top + plotHeight - (point.cumulative / niceMaxCumulative) * plotHeight;
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#4caf50"
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}
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
        <span>Right: {mode === 'realtime' && scale !== 'whole' ? 'Cumulative (window)' : 'Cumulative Total'}</span>
        {mode === 'realtime' && (
          <span style={{fontStyle: 'italic'}}>
            Showing: {filteredTimestamps.length} of {parsedTimestamps.length} votes
          </span>
        )}
      </div>
      )}
    </TimelineContainer>
  );
}

