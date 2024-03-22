import React, {useCallback, useEffect, useState} from 'react';
import 'vis-network/styles/vis-network.css';
import {renderGraphData,stdEdgeWidth, NodeToRouteMapper } from './vis/myvis.js';
import {defaultOptions} from './vis/options';
import {Network, Options, Data, Edge, Node, DataSet, IdType} from "vis-network/standalone/esm/vis-network";
import {useVisNetwork} from './vis/useVisNetwork';
import {actions, useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {Color} from './ticket/Color';

// const   graphData:Data = renderGraphData();
const {nodes:rawnodes, edges:rawedges} = renderGraphData();

const nodes = new DataSet<Node>(rawnodes);
const edges= new DataSet<Edge>(rawedges);


type VisClick = {nodes:Node[], edges:Edge[], pointer:any, previousSelection: { nodes:Node[], edges:Edge[]}};


const somecolors = ['#f00', '#f70', '#ff0', '#0f0', '#0ff',  '#00f', '#f0f',];
const ticketActions = actions.ticket;

export const MapView = ()=>
{
  const {players, whoPlaysNow} = useSelector<TicketState>(s=>s.ticket);

  const { ref, network } =
  useVisNetwork({options:defaultOptions, edges:edges as any, nodes:nodes as any});

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
          const wildToUse = (sameToUse === route.cost)? 0: route.cost - wildColorCount;
          ticketActions.claimRoute(route, {[route.color]: sameToUse, [Color.Wild]: wildToUse});
      } else {
        alert(`You don't have enough to claim route, you need ${route.cost} cards of color ${route.color}`);
      }
    }

  },[network]);

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
