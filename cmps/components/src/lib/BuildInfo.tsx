import React, { useState, useRef, useEffect } from 'react';

interface BuildInfoData {
  commitHash: string;
  branch: string;
  authoredDate: string;
  committedDate: string;
  builtDate: string;
  mnemonic?: string;
}

interface BuildInfoProps {
  buildInfo?: BuildInfoData | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Format a date string for display with smart formatting
 * If the date is the same as the previous date, only show the time
 * Use non-breaking spaces to align dates/times vertically
 */
function formatDateForDisplay(
  dateStr: string,
  previousDateStr: string | null,
  previousFormatted: { formatted: string; fullLength: number } | null
): { formatted: string; fullLength: number } {
  const date = new Date(dateStr);
  const fullDateStr = date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const fullLength = fullDateStr.length;

  if (!previousDateStr) {
    // First date - show full date and time
    return { formatted: fullDateStr, fullLength };
  }

  const prevDate = new Date(previousDateStr);
  const currentDate = new Date(dateStr);

  // If dates are exactly the same, show "---"
  if (currentDate.getTime() === prevDate.getTime()) {
    const prevLength = previousFormatted?.fullLength || fullLength;
    return { formatted: '---', fullLength: prevLength };
  }

  // If same date (different time), pad with non-breaking spaces to align
  if (
    currentDate.getFullYear() === prevDate.getFullYear() &&
    currentDate.getMonth() === prevDate.getMonth() &&
    currentDate.getDate() === prevDate.getDate()
  ) {
    // Extract time portion (format: "HH:MM:SS")
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    // Pad with non-breaking spaces to match previous full length
    const prevLength = previousFormatted?.fullLength || fullLength;
    const padding = '\u00A0'.repeat(Math.max(0, prevLength - timeStr.length));
    return { formatted: padding + timeStr, fullLength: prevLength };
  }

  // Different date - show full date and time
  return { formatted: fullDateStr, fullLength };
}

/**
 * BuildInfo component displays build information (commit hash, branch, dates)
 * 
 * This component is designed to be reusable across all UI-only applications.
 * 
 * Styled to match UserProfile widget: same height, padding, background, border-radius, border
 * Positioned on the right side, just before UserProfile widget with small gap
 * 
 * @param buildInfo - Optional build info data. If not provided, component will try to import from '../build-info.json'
 * @param className - Optional CSS class name
 * @param style - Optional inline styles
 */
export function BuildInfo({ buildInfo: buildInfoProp, className, style }: BuildInfoProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position to avoid clipping
  useEffect(() => {
    if (showTooltip && containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceAbove = containerRect.top;
      const spaceBelow = viewportHeight - containerRect.bottom;
      const tooltipHeight = tooltipRect.height || 200; // Estimate if not yet rendered

      // Position above if there's enough space, otherwise below
      if (spaceAbove >= tooltipHeight + 10) {
        setTooltipPosition('top');
      } else if (spaceBelow >= tooltipHeight + 10) {
        setTooltipPosition('bottom');
      } else {
        // Not enough space on either side - choose the side with more space
        setTooltipPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
      }
    }
  }, [showTooltip]);

  // Use buildInfo from prop if provided, otherwise gracefully degrade
  if (!buildInfoProp) {
    return null; // Hide component if build info not available
  }

  const buildInfo: BuildInfoData = buildInfoProp;

  // Format dates with smart alignment
  const authoredResult = formatDateForDisplay(buildInfo.authoredDate, null, null);
  const committedResult = formatDateForDisplay(
    buildInfo.committedDate,
    buildInfo.authoredDate,
    authoredResult
  );
  const builtResult = formatDateForDisplay(
    buildInfo.builtDate,
    buildInfo.committedDate,
    committedResult
  );

  // Build tooltip content with right-aligned property names
  const tooltipContent = (
    <div style={{ padding: '0.5rem', fontSize: '10px', fontFamily: 'monospace', lineHeight: '1.4' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Build Info:</div>
      <div style={{ display: 'table', width: '100%' }}>
        <div style={{ display: 'table-row' }}>
          <span style={{ display: 'table-cell', textAlign: 'right', paddingRight: '0.5rem' }}>Hash:</span>
          <span style={{ display: 'table-cell' }}>{buildInfo.commitHash}</span>
          {buildInfo.mnemonic && (
            <span style={{ display: 'table-cell', paddingLeft: '0.5rem', color: '#999' }}>
              {buildInfo.mnemonic}
            </span>
          )}
        </div>
        <div style={{ display: 'table-row' }}>
          <span style={{ display: 'table-cell', textAlign: 'right', paddingRight: '0.5rem' }}>Branch:</span>
          <span style={{ display: 'table-cell' }}>{buildInfo.branch}</span>
        </div>
        <div style={{ display: 'table-row' }}>
          <span style={{ display: 'table-cell', textAlign: 'right', paddingRight: '0.5rem' }}>Authored:</span>
          <span style={{ display: 'table-cell', fontFamily: 'monospace' }}>{authoredResult.formatted}</span>
        </div>
        <div style={{ display: 'table-row' }}>
          <span style={{ display: 'table-cell', textAlign: 'right', paddingRight: '0.5rem' }}>Committed:</span>
          <span style={{ display: 'table-cell', fontFamily: 'monospace' }}>{committedResult.formatted}</span>
        </div>
        <div style={{ display: 'table-row' }}>
          <span style={{ display: 'table-cell', textAlign: 'right', paddingRight: '0.5rem' }}>Built:</span>
          <span style={{ display: 'table-cell', fontFamily: 'monospace' }}>{builtResult.formatted}</span>
        </div>
      </div>
    </div>
  );

  // Match UserProfile styling exactly: same padding, background, border-radius, border
  // Same height by using same padding and single line display
  const defaultStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '0.5rem 1rem',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    fontSize: '10px',
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: '1.2',
    position: 'relative',
    cursor: 'help',
    ...style
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    ...(tooltipPosition === 'top'
      ? { bottom: '100%', marginBottom: '0.5rem' }
      : { top: '100%', marginTop: '0.5rem' }
    ),
    background: '#333',
    color: '#fff',
    padding: '0.5rem',
    borderRadius: '4px',
    zIndex: 10000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    minWidth: '300px',
    maxWidth: '400px',
    whiteSpace: 'normal' as const,
    maxHeight: '80vh',
    overflowY: 'auto' as const
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={defaultStyle}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title="Hover for full build info"
    >
      <div>
        {buildInfo.commitHash}
        {buildInfo.mnemonic && (
          <span style={{ marginLeft: '0.5rem', color: '#999' }}>{buildInfo.mnemonic}</span>
        )}
      </div>

      {showTooltip && (
        <div ref={tooltipRef} style={tooltipStyle}>
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

