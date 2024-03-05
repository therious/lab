import {Cities, City } from '../ticket/City'
import {Routes, Route} from "../ticket/Route";

export type MyNode = {id:string, label:string, title:string};

function populateNodes(cities:Record<string, City>/*, nodeMax*/):MyNode[]
{
  const arr = Object.entries(cities);
  return arr.map(([key, value],i)=>({id:value, label:value, title:key}));
}


function populateEdges(routes:Route[]) {
  const edges =
  routes.map((route)=>({from:route.cities[0], to:route.cities[1]}));

  return  edges;
}

function diagram(cities:Record<string,City>)
{
  let nodes = populateNodes(cities);
  console.log(`nodes`, nodes);

  let edges = populateEdges(Routes);


  const data= {
    nodes: nodes,
    edges: edges
  };
  // const network = new vis.Network(container, data, options);
  return  data;

}


export function renderGraphData()
{
  return diagram(Cities);
}

