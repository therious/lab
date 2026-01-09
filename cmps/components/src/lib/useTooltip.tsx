import React, { useState, useRef, useEffect, ReactNode } from 'react';
import styled from 'styled-components';

export interface TooltipPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

const TooltipContainer = styled.div<{ $position: TooltipPosition }>`
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

/**
 * Calculate tooltip position to avoid clipping on all screen edges
 */
function calculateTooltipPosition(
  containerRect: DOMRect,
  tooltipRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number
): TooltipPosition {
  const margin = 10; // Margin from screen edges
  const preferredGap = 8; // Gap between container and tooltip

  // Try positioning above first
  const spaceAbove = containerRect.top;
  const spaceBelow = viewportHeight - containerRect.bottom;

  let verticalPos: { top?: number; bottom?: number };
  let horizontalPos: { left?: number; right?: number };

  const heightGapMargin = tooltipRect.height + preferredGap + margin;

  // Choose vertical position (above or below)
  if (spaceAbove >= heightGapMargin) {
    verticalPos = {bottom: viewportHeight - containerRect.top + preferredGap};     // Position above
  } else if (spaceBelow >= heightGapMargin) {
    verticalPos = {top: containerRect.bottom + preferredGap};  // Position below
  } else {
    // Not enough space on either side - position where there's more space
    if (spaceAbove > spaceBelow)
      verticalPos = {bottom: viewportHeight - containerRect.top + preferredGap};
    else
      verticalPos = {top: containerRect.bottom + preferredGap};
  }

  // Choose horizontal position (left, center, or right aligned)
  const tooltipLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
  const tooltipRight = tooltipLeft + tooltipRect.width;

  if (tooltipLeft < margin) {
    horizontalPos = { left: margin };  // Too far left - align to left edge with margin
  } else if (tooltipRight > viewportWidth - margin) {
    horizontalPos = { right: margin };   // Too far right - align to right edge with margin
  } else {
    // Center it relative to container
    horizontalPos = {left: containerRect.left + containerRect.width / 2 - tooltipRect.width / 2};
  }
  return { ...verticalPos, ...horizontalPos };
}

export interface UseTooltipReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipProps: { onMouseEnter: () => void; onMouseLeave: () => void; };
  tooltip: ReactNode | null;
}

/**
 * Custom hook for managing tooltip display and positioning
 *
 * @param content - The content to display in the tooltip
 * @returns Object containing containerRef, tooltipProps (event handlers), and tooltip element
 */
export function useTooltip(content: ReactNode | null): UseTooltipReturn {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position to avoid clipping on all edges
  useEffect(() => {
    if (showTooltip && containerRef.current && tooltipRef.current) {
      const containerRect  = containerRef.current.getBoundingClientRect();
      const tooltipRect    = tooltipRef.current.getBoundingClientRect();
      const viewportWidth  = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const position       = calculateTooltipPosition(containerRect, tooltipRect, viewportWidth, viewportHeight);
      setTooltipPosition(position);
    }
  }, [showTooltip]);

  const tooltip = showTooltip && content ? (
    <TooltipContainer ref={tooltipRef} $position={tooltipPosition}>{content}</TooltipContainer>
  ) : null;

  return {
    containerRef,
    tooltipProps: {
      onMouseEnter: () => setShowTooltip(true),
      onMouseLeave: () => setShowTooltip(false)
    },
    tooltip
  };
}

