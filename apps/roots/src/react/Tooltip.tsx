import React, { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';

/**
 * Custom tooltip component with word wrap and better formatting
 * Supports tabular formatting for numbers
 * Automatically positions below if there's not enough space above
 */
type TooltipProps = {
  children: ReactNode;
  content: string | ReactNode | null | undefined;
  style?: CSSProperties;
  maxWidth?: number;
};

type TooltipPosition = 'top' | 'bottom';

export function Tooltip({ children, content, style = {}, maxWidth = 350 }: TooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<TooltipPosition>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Format content - if it's a string with newlines, format as multi-line
  // If it's already ReactNode, use it as-is
  const formattedContent: ReactNode = content && typeof content === 'string' 
    ? content.split('\n').map((line, i, lines) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))
    : content;

  // Check position when tooltip becomes visible and adjust to prevent clipping
  useEffect(() => {
    if (content && isVisible && tooltipRef.current && containerRef.current) {
      // Use requestAnimationFrame to ensure tooltip is rendered before calculating position
      requestAnimationFrame(() => {
        if (tooltipRef.current && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Check if there's enough space above (at least 10px margin)
          const spaceAbove = containerRect.top;
          const spaceBelow = viewportHeight - containerRect.bottom;
          const tooltipHeight = tooltipRect.height || 200; // Estimate if not yet rendered
          
          // If not enough space above but enough below, position below
          if (spaceAbove < tooltipHeight + 10 && spaceBelow > tooltipHeight + 10) {
            setPosition('bottom');
          } else {
            setPosition('top');
          }
          
          // Adjust tooltip position to prevent clipping
          // If tooltip would be clipped at top, use fixed positioning
          if (position === 'top' && tooltipRect.top < 10) {
            tooltipRef.current.style.position = 'fixed';
            tooltipRef.current.style.top = `${Math.min(containerRect.bottom + 5, viewportHeight - tooltipRect.height - 10)}px`;
            tooltipRef.current.style.bottom = 'auto';
            const leftPos = containerRect.left + (containerRect.width / 2);
            // Ensure tooltip doesn't go off left edge
            if (leftPos < tooltipRect.width / 2 + 10) {
              tooltipRef.current.style.left = `${tooltipRect.width / 2 + 10}px`;
              tooltipRef.current.style.transform = 'translateX(-50%)';
            }
            // Ensure tooltip doesn't go off right edge
            else if (leftPos > viewportWidth - tooltipRect.width / 2 - 10) {
              tooltipRef.current.style.left = `${viewportWidth - tooltipRect.width / 2 - 10}px`;
              tooltipRef.current.style.transform = 'translateX(-50%)';
            }
            else {
              tooltipRef.current.style.left = `${leftPos}px`;
              tooltipRef.current.style.transform = 'translateX(-50%)';
            }
          }
          // If tooltip would be clipped on the left or right, adjust
          else if (tooltipRect.left < 10) {
            tooltipRef.current.style.left = `${10 - containerRect.left + (containerRect.width / 2)}px`;
            tooltipRef.current.style.transform = 'translateX(0)';
          }
          else if (tooltipRect.right > viewportWidth - 10) {
            tooltipRef.current.style.left = `${viewportWidth - 10 - containerRect.left - (containerRect.width / 2)}px`;
            tooltipRef.current.style.transform = 'translateX(-100%)';
          }
        }
      });
    }
  }, [content, isVisible, position]);

  // Early return after all hooks - this is safe because hooks are always called
  if (!content) {
    return <>{children}</>;
  }

  return (
    <span
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', ...style }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            ...(position === 'top' ? {
              bottom: '100%',
              marginBottom: '5px',
            } : {
              top: '100%',
              marginTop: '5px',
            }),
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 14px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            maxWidth: `${maxWidth}px`,
            minWidth: maxWidth >= 700 ? '400px' : '200px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            textAlign: 'left',
            fontFamily: 'monospace', // Use monospace for number alignment
          }}
        >
          {formattedContent}
        </div>
      )}
    </span>
  );
}

