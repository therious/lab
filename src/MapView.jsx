import React, {useCallback,  useState} from 'react';
import Graph from 'react-vis-graph-wrapper';
import 'vis-network/styles/vis-network.css';
import {renderGraphData, toRender} from './vis/myvis.js';
import {defaultOptions} from './vis/options';

toRender.graphableRows = [] //roots; // the full list
const   defaultGraph = {nodes: [], edges: []};





const events =  {
  select: ({ nodes, edges }) => {
    console.log('Selected nodes/edges:', nodes, edges);
  },
  doubleClick: ({ pointer: { canvas } }) => {
  }
}



export const  RtStarView = ()=>{

  const [reset, setReset] = useState(false);

  const [maxNodes, setMaxNodes] = useState(2001); // get limits.nodes value here
  const [maxEdges, setMaxEdges] = useState(200_000); // get limits.edges value here


  const [graph, setGraph] = useState(defaultGraph);
  const [options, setOptions] = useState(defaultOptions);

  const chMaxNodes = useCallback((evt)=>{setMaxNodes(evt.target.value)},[]);
  const chMaxEdges = useCallback((evt)=>{setMaxEdges(evt.target.value)},[]);

  const renderReset = useCallback(()=>setReset(true),[]);


  const render = useCallback(()=>{

    const { data} = renderGraphData(toRender.graphableRows, mischalfim, otherChoices, maxNodes, maxEdges);
    console.log(`new graphData`, data);
    setReset(false);
    setGraph(data);
  }, [maxNodes, maxEdges]);



  const graphing = reset? (<></>):  (<div style={{  backgroundColor: 'midnightblue', height: '100%', width:'100%'}}>
    <Graph events={events} graph={graph} options={options} style={{  backgroundColor: 'midnightblue'}} />
  </div>);

//heading, active, name, choices,  setChoice
  return  (
    <div key={`${graph.length}-${options.length}`} style={{marginTop:'30px'}}>
      <h1>Map View</h1>
      <hr/>
      <button disabled={!reset} onClick={render}>Show results</button>
      <button disabled={reset} onClick={renderReset}>Reset Graph</button>
      {graphing}
    </div>

  );
};
