import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {actions} from "../actions-integration";
import {selectors} from "../actions/selectors";
import {useSelector} from "../actions-integration";
import {roots} from '../roots/roots';
import Graph from "react-vis-graph-wrapper";
import "vis-network/styles/vis-network.css";
import {toRender} from "../roots/myvis.js";
import {defaultOptions, type VisNetworkOptions} from "../roots/options";
import {CheckGroup} from "./CheckGroup";
import {matchesDefinitionFilter} from "../roots/definitionFilter";
import {getDictionaryWords, getDictionaryEntry} from "../roots/loadDictionary";
import {Tooltip} from "./Tooltip";
import {MAX_NODES_FOR_EXPANSION} from "../roots/constants";

// Type definitions
type Root = {
  id: number;
  r: string; // root (concatenated P+E+L)
  d?: string; // definition
  P: string; // first letter
  E: string; // middle letter
  L: string; // last letter
  generation?: number; // generation number for visualization
};

type GraphNode = {
  id: number;
  label: string;
  title?: string;
  font?: { multi: boolean };
  color?: {
    background: string;
    border: string;
    highlight: {
      background: string;
      border: string;
    };
  };
};

type GraphEdge = {
  from: number;
  to: number;
  color?: string;
  width?: number;
};

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
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
        update: (node: { id: number; color?: GraphNode['color'] }) => void;
      };
    };
  };
}

type WorkerMessage = 
  | { type: 'result'; payload: { computationId: number; data: GraphData; nodeMax: number; edgeMax: number; generationRange: GenerationRange; nodeIdToRootId: [number, number][]; tooltipCounts: TooltipCounts } }
  | { type: 'error'; payload: { error: unknown } };

type GraphEvents = {
  select: (params: { nodes: number[]; edges: number[] }) => void;
  doubleClick: (params: { pointer: { canvas: { x: number; y: number } } }) => void;
};

toRender.graphableRows = roots; // the full list
const defaultGraph: GraphData = {nodes: [], edges: []};








