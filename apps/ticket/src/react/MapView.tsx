import React, {useCallback, useEffect, useState} from 'react';
import 'vis-network/styles/vis-network.css';
import {Network, Options, Data, Edge, Node, DataSet, IdType} from "vis-network/standalone/esm/vis-network";

import {renderGraphData,stdEdgeWidth, NodeToRouteMapper } from '../vis/myvis.js';
import {defaultOptions} from '../vis/options';
import {useVisNetwork} from '../vis/useVisNetwork';
import {actions, useSelector} from '../actions-integration';
import {TicketState} from '../actions/ticket-slice';
import {Color} from '../ticket/Color';
import {playClick, playError} from '../effects/sounds';

// const   graphData:Data = renderGraphData();
const {nodes:rawnodes, edges:rawedges} = renderGraphData();

const nodes = new DataSet<Node>(rawnodes);
const edges= new DataSet<Edge>(rawedges);


type VisClick = {nodes:Node[], edges:Edge[], pointer:any, previousSelection: { nodes:Node[], edges:Edge[]}};


const somecolors = ['#f00', '#f70', '#ff0', '#0f0', '#0ff',  '#00f', '#f0f',];
const ticketActions = actions.ticket;


function getNode(index:number): Node
{
  const id = rawnodes[index].id;
  const node = nodes.get(id as IdType);
  if(node !== null)
    return node;
  throw new Error(`Node ${id} not found`)
}
function getNodeById(id:IdType): Node
{
  const node = nodes.get(id);
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


export const MapView = ()=>
{
  const {players, whoPlaysNow} = useSelector<TicketState>(s=>s.ticket);

  const { ref, network } = useVisNetwork({options:defaultOptions, edges:edges as any, nodes:nodes as any});

  const nodeSelect = useCallback((event:VisClick)=>{

    const player = players[whoPlaysNow];
    const node = event.nodes[0];
    const route = NodeToRouteMapper.costNodeIdToRouteInfo(node as string);
    if(route)
    {
      const sameColorCount = player.colorCardsInHand[route.color];
      const wildColorCount = player.colorCardsInHand[Color.Wild];

      // do we have enough to claim the route (prefer same color, use wilds only if we have to
      if(sameColorCount + wildColorCount >= route.cost)
      {
          const sameToUse = (sameColorCount >= route.cost)?  route.cost: sameColorCount;
          const wildToUse = (sameToUse === route.cost)? 0:  (route.cost - sameToUse);
          ticketActions.claimRoute(route, {[route.color]: sameToUse, [Color.Wild]: wildToUse});
          playClick();
          //...todo put in graphic effect here on the route
          // like make it thicker
        for (let i = 0; i < route.cost; ++i)
        {
          const id = NodeToRouteMapper.registerRouteCreateId(route, i);

          const node = getNodeById(id);

          node.shape = 'image';
          node.image = `./icons/car-${player.color}.png`;
          nodes.update(node);
        }

      } else {
        playError();
      }
    }

  },[whoPlaysNow, players]);

  // useEffect(() => {
  //   let currentNodeIndex = 0;
  //   let currentEdgeIndex = 0;
  //
  //
  //   setInterval(()=>{
  //     // if(prevNodeIndex >= 0)
  //     //   getNode(prevNodeIndex).color = prevColor;
  //
  //     const edge = getEdge(currentEdgeIndex);
  //     const w = edge.width ?? stdEdgeWidth;
  //
  //     edge.width = w > 2 * stdEdgeWidth? stdEdgeWidth: 2 * w;
  //
  //     const node = getNode(currentNodeIndex)
  //
  //     node.color=somecolors[currentNodeIndex % somecolors.length];
  //     ++currentNodeIndex;
  //     if(currentNodeIndex >= rawnodes.length)
  //       currentNodeIndex = 0;
  //
  //    ++currentEdgeIndex;
  //    if(currentEdgeIndex >= rawedges.length)
  //     currentEdgeIndex = 0;
  //
  //     edges.update(edge);
  //     nodes.update(node);
  //   }, 20);
  //
  // }, [network]);

  useEffect(()=>{
    network?.off('click');
    network?.on('click', nodeSelect);
  },[network, nodeSelect]);


  return <div style={{
      // position:'absolute',
      // left: '0px',
      marginLeft: 'auto',
      marginRight: 'auto',
      display:'inline-block',
      width:'1800px', height:'1000px',
      backgroundImage:`url('/map-us-again.png')`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      backgroundPositionX: '17px',
      backgroundPositionY: '-6px',

    overflow: 'auto'}} ref={ref} />;
}
