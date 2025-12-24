import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {actions} from "../actions-integration";
import {selectors} from "../actions/selectors";
import {useSelector} from "../actions-integration";
import {roots} from '../roots/roots';
import Graph from "react-vis-graph-wrapper";
import "vis-network/styles/vis-network.css";
import {toRender} from "../roots/myvis.js";
import {defaultOptions} from "../roots/options";
import {CheckGroup} from "./CheckGroup";
import {matchesDefinitionFilter} from "../roots/definitionFilter";
import {getDictionaryWords, getDictionaryEntry} from "../roots/loadDictionary";

toRender.graphableRows = roots; // the full list
const   defaultGraph = {nodes: [], edges: []};








export const  RtStarView = ()=>{

  const {
    options: {choices, otherChoices, mischalfim, includeLinked, maxNodes, maxEdges, linkByMeaningThreshold, pruneByGradeThreshold}
  } = useSelector(s=>s);


  const [reset, setReset] = useState(false);

  const [maxGeneration, setMaxGeneration] = useState(1);

  const [graph, setGraph] = useState(defaultGraph);
  const [options, setOptions] = useState(defaultOptions);
  const [isComputing, setIsComputing] = useState(false);
  const [generationRange, setGenerationRange] = useState({ min: 1, max: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const workerRef = useRef(null);
  const computationIdRef = useRef(0);
  const debounceTimeoutRef = useRef(null);
  const pendingGraphDataRef = useRef(null); // Store computed graph data before rendering
  const graphUpdateTimeoutRef = useRef(null);
  const networkRef = useRef(null); // Reference to vis-network instance
  const nodeIdToRootIdRef = useRef(new Map()); // Map node IDs to root IDs for search

  const chMaxNodes = useCallback((evt)=>{actions.options.setMaxNodes(Number(evt.target.value))},[]);
  const chMaxEdges = useCallback((evt)=>{actions.options.setMaxEdges(Number(evt.target.value))},[]);
  const chMaxGeneration = useCallback((evt)=>{
    const value = Number(evt.target.value);
    // Use requestAnimationFrame to ensure non-blocking update
    requestAnimationFrame(() => {
      setMaxGeneration(value);
    });
  },[]);
  const chLinkByMeaning = useCallback((evt)=>{
    const sliderValue = Number(evt.target.value);
    const threshold = 6 - sliderValue; // Reverse: slider 0 = threshold 6, slider 6 = threshold 0
    // Use requestAnimationFrame to ensure non-blocking update
    requestAnimationFrame(() => {
      actions.options.setLinkByMeaningThreshold(threshold);
    });
  },[]);
  // Local state for immediate slider updates (non-blocking)
  const [localPruneByGrade, setLocalPruneByGrade] = useState(pruneByGradeThreshold);
  const pruneSyncTimeoutRef = useRef(null);
  
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
  
  const chPruneByGrade = useCallback((evt)=>{
    const sliderValue = Number(evt.target.value);
    const threshold = 6 - sliderValue; // Reverse: slider 0 = threshold 6, slider 6 = threshold 0
    // Update local state immediately (non-blocking, no Redux update yet)
    setLocalPruneByGrade(threshold);
  },[]);
  
  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../worker/graphWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'result') {
        const { computationId, data, nodeMax, edgeMax, generationRange, nodeIdToRootId } = e.data.payload;
        // Only update if this is the latest computation
        if (computationId === computationIdRef.current) {
          // Store the computed data but don't render immediately
          pendingGraphDataRef.current = { data, generationRange, nodeIdToRootId };
          setIsComputing(false);
          setReset(false);
          
          // Store nodeId to rootId mapping (convert from array to Map)
          const mapping = new Map();
          if (nodeIdToRootId && Array.isArray(nodeIdToRootId)) {
            nodeIdToRootId.forEach(([nodeId, rootId]) => {
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
                // Update mapping
                const mapping = new Map();
                if (pendingGraphDataRef.current.nodeIdToRootId && Array.isArray(pendingGraphDataRef.current.nodeIdToRootId)) {
                  pendingGraphDataRef.current.nodeIdToRootId.forEach(([nodeId, rootId]) => {
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

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setIsComputing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Update max generation when generation range changes (from worker)
  useEffect(() => {
    if (generationRange.max >= generationRange.min) {
      setMaxGeneration(prev => {
        // Only update if current value is outside the new range
        if (prev < generationRange.min || prev > generationRange.max) {
          return generationRange.min;
        }
        return prev;
      });
    }
  }, [generationRange]);

  const renderReset = useCallback(()=>setReset(true),[]);

  // Debounced computation function
  const computeGraph = useCallback(() => {
    if (!workerRef.current || !toRender.graphableRows || !Array.isArray(toRender.graphableRows)) {
      return;
    }

    setIsComputing(true);
    // Note: computationIdRef.current is incremented in the useEffect before calling this

    // Send computation request to worker with computation ID
    // Use localPruneByGrade for immediate responsiveness
    workerRef.current.postMessage({
      type: 'compute',
      payload: {
        computationId: computationIdRef.current,
        filteredRoots: toRender.graphableRows,
        allRoots: roots,
        linkByMeaningThreshold,
        maxGeneration,
        mischalfim,
        otherChoices,
        maxNodes,
        maxEdges,
        pruneByGradeThreshold: localPruneByGrade,
      },
    });
  }, [linkByMeaningThreshold, maxGeneration, mischalfim, otherChoices, maxNodes, maxEdges, localPruneByGrade]);

  const render = useCallback(() => {
    // Increment computation ID to cancel any in-flight computation
    computationIdRef.current += 1;
    computeGraph();
  }, [computeGraph]);

  // Auto-update graph when slider changes (if graph is already rendered)
  // Use debounce with cancellation for smooth slider dragging
  useEffect(() => {
    if (!reset && workerRef.current) {
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
  

  const events = useMemo(() => ({
    select: ({ nodes, edges }) => {
      console.log("Selected nodes/edges:", nodes, edges);
    },
    doubleClick: ({ pointer: { canvas } }) => {
    }
  }), []);

  // Update node colors based on search term
  useEffect(() => {
    // Use a ref to track if this effect is still valid (not cancelled)
    let isCancelled = false;
    
    const updateNodeColors = () => {
      if (isCancelled) return;
      
    if (!networkRef.current || !graph.nodes || graph.nodes.length === 0) {
      return;
    }

      // Check if nodes DataSet is available
      if (!networkRef.current.body || !networkRef.current.body.data || !networkRef.current.body.data.nodes) {
        // Retry after a short delay
        setTimeout(() => {
          if (!isCancelled) {
            updateNodeColors();
          }
        }, 100);
        return;
      }

    const network = networkRef.current;
    const nodesDataSet = network.body.data.nodes;
    const updates = [];

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
      graph.nodes.forEach((node) => {
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
        const root = roots.find(r => r.id === rootId);
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
            
            if (networkRef.current && networkRef.current.body && networkRef.current.body.data && networkRef.current.body.data.nodes) {
            try {
              const nodesDataSet = networkRef.current.body.data.nodes;
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
  const handleGetNetwork = useCallback((network) => {
    networkRef.current = network;
  }, []);

  const graphing = reset? (<></>):  (<div style={{  backgroundColor: 'midnightblue', height: "100%", width:"100%"}}>
    <Graph 
      events={events} 
      graph={graph} 
      options={options} 
      style={{  backgroundColor: 'midnightblue'}}
      getNetwork={handleGetNetwork}
    />
  </div>);

//heading, active, name, choices,  setChoice
   return  (
      <div key={`${graph.length}-${options.length}`} style={{marginTop:'30px'}}>
        <h1>Star view</h1>
        <div style={{ paddingBottom: '10px'}}>
        <h3 style={{marginLeft:'14px', display:'inline'}}>Osios Mischalfos
        <button  onClick={actions.options.allChoices}>Select All</button>
        <button  onClick={actions.options.clearChoices}>Clear All</button>
        <span style={{marginLeft:'20px', fontWeight:'normal'}}>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <label style={{fontSize: '14px', marginRight: '5px'}}>Link by Meaning:</label>
            <span style={{marginRight: '5px'}}>6</span>
            <input 
              type="range" 
              min={0} 
              max={6} 
              value={6 - linkByMeaningThreshold} 
              onChange={chLinkByMeaning}
              style={{width: '120px', margin: '0 5px', verticalAlign: 'middle'}}
            />
            <span style={{marginLeft: '5px'}}>0</span>
            <span style={{marginLeft: '5px', fontSize: '12px'}}>
              {linkByMeaningThreshold >= 6 ? 'Filtered only' : `Grade ≥ ${linkByMeaningThreshold}`}
            </span>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <label style={{fontSize: '14px', marginRight: '5px'}}>Max generation:</label>
            <input 
              type="range" 
              min={generationRange.min} 
              max={generationRange.max} 
              value={maxGeneration} 
              onChange={chMaxGeneration}
              style={{width: '120px', margin: '0 5px', verticalAlign: 'middle'}}
            />
            <span style={{marginLeft: '5px'}}>{maxGeneration} (max: {generationRange.max})</span>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <label style={{fontSize: '14px', marginRight: '5px'}}>Prune by grade:</label>
            <span style={{marginRight: '5px'}}>6</span>
            <input 
              type="range" 
              min={0} 
              max={6} 
              value={6 - localPruneByGrade} 
              onChange={chPruneByGrade}
              style={{width: '120px', margin: '0 5px', verticalAlign: 'middle'}}
            />
            <span style={{marginLeft: '5px'}}>0</span>
            <span style={{marginLeft: '5px', fontSize: '12px'}}>
              {localPruneByGrade === 0 ? 'Off' : `Grade ≥ ${localPruneByGrade}`}
            </span>
          </span>
          <span style={{marginRight:'15px', display: 'inline-block'}}>
            <label style={{fontSize: '14px', marginRight: '5px', fontWeight: 'normal'}}>
              <input
                type="checkbox"
                checked={otherChoices.removeFree || false}
                onChange={(e) => actions.options.chooseOtherOne('removeFree', e.target.checked)}
                style={{marginRight: '5px'}}
              />
              Remove Free
            </label>
          </span>
        </span>
        </h3>
          <CheckGroup choices={otherChoices} setChoice={actions.options.chooseOtherOne}/>
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
