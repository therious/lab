import React, {ReactNode, useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {actions} from "../actions-integration";
import {useSelector} from "../actions-integration";
import {roots} from '../roots/roots';
import Graph from "react-vis-graph-wrapper";
import "vis-network/styles/vis-network.css";
import {toRender} from "../roots/myvis";
import {defaultOptions} from "../roots/options";
import {CheckGroup} from "./CheckGroup";
import {Tooltip} from "./Tooltip";
import {MAX_NODES_FOR_EXPANSION} from "../roots/constants";
import type {Root, GraphNode, GraphData} from "../roots/types";

// Hebrew text style for tooltips
const hebrewTextStyle: React.CSSProperties = {
  fontSize: '1.25em',
  fontWeight: 'bolder'
};

type GenerationRange = {
  min: number;
  max: number;
};

type TooltipCounts = {
  n: number; // Grid filter count
  x: number; // Roots added by similar meanings (not in grid filter)
  w: number; // Roots added only by extra degrees (not in grid filter or similar meanings)
  y: number; // Total roots after all processing
  q: number; // Roots with no edges (for Remove Free)
  pruneRemoved: number; // Number of nodes removed by pruning
};

type PendingGraphData = {
  data: GraphData;
  generationRange: GenerationRange;
  nodeIdToRootId: [number, number][];
  tooltipCounts: TooltipCounts;
};

// Using interface here because vis-network's Network type is an interface
// and we need to match its structure for proper type compatibility
interface VisNetworkInstance {
  body: {
    data: {
      nodes: {
        update: (node: { id: number; color?: GraphNode['color'] } | Array<{ id: number; color?: GraphNode['color'] }>) => void;
      };
    };
  };
  setOptions?: (options: { physics?: { stabilization?: { enabled?: boolean } } }) => void;
}

type WorkerMessage =
  | { type: 'result'; payload: { computationId: number; data: GraphData; nodeMax: number; edgeMax: number; generationRange: GenerationRange; nodeIdToRootId: [number, number][]; tooltipCounts: TooltipCounts } }
  | { type: 'searchResult'; payload: { searchId: number; nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }> } }
  | { type: 'error'; payload: { error: unknown } };

type GraphEvents = {
  select: (params: { nodes: number[]; edges: number[] }) => void;
  doubleClick: (params: { pointer: { canvas: { x: number; y: number } } }) => void;
};

