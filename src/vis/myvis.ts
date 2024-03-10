import {Cities, City, Locations } from '../ticket/City'
import {Routes, Route} from "../ticket/Route";
import {ColorStyle} from '../ticket/Color';

export type MyNode = {id:string, label:string, title:string, hidden?:boolean, shape?:string, color?:any, x?:number, y?:number};

function populateNodes(cities:Record<string, City>/*, nodeMax*/):MyNode[]
{
  const arr = Object.entries(cities);
  const cityNodes =  arr.map(([key, value],i)=>
  ({id:value, label:value, title:key,
      x: Locations[value].x * 1.65 - 3060,
      y: Locations[value].y * 1.65 - 1700,
      fixed: {x:true, y:true}
  }));

  const costNodes:MyNode[] = [];

  Routes.forEach(route=> {
    for (let i = 0; i < route.cost; ++i)
    {
      const s = route.cities[0];
      const d =route.cities[1];
      const c = route.color;
      const idstr = `${s}-${d}-${c}-${i}`;
      const label =`${c}-${i}`;

      const n:MyNode = {id:`${s}-${d}-${c}-${i}`, label, title:idstr, shape:'circle', color:{background:ColorStyle[route.color]}};
      costNodes.push(n);
    }


  });
  return [...cityNodes, ...costNodes];
}


function populateEdges(routes:Route[]) {
  const edges:any[] = [];

  routes.forEach((route)=>{

    const s= route.cities[0];
    const d= route.cities[1];
    const c= route.color;
    const interId = `${s}-${d}-${c}-`;

    const color = ColorStyle[route.color];
    const length = 50;
    // there is a node for each element of cost, rather just segments between cost
    // because otherwise we cant have two color single cost routes with vis.js easily

    edges.push({from: s, to: interId + 0, length, color, width:10});
    // just do the connections between costs 0-1, 1-2, etc.
    for(let i = 0; i < route.cost - 1; ++i)
      edges.push({ from: interId + i, to: interId + (i + 1), length, color, width:10});

    edges.push({from: interId + (route.cost - 1), to: d, length, color, width:10});
    });

  edges.forEach((edge)=>console.log(edge));

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

