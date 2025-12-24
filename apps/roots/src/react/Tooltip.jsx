import React, { useState, useRef, useEffect } from 'react';

/**
 * Custom tooltip component with word wrap and better formatting
 * Supports tabular formatting for numbers
 * Automatically positions below if there's not enough space above
 */
export function Tooltip({ children, content, style = {}, maxWidth = 350 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState('top'); // 'top' or 'bottom'
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);

  if (!content) {
    return children;
  }

  // Format content - if it contains newlines, format as multi-line
  const formattedContent = typeof content === 'string' ? content.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < content.split('\n').length - 1 && <br />}
    </React.Fragment>
  )) : content;

  // Check position when tooltip becomes visible
  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Check if there's enough space above (at least 10px margin)
      const spaceAbove = containerRect.top;
      const spaceBelow = window.innerHeight - containerRect.bottom;
      const tooltipHeight = tooltipRect.height;
      
      // If not enough space above but enough below, position below
      if (spaceAbove < tooltipHeight + 10 && spaceBelow > tooltipHeight + 10) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isVisible]);

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