toRender.graphableRows = roots as unknown as Record<string, unknown>; // the full list
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
    options: {choices, otherChoices, mischalfim, includeLinked, maxEdges, linkByMeaningThreshold, pruneByGradeThreshold}
  } = useSelector(s=>s);


  const [maxGeneration, setMaxGeneration] = useState(1);
  const [localExtraDegrees, setLocalExtraDegrees] = useState(0);

  const [graph, setGraph] = useState<GraphData>(defaultGraph);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [generationRange, setGenerationRange] = useState<GenerationRange>({ min: 1, max: 1 });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tooltipCounts, setTooltipCounts] = useState<TooltipCounts>({ n: 0, x: 0, w: 0, y: 0, q: 0, pruneRemoved: 0 });
  const shouldDisableExpansion = tooltipCounts.n > MAX_NODES_FOR_EXPANSION;
  const workerRef = useRef<Worker | null>(null);
  const computationIdRef = useRef<number>(0);
  const searchIdRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingGraphDataRef = useRef<PendingGraphData | null>(null); // Store computed graph data before rendering
  const graphUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const networkRef = useRef<VisNetworkInstance | null>(null); // Reference to vis-network instance
  const nodeIdToRootIdRef = useRef<Map<number, number>>(new Map()); // Map node IDs to root IDs for search

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

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../worker/graphWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>): void => {
      if (e.data.type === 'result') {
        const { computationId, data, nodeMax, edgeMax, generationRange, nodeIdToRootId, tooltipCounts } = e.data.payload;
        // Only update if this is the latest computation
        if (computationId === computationIdRef.current) {
          // Store the computed data but don't render immediately
          pendingGraphDataRef.current = { data, generationRange, nodeIdToRootId, tooltipCounts };
          setIsComputing(false);

          // Update tooltip counts
          if (tooltipCounts) {
            setTooltipCounts(tooltipCounts);
          }

          // Store nodeId to rootId mapping (convert from array to Map)
          const mapping = new Map<number, number>();
          if (nodeIdToRootId && Array.isArray(nodeIdToRootId)) {
            nodeIdToRootId.forEach(([nodeId, rootId]: [number, number]) => {
              mapping.set(nodeId, rootId);
            });
          }
          nodeIdToRootIdRef.current = mapping;

          // Clear any pending graph update
          if (graphUpdateTimeoutRef.current) {
            clearTimeout(graphUpdateTimeoutRef.current);
          }

          // Update graph visualization with throttling using requestAnimationFrame
          // This batches updates and prevents blocking during rapid slider changes
          requestAnimationFrame(() => {
            graphUpdateTimeoutRef.current = setTimeout(() => {
              if (pendingGraphDataRef.current) {
                setGraph(pendingGraphDataRef.current.data);
                setGenerationRange(pendingGraphDataRef.current.generationRange);
                // Update tooltip counts
                if (pendingGraphDataRef.current.tooltipCounts) {
                  setTooltipCounts(pendingGraphDataRef.current.tooltipCounts);
                }
                // Update mapping
                const mapping = new Map<number, number>();
                if (pendingGraphDataRef.current.nodeIdToRootId && Array.isArray(pendingGraphDataRef.current.nodeIdToRootId)) {
                  pendingGraphDataRef.current.nodeIdToRootId.forEach(([nodeId, rootId]: [number, number]) => {
                    mapping.set(nodeId, rootId);
                  });
                }
                nodeIdToRootIdRef.current = mapping;
                pendingGraphDataRef.current = null;
              }
            }, 50); // Small delay to batch rapid updates
          });
        }
      } else if (e.data.type === 'searchResult') {
        const { searchId, nodeColors } = e.data.payload;
        // Only apply if this is the latest search
        if (searchId === searchIdRef.current) {
          applyNodeColors(nodeColors);
        }
      } else if (e.data.type === 'error') {
        console.error('Worker error:', e.data.payload.error);
        setIsComputing(false);
      }
    };

    workerRef.current.onerror = (error: ErrorEvent): void => {
      console.error('Worker error:', error);
      setIsComputing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
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

    // Assert non-null: workerRef.current is guaranteed to be set when this runs
    const worker = workerRef.current!;

    setIsComputing(true);
    // Note: computationIdRef.current is incremented in the useEffect before calling this

    // Send computation request to worker with computation ID
    // Use localPruneByGrade for immediate responsiveness
    worker.postMessage({
      type: 'compute',
      payload: {
        computationId: computationIdRef.current,
        filteredRoots: toRender.graphableRows as Root[],
        allRoots: roots as Root[],
        linkByMeaningThreshold,
        maxGeneration,
        mischalfim,
        otherChoices,
        maxNodes: roots.length, // No limit on number of roots
        maxEdges,
        pruneByGradeThreshold: localPruneByGrade,
        maxNodesForExpansion: MAX_NODES_FOR_EXPANSION,
      },
    });
  }, [linkByMeaningThreshold, maxGeneration, mischalfim, otherChoices, maxEdges, localPruneByGrade]);

  // Auto-update graph when slider changes
  // Use debounce with cancellation for smooth slider dragging
  useEffect(() => {
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
    requestAnimationFrame(() => {
      debounceTimeoutRef.current = setTimeout(() => {
        computeGraph();
      }, 100); // 100ms debounce - enough to batch rapid changes
    });

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [maxGeneration, linkByMeaningThreshold, localPruneByGrade, maxEdges, computeGraph]);


  const events = useMemo<GraphEvents>(() => ({
    select: ({ nodes, edges }: { nodes: number[]; edges: number[] }): void => {
      // console.log("Selected nodes/edges:", nodes, edges);
    },
    doubleClick: ({ pointer: { canvas } }: { pointer: { canvas: { x: number; y: number } } }): void => {
      // Handle double click if needed
    }
  }), []);

  // Helper function to apply node colors from worker
  const applyNodeColors = useCallback((nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>): void => {
    if (!networkRef.current) return;

    try {
      const network = networkRef.current;
      const nodesDataSet = network.body.data.nodes;
      
      // Temporarily disable stabilization to prevent animation interruption
      // This allows physics to continue running while we update colors
      if (network.setOptions) {
        network.setOptions({ physics: { stabilization: { enabled: false } } });
      }
      
      // Batch all updates into a single call to prevent multiple physics recalculations
      // DataSet.update() accepts an array, which is more efficient and doesn't interrupt animation
      const updates = nodeColors.map(({ nodeId, color }) => ({ id: nodeId, color }));
      nodesDataSet.update(updates);
      
      // Re-enable stabilization after a brief delay to allow updates to complete
      // The physics simulation continues running, we're just preventing stabilization restart
      if (network.setOptions) {
        // Use requestAnimationFrame to ensure updates are applied before re-enabling
        requestAnimationFrame(() => {
          if (networkRef.current && networkRef.current.setOptions) {
            networkRef.current.setOptions({ physics: { stabilization: { enabled: true } } });
          }
        });
      }
    } catch (error) {
      console.error('Error updating node colors:', error);
    }
  }, []);

  // Helper function to trigger search in worker
  const triggerSearch = useCallback((term: string): void => {
    if (!workerRef.current) return;

    // Cancel previous search by incrementing ID
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;

    // Send search request to worker
    workerRef.current.postMessage({
      type: 'search',
      payload: {
        searchId: currentSearchId,
        searchTerm: term,
      },
    });
  }, []);

  // Debounced search effect - input updates immediately, search is debounced
  useEffect(() => {
    // Clear any pending search timeout
    if (searchDebounceTimeoutRef.current) {
      clearTimeout(searchDebounceTimeoutRef.current);
      searchDebounceTimeoutRef.current = null;
    }

    // Only search if we have nodes and a worker
    if (!graph.nodes || graph.nodes.length === 0 || !workerRef.current) {
      return;
    }

    // Debounce the search - wait for user to stop typing
    searchDebounceTimeoutRef.current = setTimeout(() => {
      if (searchTerm !== undefined) {
        triggerSearch(searchTerm);
      }
    }, 300); // 300ms debounce

    // Cleanup function to cancel pending search
    return () => {
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
        searchDebounceTimeoutRef.current = null;
      }
    };
  }, [searchTerm, graph.nodes, triggerSearch]);

  // Get network instance via getNetwork prop (if supported) or events
  const handleGetNetwork = useCallback((network: VisNetworkInstance): void => {
    networkRef.current = network;
  }, []);

  const graphing = (<div style={{  backgroundColor: 'midnightblue', height: "100%", width:"100%"}}>
    <Graph
      events={events}
      graph={graph}
      options={defaultOptions}
      style={{  backgroundColor: 'midnightblue'}}
      getNetwork={handleGetNetwork}
    />
  </div>);

//heading, active, name, choices,  setChoice
   return  (
      <div key={`${graph.nodes.length}-${graph.edges.length}`} style={{marginTop:'30px'}}>
        <h1>Star view</h1>
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
          <label style={{marginRight: '10px'}}>Search nodes:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search definitions and examples (supports |, &, -, &quot;&quot;)"
            style={{width: '400px', padding: '5px'}}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{marginLeft: '10px', padding: '5px 10px'}}
            >
              Clear
            </button>
          )}
          <span style={{marginLeft: '20px'}}>
            <label style={{marginRight: '10px'}}>Maximum connections:</label>
            <input type="number" min={100} max={200_000} step={1_000} value={maxEdges} onChange={chMaxEdges}/>
          </span>
        </div>
        <hr/>
        {isComputing && <span style={{marginLeft: '10px', color: '#888'}}>Computing...</span>}
        {graphing}
      </div>

    );
};
