import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { dateTimeToLocal } from '@therious/utils';

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

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  font-size: 10px;
  color: #666;
  font-family: monospace;
  line-height: 1.2;
  position: relative;
  cursor: help;
`;

const WidgetLine = styled.div`
  &:last-child {
    color: #999;
  }
`;

const TooltipContainer = styled.div<{ $position: { top?: number; bottom?: number; left?: number; right?: number } }>`
  position: fixed;
  ${props => props.$position.top !== undefined && `top: ${props.$position.top}px;`}
  ${props => props.$position.bottom !== undefined && `bottom: ${props.$position.bottom}px;`}
  ${props => props.$position.left !== undefined && `left: ${props.$position.left}px;`}
  ${props => props.$position.right !== undefined && `right: ${props.$position.right}px;`}
  background: #333;
  color: #fff;
  padding: 0.5rem;
  border-radius: 4px;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  white-space: normal;
  max-height: 80vh;
  overflow-y: auto;
  font-size: 10px;
  font-family: monospace;
  line-height: 1.4;
  width: fit-content;
  min-width: min-content;
`;

const TooltipTitle = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const TooltipTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TooltipLabelCell = styled.td`
  text-align: right;
  padding-right: 0.75rem;
  padding-bottom: 0.25rem;
`;

const TooltipValueCell = styled.td`
  text-align: left;
  padding-bottom: 0.25rem;
  font-family: monospace;
`;

const TooltipValueCellLast = styled(TooltipValueCell)`
  padding-bottom: 0;
`;

/**
 * Format a date string for display with smart formatting
 * Returns date in yyyy-mm-dd HH:MM:SS format (local time)
 * If the date is the same as the previous date, only show the time
 * Use non-breaking spaces to align dates/times vertically
 */
function formatDateForDisplay(
  dateStr: string,
  previousDateStr: string | null,
  previousFormatted: { formatted: string; fullLength: number } | null
): { formatted: string; fullLength: number } {
  const fullDateStr = dateTimeToLocal(dateStr);
  const fullLength = fullDateStr.length;

  if (!previousDateStr) {
    // First date - show full date and time
    return { formatted: fullDateStr, fullLength };
  }

  const prevFormatted = dateTimeToLocal(previousDateStr);

  // If dates are exactly the same (identical strings), show "---"
  if (fullDateStr === prevFormatted) {
    const prevLength = previousFormatted?.fullLength || fullLength;
    return { formatted: '---', fullLength: prevLength };
  }

  // Check if same date by splitting on space and comparing date portion
  const [currentDatePart] = fullDateStr.split(' ');
  const [prevDatePart] = prevFormatted.split(' ');

  // If same date (different time), pad with non-breaking spaces to align
  if (currentDatePart === prevDatePart) {
    // Extract time portion (format: "HH:MM:SS")
    const [, timeStr] = fullDateStr.split(' ');
    // Pad with non-breaking spaces to match previous full length
    const prevLength = previousFormatted?.fullLength || fullLength;
    const padding = '\u00A0'.repeat(Math.max(0, prevLength - timeStr.length));
    return { formatted: padding + timeStr, fullLength: prevLength };
  }

  // Different date - show full date and time
  return { formatted: fullDateStr, fullLength };
}

/**
 * Format mnemonic: wrap in double quotes and replace hyphens with spaces
 */
function formatMnemonic(mnemonic: string): string {
  return `"${mnemonic.replace(/-/g, ' ')}"`;
}

/**
 * Calculate tooltip position to avoid clipping on all screen edges
 */
function calculateTooltipPosition(
  containerRect: DOMRect,
  tooltipRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number
): { top?: number; bottom?: number; left?: number; right?: number } {
  const margin = 10; // Margin from screen edges
  const preferredGap = 8; // Gap between container and tooltip

  // Try positioning above first
  const spaceAbove = containerRect.top;
  const spaceBelow = viewportHeight - containerRect.bottom;
  const spaceLeft = containerRect.left;
  const spaceRight = viewportWidth - containerRect.right;

  let verticalPos: { top?: number; bottom?: number } = {};
  let horizontalPos: { left?: number; right?: number } = {};

  // Choose vertical position (above or below)
  if (spaceAbove >= tooltipRect.height + preferredGap + margin) {
    // Position above
    verticalPos = {
      bottom: viewportHeight - containerRect.top + preferredGap
    };
  } else if (spaceBelow >= tooltipRect.height + preferredGap + margin) {
    // Position below
    verticalPos = {
      top: containerRect.bottom + preferredGap
    };
  } else {
    // Not enough space on either side - position where there's more space
    if (spaceAbove > spaceBelow) {
      verticalPos = {
        bottom: viewportHeight - containerRect.top + preferredGap
      };
    } else {
      verticalPos = {
        top: containerRect.bottom + preferredGap
      };
    }
  }

  // Choose horizontal position (left, center, or right aligned)
  const tooltipLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
  const tooltipRight = tooltipLeft + tooltipRect.width;

  if (tooltipLeft < margin) {
    // Too far left - align to left edge with margin
    horizontalPos = { left: margin };
  } else if (tooltipRight > viewportWidth - margin) {
    // Too far right - align to right edge with margin
    horizontalPos = { right: margin };
  } else {
    // Center it relative to container
    horizontalPos = {
      left: containerRect.left + containerRect.width / 2 - tooltipRect.width / 2
    };
  }

  return { ...verticalPos, ...horizontalPos };
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
  const [tooltipPosition, setTooltipPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position to avoid clipping on all edges
  useEffect(() => {
    if (showTooltip && containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const position = calculateTooltipPosition(
        containerRect,
        tooltipRect,
        viewportWidth,
        viewportHeight
      );

      setTooltipPosition(position);
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

  // Format mnemonic
  const formattedMnemonic = buildInfo.mnemonic ? formatMnemonic(buildInfo.mnemonic) : null;

  return (
    <Container
      ref={containerRef}
      className={className}
      style={style}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title="Hover for full build info"
    >
      <WidgetLine>{buildInfo.commitHash}</WidgetLine>
      {formattedMnemonic && (
        <WidgetLine>{formattedMnemonic}</WidgetLine>
      )}

      {showTooltip && (
        <TooltipContainer ref={tooltipRef} $position={tooltipPosition}>
          <TooltipTitle>Build Info:</TooltipTitle>
          <TooltipTable>
            <tbody>
              <tr>
                <TooltipLabelCell>Hash:</TooltipLabelCell>
                <TooltipValueCell>{buildInfo.commitHash}</TooltipValueCell>
              </tr>
              {formattedMnemonic && (
                <tr>
                  <TooltipLabelCell>Mnemonic:</TooltipLabelCell>
                  <TooltipValueCell style={{ color: '#999' }}>{formattedMnemonic}</TooltipValueCell>
                </tr>
              )}
              <tr>
                <TooltipLabelCell>Branch:</TooltipLabelCell>
                <TooltipValueCell>{buildInfo.branch}</TooltipValueCell>
              </tr>
              <tr>
                <TooltipLabelCell>Authored:</TooltipLabelCell>
                <TooltipValueCell>{authoredResult.formatted}</TooltipValueCell>
              </tr>
              <tr>
                <TooltipLabelCell>Committed:</TooltipLabelCell>
                <TooltipValueCell>{committedResult.formatted}</TooltipValueCell>
              </tr>
              <tr>
                <TooltipLabelCell>Built:</TooltipLabelCell>
                <TooltipValueCellLast>{builtResult.formatted}</TooltipValueCellLast>
              </tr>
            </tbody>
          </TooltipTable>
        </TooltipContainer>
      )}
    </Container>
  );
}
