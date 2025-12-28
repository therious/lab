import React, {ReactNode, useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {actions} from "../actions-integration";
import {useSelector} from "../actions-integration";
import {persistentGraphIframeRef, persistentGraphIframeElementRef} from "./PersistentGraphContainer";
import {toRender} from "../roots/myvis";
import {CheckGroup} from "./CheckGroup";
import {Tooltip} from "./Tooltip";
import {choiceTitles} from "../roots/mischalfim";
import {MAX_NODES_FOR_EXPANSION} from "../roots/constants";
import type {Root, GraphData} from "../roots/types";
import {useGraphWorker, type GraphComputePayload} from "../hooks/useGraphWorker";
import type {GraphComputePayload as GraphComputePayloadType} from "../utils/graphWorker";
import {useNodeSearch} from "../hooks/useNodeSearch";
// GraphIframe is now in PersistentGraphContainer - we just send updates to it
import {generateTooltipUpdates} from "../utils/updateNodeTooltips";

// Hebrew text style for tooltips
const hebrewTextStyle: React.CSSProperties = {
  fontSize: '1.25em',
  fontWeight: 'bolder'
};


toRender.graphableRows = [] as unknown as Record<string, unknown>; // Will be set by grid view
const defaultGraph: GraphData = {nodes: [], edges: []};








// Reusable slider component with optional tooltip
type SliderWithTooltipProps = {
  label: string;
  tooltipContent: string | ReactNode | null;
  tooltipMaxWidth?: number;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  ticksId: string;
  valueDisplay?: ReactNode;
};

const SliderWithTooltip = ({ label, tooltipContent, tooltipMaxWidth, value, min, max, step, onChange, disabled, ticksId, valueDisplay }: SliderWithTooltipProps): JSX.Element => {
  const [isDragging, setIsDragging] = useState(false);

  const slider = (
    <span>
      <label style={{fontSize: '14px', marginRight: '5px', opacity: disabled ? 0.5 : 1}}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={String(value)}
        onChange={onChange}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        disabled={disabled}
        style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: disabled ? 0.5 : 1}}
        list={ticksId}
      />
      {valueDisplay}
    </span>
  );

  // Don't show tooltip while dragging
  return tooltipContent && !isDragging ? (
    <Tooltip content={tooltipContent} maxWidth={tooltipMaxWidth}>
      {slider}
    </Tooltip>
  ) : slider;
};

