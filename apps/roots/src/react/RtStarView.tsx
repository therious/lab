import React, {ReactNode, useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {actions} from "../actions-integration";
import {useSelector} from "../actions-integration";
import {persistentGraphIframeRef, persistentGraphIframeElementRef} from "./PersistentGraphContainer";
import {toRender} from "../roots/myvis";
import {CheckGroup} from "./CheckGroup";
import {Tooltip} from "./Tooltip";
import {MAX_NODES_FOR_EXPANSION} from "../roots/constants";
import type {Root, GraphData} from "../roots/types";
import {useGraphWorker, type GraphComputePayload} from "../hooks/useGraphWorker";
import type {GraphComputePayload as GraphComputePayloadType} from "../utils/graphWorker";
import {useNodeSearch} from "../hooks/useNodeSearch";
import {GraphIframe} from "./GraphIframe";
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
  const slider = (
    <span>
      <label style={{fontSize: '14px', marginRight: '5px', cursor: tooltipContent ? 'help' : 'default', opacity: disabled ? 0.5 : 1}}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={String(value)}
        onChange={onChange}
        disabled={disabled}
        style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: disabled ? 0.5 : 1}}
        list={ticksId}
      />
      {valueDisplay}
    </span>
  );

  return tooltipContent ? (
    <Tooltip content={tooltipContent} maxWidth={tooltipMaxWidth}>
      {slider}
    </Tooltip>
  ) : slider;
};