export const RtStarView = (): JSX.Element => {

  const {
    options: {choices, otherChoices, mischalfim, includeLinked, maxNodes, maxEdges, linkByMeaningThreshold, pruneByGradeThreshold}
  } = useSelector(s=>s);


  const [reset, setReset] = useState(false);

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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingGraphDataRef = useRef<PendingGraphData | null>(null); // Store computed graph data before rendering
  const graphUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const networkRef = useRef<VisNetworkInstance | null>(null); // Reference to vis-network instance
  const nodeIdToRootIdRef = useRef<Map<number, number>>(new Map()); // Map node IDs to root IDs for search

  const chMaxNodes = useCallback((evt: React.ChangeEvent<HTMLInputElement>): void => {
    actions.options.setMaxNodes(Number(evt.target.value));
  }, []);
  
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
          setReset(false);
          
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

  const renderReset = useCallback((): void => setReset(true), []);

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
        maxNodes,
        maxEdges,
        pruneByGradeThreshold: localPruneByGrade,
        maxNodesForExpansion: MAX_NODES_FOR_EXPANSION,
      },
    });
  }, [linkByMeaningThreshold, maxGeneration, mischalfim, otherChoices, maxNodes, maxEdges, localPruneByGrade]);

  const render = useCallback((): void => {
    // Increment computation ID to cancel any in-flight computation
    computationIdRef.current += 1;
    computeGraph();
  }, [computeGraph]);

  // Auto-update graph when slider changes (if graph is already rendered)
  // Use debounce with cancellation for smooth slider dragging
  useEffect(() => {
    if (!reset) {
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
    }
  }, [maxGeneration, linkByMeaningThreshold, localPruneByGrade, maxNodes, maxEdges, reset, computeGraph]);
  

  const events = useMemo<GraphEvents>(() => ({
    select: ({ nodes, edges }: { nodes: number[]; edges: number[] }): void => {
      console.log("Selected nodes/edges:", nodes, edges);
    },
    doubleClick: ({ pointer: { canvas } }: { pointer: { canvas: { x: number; y: number } } }): void => {
      // Handle double click if needed
    }
  }), []);

  // Update node colors based on search term
  useEffect(() => {
    // Use a ref to track if this effect is still valid (not cancelled)
    let isCancelled = false;
    
    const updateNodeColors = (): void => {
      if (isCancelled) return;
      
      if (!graph.nodes || graph.nodes.length === 0) {
        return;
      }

      // Assert non-null: networkRef.current is guaranteed to be set when this runs
      const network = networkRef.current!;
      const nodesDataSet = network.body.data.nodes;
      type NodeUpdate = {
        id: number;
        matchType?: 'definition' | 'example';
        color: {
          background: string;
          border: string;
          highlight: {
            background: string;
            border: string;
          };
        };
      };
      const updates: NodeUpdate[] = [];

    if (!searchTerm || !searchTerm.trim()) {
      // Clear all colors - reset to default
      graph.nodes.forEach((node) => {
        updates.push({
          id: node.id,
          color: {
            background: 'white',
            border: 'cyan',
            highlight: {
              background: 'pink',
              border: 'red'
            }
          }
        });
      });
    } else {
        // Search through nodes
      graph.nodes.forEach((node: GraphNode) => {
        const nodeId = node.id;
        const rootId = nodeIdToRootIdRef.current.get(nodeId);
        
        if (!rootId) {
          // Reset to default if we can't find the root
          updates.push({
            id: nodeId,
            color: {
              background: 'white',
              border: 'cyan',
              highlight: {
                background: 'pink',
                border: 'red'
              }
            }
          });
          return;
        }

        // Find root data
        const root = (roots as Root[]).find((r: Root) => r.id === rootId);
        if (!root) {
          return;
        }

        const rootDefinition = root.d || '';

        // Check definition first (faster)
        const matchesDefinition = matchesDefinitionFilter(rootDefinition, searchTerm);
        
        let matchesExamples = false;
        if (!matchesDefinition) {
          // Only check examples if definition doesn't match
          const dictionaryWords = getDictionaryWords(rootId);
          for (const word of dictionaryWords) {
            const exampleText = word.e || '';
            if (matchesDefinitionFilter(exampleText, searchTerm)) {
              matchesExamples = true;
              break;
            }
          }
        }

        if (matchesDefinition || matchesExamples) {
          const matchType = matchesDefinition ? 'definition' : 'example';
          updates.push({
            id: nodeId,
            matchType: matchType, // Store match type for summary
            color: {
              background: matchesDefinition ? 'orange' : 'yellow',
              border: matchesDefinition ? 'darkorange' : 'gold',
              highlight: {
                background: matchesDefinition ? 'darkorange' : 'gold',
                border: matchesDefinition ? 'red' : 'darkgoldenrod'
              }
            }
          });
        } else {
          // Reset to default
          updates.push({
            id: nodeId,
            color: {
              background: 'white',
              border: 'cyan',
              highlight: {
                background: 'pink',
                border: 'red'
              }
            }
          });
        }
      });
    }

      // Update nodes without re-rendering (non-blocking)
      // Use DataSet.update() method instead of network.updateNodes()
      if (updates.length > 0 && !isCancelled) {
        const matchedUpdates = updates.filter(u => u.color.background !== 'white');
        // if (matchedUpdates.length > 0) {
        //   const definitionMatches = matchedUpdates.filter(u => u.matchType === 'definition').map(u => u.id);
        //   const exampleMatches = matchedUpdates.filter(u => u.matchType === 'example').map(u => u.id);
        //   console.log(`Search "${searchTerm}": ${matchedUpdates.length} matches (${definitionMatches.length} definition, ${exampleMatches.length} example). Node IDs: definition=[${definitionMatches.join(', ')}], example=[${exampleMatches.join(', ')}]`);
        // }
        // Use a small delay to ensure the network is ready
        requestAnimationFrame(() => {
          if (isCancelled) return;
          
          requestAnimationFrame(() => {
            if (isCancelled) return;
            
            // Assert non-null: networkRef.current is guaranteed to be set when this runs
            try {
              const nodesDataSet = networkRef.current!.body.data.nodes;
              // Update each node using DataSet.update()
              // Batch updates for better performance
              updates.forEach((update) => {
                if (!isCancelled) {
                  // Only pass id and color to vis-network (remove matchType)
                  const { id, color } = update;
                  nodesDataSet.update({ id, color });
                }
              });
            } catch (error) {
              console.error('Error updating nodes:', error);
            }
          });
        });
      }
    };
    
    // Start the update process
    updateNodeColors();
    
    // Cleanup function to cancel any pending updates
    return () => {
      isCancelled = true;
    };
  }, [searchTerm, graph.nodes]);

  // Get network instance via getNetwork prop (if supported) or events
  const handleGetNetwork = useCallback((network: VisNetworkInstance): void => {
    networkRef.current = network;
  }, []);

  const graphing = reset? (<></>):  (<div style={{  backgroundColor: 'midnightblue', height: "100%", width:"100%"}}>
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
        <h3 style={{marginLeft:'14px', display:'inline'}}>Osios Mischalfos
        <button  onClick={actions.options.allChoices}>Select All</button>
        <button  onClick={actions.options.clearChoices}>Clear All</button>
        <span style={{marginLeft:'20px', fontWeight:'normal'}}>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <Tooltip content={shouldDisableExpansion ? `Disabled: ${tooltipCounts.n} filtered roots exceeds ${MAX_NODES_FOR_EXPANSION} node limit for expansion operations` : `Include additional roots (${tooltipCounts.x}) based on meanings similar to roots currently included in the grid filter (${tooltipCounts.n})`}>
              <label style={{fontSize: '14px', marginRight: '5px', cursor: 'help', opacity: shouldDisableExpansion ? 0.5 : 1}}>Add similar meanings:</label>
            </Tooltip>
            <Tooltip content={shouldDisableExpansion ? `Disabled: ${tooltipCounts.n} filtered roots exceeds ${MAX_NODES_FOR_EXPANSION} node limit for expansion operations` : `Include additional roots (${tooltipCounts.x}) based on meanings similar to roots currently included in the grid filter (${tooltipCounts.n})`}>
              <input 
                type="range" 
                min={0} 
                max={6} 
                step={1}
                value={6 - linkByMeaningThreshold} 
                onChange={chLinkByMeaning}
                disabled={shouldDisableExpansion}
                style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: shouldDisableExpansion ? 0.5 : 1}}
                list={`linkByMeaning-ticks`}
              />
            </Tooltip>
            <datalist id={`linkByMeaning-ticks`}>
              {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
            </datalist>
            <span style={{marginLeft: '5px', fontSize: '12px', display: 'inline-block', width: '85px'}}>
              Grade ≥ {linkByMeaningThreshold}
            </span>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <Tooltip content={shouldDisableExpansion ? `Disabled: ${tooltipCounts.n} filtered roots exceeds ${MAX_NODES_FOR_EXPANSION} node limit for expansion operations` : `Given the roots included by the grid (${tooltipCounts.n}) and the roots with similar meanings (${tooltipCounts.x}) bring in additional roots (${tooltipCounts.w}) that are related according to the checked אותיות מתחלפות criteria`}>
              <label style={{fontSize: '14px', marginRight: '5px', cursor: 'help', opacity: shouldDisableExpansion ? 0.5 : 1}}>Extra degrees:</label>
            </Tooltip>
            <Tooltip content={shouldDisableExpansion ? `Disabled: ${tooltipCounts.n} filtered roots exceeds ${MAX_NODES_FOR_EXPANSION} node limit for expansion operations` : `Given the roots included by the grid (${tooltipCounts.n}) and the roots with similar meanings (${tooltipCounts.x}) bring in additional roots (${tooltipCounts.w}) that are related according to the checked אותיות מתחלפות criteria`}>
              <input 
                type="range" 
                min={0} 
                max={6} 
                step={1}
                value={String(localExtraDegrees)} 
                onChange={chExtraDegrees}
                disabled={shouldDisableExpansion}
                style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: shouldDisableExpansion ? 0.5 : 1}}
                list={`extraDegrees-ticks`}
              />
            </Tooltip>
            <datalist id={`extraDegrees-ticks`}>
              {[0, 1, 2, 3, 4, 5, 6].map(val => <option key={val} value={String(val)} label={String(val)} />)}
            </datalist>
            <span style={{marginLeft: '5px', fontSize: '12px', display: 'inline-block', width: '20px'}}>
              {localExtraDegrees}
            </span>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            {(() => {
              const numMaxWidth = Math.max(
                String(tooltipCounts.n).length,
                String(tooltipCounts.x).length,
                String(tooltipCounts.w).length
              );
              const tooltipContent = shouldDisableExpansion 
                ? `Disabled: ${tooltipCounts.n} filtered roots exceeds ${MAX_NODES_FOR_EXPANSION} node limit for expansion operations`
                : `Given the ${tooltipCounts.y} total roots now included:\n\n${String(tooltipCounts.n).padStart(numMaxWidth)} included in grid filter\n${String(tooltipCounts.x).padStart(numMaxWidth)} have similar meanings\n${String(tooltipCounts.w).padStart(numMaxWidth)} extra degrees of relation\n\nNow prune out roots (${tooltipCounts.pruneRemoved}) included by previous sliders whose related letter-based connections to other roots in current diagram do not have a sufficiently similar-graded meaning.`;
              return (
                <>
                  <Tooltip content={tooltipContent} maxWidth={700}>
                    <label style={{fontSize: '14px', marginRight: '5px', cursor: 'help', opacity: shouldDisableExpansion ? 0.5 : 1}}>Prune by grade:</label>
                  </Tooltip>
                  <Tooltip content={tooltipContent} maxWidth={700}>
                    <input 
                      type="range" 
                      min={0} 
                      max={6} 
                      step={1}
                      value={String(6 - localPruneByGrade)} 
                      onChange={chPruneByGrade}
                      disabled={shouldDisableExpansion}
                      style={{width: '120px', margin: '0 5px', verticalAlign: 'middle', opacity: shouldDisableExpansion ? 0.5 : 1}}
                      list={`pruneByGrade-ticks`}
                    />
                  </Tooltip>
                </>
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
        </div>
        <hr/>
        <label>Maximum number of roots:</label>&nbsp;
        <input type="number" min={1} max={2_001} step={50} value={maxNodes} onChange={chMaxNodes}/>&nbsp;
        <label>connections:</label>&nbsp;
        <input type="number" min={100} max={200_000} step={1_000} value={maxEdges} onChange={chMaxEdges}/>
        <hr/>
        <button disabled={!reset || isComputing} onClick={render}>Show results</button>
        <button disabled={reset} onClick={renderReset}>Reset Graph</button>
        {isComputing && <span style={{marginLeft: '10px', color: '#888'}}>Computing...</span>}
        {graphing}
      </div>

    );
};