export const RtStarView = (): JSX.Element => {

  const {
    options: {choices, otherChoices, mischalfim, allmischalfim, includeLinked, maxEdges, linkByMeaningThreshold, pruneByGradeThreshold, maxGeneration, localExtraDegrees, searchTerm: optionsSearchTerm, isPhysicsEnabled, hideNonMatched}
  } = useSelector(s=>s);

  // Ensure mischalfim and otherChoices are properly initialized before computing graph
  // Note: mischalfim can be empty (all checkboxes unchecked) - that's valid, just means no edges
  const areOptionsReady = mischalfim && Array.isArray(mischalfim) && otherChoices && typeof otherChoices === 'object';

  const setMaxGeneration = useCallback((value: number) => {
    actions.options.setMaxGeneration(value);
  }, []);

  const setLocalExtraDegrees = useCallback((value: number) => {
    actions.options.setLocalExtraDegrees(value);
  }, []);

  // Use extracted hooks for worker and search functionality
  const {
    workerRef,
    computationIdRef,
    isComputing,
    graph,
    tooltipCounts,
    nodeIdToRootIdRef,
    computeGraph: computeGraphBase,
    setSearchResultHandler,
  } = useGraphWorker();

  // Always use persistent iframe refs from App level - iframe persists across routes
  const iframeRef = persistentGraphIframeRef;
  const iframeElementRef = persistentGraphIframeElementRef;
  const dataWorkerRef = useRef<Worker | null>(null);
  const allRootsRef = useRef<Root[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevMaxGenRef = useRef<number>(1);
  const prevLinkByMeaningRef = useRef<number>(0);
  const prevPruneByGradeRef = useRef<number>(6);
  const prevMaxEdgesRef = useRef<number>(0);
  const [graphableRowsReady, setGraphableRowsReady] = useState<boolean>(false);

  // UI state from options slice
  const setIsPhysicsEnabled = useCallback((value: boolean) => {
    actions.options.setPhysicsEnabled(value);
  }, []);

  // Search/match state - kept in component state (not Redux) as it's transient
  const [searchMatchCounts, setSearchMatchCounts] = useState<{ definitions: number; examples: number }>({ definitions: 0, examples: 0 });
  const [nodeColors, setNodeColors] = useState<Array<{ id: number; color: { background: string } }>>([]);
  const [matchedNodeIds, setMatchedNodeIds] = useState<number[]>([]);

  // Initialize data worker for tooltip requests and roots data
  // Keep worker alive across navigation to preserve state
  useEffect(() => {
    // Only create worker if it doesn't exist
    if (!dataWorkerRef.current) {
      dataWorkerRef.current = new Worker(
        new URL('../worker/dataWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }

    // Request all roots for graph computation
    dataWorkerRef.current.postMessage({ type: 'getAllRoots' });
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'getAllRootsResult') {
        const { roots: allRoots } = e.data.payload;
        allRootsRef.current = allRoots as Root[];

        // Initialize graphableRows with all roots if it's empty
        // This ensures the graph computes even if you navigate directly to visualization
        // or if the grid hasn't set it yet
        // Note: We preserve graphableRows across routes, so this only runs on first load
        if (!toRender.graphableRows || !Array.isArray(toRender.graphableRows) || (Array.isArray(toRender.graphableRows) && toRender.graphableRows.length === 0)) {
          toRender.graphableRows = allRoots as unknown as Record<string, unknown>;
          console.log('[RtStarView] Initialized graphableRows with all roots:', allRoots.length);
        }
        // Signal that graphableRows is ready (even if it was already set from grid)
        setGraphableRowsReady(true);
      }
    };
    dataWorkerRef.current.addEventListener('message', handleMessage);

    return () => {
      // Don't terminate worker on unmount - keep it alive for navigation
      // Only remove event listener
      if (dataWorkerRef.current) {
        dataWorkerRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  // Create a dummy networkRef for useNodeSearch (it doesn't actually use it for search, just for applyNodeColors)
  const dummyNetworkRef = useRef(null);

  // Use searchTerm from options slice
  const {
    searchTerm: hookSearchTerm,
    setSearchTerm: setHookSearchTerm,
    searchIdRef,
    applyNodeColors: applyNodeColorsBase,
  } = useNodeSearch(graph, dummyNetworkRef, workerRef);

  // Sync hook's searchTerm with Redux options slice
  const searchTerm = optionsSearchTerm || hookSearchTerm;
  const setSearchTerm = useCallback((value: string) => {
    actions.options.setSearchTerm(value);
    setHookSearchTerm(value);
  }, [setHookSearchTerm]);

  // Override applyNodeColors to work with iframe instead of direct network access
  const applyNodeColors = useCallback((colors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>) => {
    // Convert to format expected by iframe
    const iframeColors = colors.map(({ nodeId, color }) => ({
      id: nodeId,
      color: { background: color.background }
    }));
    setNodeColors(iframeColors);
  }, []);

  const shouldDisableExpansion = tooltipCounts.n > MAX_NODES_FOR_EXPANSION;

  // Setup search result handler
  useEffect(() => {
    setSearchResultHandler((searchId, nodeColors) => {
      // Only apply if this is the latest search (using generic utility)
      if (searchId === searchIdRef.current) {
        applyNodeColors(nodeColors);

        // Extract matched node IDs (nodes with orange or yellow background)
        const matchedIds = nodeColors
          .filter(({ color }) => color.background === 'orange' || color.background === 'yellow')
          .map(({ nodeId }) => nodeId);
        setMatchedNodeIds(matchedIds);

        // Count matches: orange = definition matches, yellow = example matches
        let definitionMatches = 0;
        let exampleMatches = 0;
        nodeColors.forEach(({ color }) => {
          if (color.background === 'orange') {
            definitionMatches++;
          } else if (color.background === 'yellow') {
            exampleMatches++;
          }
        });
        setSearchMatchCounts({ definitions: definitionMatches, examples: exampleMatches });

        // If hideNonMatched is enabled, update visibility to show newly matched nodes
        if (hideNonMatched && iframeRef.current) {
          iframeRef.current.toggleNonMatchedNodes(true, matchedIds);
        }
      }
    });
  }, [setSearchResultHandler, searchIdRef, applyNodeColors, hideNonMatched]);

  // Clear search match counts and show all nodes when search term is cleared
  useEffect(() => {
    if (!searchTerm || !searchTerm.trim()) {
      setSearchMatchCounts({ definitions: 0, examples: 0 });
      setMatchedNodeIds([]);
      actions.options.setHideNonMatched(false);
      setNodeColors([]); // Clear node colors to remove highlighting
      // Show all nodes
      if (iframeRef.current && graph.nodes.length > 0) {
        const allNodeIds = graph.nodes.map(n => n.id);
        iframeRef.current.toggleNonMatchedNodes(false, allNodeIds);
      }
    }
  }, [searchTerm, graph]);

  // Update node tooltips when dictionary loads
  useEffect(() => {
    if (!iframeRef.current || !graph.nodes || graph.nodes.length === 0) {
      return;
    }

    // Request all roots from data worker to generate tooltips
    if (dataWorkerRef.current) {
      dataWorkerRef.current.postMessage({ type: 'getAllRoots' });
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'getAllRootsResult') {
          const { roots: allRoots } = e.data.payload;

          // Generate tooltip updates for all nodes
          const updates = generateTooltipUpdates(
            graph,
            nodeIdToRootIdRef.current,
            allRoots as Root[]
          );

          // Apply updates via iframe (convert nodeId to id)
          if (updates.length > 0 && iframeRef.current) {
            const iframeUpdates = updates.map(({ nodeId, title }) => ({ id: nodeId, title }));
            iframeRef.current.updateTooltips(iframeUpdates);
          }
        }
      };
      dataWorkerRef.current.addEventListener('message', handleMessage);
      return () => {
        if (dataWorkerRef.current) {
          dataWorkerRef.current.removeEventListener('message', handleMessage);
        }
      };
    }
  }, [graph, nodeIdToRootIdRef]);

  const chMaxEdges = useCallback((evt: React.ChangeEvent<HTMLInputElement>): void => {
    actions.options.setMaxEdges(Number(evt.target.value));
  }, []);

  const chMaxGeneration = useCallback((evt: React.ChangeEvent<HTMLInputElement>): void => {
    const value = Number(evt.target.value);
    // Use requestAnimationFrame to ensure non-blocking update
    requestAnimationFrame(() => {
      setMaxGeneration(value);
    });
  }, []);

  const chExtraDegrees = useCallback((evt: React.ChangeEvent<HTMLInputElement>): void => {
    const value = Number(evt.target.value);
    // Shift: 0 = 1, 1 = 2, etc. (value + 1)
    setLocalExtraDegrees(value);
    // Update maxGeneration: 0 -> 1, 1 -> 2, etc.
    requestAnimationFrame(() => {
      setMaxGeneration(value + 1);
    });
  }, []);

  const chLinkByMeaning = useCallback((evt: React.ChangeEvent<HTMLInputElement>): void => {
    const sliderValue = Number(evt.target.value);
    const threshold = 6 - sliderValue; // Reverse: slider 0 = threshold 6, slider 6 = threshold 0
    // Use requestAnimationFrame to ensure non-blocking update
    requestAnimationFrame(() => {
      actions.options.setLinkByMeaningThreshold(threshold);
    });
  }, []);

  // Local state for immediate slider updates (non-blocking)
  const [localPruneByGrade, setLocalPruneByGrade] = useState<number>(pruneByGradeThreshold);
  const pruneSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state to Redux with debounce (only when user stops dragging)
  useEffect(() => {
    if (pruneSyncTimeoutRef.current) {
      clearTimeout(pruneSyncTimeoutRef.current);
    }

    if (localPruneByGrade !== pruneByGradeThreshold) {
      // Debounce Redux update - only update after user stops dragging
      pruneSyncTimeoutRef.current = setTimeout(() => {
        actions.options.setPruneByGradeThreshold(localPruneByGrade);
      }, 300); // 300ms after last change
    }

    return () => {
      if (pruneSyncTimeoutRef.current) {
        clearTimeout(pruneSyncTimeoutRef.current);
      }
    };
  }, [localPruneByGrade, pruneByGradeThreshold]);

  // Sync Redux state to local when it changes externally (but not from our own updates)
  useEffect(() => {
    // Only sync if the difference is significant (to avoid loops)
    if (Math.abs(localPruneByGrade - pruneByGradeThreshold) > 0.1) {
      setLocalPruneByGrade(pruneByGradeThreshold);
    }
  }, [pruneByGradeThreshold]);

  const chPruneByGrade = useCallback((evt: React.ChangeEvent<HTMLInputElement>): void => {
    const sliderValue = Number(evt.target.value);
    const threshold = 6 - sliderValue; // Reverse: slider 0 = threshold 6, slider 6 = threshold 0
    // Update local state immediately (non-blocking, no Redux update yet)
    setLocalPruneByGrade(threshold);
  }, []);


  // Update localExtraDegrees when maxGeneration changes (from other sources)
  // This keeps the slider in sync if maxGeneration is set elsewhere
  useEffect(() => {
    // maxGeneration = localExtraDegrees + 1, so localExtraDegrees = maxGeneration - 1
    const newExtraDegrees = Math.max(0, Math.min(6, maxGeneration - 1));
    if (newExtraDegrees !== localExtraDegrees) {
      setLocalExtraDegrees(newExtraDegrees);
    }
  }, [maxGeneration, localExtraDegrees]);

  // Debounced computation function
  const computeGraph = useCallback((): void => {
    // Ensure allRootsRef is populated before computing
    if (!allRootsRef.current || allRootsRef.current.length === 0) {
      return;
    }

    // Note: computationIdRef.current is incremented in the useEffect before calling this

    // Use graphableRows if available, otherwise use allRoots to preserve nodes
    // This ensures nodes remain stable when switching routes
    const rootsToUse = (toRender.graphableRows && Array.isArray(toRender.graphableRows) && toRender.graphableRows.length > 0)
      ? (toRender.graphableRows as Root[])
      : allRootsRef.current;

    // Send computation request to worker with computation ID
    // Use localPruneByGrade for immediate responsiveness
    const payload: GraphComputePayload = {
        computationId: computationIdRef.current,
      filteredRoots: rootsToUse,
      allRoots: allRootsRef.current,
        linkByMeaningThreshold,
        maxGeneration,
        mischalfim,
        otherChoices,
      maxNodes: allRootsRef.current.length, // No limit on number of roots
        maxEdges,
        pruneByGradeThreshold: localPruneByGrade,
      maxNodesForExpansion: MAX_NODES_FOR_EXPANSION,
    };

    console.log('[RtStarView] Computing graph with', rootsToUse.length, 'roots, mischalfim:', mischalfim.length, 'otherChoices:', JSON.stringify(otherChoices));
    computeGraphBase(payload);
  }, [linkByMeaningThreshold, maxGeneration, mischalfim, otherChoices, maxEdges, localPruneByGrade, computeGraphBase]);

  // Auto-update graph when slider changes or when graphableRows becomes ready
  // Use debounce with cancellation for smooth slider dragging
  useEffect(() => {
    // Ensure we have allRoots before computing (graphableRows can be empty - that's valid)
    if (!allRootsRef.current || allRootsRef.current.length === 0) {
      return;
    }
    // Ensure Redux options are properly initialized
    if (!areOptionsReady) {
      console.log('[RtStarView] Waiting for options to be ready - mischalfim:', mischalfim?.length, 'otherChoices:', !!otherChoices);
      return;
    }
    // If graphableRows is empty, use allRoots as fallback to preserve nodes
    // This ensures nodes remain stable when switching routes
    const rootsToUse = (toRender.graphableRows && Array.isArray(toRender.graphableRows) && toRender.graphableRows.length > 0)
      ? toRender.graphableRows
      : allRootsRef.current;

    // Assert non-null: workerRef.current is guaranteed to be set when this runs
      // Cancel previous computation by incrementing ID immediately
      computationIdRef.current += 1;

      // Clear any pending timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      // Use requestAnimationFrame to ensure we're not blocking the UI thread
      // Then set a timeout for the actual computation
    // For checkbox changes (otherChoices, mischalfim), use shorter debounce for immediate feedback
    // For slider changes, use longer debounce to batch rapid changes
    const isCheckboxChange =
      (maxGeneration === (prevMaxGenRef.current || maxGeneration)) &&
      (linkByMeaningThreshold === (prevLinkByMeaningRef.current || linkByMeaningThreshold)) &&
      (localPruneByGrade === (prevPruneByGradeRef.current || localPruneByGrade)) &&
      (maxEdges === (prevMaxEdgesRef.current || maxEdges));

    const debounceTime = isCheckboxChange ? 50 : 100; // Faster for checkboxes, slower for sliders

      requestAnimationFrame(() => {
        debounceTimeoutRef.current = setTimeout(() => {
          // Use graphableRows if available, otherwise use allRoots to preserve nodes
          const rootsToUse = (toRender.graphableRows && Array.isArray(toRender.graphableRows) && toRender.graphableRows.length > 0)
            ? toRender.graphableRows
            : allRootsRef.current;
          // Only compute if we have roots to use
          if (rootsToUse && rootsToUse.length > 0) {
            computeGraph();
          }
        // Update previous values after computation
        prevMaxGenRef.current = maxGeneration;
        prevLinkByMeaningRef.current = linkByMeaningThreshold;
        prevPruneByGradeRef.current = localPruneByGrade;
        prevMaxEdgesRef.current = maxEdges;
      }, debounceTime);
      });

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
      };
  }, [maxGeneration, linkByMeaningThreshold, localPruneByGrade, maxEdges, computeGraph, graphableRowsReady, otherChoices, mischalfim]);

  // Send graph updates to persistent iframe when graph changes
  // Always send updates when graph changes, even if nodes.length is 0 (to clear the graph)
  useEffect(() => {
    if (iframeElementRef.current?.contentWindow) {
      console.log('[RtStarView] Sending graph update to persistent iframe:', graph.nodes.length, 'nodes', graph.edges.length, 'edges');
      iframeElementRef.current.contentWindow.postMessage({
        type: 'updateGraph',
        payload: graph
      }, '*');

      // After graph update, reapply hideNonMatched filter if enabled
      // This ensures newly added nodes that don't match the search are hidden
      if (hideNonMatched && matchedNodeIds.length > 0 && iframeRef.current) {
        // Use setTimeout to ensure graph update is processed first
        setTimeout(() => {
          if (iframeRef.current) {
            console.log('[RtStarView] Reapplying hideNonMatched filter after graph update, matched:', matchedNodeIds.length);
            iframeRef.current.toggleNonMatchedNodes(true, matchedNodeIds);
          }
        }, 100);
      }
    }
  }, [graph, iframeElementRef, hideNonMatched, matchedNodeIds, iframeRef]);

  // Send node color updates to persistent iframe
  useEffect(() => {
    if (iframeElementRef.current?.contentWindow && nodeColors.length > 0) {
      iframeElementRef.current.contentWindow.postMessage({
        type: 'updateNodeColors',
        payload: { nodeColors }
      }, '*');
    }
  }, [nodeColors, iframeElementRef]);

  // Listen for iframe ready message from persistent iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'iframeReady') {
        console.log('[RtStarView] Persistent iframe ready, sending graph if available');
        // Restore physics state
        if (iframeRef.current) {
          iframeRef.current.setPhysics(isPhysicsEnabled);
        }
        // Send current graph if we have one
        if (graph.nodes.length > 0 && iframeElementRef.current?.contentWindow) {
          console.log('[RtStarView] Sending initial graph to iframe:', graph.nodes.length, 'nodes');
          iframeElementRef.current.contentWindow.postMessage({
            type: 'updateGraph',
            payload: graph
          }, '*');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [graph, isPhysicsEnabled, iframeRef, iframeElementRef]);

  // Handle iframe ready
  const handleIframeReady = useCallback(() => {
    // Iframe is ready, physics starts enabled by default
    setIsPhysicsEnabled(true);
  }, []);

  // Handle tooltip request from iframe
  const handleTooltipRequest = useCallback((rootId: number, definition: string) => {
    if (!dataWorkerRef.current || !iframeElementRef.current?.contentWindow) return;

    // Request tooltip from data worker
    dataWorkerRef.current.postMessage({
      type: 'getDictionaryTooltip',
      payload: { rootId, definition }
    });

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'getDictionaryTooltipResult' && e.data.payload.rootId === rootId) {
        const { tooltip } = e.data.payload;
        // Send tooltip back to iframe via postMessage
        if (iframeElementRef.current?.contentWindow) {
          iframeElementRef.current.contentWindow.postMessage({
            type: 'tooltipResult',
            payload: { rootId, tooltip }
          }, '*');
        }
        if (dataWorkerRef.current) {
          dataWorkerRef.current.removeEventListener('message', handleMessage);
        }
      }
    };

    dataWorkerRef.current.addEventListener('message', handleMessage);
  }, []);

  // Toggle physics animation
  const togglePhysics = useCallback((): void => {
    if (!iframeRef.current) return;

    const newState = !isPhysicsEnabled;
    setIsPhysicsEnabled(newState);
    iframeRef.current.setPhysics(newState);
  }, [isPhysicsEnabled]);

  // Keyboard event handler for Space and F4
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Space bar or F4 key
      if (event.key === ' ' || event.key === 'Space' || event.key === 'F4') {
        // Prevent default behavior for Space (page scroll)
        if (event.key === ' ' || event.key === 'Space') {
          event.preventDefault();
        }
        togglePhysics();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return ()=>window.removeEventListener('keydown', handleKeyDown);
  }, [togglePhysics]);

  // Position the persistent iframe in our container using CSS instead of moving it
  // Moving iframes in the DOM can break blob URLs, so we use CSS positioning instead
  useEffect(() => {
    const graphContainer = document.getElementById('graph-container');
    if (graphContainer && persistentGraphIframeElementRef.current) {
      const iframe = persistentGraphIframeElementRef.current;
      // Don't move the iframe - just style it to be visible and positioned correctly
      // The iframe stays in PersistentGraphContainer, but we make it visible and position it
      iframe.style.position = 'fixed';
      // Calculate position relative to graph-container
      const containerRect = graphContainer.getBoundingClientRect();
      iframe.style.top = `${containerRect.top}px`;
      iframe.style.left = `${containerRect.left}px`;
      iframe.style.width = `${containerRect.width}px`;
      iframe.style.height = `${containerRect.height}px`;
      iframe.style.pointerEvents = 'auto';
      iframe.style.zIndex = '1';
      iframe.style.border = 'none';
      iframe.style.visibility = 'visible';
      console.log('[RtStarView] Positioned persistent iframe over graph container');

      // Update position on resize
      const updatePosition = () => {
        const rect = graphContainer.getBoundingClientRect();
        iframe.style.top = `${rect.top}px`;
        iframe.style.left = `${rect.left}px`;
        iframe.style.width = `${rect.width}px`;
        iframe.style.height = `${rect.height}px`;
      };

      window.addEventListener('resize', updatePosition);
      const observer = new MutationObserver(updatePosition);
      observer.observe(graphContainer, { attributes: true, attributeFilter: ['style', 'class'] });

      return () => {
        window.removeEventListener('resize', updatePosition);
        observer.disconnect();
        // Hide iframe when component unmounts
        iframe.style.visibility = 'hidden';
        iframe.style.pointerEvents = 'none';
      };
    }
  }, [persistentGraphIframeElementRef.current]);

  // Display the persistent iframe element in our layout
  // The iframe is created by PersistentGraphContainer and kept alive across routes
  const graphing = (
    <div style={{ backgroundColor: 'midnightblue', height: "100%", width: "100%", minHeight: '400px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div id="graph-container" style={{ width: '100%', height: '100%', position: 'relative' }} />
    </div>
  );

//heading, active, name, choices,  setChoice
   return  (
      <div style={{marginTop:'30px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{position: 'relative', marginLeft: '14px'}}>
          <div>
            <h1 style={{display: 'inline', margin: 0}}>Star View</h1>
            <span style={{marginLeft: '20px', fontSize: '16px', fontWeight: 'normal'}}>
              Nodes: {graph.nodes.length} | Connections: {graph.edges.length}
            </span>
          </div>
          <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '10px', alignItems: 'center'}}>
            <button
              onClick={togglePhysics}
              title="Use space bar or F4 to toggle play/pause"
              style={{
                padding: '5px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                boxShadow: 'none',
                outline: 'none',
                textShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.textShadow = 'none';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              {isPhysicsEnabled ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => iframeRef.current?.recenter()}
              title="Zoom and center all visible nodes"
              style={{
                padding: '5px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                boxShadow: 'none',
                outline: 'none',
                textShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.textShadow = 'none';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              🎯 Recenter
            </button>
          </div>
        </div>
        <hr/>
        <div style={{ paddingBottom: '10px'}}>
        {/* Flex container that wraps */}
        <div style={{marginLeft:'14px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '20px'}}>
          {/* Osios Mischalfos section */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
            {/* Stats above */}
            {tooltipCounts.afterMischalfim && (
              <div style={{marginBottom: '8px', fontSize: '12px', color: '#000'}}>
                Nodes: {tooltipCounts.afterMischalfim.nodes} | Connections: {tooltipCounts.afterMischalfim.edges}
              </div>
            )}
            {/* Heading and buttons */}
            <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap'}}>
              <Tooltip content={<>Osios Mischalfos (<span style={hebrewTextStyle}>אותיות מתחלפות</span>) are groups of Hebrew letters that can substitute for each other. When a root has one letter replaced with a related letter from the same group, it often produces a related meaning. These relationships are used to link roots together in the visualization.</>}>
                <span>Osios Mischalfos</span>
              </Tooltip>
              <button onClick={actions.options.allChoices}>Select All</button>
              <button onClick={actions.options.clearChoices}>Clear All</button>
            </h3>
          </div>

          {/* Add similar meanings slider - three column layout */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
            {/* Stats row: empty space for label | stats over slider */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', flexWrap: 'nowrap'}}>
              <div style={{width: '160px', textAlign: 'right'}}></div>
              {tooltipCounts.meaningStage && (
                <div style={{fontSize: '12px', textAlign: 'center', color: (tooltipCounts.meaningStage.nodesAdded === 0 && tooltipCounts.meaningStage.edgesAdded === 0) || shouldDisableExpansion ? '#999' : '#000'}}>
                  +{tooltipCounts.meaningStage.nodesAdded} = {tooltipCounts.meaningStage.nodesTotal} | +{tooltipCounts.meaningStage.edgesAdded} = {tooltipCounts.meaningStage.edgesTotal}
                </div>
              )}
            </div>
            {/* Control row: label (right-justified) | slider | value */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap'}}>
              <label style={{fontSize: '14px', opacity: shouldDisableExpansion ? 0.5 : 1, whiteSpace: 'nowrap', width: '160px', textAlign: 'right'}}>
                Add similar meanings:
              </label>
              <Tooltip content={shouldDisableExpansion ? null : `Include additional roots (${tooltipCounts.x}) based on meanings similar to roots currently included in the grid filter (${tooltipCounts.n})`}>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={String(6 - linkByMeaningThreshold)}
                  onChange={chLinkByMeaning}
                  disabled={shouldDisableExpansion}
                  style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: shouldDisableExpansion ? 0.5 : 1}}
                  list="linkByMeaning-ticks"
                />
              </Tooltip>
              <datalist id="linkByMeaning-ticks">
                {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
              </datalist>
              <span style={{fontSize: '12px', whiteSpace: 'nowrap'}}>Grade ≥ {linkByMeaningThreshold}</span>
            </div>
          </div>

          {/* Extra degrees slider - three column layout */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
            {/* Stats row: empty space for label | stats over slider */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', flexWrap: 'nowrap'}}>
              <div style={{width: '120px', textAlign: 'right'}}></div>
              {tooltipCounts.extraDegreesStage && (
                <div style={{fontSize: '12px', textAlign: 'center', color: (tooltipCounts.extraDegreesStage.nodesAdded === 0 && tooltipCounts.extraDegreesStage.edgesAdded === 0) || shouldDisableExpansion ? '#999' : '#000'}}>
                  +{tooltipCounts.extraDegreesStage.nodesAdded} = {tooltipCounts.extraDegreesStage.nodesTotal} | +{tooltipCounts.extraDegreesStage.edgesAdded} = {tooltipCounts.extraDegreesStage.edgesTotal}
                </div>
              )}
            </div>
            {/* Control row: label (right-justified) | slider | value */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap'}}>
              <label style={{fontSize: '14px', opacity: shouldDisableExpansion ? 0.5 : 1, whiteSpace: 'nowrap', width: '120px', textAlign: 'right'}}>
                Extra degrees:
              </label>
              <Tooltip content={shouldDisableExpansion ? null : <>Given the roots included by the grid ({tooltipCounts.n}) and the roots with similar meanings ({tooltipCounts.x}) bring in additional roots ({tooltipCounts.w}) that are related according to the enabled <span style={hebrewTextStyle}>אותיות מתחלפות</span> criteria</>}>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={String(localExtraDegrees)}
                  onChange={chExtraDegrees}
                  disabled={shouldDisableExpansion}
                  style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: shouldDisableExpansion ? 0.5 : 1}}
                  list="extraDegrees-ticks"
                />
              </Tooltip>
              <datalist id="extraDegrees-ticks">
                {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
              </datalist>
              <span style={{fontSize: '12px', whiteSpace: 'nowrap'}}>{localExtraDegrees}</span>
            </div>
          </div>

          {/* Prune by grade slider - three column layout */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
            {/* Stats row: empty space for label | stats over slider */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', flexWrap: 'nowrap'}}>
              <div style={{width: '120px', textAlign: 'right'}}></div>
              {tooltipCounts.pruneStage && (
                <div style={{fontSize: '12px', textAlign: 'center', color: tooltipCounts.pruneStage.edgesRemoved === 0 ? '#999' : '#000'}}>
                  -0 = {tooltipCounts.pruneStage.nodesTotal} | -{tooltipCounts.pruneStage.edgesRemoved} = {tooltipCounts.pruneStage.edgesTotal}
                </div>
              )}
            </div>
            {/* Control row: label (right-justified) | slider | value */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap'}}>
              <label style={{fontSize: '14px', whiteSpace: 'nowrap', width: '120px', textAlign: 'right'}}>
                Prune by grade:
              </label>
              {(() => {
                const numMaxWidth = Math.max(
                  String(tooltipCounts.n).length,
                  String(tooltipCounts.x).length,
                  String(tooltipCounts.w).length
                );
                const tooltipContent = shouldDisableExpansion ? (
                  <>
                    Prune out roots ({tooltipCounts.pruneRemoved}) whose related letter-based connections to other roots in current diagram do not have a sufficiently similar-graded meaning.
                    <br />
                    <br />
                    This works on the current set of {tooltipCounts.y} roots (from grid filter and any enabled expansion sliders).
                  </>
                ) : (
                  <>
                    Given the {tooltipCounts.y} total roots now included:
                    <br />
                    <br />
                    {String(tooltipCounts.n).padStart(numMaxWidth)} included in grid filter
                    <br />
                    {String(tooltipCounts.x).padStart(numMaxWidth)} have similar meanings
                    <br />
                    {String(tooltipCounts.w).padStart(numMaxWidth)} extra degrees of relation
                    <br />
                    <br />
                    Now prune out roots ({tooltipCounts.pruneRemoved}) included by previous sliders whose related letter-based connections to other roots in current diagram do not have a sufficiently similar-graded meaning.
                  </>
                );
                return (
                  <>
                    <Tooltip content={tooltipContent} maxWidth={700}>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        step={1}
                        value={String(6 - localPruneByGrade)}
                        onChange={chPruneByGrade}
                        disabled={false}
                        style={{width: '120px', margin: '0 5px', verticalAlign: 'middle'}}
                        list="pruneByGrade-ticks"
                      />
                    </Tooltip>
                    <datalist id="pruneByGrade-ticks">
                      {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
                    </datalist>
                  </>
                );
              })()}
              <span style={{fontSize: '12px', whiteSpace: 'nowrap'}}>Grade ≥ {localPruneByGrade}</span>
            </div>
          </div>

          {/* Remove Free checkbox - three column layout */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
            {/* Stats row: checkbox space | stats over "Remove Free" text */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', flexWrap: 'nowrap'}}>
              <div style={{width: '20px', flexShrink: 0}}></div>
              {tooltipCounts.removeFreeStage && (
                <div style={{fontSize: '12px', textAlign: 'center', color: tooltipCounts.removeFreeStage.nodesRemoved === 0 || tooltipCounts.q === 0 ? '#999' : '#000'}}>
                  -{tooltipCounts.removeFreeStage.nodesRemoved} = {tooltipCounts.removeFreeStage.nodesTotal} | -0 = {tooltipCounts.removeFreeStage.edgesTotal}
                </div>
              )}
            </div>
            {/* Control row: checkbox | label */}
            <div style={{display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap'}}>
              <Tooltip content={`Remove roots (${tooltipCounts.q}) from diagram now left with no surviving connections based on the grid filter and the preceding sliders`}>
                <label style={{fontSize: '14px', marginRight: '5px', fontWeight: 'normal', opacity: tooltipCounts.q > 0 ? 1 : 0.5, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center'}}>
                  <input
                    type="checkbox"
                    checked={otherChoices.removeFree || false}
                    onChange={(e) => actions.options.chooseOtherOne('removeFree', e.target.checked)}
                    style={{marginRight: '5px'}}
                    disabled={tooltipCounts.q === 0}
                  />
                  Remove Free
                </label>
              </Tooltip>
            </div>
          </div>
        </div>
          <CheckGroup
            choices={Object.fromEntries(Object.entries(otherChoices).filter(([k]) => k !== 'removeFree'))}
            setChoice={actions.options.chooseOtherOne}
            titles={{
            vavToDoubled: `Doubled end consonants are often related to ע״ו root`,
              jumbled: "Connect roots w/ same set of letters in any order",
              atbash: "Use atbash (אתבש) to relate roots (א=ת, ב=ש, ג=ר)"
            }}
          />
          <CheckGroup
            choices={choices}
            setChoice={actions.options.chooseOne}
            titles={allmischalfim ? choiceTitles(allmischalfim) : undefined}
          />
        </div>
        <hr/>
        <div style={{marginBottom: '10px'}}>
          <Tooltip content="Find matching root definition terms, or example word definitions, highlighted in orange and yellow, respectively">
            <span style={{display: 'inline-block', position: 'relative'}}>
          <label style={{marginRight: '10px'}}>Search nodes:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search definitions and examples (supports |, &, -, &quot;&quot;)"
                style={{width: '400px', padding: '5px 25px 5px 5px'}}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 5px',
                    fontSize: '16px',
                    lineHeight: '1',
                    color: '#666'
                  }}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </span>
          </Tooltip>
          {searchTerm && searchTerm.trim() && (
            <>
              <span style={{marginLeft: '10px', fontSize: '14px'}}>
                Matches: <span style={{display: 'inline-block', backgroundColor: 'orange', color: 'black', borderRadius: '10px', minWidth: '20px', height: '20px', lineHeight: '20px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 6px'}}>{searchMatchCounts.definitions}</span> definitions, <span style={{display: 'inline-block', backgroundColor: 'gold', color: 'black', borderRadius: '10px', minWidth: '20px', height: '20px', lineHeight: '20px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 6px'}}>{searchMatchCounts.examples}</span> examples
              </span>
              <button
                  onClick={() => {
                    const newHideState = !hideNonMatched;
                    actions.options.setHideNonMatched(newHideState);
                    if (iframeRef.current && matchedNodeIds.length > 0) {
                      iframeRef.current.toggleNonMatchedNodes(newHideState, matchedNodeIds);
                    }
                  }}
                disabled={matchedNodeIds.length === 0}
                style={{
                  marginLeft: '10px',
                  padding: '5px 10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: hideNonMatched ? '#4CAF50' : '#fff',
                  color: hideNonMatched ? '#fff' : '#000',
                  cursor: matchedNodeIds.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: matchedNodeIds.length > 0 ? 1 : 0.5,
                  boxShadow: 'none',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (matchedNodeIds.length > 0) {
                    e.currentTarget.style.backgroundColor = hideNonMatched ? '#45a049' : '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = hideNonMatched ? '#4CAF50' : '#fff';
                }}
                title={hideNonMatched ? 'Show all nodes' : 'Hide non-matched nodes'}
              >
                {hideNonMatched ? '👁️ Show All' : '👁️‍🗨️ Hide Others'}
            </button>
            </>
          )}
        </div>
        <hr/>
        {isComputing && <span style={{marginLeft: '10px', color: '#888'}}>Computing...</span>}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {graphing}
        </div>
      </div>

    );
};
