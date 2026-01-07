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
  const edgeStylesRef = useRef<Map<SVGGElement, {path?: {stroke?: string, strokeWidth?: string, style?: string}, label?: {fill?: string, fontWeight?: string}}>>(new Map());
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
    console.log('DagViewer: State change effect triggered', {
      hasSvg: !!svgElementRef.current,
      currentState,
      previousState,
      isLoading,
      elementMapSize: elementMapRef.current.size,
      animationEnabled,
      transitionEvent
    });
    
    if (!svgElementRef.current || !currentState || isLoading) {
      console.log('DagViewer: Early return - svg:', !!svgElementRef.current, 'state:', currentState, 'loading:', isLoading);
      return;
    }
    
    // Wait for element map to be built
    if (elementMapRef.current.size === 0) {
      console.log('DagViewer: Element map not ready yet, waiting...');
      return;
    }
    
    // Initial state highlighting (no previous state)
    if (!previousState) {
      console.log('DagViewer: Initial state highlighting for', currentState);
      clearAllStateColors();
      updateStateColor(currentState, true);
      return;
    }
    
    if (animationEnabled) {
      // Animate both regular transitions and self-transitions
      // Always animate if there's a transitionEvent, even for self-transitions
      if (transitionEvent) {
        console.log('DagViewer: Transition with event, animating', previousState, '->', currentState);
        animateStateTransition(previousState, currentState, transitionEvent, transitionTime, onAnimationComplete);
      } else if (previousState !== currentState) {
        console.log('DagViewer: State change without event, animating');
        animateStateTransition(previousState, currentState, transitionEvent, transitionTime, onAnimationComplete);
      } else {
        // No event and no state change - just update
        console.log('DagViewer: No state change and no event, direct update');
        clearAllStateColors();
        updateStateColor(currentState, true);
      }
    } else {
      // Direct update without animation
      console.log('DagViewer: Direct update from', previousState, 'to', currentState, 'animationEnabled:', animationEnabled);
      clearAllStateColors();
      updateStateColor(currentState, true);
    }
  }, [currentState, previousState, transitionEvent, animationEnabled, transitionTime, isLoading]);

  // Build element map from SVG DOM
  function buildElementMap(svg: SVGSVGElement) {
    const map = new Map<string, SVGGElement>();
    const edgeMap = new Map<string, SVGGElement>();
    
    // Find all node groups (states)
    // Graphviz creates nodes with class "node" and IDs like "node1", "node2", etc.
    // The title element contains the state name
    const nodeGroups = svg.querySelectorAll('g.node');
    nodeGroups.forEach((group) => {
      const title = group.querySelector('title');
      if (title) {
        // Title text is the state name, but may be quoted
        let stateName = title.textContent?.trim() || '';
        // Remove quotes if present
        stateName = stateName.replace(/^["']|["']$/g, '');
        if (stateName) {
          map.set(stateName, group as SVGGElement);
        }
      }
    });
    
    // Build edge map - Graphviz creates edges with class "edge" and title with "fromState->toState"
    const edges = svg.querySelectorAll('g.edge');
    edges.forEach((edge) => {
      const title = edge.querySelector('title');
      if (title) {
        const edgeKey = title.textContent?.trim() || '';
        if (edgeKey) {
          edgeMap.set(edgeKey, edge as SVGGElement);
        }
      }
    });
    
    elementMapRef.current = map;
    // Store edge map in a ref for easy lookup
    (elementMapRef as any).edgeMap = edgeMap;
    console.log('DagViewer: Element map built with', map.size, 'states:', Array.from(map.keys()));
    console.log('DagViewer: Edge map built with', edgeMap.size, 'edges:', Array.from(edgeMap.keys()));
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

  // Clear all state colors
  function clearAllStateColors() {
    elementMapRef.current.forEach((nodeGroup, stateName) => {
      const shape = nodeGroup.querySelector('ellipse, circle, polygon') as SVGElement;
      if (shape) {
        shape.classList.add('dag-viewer-state');
        shape.setAttribute('fill', 'cornsilk');
      }
    });
  }

  // Update state color directly
  function updateStateColor(stateName: string | null | undefined, isCurrent: boolean) {
    if (!stateName) return;
    
    const nodeGroup = elementMapRef.current.get(stateName);
    if (!nodeGroup) {
      console.warn('DagViewer: State node not found:', stateName, 'Available states:', Array.from(elementMapRef.current.keys()));
      return;
    }
    
    const shape = nodeGroup.querySelector('ellipse, circle, polygon') as SVGElement;
    if (shape) {
      shape.classList.add('dag-viewer-state');
      shape.setAttribute('fill', isCurrent ? 'palegreen' : 'cornsilk');
      console.log('DagViewer: Updated state', stateName, 'to', isCurrent ? 'palegreen' : 'cornsilk');
    } else {
      console.warn('DagViewer: Shape element not found for state:', stateName);
    }
  }

  // Find edge connecting two states - use simple title lookup
  function findTransitionEdge(fromState: string, toState: string, eventName?: string): SVGGElement | null {
    console.log('DagViewer: findTransitionEdge called:', fromState, '->', toState, 'event:', eventName);
    
    if (!svgElementRef.current) {
      console.warn('DagViewer: svgElementRef.current is null');
      return null;
    }
    
    // Try direct lookup from edge map first
    const edgeMap = (elementMapRef as any).edgeMap as Map<string, SVGGElement>;
    if (edgeMap) {
      // Try unquoted format first (most common)
      let edgeKey = `${fromState}->${toState}`;
      let edge = edgeMap.get(edgeKey);
      
      // Try quoted formats if not found
      if (!edge) {
        edgeKey = `"${fromState}"->"${toState}"`;
        edge = edgeMap.get(edgeKey);
      }
      if (!edge) {
        edgeKey = `'${fromState}'->'${toState}'`;
        edge = edgeMap.get(edgeKey);
      }
      
      if (edge) {
        console.log('DagViewer: Found edge via map lookup:', edgeKey);
        
        // If eventName provided, try to match label, but if no match, still return the edge
        // (for conditional transitions, the label is the condition, not the event)
        if (eventName) {
          const label = edge.querySelector('text');
          if (label) {
            const labelText = label.textContent || '';
            if (labelText.includes(eventName)) {
              console.log('DagViewer: Label matches event');
              return edge;
            } else {
              console.log('DagViewer: Label does not match event (may be conditional transition):', labelText, 'vs', eventName);
              // Still return the edge - it might be a conditional transition triggered by the event
              return edge;
            }
          }
        }
        // Return edge if found, regardless of event name matching
        return edge;
      }
    }
    
    // Fallback: search all edges by title
    const edges = svgElementRef.current.querySelectorAll('g.edge');
    for (const edge of edges) {
      const title = edge.querySelector('title');
      if (title) {
        const titleText = title.textContent?.trim() || '';
        // Simple check: does title contain fromState->toState pattern?
        if (titleText.includes(`${fromState}->${toState}`) || 
            titleText.includes(`"${fromState}"->"${toState}"`) ||
            titleText.includes(`'${fromState}'->'${toState}'`)) {
          
          console.log('DagViewer: Found edge via fallback search:', titleText);
          // Return the edge - for conditional transitions, we don't need to match the event name
          return edge as SVGGElement;
        }
      }
    }
    
    console.warn('DagViewer: No matching edge found for', fromState, '->', toState);
    return null;
  }

  // Highlight transition edge
  function highlightTransitionEdge(fromState: string, toState: string, eventName?: string) {
    const edge = findTransitionEdge(fromState, toState, eventName);
    if (!edge) {
      console.warn('DagViewer: Transition edge not found:', fromState, '->', toState, 'event:', eventName);
      // Log all available edges for debugging
      if (svgElementRef.current) {
        const allEdges = svgElementRef.current.querySelectorAll('g.edge');
        console.log('DagViewer: Available edges:', Array.from(allEdges).map(e => {
          const title = e.querySelector('title');
          return title?.textContent || 'no title';
        }));
      }
      return false; // Return false to indicate failure
    }
    
    const path = edge.querySelector('path') as SVGPathElement;
    const label = edge.querySelector('text') as SVGTextElement;
    
    console.log('DagViewer: Highlighting edge from', fromState, 'to', toState);
    
    // Store original styles before modifying - CRITICAL for restoration
    const originalStyles: {path?: {stroke?: string, strokeWidth?: string, style?: string}, label?: {fill?: string, fontWeight?: string}} = {};
    
    if (path) {
      // Store original values - check both attribute and computed style
      const computedStyle = window.getComputedStyle(path);
      originalStyles.path = {
        stroke: path.getAttribute('stroke') || computedStyle.stroke || '',
        strokeWidth: path.getAttribute('stroke-width') || computedStyle.strokeWidth || ''
      };
      
      // Also store style attribute if present (for dotted edges)
      const styleAttr = path.getAttribute('style') || '';
      if (styleAttr) {
        originalStyles.path.style = styleAttr;
      }
      
      path.classList.add('dag-viewer-edge');
      path.setAttribute('stroke', 'cyan');
      path.setAttribute('stroke-width', '3');
      console.log('DagViewer: Edge path highlighted, original stroke:', originalStyles.path.stroke, 'strokeWidth:', originalStyles.path.strokeWidth, 'style:', originalStyles.path.style);
    } else {
      console.warn('DagViewer: Path element not found in edge');
    }
    
    if (label) {
      // Store original values
      originalStyles.label = {
        fill: label.getAttribute('fill') || '',
        fontWeight: label.style.fontWeight || ''
      };
      
      label.classList.add('dag-viewer-edge-label');
      label.setAttribute('fill', 'orange');
      label.style.fontWeight = 'bold';
      console.log('DagViewer: Edge label highlighted:', label.textContent, 'original fill:', originalStyles.label.fill);
    } else {
      console.warn('DagViewer: Label element not found in edge');
    }
    
    // Store original styles for this edge - MUST store for restoration
    edgeStylesRef.current.set(edge, originalStyles);
    console.log('DagViewer: Stored original styles for edge restoration');
    return true; // Return true to indicate success
  }

  // Reset transition edge highlighting - MUST restore to original state
  function resetTransitionEdge(fromState: string, toState: string, eventName?: string) {
    // Try to find edge with eventName first, then without
    let edge = findTransitionEdge(fromState, toState, eventName);
    if (!edge && eventName) {
      edge = findTransitionEdge(fromState, toState);
    }
    
    if (!edge) {
      console.error('DagViewer: Edge not found for reset:', fromState, '->', toState, 'event:', eventName);
      // Try to find ANY edge that was highlighted and restore it
      // This is a safety mechanism to ensure edges are always restored
      edgeStylesRef.current.forEach((styles, storedEdge) => {
        const title = storedEdge.querySelector('title');
        if (title && title.textContent?.includes(`${fromState}->${toState}`)) {
          console.warn('DagViewer: Found stored edge for reset, restoring it');
          edge = storedEdge;
        }
      });
      
      if (!edge) {
        console.error('DagViewer: CRITICAL - Cannot find edge to restore!', fromState, '->', toState);
        return;
      }
    }
    
    // Get stored original styles - MUST exist if we highlighted
    const originalStyles = edgeStylesRef.current.get(edge);
    
    if (!originalStyles) {
      console.error('DagViewer: CRITICAL - No stored styles for edge! Attempting fallback restoration');
      // Fallback: try to restore to default Graphviz styles
      const path = edge.querySelector('path') as SVGPathElement;
      const label = edge.querySelector('text') as SVGTextElement;
      
      if (path) {
        path.removeAttribute('stroke');
        path.removeAttribute('stroke-width');
        path.removeAttribute('style');
        path.classList.remove('dag-viewer-edge');
      }
      if (label) {
        label.removeAttribute('fill');
        label.style.fontWeight = '';
        label.classList.remove('dag-viewer-edge-label');
      }
      return;
    }
    
    const path = edge.querySelector('path') as SVGPathElement;
    const label = edge.querySelector('text') as SVGTextElement;
    
    if (path && originalStyles.path) {
      // ALWAYS restore original values
      if (originalStyles.path.stroke) {
        path.setAttribute('stroke', originalStyles.path.stroke);
      } else {
        path.removeAttribute('stroke');
      }
      if (originalStyles.path.strokeWidth) {
        path.setAttribute('stroke-width', originalStyles.path.strokeWidth);
      } else {
        path.removeAttribute('stroke-width');
      }
      // Restore style attribute if it was stored (for dotted edges)
      if (originalStyles.path.style) {
        path.setAttribute('style', originalStyles.path.style);
      } else {
        path.removeAttribute('style');
      }
      // Remove highlight class
      path.classList.remove('dag-viewer-edge');
      console.log('DagViewer: Restored path - stroke:', originalStyles.path.stroke || 'removed', 'strokeWidth:', originalStyles.path.strokeWidth || 'removed');
    }
    
    if (label && originalStyles.label) {
      // ALWAYS restore original values
      if (originalStyles.label.fill) {
        label.setAttribute('fill', originalStyles.label.fill);
      } else {
        label.removeAttribute('fill');
      }
      if (originalStyles.label.fontWeight) {
        label.style.fontWeight = originalStyles.label.fontWeight;
      } else {
        label.style.fontWeight = '';
      }
      // Remove highlight class
      label.classList.remove('dag-viewer-edge-label');
      console.log('DagViewer: Restored label - fill:', originalStyles.label.fill || 'removed');
    }
    
    // Remove from stored styles map AFTER restoration
    edgeStylesRef.current.delete(edge);
    
    console.log('DagViewer: Edge highlighting RESET COMPLETE for', fromState, '->', toState);
  }

  // Pulse state color (for destination state in all transitions)
  function pulseStateColor(stateName: string, duration: number) {
    const nodeGroup = elementMapRef.current.get(stateName);
    if (!nodeGroup) {
      console.warn('DagViewer: State node not found for pulse:', stateName);
      return;
    }
    
    const shape = nodeGroup.querySelector('ellipse, circle, polygon') as SVGElement;
    if (!shape) {
      console.warn('DagViewer: Shape element not found for pulse:', stateName);
      return;
    }
    
    // Get target color (what it should be after transition)
    const targetColor = 'palegreen'; // Destination state is always current/active
    
    // Convert to much brighter/more saturated version for pulse
    // Use more vibrant colors that are clearly noticeable
    const brightColor = '#00FF00'; // Bright green for destination state
    
    // Add transition class for smooth animation
    shape.classList.add('dag-viewer-state');
    
    // Pulse animation: bright -> target color
    shape.setAttribute('fill', brightColor);
    console.log('DagViewer: Pulsing destination state', stateName, 'to bright color', brightColor);
    
    // Use longer pulse duration (80% of total) so it's more noticeable
    setTimeout(() => {
      shape.setAttribute('fill', targetColor);
      console.log('DagViewer: Pulsed state', stateName, 'to target color', targetColor);
    }, duration * 0.8);
  }

  // Animate state transition
  async function animateStateTransition(
    fromState: string,
    toState: string,
    eventName: string | undefined,
    duration: number,
    onComplete?: () => void
  ) {
    console.log('DagViewer: Starting animation transition', fromState, '->', toState);
    
    // Handle self-transitions (same state)
    if (fromState === toState) {
      console.log('DagViewer: Self-transition detected, checking for self-loop edge');
      // Only animate if there's actually a self-transition edge
      const selfEdge = findTransitionEdge(fromState, toState, eventName);
      if (!selfEdge) {
        console.log('DagViewer: No self-transition edge found, skipping animation');
        // No edge means no transition - just return without animating
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      console.log('DagViewer: Self-transition edge found, using pulse animation');
      let edgeHighlighted = false;
      try {
        // Highlight the self-loop edge
        edgeHighlighted = highlightTransitionEdge(fromState, toState, eventName);
        if (!edgeHighlighted) {
          console.warn('DagViewer: Failed to highlight self-transition edge');
        }
        
        // Wait a moment to show the edge
        await new Promise(resolve => setTimeout(resolve, duration * 0.2));
        
        // Pulse the state color (bright then fade to target)
        pulseStateColor(toState, duration);
        
        // Wait for pulse to complete, then reset edge highlighting
        await new Promise(resolve => setTimeout(resolve, duration * 0.8));
        console.log('DagViewer: Resetting self-transition edge');
        if (edgeHighlighted) {
          resetTransitionEdge(fromState, toState, eventName);
        }
      } catch (error) {
        console.error('DagViewer: Error during self-transition animation, ensuring edge is restored:', error);
        // CRITICAL: Always restore edge even if there's an error
        if (edgeHighlighted) {
          resetTransitionEdge(fromState, toState, eventName);
        }
      }
      
      console.log('DagViewer: Self-transition animation complete');
      if (onComplete) {
        onComplete();
      }
      return;
    }
    
    // Regular transition animation
    let edgeHighlighted = false;
    try {
      // Step 1: Clear all states first
      clearAllStateColors();
      
      // Step 2: Highlight transition path and label
      edgeHighlighted = highlightTransitionEdge(fromState, toState, eventName);
      if (!edgeHighlighted) {
        console.warn('DagViewer: No edge found to highlight, skipping edge animation');
      }
      
      // Step 3: Wait a moment to show the path
      await new Promise(resolve => setTimeout(resolve, duration * 0.3));
      
      // Step 4: Animate state color change
      updateStateColor(fromState, false);
      await new Promise(resolve => setTimeout(resolve, duration * 0.2));
      clearAllStateColors();
      
      // Step 5: Pulse destination state (bright then fade to normal)
      pulseStateColor(toState, duration);
      await new Promise(resolve => setTimeout(resolve, duration * 0.3));
      // After pulse, set to final state
      updateStateColor(toState, true);
      
      // Step 6: Reset transition highlighting - ALWAYS restore
      await new Promise(resolve => setTimeout(resolve, duration * 0.5));
      if (edgeHighlighted) {
        resetTransitionEdge(fromState, toState, eventName);
      }
    } catch (error) {
      console.error('DagViewer: Error during animation, ensuring edge is restored:', error);
      // CRITICAL: Always restore edge even if there's an error
      if (edgeHighlighted) {
        resetTransitionEdge(fromState, toState, eventName);
      }
    }
    
    console.log('DagViewer: Animation complete');
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

