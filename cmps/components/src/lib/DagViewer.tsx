import React, { useEffect, useRef, useState } from 'react';
import { instance } from '@viz-js/viz';

export interface DagViewerProps {
  dot: string;
  width?: string | number;
  height?: string | number;
  currentState?: string;
  previousState?: string;
  transitionEvent?: string;
  animationEnabled?: boolean;
  transitionTime?: number;
  onAnimationComplete?: () => void;
}

export function DagViewer({ 
  dot, 
  width = '100%', 
  height = '100%',
  currentState,
  previousState,
  transitionEvent,
  animationEnabled = true,
  transitionTime = 500,
  onAnimationComplete
}: DagViewerProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgElementRef = useRef<SVGSVGElement | null>(null);
  const elementMapRef = useRef<Map<string, SVGGElement>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('DagViewer effect triggered, dot:', dot ? `${dot.substring(0, 100)}...` : 'undefined/empty');

    if (!dot) {
      console.warn('DagViewer: No dot string provided');
      setIsLoading(false);
      setError('No dot graph string provided');
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

        // Check if still mounted after async operation
        if (!isMounted) {
          console.warn('DagViewer: Component unmounted during async operation');
          return;
        }

        // Check container ref
        if (!svgContainerRef.current) {
          console.warn('DagViewer: SVG container ref not available');
          if (isMounted) {
            setIsLoading(false);
            setError('Container not available');
          }
          return;
        }

        const svgElement = viz.renderSVGElement(dot);


        // Scale SVG to fit container
        if (svgElement && svgElement instanceof SVGSVGElement) {
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svgElement.style.maxWidth = '100%';
          svgElement.style.maxHeight = '100%';
        }

        console.log('DagViewer: SVG element rendered:', svgElement);

        // Final check before DOM manipulation
        if (!isMounted || !svgContainerRef.current) {
          console.warn('DagViewer: Component unmounted or container lost before appending');
          return;
        }

        // Clear previous SVG content
        svgContainerRef.current.innerHTML = '';
        
        // Append the SVG element
        svgContainerRef.current.appendChild(svgElement);
        svgElementRef.current = svgElement;
        console.log('DagViewer: SVG appended to container successfully');
        
        // Build element mapping for direct manipulation
        buildElementMap(svgElement);
        
        // Setup CSS transitions for animations
        if (animationEnabled) {
          setupSvgAnimations(transitionTime);
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('DagViewer render error:', err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to render graph';
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      renderGraph();
    }, 10);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [dot, width, height]);

  // Effect for state changes and animations
  useEffect(() => {
    if (!svgElementRef.current || !currentState || isLoading) return;
    
    if (animationEnabled && previousState && previousState !== currentState) {
      animateStateTransition(previousState, currentState, transitionEvent, transitionTime, onAnimationComplete);
    } else {
      // Direct update without animation
      updateStateColor(previousState, false);
      updateStateColor(currentState, true);
    }
  }, [currentState, previousState, transitionEvent, animationEnabled, transitionTime, isLoading]);

  // Build element map from SVG DOM
  function buildElementMap(svg: SVGSVGElement) {
    const map = new Map<string, SVGGElement>();
    
    // Find all node groups (states)
    const nodeGroups = svg.querySelectorAll('g.node');
    nodeGroups.forEach((group) => {
      const title = group.querySelector('title');
      if (title) {
        const stateName = title.textContent?.trim();
        if (stateName) {
          map.set(stateName, group as SVGGElement);
        }
      }
    });
    
    elementMapRef.current = map;
    console.log('DagViewer: Element map built with', map.size, 'states');
  }

  // Setup CSS transitions
  function setupSvgAnimations(duration: number) {
    const styleId = 'dag-viewer-animations';
    if (document.getElementById(styleId)) return; // Already added
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .dag-viewer-state ellipse,
      .dag-viewer-state circle,
      .dag-viewer-state polygon {
        transition: fill ${duration}ms ease-in-out;
      }
      .dag-viewer-edge path {
        transition: stroke ${duration}ms ease-in-out,
                    stroke-width ${duration}ms ease-in-out;
      }
      .dag-viewer-edge-label text {
        transition: fill ${duration}ms ease-in-out,
                    font-weight ${duration}ms ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }

  // Update state color directly
  function updateStateColor(stateName: string | null | undefined, isCurrent: boolean) {
    if (!stateName) return;
    
    const nodeGroup = elementMapRef.current.get(stateName);
    if (!nodeGroup) {
      console.warn('DagViewer: State node not found:', stateName);
      return;
    }
    
    const shape = nodeGroup.querySelector('ellipse, circle, polygon') as SVGElement;
    if (shape) {
      shape.classList.add('dag-viewer-state');
      shape.setAttribute('fill', isCurrent ? 'palegreen' : 'cornsilk');
    }
  }

  // Find edge connecting two states
  function findTransitionEdge(fromState: string, toState: string, eventName?: string): SVGGElement | null {
    if (!svgElementRef.current) return null;
    
    const edges = svgElementRef.current.querySelectorAll('g.edge');
    for (const edge of edges) {
      const title = edge.querySelector('title');
      if (title) {
        const titleText = title.textContent || '';
        // Check if this edge connects fromState to toState
        if (titleText.includes(fromState) && titleText.includes(toState)) {
          // If eventName provided, check if label matches
          if (eventName) {
            const label = edge.querySelector('text');
            if (label && label.textContent?.includes(eventName)) {
              return edge as SVGGElement;
            }
          } else {
            return edge as SVGGElement;
          }
        }
      }
    }
    return null;
  }

  // Highlight transition edge
  function highlightTransitionEdge(fromState: string, toState: string, eventName?: string) {
    const edge = findTransitionEdge(fromState, toState, eventName);
    if (!edge) {
      console.warn('DagViewer: Transition edge not found:', fromState, '->', toState);
      return;
    }
    
    const path = edge.querySelector('path') as SVGPathElement;
    const label = edge.querySelector('text') as SVGTextElement;
    
    if (path) {
      path.classList.add('dag-viewer-edge');
      path.style.stroke = 'cyan';
      path.style.strokeWidth = '3px';
    }
    
    if (label) {
      label.classList.add('dag-viewer-edge-label');
      label.style.fill = 'orange';
      label.style.fontWeight = 'bold';
    }
  }

  // Reset transition edge highlighting
  function resetTransitionEdge(fromState: string, toState: string) {
    const edge = findTransitionEdge(fromState, toState);
    if (!edge) return;
    
    const path = edge.querySelector('path') as SVGPathElement;
    const label = edge.querySelector('text') as SVGTextElement;
    
    if (path) {
      path.style.stroke = '';
      path.style.strokeWidth = '';
    }
    
    if (label) {
      label.style.fill = '';
      label.style.fontWeight = '';
    }
  }

  // Animate state transition
  async function animateStateTransition(
    fromState: string,
    toState: string,
    eventName: string | undefined,
    duration: number,
    onComplete?: () => void
  ) {
    // Step 1: Highlight transition path and label
    highlightTransitionEdge(fromState, toState, eventName);
    
    // Step 2: Wait a moment to show the path
    await new Promise(resolve => setTimeout(resolve, duration * 0.3));
    
    // Step 3: Animate state color change
    updateStateColor(fromState, false);
    await new Promise(resolve => setTimeout(resolve, duration * 0.2));
    updateStateColor(toState, true);
    
    // Step 4: Reset transition highlighting
    await new Promise(resolve => setTimeout(resolve, duration * 0.5));
    resetTransitionEdge(fromState, toState);
    
    if (onComplete) {
      onComplete();
    }
  }

  // Always render the container div so ref is available
  return (
    <div
      style={{
        width,
        height,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: typeof height === 'number' ? `${height}px` : height === '100%' ? '100%' : '400px',
        minWidth: typeof width === 'number' ? `${width}px` : width === '100%' ? '100%' : '400px',
        border: '1px solid #ccc',
        backgroundColor: '#f9f9f9',
        position: 'relative',
      }}
    >
      {/* SVG container - always present for ref */}
      <div
        ref={svgContainerRef}
        style={{
          width: '100%',
          height: '100%',
          display: isLoading || error ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(249, 249, 249, 0.9)',
        }}>
          <span>Loading graph...</span>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'red',
          padding: '20px',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(249, 249, 249, 0.9)',
        }}>
          <span>Error: {error}</span>
          {dot && (
            <details style={{ marginTop: '10px', maxWidth: '100%', overflow: 'auto' }}>
              <summary>Dot string (first 500 chars)</summary>
              <pre style={{ fontSize: '10px', textAlign: 'left' }}>{dot.substring(0, 500)}</pre>
            </details>
          )}
        </div>
      )}

      {/* No data message */}
      {!dot && !isLoading && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'orange' }}>
          <span>No dot graph string provided</span>
        </div>
      )}
    </div>
  );
}

