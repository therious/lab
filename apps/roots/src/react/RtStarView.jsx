import React, {useCallback, useEffect, useState, useMemo} from 'react';
import {actions} from "../actions-integration";
import {selectors} from "../actions/selectors";
import {useSelector} from "../actions-integration";
import {roots} from '../roots/roots';
import Graph from "react-vis-graph-wrapper";
import "vis-network/styles/vis-network.css";
import {renderGraphData, toRender} from "../roots/myvis.js";
import {defaultOptions} from "../roots/options";
import {CheckGroup} from "./CheckGroup";

toRender.graphableRows = roots; // the full list
const   defaultGraph = {nodes: [], edges: []};





const events =  {
  select: ({ nodes, edges }) => {
    console.log("Selected nodes/edges:", nodes, edges);
  },
  doubleClick: ({ pointer: { canvas } }) => {
  }
}



export const  RtStarView = ()=>{

  const {
    options: {choices, otherChoices, mischalfim}
  } = useSelector(s=>s);


  const [reset, setReset] = useState(false);

  const [maxNodes, setMaxNodes] = useState(2001); // get limits.nodes value here
  const [maxEdges, setMaxEdges] = useState(200_000); // get limits.edges value here
  const [linkageOption, setLinkageOption] = useState('filtered'); // 'filtered', 'directlyLinked', 'indirectlyLinked'
  const [maxGeneration, setMaxGeneration] = useState(1);

  const [graph, setGraph] = useState(defaultGraph);
  const [options, setOptions] = useState(defaultOptions);

  const chMaxNodes = useCallback((evt)=>{setMaxNodes(evt.target.value)},[]);
  const chMaxEdges = useCallback((evt)=>{setMaxEdges(evt.target.value)},[]);
  const chLinkageOption = useCallback((evt)=>{
    setLinkageOption(evt.target.value);
  },[]);
  const chMaxGeneration = useCallback((evt)=>{setMaxGeneration(Number(evt.target.value))},[]);

  // Calculate min/max generations from the current roots list
  const generationRange = useMemo(() => {
    let rootsToCheck = toRender.graphableRows;
    
    if (linkageOption === 'indirectlyLinked' && toRender.indirectlyLinkedRows && Array.isArray(toRender.indirectlyLinkedRows) && toRender.indirectlyLinkedRows.length > 0) {
      rootsToCheck = toRender.indirectlyLinkedRows;
    } else if (linkageOption === 'directlyLinked' && toRender.expandedLinkedRows && Array.isArray(toRender.expandedLinkedRows) && toRender.expandedLinkedRows.length > 0) {
      rootsToCheck = toRender.expandedLinkedRows;
    }
    
    if (!rootsToCheck || rootsToCheck.length === 0) {
      return { min: 1, max: 1 };
    }
    
    const generations = rootsToCheck
      .filter(r => r && r.generation !== undefined)
      .map(r => r.generation);
    
    if (generations.length === 0) {
      return { min: 1, max: 1 };
    }
    
    return {
      min: Math.min(...generations),
      max: Math.max(...generations)
    };
  }, [linkageOption]);
  
  // Update max generation when linkage option changes - start at minimum
  useEffect(() => {
    if (generationRange.max >= generationRange.min) {
      setMaxGeneration(generationRange.min);
    }
  }, [linkageOption, generationRange]);

  const renderReset = useCallback(()=>setReset(true),[]);

  const render = useCallback(()=>{
    // Determine which list to use based on radio selection
    let rootsToRender = toRender.graphableRows;
    let showGenerations = false;
    
    if (linkageOption === 'indirectlyLinked' && toRender.indirectlyLinkedRows && Array.isArray(toRender.indirectlyLinkedRows) && toRender.indirectlyLinkedRows.length > 0) {
      rootsToRender = toRender.indirectlyLinkedRows;
      showGenerations = true;
    } else if (linkageOption === 'directlyLinked' && toRender.expandedLinkedRows && Array.isArray(toRender.expandedLinkedRows) && toRender.expandedLinkedRows.length > 0) {
      rootsToRender = toRender.expandedLinkedRows;
      showGenerations = true;
    }
    
    // Create graph data with full list first (so all edges are created)
    const { data, nodeMax, edgeMax} = renderGraphData(rootsToRender, mischalfim, otherChoices, maxNodes, maxEdges, showGenerations);
    
    // Filter nodes and edges by generation if generations are being shown and slider is active
    if (showGenerations && (linkageOption === 'directlyLinked' || linkageOption === 'indirectlyLinked')) {
      // Find which indices in the roots list should be included based on generation filter
      // Node IDs are 1-based indices (i+1), so we need to track which indices to include
      const includedIndices = new Set();
      rootsToRender.forEach((root, index) => {
        // If root has no generation, it's from filtered list (generation 1), include it
        if (root.generation === undefined) {
          if (maxGeneration >= 1) {
            includedIndices.add(index + 1); // Node ID is index + 1
          }
        } else if (root.generation <= maxGeneration) {
          includedIndices.add(index + 1); // Node ID is index + 1
        }
      });
      
      // Filter nodes to only include those with included indices
      data.nodes = data.nodes.filter(node => includedIndices.has(node.id));
      
      // Filter edges to only include those where both nodes are in the filtered set
      data.edges = data.edges.filter(edge => 
        includedIndices.has(edge.from) && includedIndices.has(edge.to)
      );
    }
    
    console.log(`new graphData`, data);
    setReset(false);
    setGraph(data);
  }, [maxNodes, maxEdges, mischalfim, otherChoices, linkageOption, maxGeneration]);

  // Auto-update graph when slider changes (if graph is already rendered)
  useEffect(() => {
    if (!reset && (linkageOption === 'directlyLinked' || linkageOption === 'indirectlyLinked')) {
      render();
    }
  }, [maxGeneration, reset, linkageOption, render]);



  const graphing = reset? (<></>):  (<div style={{  backgroundColor: 'midnightblue', height: "100%", width:"100%"}}>
    <Graph events={events} graph={graph} options={options} style={{  backgroundColor: 'midnightblue'}} />
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
          <label style={{marginRight:'15px'}}>
            <input type="radio" name="linkageOption" value="filtered" checked={linkageOption === 'filtered'} onChange={chLinkageOption} />
            Filtered
          </label>
          <label style={{marginRight:'15px'}}>
            <input type="radio" name="linkageOption" value="directlyLinked" checked={linkageOption === 'directlyLinked'} onChange={chLinkageOption} />
            Directly linked
          </label>
          <label>
            <input type="radio" name="linkageOption" value="indirectlyLinked" checked={linkageOption === 'indirectlyLinked'} onChange={chLinkageOption} />
            Indirectly linked
          </label>
        </span>
        </h3>
          <CheckGroup choices={otherChoices} setChoice={actions.options.chooseOtherOne}/>
          <CheckGroup choices={choices} setChoice={actions.options.chooseOne}/>
        </div>
        <hr/>
        <label>Maximum number of roots:</label>&nbsp;
        <input type="number" min={1} max={2_001} step={50} value={maxNodes} onChange={chMaxNodes}/>&nbsp;
        <label>connections:</label>&nbsp;
        <input type="number" min={100} max={200_000} step={1_000} value={maxEdges} onChange={chMaxEdges}/>
        {(linkageOption === 'directlyLinked' || linkageOption === 'indirectlyLinked') && (
          <>
            <hr/>
            <label>Max generation:</label>&nbsp;
            <input 
              type="range" 
              min={generationRange.min} 
              max={generationRange.max} 
              value={maxGeneration} 
              onChange={chMaxGeneration}
              style={{width: '200px', margin: '0 10px'}}
            />
            <span>{maxGeneration}</span>
            <span style={{marginLeft: '10px'}}>(showing generations {generationRange.min} - {maxGeneration})</span>
          </>
        )}
        <hr/>
        <button disabled={!reset} onClick={render}>Show results</button>
        <button disabled={reset} onClick={renderReset}>Reset Graph</button>
        {graphing}
      </div>

    );
};
