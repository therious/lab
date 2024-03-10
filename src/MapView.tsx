import React, {useCallback,  useState} from 'react';
import Graph from 'react-vis-graph-wrapper';
import 'vis-network/styles/vis-network.css';
import {renderGraphData, MyNode} from './vis/myvis.js';
import {defaultOptions} from './vis/options';

const   graphData:{nodes:MyNode[], edges:any[]} = renderGraphData();




//
// const events =  {
//   select: ({ nodes, edges }) => {
//     console.log('Selected nodes/edges:', nodes, edges);
//   },
//   doubleClick: ({ pointer: { canvas } }) => {
//   }
// }


export const  MapView = ()=>{

  const graphing =(<div style={{ width:'100%',  height: '100%'}}>
    <Graph  graph={graphData} options={defaultOptions} style={{
      backgroundImage:`url('/map-us-again.png')`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain'
    }} />
  </div>);

//heading, active, name, choices,  setChoice
  return  (
    <div key={`ticket`} style={{marginTop: '30px', width:'1800px', height:'1000px', overflow: 'auto'}}>
      {graphing}
    </div>

  );
};
