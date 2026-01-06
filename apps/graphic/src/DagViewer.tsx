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
    console.log('DagViewer effect triggered, dot:', dot ? `${dot.substring(0, 100)}...` : 'undefined/empty', 'containerRef:', !!containerRef.current);
    
    if (!dot) {
      console.warn('DagViewer: No dot string provided');
      setIsLoading(false);
      setError('No dot graph string provided');
      return;
    }

    if (!containerRef.current) {
      console.warn('DagViewer: Container ref not available');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const renderGraph = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('DagViewer: Starting render, dot length:', dot.length);

        const viz = await instance();
        console.log('DagViewer: Viz instance obtained');
        
        const svgElement = viz.renderSVGElement(dot, {
          graphAttributes: {
            ImageSize: {
              html: `width:${width}, height:${height}`
            }
          }
        });

        console.log('DagViewer: SVG element rendered:', svgElement);

        if (!isMounted || !containerRef.current) {
          console.warn('DagViewer: Component unmounted or container lost during render');
          return;
        }

        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Append the SVG element
        containerRef.current.appendChild(svgElement);
        console.log('DagViewer: SVG appended to container');
        setIsLoading(false);
      } catch (err) {
        console.error('DagViewer render error:', err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to render graph';
          setError(errorMessage);
          setIsLoading(false);
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
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid gray' }}>
        <span>Loading graph...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'red', border: '1px solid red', padding: '20px' }}>
        <span>Error: {error}</span>
        {dot && (
          <details style={{ marginTop: '10px', maxWidth: '100%', overflow: 'auto' }}>
            <summary>Dot string (first 500 chars)</summary>
            <pre style={{ fontSize: '10px', textAlign: 'left' }}>{dot.substring(0, 500)}</pre>
          </details>
        )}
      </div>
    );
  }

  if (!dot) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid orange', color: 'orange' }}>
        <span>No dot graph string provided</span>
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
        border: '1px solid #ccc',
        backgroundColor: '#f9f9f9',
      }}
    />
  );
}

