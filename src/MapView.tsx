import React, {useCallback,  useState} from 'react';
import Graph from 'react-vis-graph-wrapper';
import 'vis-network/styles/vis-network.css';
import {renderGraphData, MyNode} from './vis/myvis.js';
import {defaultOptions} from './vis/options';

const   defaultGraph:{nodes:MyNode[], edges:any[]} = {nodes:[], edges: []};




//
// const events =  {
//   select: ({ nodes, edges }) => {
//     console.log('Selected nodes/edges:', nodes, edges);
//   },
//   doubleClick: ({ pointer: { canvas } }) => {
//   }
// }



export const  MapView = ()=>{

  const [reset, setReset] = useState(false);

  const [maxNodes, setMaxNodes] = useState(2001); // get limits.nodes value here
  const [maxEdges, setMaxEdges] = useState(200_000); // get limits.edges value here


  const [graph, setGraph] = useState(defaultGraph);
  const [options, setOptions] = useState(defaultOptions);

  const renderReset = useCallback(()=>setReset(true),[]);

  const render = useCallback(()=>{

    const data = renderGraphData();
    console.log(`new graphData`, data);
    setReset(false);
    setGraph(data as any);
  }, [maxNodes, maxEdges]);



  const graphing = reset? (<></>):  (<div style={{  height: '900px', width:'1200px'}}>
    <Graph  graph={graph} options={options} style={{
      backgroundImage:`url('/us-canada.png')`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover'
    }} />
  </div>);

//heading, active, name, choices,  setChoice
  return  (
    <div key={`ticket`} style={{marginTop: '30px'}}>
      <h1>Map View</h1>
      <hr/>
      <button disabled={!reset} onClick={render}>Show results</button>
      <button disabled={reset} onClick={renderReset}>Reset Graph</button>
      {graphing}
    </div>

  );
};
