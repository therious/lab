
function buildMischalfim(arr)
{
  const result = {};

  for (let i = 0; i < arr.length; ++i) {
    const set = arr[i].data;
    for (let j = 0; j < set.length; ++j) {
      const key = set[j];
      for (let k = 0; k < set.length; ++k) {
        const m = set[k];
        if (m !== key) {
          let o = result[key];
          if (o === undefined) {
            o = result[key] = {};
          }
          o[m]=1;
        }
      }  // each item in the set as an entry (excepting the current key itself)
    } // each item in set as the key to create in map
  } // for each set of interchangeable characters

  return result;
}

// check a map of maps mischalfim for letters that substitute for other letters
// and use those to generate a connection. Any mischalef relationship will do
let mischalfim = buildMischalfim(arrMischalfim);


function populateNodes(roots, nodeMax)
{
  const max = Math.min(nodeMax, roots.length);

  return roots.slice(0, max).map((o,i)=>({id:i+1, label:o.r, title:o.d}));


}





// return index of matching item from
function findEdge(p,e,l, roots, index)
{
  const cand = roots[index];

  if (atLeastTwoMatch(p, e, l, cand)) { // if two of the three letters of shoresh are the same

    // if a remaining letter is a mischalef
    if(mischalef(p, cand.P) || mischalef(e, cand.E) || mischalef(l, cand.L)) {
      return index;
    } else if(useVavToDoubled && doubledLast(p,e,l,cand)) {
      return index;
    }
    // } else if(pairMischalef(p,e,l,cand)) {  // not sure which cases this adds
    //     return index;
  }
  return -1;
}

let mappedNodes = {}
let mappedEdges = {};
let edgeCount = 0;
function createEdge(aidx, bidx, edges) {
  if(bidx < 0)
    return null;
  if (aidx === bidx)
    return null;

  // canonical key
  const key = '' + ((aidx < bidx)? (aidx + '_' + bidx) : (bidx + '_' + aidx));

  if (mappedEdges[key])
    return null;

  const edge = {from: aidx + 1, to: bidx + 1};
  mappedEdges[key]=true;
  edgeCount++;

  edges.push(edge);
  return edge;
}


function populateEdges(roots, hardMax, edgeMax) {
  const edges = [];

  mappedEdges = {};
  mappedNodes = {};
  edgeCount = 0;


  console.log('populate edges: hardMax', hardMax);
  for (let i = 0, len = hardMax; i < len; ++i) {
    const src = roots[i];
    for(let j = 0, mlen = hardMax; j < mlen; ++j)
    {
      if (edgeCount === edgeMax)
        return edges;
      if (j !== i) {
        const matchindex = findEdge(src.P, src.E, src.L, roots, j);
        if (matchindex >= 0) {
          createEdge(i, matchindex, edges);
          mappedNodes[src.r] =true;
          mappedNodes[roots[j].r] = true;
        }
      }
    }
  } // end for each src root
  return  edges;
}

function diagram(list, nodeMax, edgeMax)
{
  nodeMax = Math.min(nodeMax, list.length);


  let nodes = populateNodes(list, nodeMax);
  console.log(`nodes`, nodes);

  let edges = populateEdges(list, nodeMax, edgeMax);


  const data= {
    nodes: nodes,
    edges: edges
  };
  // const network = new vis.Network(container, data, options);
  return {nodeMax, edgeMax, data};

}


export function renderGraphData(list)
{
  return diagram(list, 20000, 20000);
}

// reset graphableRows from outside to communicate what to render
export const toRender = {graphableRows:{}}
