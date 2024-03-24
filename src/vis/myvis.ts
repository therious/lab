import {Cities, City, Locations } from '../ticket/City'
import {Routes, Route} from "../ticket/Route";
import {Edge, Node} from "vis-network/standalone/esm/vis-network";
export const stdEdgeWidth = 15;

export class NodeToRouteMapper
{
  protected static map:Map<string, Route> = new Map();

  public static registerRouteCreateId(route:Route, i:number):string
  {
    const s = route.cities[0];
    const d =route.cities[1];
    const c = route.color;
    const idstr = `${s}-${d}-${c}-${i}`;
    this.map.set(idstr, route);
    return idstr;
  }
  public static costNodeIdToRouteInfo(id:string) {
    return this.map.get(id);
  }
}


function populateNodes(cities:Record<string, City>):Node[]
{
  const arr = Object.entries(cities);
  const cityNodes =  arr.map(([key, value])=>
  ({id:value, label:value, title:key,
      x: Locations[value].x * 1.65 - 3060,
      y: Locations[value].y * 1.65 - 1700,
      fixed: {x:true, y:true}
  }));

  const costNodes:Node[] = [];

  const trains = ['./icons/car-red.png', './icons/car-green.png', './icons/car-orange.png', './icons/car-blue.png'];
  Routes.forEach(route=> {
    for (let i = 0; i < route.cost; ++i)
    {
      const s = route.cities[0];
      const d =route.cities[1];
      const c = route.color;
      const id = NodeToRouteMapper.registerRouteCreateId(route, i);
      const n:Node = {id, title:id,
      shape: 'square', size:30,
      color:{background:route.color}, font:{size:30}};
      costNodes.push(n);
    }

  });
  return [...cityNodes, ...costNodes];
}


function populateEdges(routes:Route[]):Edge[] {
  const edges:any[] = [];

  routes.forEach((route)=>
  {
    const s= route.cities[0];
    const d= route.cities[1];
    const c= route.color;
    const interId = `${s}-${d}-${c}-`;

    const color = route.color;
    const length = 50;
    // there is a node for each element of cost, rather just segments between cost
    // because otherwise we cant have two color single cost routes with vis.js easily

    const width = stdEdgeWidth;

    edges.push({from: s, to: interId + 0, length, color, width});
    // just do the connections between costs 0-1, 1-2, etc.
    for(let i = 0; i < route.cost - 1; ++i)
      edges.push({ from: interId + i, to: interId + (i + 1), length, color, width});

    edges.push({from: interId + (route.cost - 1), to: d, length, color, width});
    });

  return  edges;
}

function diagram(cities:Record<string,City>): { nodes:Node[], edges:Edge[] }
{
  let nodes = populateNodes(cities);
  let edges = populateEdges(Routes);

  // const network = new vis.Network(container, data, options);
  return  {nodes, edges};

}

export const renderGraphData = ()=>diagram(Cities);
