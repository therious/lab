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
  // Store edge map in a separate ref for reliable persistence
  const edgeMapRef = useRef<Map<string, SVGGElement>>(new Map());
  // Use edge identifier (title) as key instead of DOM element for reliable lookup
  const edgeStylesRef = useRef<Map<string, {path?: {stroke?: string, strokeWidth?: string, style?: string}, label?: {fill?: string, fontWeight?: string}, edge?: SVGGElement}>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!dot) {
      setIsLoading(false);
      setError('No dot graph string provided');
      return;
    }

    let isMounted = true;

    const renderGraph = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const viz = await instance();

        // Check if still mounted after async operation
        if (!isMounted) return;

        // Check container ref
        if (!svgContainerRef.current) {
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

        // Final check before DOM manipulation
        if (!isMounted || !svgContainerRef.current) return;

        // Clear previous SVG content
        svgContainerRef.current.innerHTML = '';
        
        // Append the SVG element
        svgContainerRef.current.appendChild(svgElement);
        svgElementRef.current = svgElement;
        
        // Build element mapping for direct manipulation
        buildElementMap(svgElement);
        
        // Setup CSS transitions for animations
        if (animationEnabled)
          setupSvgAnimations(transitionTime);
        
        if (isMounted)
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

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      renderGraph();
    }, 10);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [dot, width, height, animationEnabled, transitionTime]);

  // Effect for state changes and animations
  useEffect(() => {
    if (!svgElementRef.current || !currentState || isLoading) return;
    
    // Wait for element map to be built
    if (elementMapRef.current.size === 0) return;
    
    // Initial state highlighting (no previous state)
    if (!previousState) {
      clearAllStateColors();
      updateStateColor(currentState, true);
      return;
    }
    
    if (animationEnabled) {
      // Animate both regular transitions and self-transitions
      // Always animate if there's a transitionEvent, even for self-transitions
      if (transitionEvent)
        animateStateTransition(previousState, currentState, transitionEvent, transitionTime, onAnimationComplete);
      else if (previousState !== currentState)
        animateStateTransition(previousState, currentState, transitionEvent, transitionTime, onAnimationComplete);
      else {
        // No event and no state change - just update
        clearAllStateColors();
        updateStateColor(currentState, true);
      }
    } else {
      // Direct update without animation
      clearAllStateColors();
      updateStateColor(currentState, true);
    }
    // animateStateTransition is a function defined in this component that uses refs and internal functions.
    // It's called with current values (previousState, currentState, transitionEvent, transitionTime, onAnimationComplete)
    // which are all in the dependency array, so the function identity changing doesn't affect behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentState, previousState, transitionEvent, animationEnabled, transitionTime, isLoading, onAnimationComplete]);

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
    // Store edge map in a dedicated ref for reliable persistence
    edgeMapRef.current = edgeMap;
  }

  // Setup CSS transitions
  function setupSvgAnimations(duration: number) {
    const styleId = 'dag-viewer-animations';
    if (document.getElementById(styleId)) return;
    
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
    }
  }

  // Find edge connecting two states - use simple title lookup
  function findTransitionEdge(fromState: string, toState: string, eventName?: string): SVGGElement | null {
    if (!svgElementRef.current) return null;
    
    // Try direct lookup from edge map first (persistent ref)
    const edgeMap = edgeMapRef.current;
    if (edgeMap && edgeMap.size > 0) {
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
        // If eventName provided, try to match label, but if no match, still return the edge
        // (for conditional transitions, the label is the condition, not the event)
        if (eventName) {
          const label = edge.querySelector('text');
          if (label) {
            const labelText = label.textContent || '';
            if (labelText.includes(eventName))
              return edge;
            // Still return the edge - it might be a conditional transition triggered by the event
            return edge;
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
            titleText.includes(`'${fromState}'->'${toState}'`))
          // Return the edge - for conditional transitions, we don't need to match the event name
          return edge as SVGGElement;
      }
    }
    
    return null;
  }

  // Highlight transition edge
  function highlightTransitionEdge(fromState: string, toState: string, eventName?: string) {
    const edge = findTransitionEdge(fromState, toState, eventName);
    if (!edge) {
      console.warn('DagViewer: Edge not found for highlighting:', fromState, '->', toState, 'event:', eventName);
      return false;
    }
    
    // Get edge identifier (title) for tracking - use this as the key
    const title = edge.querySelector('title');
    const edgeId = title?.textContent?.trim() || `${fromState}->${toState}`;
    
    // Check if edge is currently highlighted (has highlight styles applied)
    // If it's in edgeStylesRef, it means we have stored original styles, so it's either:
    // 1. Currently highlighted (styles not yet restored), OR
    // 2. Already restored (should be removed from map, but check actual state)
    const storedData = edgeStylesRef.current.get(edgeId);
    if (storedData) {
      // Check if actually still highlighted by examining the edge
      const path = edge.querySelector('path') as SVGPathElement;
      const currentStroke = path?.getAttribute('stroke');
      const currentStrokeWidth = path?.getAttribute('stroke-width');
      // If still highlighted (cyan/3), return early
      if (currentStroke === 'cyan' && (currentStrokeWidth === '3' || currentStrokeWidth === '3px')) {
        return true; // Already highlighted, consider it success
      }
      // Otherwise, it was restored but not cleaned up - remove from map and continue
      edgeStylesRef.current.delete(edgeId);
    }
    
    const path = edge.querySelector('path') as SVGPathElement;
    const label = edge.querySelector('text') as SVGTextElement;
    
    // Store original styles BEFORE any modifications - CRITICAL
    const originalStyles: {path?: {stroke?: string, strokeWidth?: string, style?: string}, label?: {fill?: string, fontWeight?: string}} = {};
    
    if (path) {
      // Read ORIGINAL values BEFORE modifying - check if already highlighted
      const currentStroke = path.getAttribute('stroke');
      const currentStrokeWidth = path.getAttribute('stroke-width');
      
      // If already highlighted (cyan/3), we need to get the REAL original from storage
      if (currentStroke === 'cyan' && currentStrokeWidth === '3') {
        const computedStyle = window.getComputedStyle(path);
        // Try to get the actual original from computed style (before our modifications)
        originalStyles.path = {
          stroke: '', // Will be removed if empty
          strokeWidth: computedStyle.strokeWidth === '3px' ? '' : computedStyle.strokeWidth || ''
        };
      } else {
        // Store actual original values
        originalStyles.path = {
          stroke: currentStroke || '',
          strokeWidth: currentStrokeWidth || ''
        };
      }
      
      // Also store style attribute if present (for dotted edges)
      const styleAttr = path.getAttribute('style') || '';
      if (styleAttr && !styleAttr.includes('stroke: cyan'))
        originalStyles.path.style = styleAttr;
      
      path.classList.add('dag-viewer-edge');
      path.setAttribute('stroke', 'cyan');
      path.setAttribute('stroke-width', '3');
    }
    
    if (label) {
      // Read ORIGINAL values BEFORE modifying
      const currentFill = label.getAttribute('fill');
      
      // If already highlighted (orange), get real original
      if (currentFill === 'orange') {
        const computedStyle = window.getComputedStyle(label);
        originalStyles.label = {
          fill: computedStyle.fill === 'rgb(255, 165, 0)' ? '' : computedStyle.fill || '',
          fontWeight: ''
        };
      } else {
        originalStyles.label = {
          fill: currentFill || '',
          fontWeight: label.style.fontWeight || ''
        };
      }
      
      label.classList.add('dag-viewer-edge-label');
      label.setAttribute('fill', 'orange');
      label.style.fontWeight = 'bold';
    }
    
    // Store original styles for this edge using edgeId as key - MUST store for restoration
    // Also store the edge reference so we can restore it directly
    edgeStylesRef.current.set(edgeId, {
      ...originalStyles,
      edge: edge
    });
    return true; // Return true to indicate success
  }

  // Restore edge directly using stored edge reference
  function restoreEdgeDirectly(edge: SVGGElement) {
    const title = edge.querySelector('title');
    const edgeId = title?.textContent?.trim() || 'unknown';
    
    // Look up by edgeId instead of DOM element
    const storedData = edgeStylesRef.current.get(edgeId);
    const originalStyles = storedData ? {
      path: storedData.path,
      label: storedData.label
    } : undefined;
    
    if (!originalStyles) {
      // Edge was already restored or never highlighted - DON'T remove attributes!
      // Just remove our highlight classes and check if we need to clean style
      const path = edge.querySelector('path') as SVGPathElement;
      const label = edge.querySelector('text') as SVGTextElement;
      
      if (path) {
        // Only remove our highlight modifications if they exist
        const currentStroke = path.getAttribute('stroke');
        const currentStrokeWidth = path.getAttribute('stroke-width');
        
        // If we added cyan/3, remove ONLY those
        if (currentStroke === 'cyan')
          path.removeAttribute('stroke');
        if (currentStrokeWidth === '3' || currentStrokeWidth === '3px')
          path.removeAttribute('stroke-width');
        
        // Clean style attribute of our additions only, preserve everything else
        const currentStyle = path.getAttribute('style') || '';
        if (currentStyle.includes('stroke: cyan') || currentStyle.includes('stroke-width: 3')) {
          const cleanedStyle = currentStyle
            .replace(/stroke:\s*cyan[;\s]*/gi, '')
            .replace(/stroke-width:\s*3[px\s]*[;\s]*/gi, '')
            .trim();
          if (cleanedStyle)
            path.setAttribute('style', cleanedStyle);
          else if (currentStyle)
            // Only remove style if it was empty after cleaning AND it was our addition
            // Don't remove if it had other styles originally
            path.removeAttribute('style');
        }
        path.classList.remove('dag-viewer-edge');
      }
      if (label) {
        const currentFill = label.getAttribute('fill');
        // Only remove orange if we added it
        if (currentFill === 'orange')
          label.removeAttribute('fill');
        // Only clear fontWeight if we set it to bold
        if (label.style.fontWeight === 'bold')
          label.style.fontWeight = '';
        label.classList.remove('dag-viewer-edge-label');
      }
      return;
    }
    
    const path = edge.querySelector('path') as SVGPathElement;
    const label = edge.querySelector('text') as SVGTextElement;
    
    if (path && originalStyles.path) {
      // Restore stroke
      if (originalStyles.path.stroke && originalStyles.path.stroke !== 'cyan')
        path.setAttribute('stroke', originalStyles.path.stroke);
      else
        path.removeAttribute('stroke');
      // Restore strokeWidth
      if (originalStyles.path.strokeWidth && originalStyles.path.strokeWidth !== '3' && originalStyles.path.strokeWidth !== '3px')
        path.setAttribute('stroke-width', originalStyles.path.strokeWidth);
      else
        path.removeAttribute('stroke-width');
      // Restore style attribute
      if (originalStyles.path.style)
        path.setAttribute('style', originalStyles.path.style);
      else {
        // Clean our modifications from style if present
        const currentStyle = path.getAttribute('style') || '';
        if (currentStyle.includes('stroke: cyan') || currentStyle.includes('stroke-width: 3')) {
          const cleanedStyle = currentStyle
            .replace(/stroke:\s*cyan[;\s]*/gi, '')
            .replace(/stroke-width:\s*3[px\s]*[;\s]*/gi, '')
            .trim();
          if (cleanedStyle)
            path.setAttribute('style', cleanedStyle);
          else
            path.removeAttribute('style');
        }
      }
      path.classList.remove('dag-viewer-edge');
    }
    
    if (label && originalStyles.label) {
      // Restore fill
      if (originalStyles.label.fill && originalStyles.label.fill !== 'orange')
        label.setAttribute('fill', originalStyles.label.fill);
      else
        label.removeAttribute('fill');
      // Restore fontWeight
      if (originalStyles.label.fontWeight)
        label.style.fontWeight = originalStyles.label.fontWeight;
      else
        label.style.fontWeight = '';
      label.classList.remove('dag-viewer-edge-label');
    }
    
    // DON'T delete from map yet - keep it for verification
    // Only delete after we're sure restoration worked
  }
  
  // Clean up edge from map after verification
  function cleanupEdgeFromMap(edge: SVGGElement) {
    const title = edge.querySelector('title');
    const edgeId = title?.textContent?.trim() || 'unknown';
    edgeStylesRef.current.delete(edgeId);
  }
  
  // Get edge identifier for lookup
  function getEdgeId(edge: SVGGElement): string {
    const title = edge.querySelector('title');
    return title?.textContent?.trim() || 'unknown';
  }

  // Reset transition edge highlighting - MUST restore to original state
  function resetTransitionEdge(fromState: string, toState: string, eventName?: string) {
    // Try to find edge with eventName first, then without
    let edge = findTransitionEdge(fromState, toState, eventName);
    if (!edge && eventName)
      edge = findTransitionEdge(fromState, toState);
    
    if (!edge) {
      // Try to find ANY edge that was highlighted and restore it
      // This is a safety mechanism to ensure edges are always restored
      edgeStylesRef.current.forEach((storedData, storedEdgeId) => {
        if (storedEdgeId.includes(`${fromState}->${toState}`) && storedData.edge)
          edge = storedData.edge;
      });
      
      if (!edge) return;
    }
    
    // Get stored original styles using edgeId
    const edgeId = getEdgeId(edge);
    const storedData = edgeStylesRef.current.get(edgeId);
    const originalStyles = storedData ? {
      path: storedData.path,
      label: storedData.label
    } : undefined;
    
    if (!originalStyles) {
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
      if (originalStyles.path.stroke)
        path.setAttribute('stroke', originalStyles.path.stroke);
      else
        path.removeAttribute('stroke');
      if (originalStyles.path.strokeWidth)
        path.setAttribute('stroke-width', originalStyles.path.strokeWidth);
      else
        path.removeAttribute('stroke-width');
      // Restore style attribute if it was stored (for dotted edges)
      if (originalStyles.path.style)
        path.setAttribute('style', originalStyles.path.style);
      else
        path.removeAttribute('style');
      // Remove highlight class
      path.classList.remove('dag-viewer-edge');
    }
    
    if (label && originalStyles.label) {
      // ALWAYS restore original values
      if (originalStyles.label.fill)
        label.setAttribute('fill', originalStyles.label.fill);
      else
        label.removeAttribute('fill');
      if (originalStyles.label.fontWeight)
        label.style.fontWeight = originalStyles.label.fontWeight;
      else
        label.style.fontWeight = '';
      // Remove highlight class
      label.classList.remove('dag-viewer-edge-label');
    }
    
    // DON'T delete from map here - let the caller cleanup after verification
    // This ensures we can restore again if needed
  }

  // Pulse state color (for destination state in all transitions)
  function pulseStateColor(stateName: string, duration: number) {
    const nodeGroup = elementMapRef.current.get(stateName);
    if (!nodeGroup) return;
    
    const shape = nodeGroup.querySelector('ellipse, circle, polygon') as SVGElement;
    if (!shape) return;
    
    // Get target color (what it should be after transition)
    const targetColor = 'palegreen'; // Destination state is always current/active
    
    // Convert to much brighter/more saturated version for pulse
    // Use more vibrant colors that are clearly noticeable
    const brightColor = '#00FF00'; // Bright green for destination state
    
    // Add transition class for smooth animation
    shape.classList.add('dag-viewer-state');
    
    // Pulse animation: bright -> target color
    shape.setAttribute('fill', brightColor);
    
    // Use longer pulse duration (80% of total) so it's more noticeable
    setTimeout(() => {
      shape.setAttribute('fill', targetColor);
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
    // Handle self-transitions (same state)
    if (fromState === toState) {
      // Only animate if there's actually a self-transition edge
      const selfEdgeRef = findTransitionEdge(fromState, toState, eventName);
      if (!selfEdgeRef) {
        // No edge means no transition - just return without animating
        if (onComplete) onComplete();
        return;
      }
      
      // Store the edge reference directly so we can always restore it
      const edgeToRestore = selfEdgeRef;
      let edgeHighlighted = false;
      
      try {
        // Highlight the self-loop edge
        edgeHighlighted = highlightTransitionEdge(fromState, toState, eventName);
        if (!edgeHighlighted) {
          // Try to restore immediately if highlighting failed
          if (edgeToRestore) restoreEdgeDirectly(edgeToRestore);
          if (onComplete) onComplete();
          return;
        }
        
        // Wait a moment to show the edge
        await new Promise(resolve => setTimeout(resolve, duration * 0.2));
        
        // Pulse the state color (bright then fade to target)
        pulseStateColor(toState, duration);
        
        // Wait for pulse to complete, then reset edge highlighting
        await new Promise(resolve => setTimeout(resolve, duration * 0.8));
        
        // CRITICAL: Restore using direct edge reference
        if (edgeToRestore) {
          restoreEdgeDirectly(edgeToRestore);
          
          // Verify restoration worked
          const path = edgeToRestore.querySelector('path') as SVGPathElement;
          if (path) {
            const stroke = path.getAttribute('stroke');
            const strokeWidth = path.getAttribute('stroke-width');
            if (stroke === 'cyan' || strokeWidth === '3' || strokeWidth === '3px')
              // Try one more time - styles should still be in map
              restoreEdgeDirectly(edgeToRestore);
          }
          
          // Only cleanup from map after successful verification
          cleanupEdgeFromMap(edgeToRestore);
        } else
          resetTransitionEdge(fromState, toState, eventName);
      } catch (error) {
        // CRITICAL: Always restore edge even if there's an error
        if (edgeToRestore) {
          restoreEdgeDirectly(edgeToRestore);
          cleanupEdgeFromMap(edgeToRestore);
        } else
          resetTransitionEdge(fromState, toState, eventName);
      }
      
      if (onComplete) onComplete();
      return;
    }
    
    // Regular transition animation
    let edgeHighlighted = false;
    try {
      // Step 1: Clear all states first
      clearAllStateColors();
      
      // Step 2: Highlight transition path and label
      edgeHighlighted = highlightTransitionEdge(fromState, toState, eventName);
      
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
      if (edgeHighlighted)
        resetTransitionEdge(fromState, toState, eventName);
    } catch (error) {
      // CRITICAL: Always restore edge even if there's an error
      if (edgeHighlighted)
        resetTransitionEdge(fromState, toState, eventName);
    }
    
    if (onComplete) onComplete();
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