export const RtStarView = (): JSX.Element => {

  const {
    options: {choices, otherChoices, mischalfim, includeLinked, maxEdges, linkByMeaningThreshold, pruneByGradeThreshold, maxGeneration, localExtraDegrees, searchTerm: optionsSearchTerm, isPhysicsEnabled, hideNonMatched}
  } = useSelector(s=>s);

  // Ensure mischalfim and otherChoices are properly initialized before computing graph
  const areOptionsReady = mischalfim && Array.isArray(mischalfim) && mischalfim.length > 0 && otherChoices && typeof otherChoices === 'object';
  
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
        if (!toRender.graphableRows || !Array.isArray(toRender.graphableRows) || (Array.isArray(toRender.graphableRows) && toRender.graphableRows.length === 0)) {
          toRender.graphableRows = allRoots as unknown as Record<string, unknown>;
          // Signal that graphableRows is ready
          setGraphableRowsReady(true);
        }
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
    if (!toRender.graphableRows || !Array.isArray(toRender.graphableRows)) {
      return;
    }

    // Ensure allRootsRef is populated before computing
    if (!allRootsRef.current || allRootsRef.current.length === 0) {
      return;
    }

    // Note: computationIdRef.current is incremented in the useEffect before calling this

    // Send computation request to worker with computation ID
    // Use localPruneByGrade for immediate responsiveness
    const payload: GraphComputePayload = {
        computationId: computationIdRef.current,
      filteredRoots: toRender.graphableRows as Root[],
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

    computeGraphBase(payload);
  }, [linkByMeaningThreshold, maxGeneration, mischalfim, otherChoices, maxEdges, localPruneByGrade, computeGraphBase]);

  // Auto-update graph when slider changes or when graphableRows becomes ready
  // Use debounce with cancellation for smooth slider dragging
  useEffect(() => {
    // Ensure we have both graphableRows and allRoots before computing
    if (!toRender.graphableRows || !Array.isArray(toRender.graphableRows) || toRender.graphableRows.length === 0) {
      return;
    }
    if (!allRootsRef.current || allRootsRef.current.length === 0) {
      return;
    }
    // Ensure Redux options are properly initialized
    if (!areOptionsReady) {
      console.log('[RtStarView] Waiting for options to be ready - mischalfim:', mischalfim?.length, 'otherChoices:', !!otherChoices);
      return;
    }

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
          computeGraph();
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

  const graphing = (
    <div style={{ backgroundColor: 'midnightblue', height: "100%", width: "100%", minHeight: '400px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <GraphIframe
      graph={graph} 
        onReady={handleIframeReady}
        onTooltipRequest={handleTooltipRequest}
        nodeColors={nodeColors}
        iframeRef={iframeRef}
        iframeElementRef={iframeElementRef}
        style={{ backgroundColor: 'midnightblue', height: '100%', width: '100%', flex: 1 }}
      />
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
        <h3 style={{marginLeft:'14px', display:'inline'}}>
          <Tooltip content={<>Osios Mischalfos (<span style={hebrewTextStyle}>אותיות מתחלפות</span>) are groups of Hebrew letters that can substitute for each other. When a root has one letter replaced with a related letter from the same group, it often produces a related meaning. These relationships are used to link roots together in the visualization.</>}>
            <span style={{cursor: 'help'}}>Osios Mischalfos</span>
          </Tooltip>
        <button  onClick={actions.options.allChoices}>Select All</button>
        <button  onClick={actions.options.clearChoices}>Clear All</button>
        <span style={{marginLeft:'20px', fontWeight:'normal'}}>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <SliderWithTooltip
              label="Add similar meanings:"
              tooltipContent={shouldDisableExpansion ? null : `Include additional roots (${tooltipCounts.x}) based on meanings similar to roots currently included in the grid filter (${tooltipCounts.n})`}
              value={6 - linkByMeaningThreshold}
                min={0} 
                max={6} 
                step={1}
                onChange={chLinkByMeaning}
              disabled={shouldDisableExpansion}
              ticksId="linkByMeaning-ticks"
              valueDisplay={<span style={{marginLeft: '5px', fontSize: '12px', display: 'inline-block', width: '85px'}}>Grade ≥ {linkByMeaningThreshold}</span>}
              />
            <datalist id="linkByMeaning-ticks">
              {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
            </datalist>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <SliderWithTooltip
              label="Extra degrees:"
              tooltipContent={shouldDisableExpansion ? null : <>Given the roots included by the grid ({tooltipCounts.n}) and the roots with similar meanings ({tooltipCounts.x}) bring in additional roots ({tooltipCounts.w}) that are related according to the enabled <span style={hebrewTextStyle}>אותיות מתחלפות</span> criteria</>}
              value={localExtraDegrees}
                min={0} 
                max={6} 
                step={1}
                onChange={chExtraDegrees}
              disabled={shouldDisableExpansion}
              ticksId="extraDegrees-ticks"
              valueDisplay={<span style={{marginLeft: '5px', fontSize: '12px', display: 'inline-block', width: '20px'}}>{localExtraDegrees}</span>}
              />
            <datalist id="extraDegrees-ticks">
              {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
            </datalist>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            {(() => {
              const numMaxWidth = Math.max(
                String(tooltipCounts.n).length,
                String(tooltipCounts.x).length,
                String(tooltipCounts.w).length
              );
              const tooltipContent = shouldDisableExpansion ? null : (
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
                <SliderWithTooltip
                  label="Prune by grade:"
                  tooltipContent={tooltipContent}
                  tooltipMaxWidth={700}
                  value={6 - localPruneByGrade}
                      min={0} 
                      max={6} 
                      step={1}
                      onChange={chPruneByGrade}
                  disabled={shouldDisableExpansion}
                  ticksId="pruneByGrade-ticks"
                  valueDisplay={<span style={{marginLeft: '5px', fontSize: '12px', display: 'inline-block', width: '85px'}}>Grade ≥ {localPruneByGrade}</span>}
                    />
              );
            })()}
            <datalist id={`pruneByGrade-ticks`}>
              {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
            </datalist>
            <span style={{marginLeft: '5px', fontSize: '12px', display: 'inline-block', width: '85px'}}>
              Grade ≥ {localPruneByGrade}
            </span>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <Tooltip content={`Remove roots (${tooltipCounts.q}) from diagram now left with no surviving connections based on the grid filter and the preceding sliders`}>
              <label style={{fontSize: '14px', marginRight: '5px', fontWeight: 'normal', cursor: tooltipCounts.q > 0 ? 'help' : 'default', opacity: tooltipCounts.q > 0 ? 1 : 0.5}}>
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
          </span>
        </span>
        </h3>
          <CheckGroup choices={Object.fromEntries(Object.entries(otherChoices).filter(([k]) => k !== 'removeFree'))} setChoice={actions.options.chooseOtherOne}/>
          <CheckGroup choices={choices} setChoice={actions.options.chooseOne}/>
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
