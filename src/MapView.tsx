import React, {useCallback, useEffect, useState} from 'react';
import 'vis-network/styles/vis-network.css';
import {renderGraphData,stdEdgeWidth } from './vis/myvis.js';
import {defaultOptions} from './vis/options';
import {Network, Options, Data, Edge, Node, DataSet, IdType} from "vis-network/standalone/esm/vis-network";
import {useVisNetwork} from './vis/useVisNetwork';

// const   graphData:Data = renderGraphData();
const {nodes:rawnodes, edges:rawedges} = renderGraphData();

const nodes = new DataSet<Node>(rawnodes);
const edges= new DataSet<Edge>(rawedges);


const options = defaultOptions;
// let currentNodeIndex = 0;
// let prevNodeIndex = -1;
// let prevColor:any = '#000000';
//
// setInterval(()=>{
//   if(prevNodeIndex >= 0)
//     nodes[prevNodeIndex].color = prevColor;
//
//   prevColor = nodes[currentNodeIndex].color;
//   prevNodeIndex = currentNodeIndex;
//
//   nodes[currentNodeIndex].color='#ffffff';
//   ++currentNodeIndex;
//   if(currentNodeIndex >= nodes.length)
//     currentNodeIndex = 0;
// }, 200);
//
//
//


//
// const events =  {
//   select: ({ nodes, edges }) => {
//     console.log('Selected nodes/edges:', nodes, edges);
//   },
//   doubleClick: ({ pointer: { canvas } }) => {
//   }
// }

function getNode(index:number): Node
{
  const id = rawnodes[index].id;
  const node = nodes.get(id as IdType);
  if(node !== null)
    return node;
  throw new Error(`Node ${id} not found`)
}

function getEdge(index:number): Edge
{
  const id = rawedges[index].id;
  const edge = edges.get(id as IdType);
  if(edge !== null)
    return edge;
  throw new Error(`Edge ${id} not found`)
}



const somecolors = ['#f00', '#f70', '#ff0', '#0f0', '#0ff',  '#00f', '#f0f',];
export const MapView = ()=>
{
  const { ref, network } =
  useVisNetwork({options:defaultOptions, edges:edges as any, nodes:nodes as any});


  useEffect(() => {
    let currentNodeIndex = 0;
    let currentEdgeIndex = 0;

    setInterval(()=>{
      // if(prevNodeIndex >= 0)
      //   getNode(prevNodeIndex).color = prevColor;

      const edge = getEdge(currentEdgeIndex);
      const w = edge.width ?? stdEdgeWidth;

      edge.width = w > 2 * stdEdgeWidth? stdEdgeWidth: 2 * w;

      const node = getNode(currentNodeIndex)

      node.color=somecolors[currentNodeIndex % somecolors.length];
      ++currentNodeIndex;
      if(currentNodeIndex >= rawnodes.length)
        currentNodeIndex = 0;

     ++currentEdgeIndex;
     if(currentEdgeIndex >= rawedges.length)
      currentEdgeIndex = 0;

      edges.update(edge);
      nodes.update(node);
    }, 20);

  }, [network]);

  return <><div style={{
      // marginTop: '30px',
      width:'1800px', height:'1000px',
      backgroundImage:`url('/map-us-again.png')`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      backgroundPositionX: '17px',
      backgroundPositionY: '-6px',

    overflow: 'auto'}} ref={ref} /></>;
}
