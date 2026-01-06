import React, { useEffect, useRef, useState } from 'react';
import { instance } from '@viz-js/viz';

export interface DagViewerProps {
  dot: string;
  width?: string | number;
  height?: string | number;
}

export function DagViewer({ dot, width = '100%', height = '100%' }: DagViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!dot || !containerRef.current) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const renderGraph = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const viz = await instance();
        const svgElement = viz.renderSVGElement(dot, {
          graphAttributes: {
            ImageSize: {
              html: `width:${width}, height:${height}`
            }
          }
        });

        if (!isMounted || !containerRef.current) {
          return;
        }

        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Append the SVG element
        containerRef.current.appendChild(svgElement);
        setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to render graph';
          setError(errorMessage);
          setIsLoading(false);
          console.error('DagViewer render error:', err);
        }
      }
    };

    renderGraph();

    return () => {
      isMounted = false;
    };
  }, [dot, width, height]);

  if (isLoading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>Loading graph...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        overflow: 'auto',
        display: 'block',
        minHeight: typeof height === 'number' ? `${height}px` : height === '100%' ? '100%' : '400px',
        minWidth: typeof width === 'number' ? `${width}px` : width === '100%' ? '100%' : '400px',
      }}
    />
  );
}

