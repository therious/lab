/**
 * Created by hzamir on 10/13/14. revised 10/2/2023
 */
import {arrMischalfim, vav} from "./mischalfim";


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

export function mischalef(a,b)
{
    const ao = mischalfim[a];

    return (ao && ao[b]);
}


function populateNodes(roots, nodeMax, showGenerations = false)
{
    const max = Math.min(nodeMax, roots.length);

    return roots.slice(0, max).map((o,i)=>{
        const node = {id:i+1, label:o.r, title:o.d};
        
        // If generation info is available and we should show it, add it to the label
        if (showGenerations && o.generation !== undefined) {
            // Use newline to display generation number on a separate line below the root text
            // vis-network supports \n for multi-line labels
            node.label = o.r + '\n' + o.generation;
            // Enable multi-line font support
            node.font = { multi: true };
        }
        
        return node;
    });

  // const node = {id:i+1, label: root.P + root.E + root.L};
  // if(root.d)
  //   node.title = root.d;
  // else
  //   node.color='cornsilk';

}



function atLeastTwoMatch(p,e,l, cand)
{
    let matches = 0;
    if(p === cand.P)
        ++matches;
    if(e === cand.E)
        ++matches;
    if(l === cand.L)
        ++matches;

    return matches >= 2;

}

/*
 function containsNameOfHashem()
 {
   // yod heh
   // aleph lamed


 }

function firstOrLastTwoMatch(p,e,l,cand)
{
    if(e === cand.E)
    {
        return (p === cand.P || l === cand.L)
    }
    return false;
}
*/

// if the first letter is the same
// and the second letter is a vav
// and the third letter is the second and third letter or the second root
function doubledLast(p,e,l, root)
{
    return (e === vav && root.L === l && p === root.P &&  root.E === root.L );
}

// maybe revise with option that first letter is identical, and not always connect because first letter is also mischalef
function pairMischalef(p,e,l, cand)
{
     return !!(e === l &&       // doubled src last letters
       cand.E === cand.L &&       // doubled dst last letters
       (mischalef(e, cand.E)) &&    // pairs are interchangeable
       (p === cand.P || mischalef(p, cand.P)));
}
let  useVavToDoubled = true;
let removeFree = false;

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


// function dumpEdges(edges)
// {
//     const div =  $('#edges');
//     div.append("edges=[");
//     for(let i = 0; i < edges.length; ++i)
//     {
//         const e = edges[i];
//         div.append("<div>{from:" + e.from + ", to: " + e.to + "},</div>");
//     }
//     div.append("<div>];</div>");
// }
//
// function dumpNodes(nodes)
// {
//     const div =  $('#nodes');
//     div.append("nodes=[");
//     for(let i = 0; i < nodes.length; ++i)
//     {
//         const n = nodes[i];
//         div.append("<div>{id:" + n.id + ", label: '" + n.label + "'},</div>");
//     }
//     div.append("<div>];</div>");
//
// }
//

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

function diagram(list, nodeMax, edgeMax, showGenerations = false)
{
     nodeMax = Math.min(nodeMax, list.length);


    let nodes = populateNodes(list, nodeMax, showGenerations);
    console.log(`nodes`, nodes);

    let edges = populateEdges(list, nodeMax, edgeMax);

    // remove anything from list that is not contained in mapped edges
    if(removeFree) {
        const unfreelist = list.filter(o=>mappedNodes[o.r]); // shrink the list, and do it again!
        nodeMax = Math.min(nodeMax, unfreelist.length);

        nodes = populateNodes(unfreelist, nodeMax, showGenerations);
        edges = populateEdges(unfreelist, nodeMax, edgeMax);
    }
//
//        dumpNodes(nodes);
//        dumpEdges(edges);

    const data= {
        nodes: nodes,
        edges: edges
    };
    // const network = new vis.Network(container, data, options);
    return {nodeMax, edgeMax, data};

}


export function renderGraphData(list, amischalfim, otherChoices, maxNodes, maxEdges, showGenerations = false)
{
    mischalfim = buildMischalfim(amischalfim);
    useVavToDoubled =   otherChoices.vavToDoubled;
    removeFree = otherChoices.removeFree;
    return diagram(list, maxNodes, maxEdges, showGenerations);
}

// reset graphableRows from outside to communicate what to render
export const toRender = {graphableRows: {}, expandedLinkedRows: [], indirectlyLinkedRows: []}

// Expand filtered roots to include all linked roots from the full list
// This function checks each filtered root against every root in the full list
// to find linked roots based on the linking rules (mischalfim, etc.)
// Returns roots with generation numbers: filtered = 1, directly linked = 2
export function expandFilteredWithLinkedRoots(filteredRoots, allRoots, amischalfim, otherChoices) {
    if (!filteredRoots || !Array.isArray(filteredRoots) || filteredRoots.length === 0) {
        return [];
    }
    
    if (!allRoots || !Array.isArray(allRoots) || allRoots.length === 0) {
        return filteredRoots.map(root => ({ ...root, generation: 1 }));
    }
    
    // Build mischalfim and set useVavToDoubled for the linking logic
    const currentMischalfim = buildMischalfim(amischalfim || []);
    const currentUseVavToDoubled = (otherChoices && otherChoices.vavToDoubled !== undefined) ? otherChoices.vavToDoubled : true;
    
    // Temporarily set globals for findEdge function
    const originalMischalfim = mischalfim;
    const originalUseVavToDoubled = useVavToDoubled;
    mischalfim = currentMischalfim;
    useVavToDoubled = currentUseVavToDoubled;
    
    try {
        // Use a Map to track unique roots by id, preserving order
        const includedRoots = new Map();
        
        // Add all filtered roots first (generation 1)
        filteredRoots.forEach(root => {
            if (root && root.id !== undefined && root.id !== null) {
                includedRoots.set(root.id, { ...root, generation: 1 });
            }
        });
        
        // For each filtered root, check against every root in the full list
        filteredRoots.forEach(filteredRoot => {
            if (!filteredRoot || filteredRoot.id === undefined || filteredRoot.id === null) {
                return;
            }
            
            for (let i = 0; i < allRoots.length; i++) {
                const candidate = allRoots[i];
                
                if (!candidate || candidate.id === undefined || candidate.id === null) {
                    continue;
                }
                
                // Skip if already included
                if (includedRoots.has(candidate.id)) {
                    continue;
                }
                
                // Check if this candidate root is linked to the filtered root
                // We need to create a temporary roots array with just these two for findEdge
                const tempRoots = [filteredRoot, candidate];
                const matchindex = findEdge(filteredRoot.P, filteredRoot.E, filteredRoot.L, tempRoots, 1);
                
                if (matchindex >= 0) {
                    // Found a link! Add the candidate to the expanded list (generation 2)
                    includedRoots.set(candidate.id, { ...candidate, generation: 2 });
                }
            }
        });
        
        // Return as array, maintaining order: filtered roots first, then newly linked roots
        const result = Array.from(includedRoots.values());
        return result;
    } finally {
        // Restore globals
        mischalfim = originalMischalfim;
        useVavToDoubled = originalUseVavToDoubled;
    }
}

// Expand filtered roots to include all indirectly linked roots (transitive closure)
// This iteratively expands the list until no new linked roots are found
// Returns roots with generation numbers: filtered = 1, each iteration adds +1
export function expandFilteredWithIndirectlyLinkedRoots(filteredRoots, allRoots, amischalfim, otherChoices) {
    if (!filteredRoots || !Array.isArray(filteredRoots) || filteredRoots.length === 0) {
        return [];
    }
    
    if (!allRoots || !Array.isArray(allRoots) || allRoots.length === 0) {
        return filteredRoots.map(root => ({ ...root, generation: 1 }));
    }
    
    // Build mischalfim and set useVavToDoubled for the linking logic
    const currentMischalfim = buildMischalfim(amischalfim || []);
    const currentUseVavToDoubled = (otherChoices && otherChoices.vavToDoubled !== undefined) ? otherChoices.vavToDoubled : true;
    
    // Temporarily set globals for findEdge function
    const originalMischalfim = mischalfim;
    const originalUseVavToDoubled = useVavToDoubled;
    mischalfim = currentMischalfim;
    useVavToDoubled = currentUseVavToDoubled;
    
    try {
        // Use a Map to track unique roots by id with their generation
        const includedRoots = new Map();
        
        // Add all filtered roots first (generation 1)
        filteredRoots.forEach(root => {
            if (root && root.id !== undefined && root.id !== null) {
                includedRoots.set(root.id, { ...root, generation: 1 });
            }
        });
        
        let previousSize = 0;
        let currentSize = includedRoots.size;
        let iteration = 0;
        const maxIterations = 100; // Safety limit to prevent infinite loops
        
        // Iteratively expand until no new roots are found
        while (currentSize > previousSize && iteration < maxIterations) {
            previousSize = currentSize;
            iteration++;
            const currentGeneration = iteration + 1; // Generation 2 for first iteration, 3 for second, etc.
            
            // Get current list of included roots
            const currentRoots = Array.from(includedRoots.values());
            
            // For each currently included root, check against all roots in the full list
            currentRoots.forEach(currentRoot => {
                if (!currentRoot || currentRoot.id === undefined || currentRoot.id === null) {
                    return;
                }
                
                for (let i = 0; i < allRoots.length; i++) {
                    const candidate = allRoots[i];
                    
                    if (!candidate || candidate.id === undefined || candidate.id === null) {
                        continue;
                    }
                    
                    // Skip if already included
                    if (includedRoots.has(candidate.id)) {
                        continue;
                    }
                    
                    // Check if this candidate root is linked to the current root
                    const tempRoots = [currentRoot, candidate];
                    const matchindex = findEdge(currentRoot.P, currentRoot.E, currentRoot.L, tempRoots, 1);
                    
                    if (matchindex >= 0) {
                        // Found a link! Add the candidate to the expanded list with current generation
                        includedRoots.set(candidate.id, { ...candidate, generation: currentGeneration });
                    }
                }
            });
            
            currentSize = includedRoots.size;
        }
        
        if (iteration >= maxIterations) {
            console.warn('expandFilteredWithIndirectlyLinkedRoots: Reached max iterations limit');
        }
        
        // Return as array, maintaining order: filtered roots first, then newly linked roots
        const result = Array.from(includedRoots.values());
        return result;
    } finally {
        // Restore globals
        mischalfim = originalMischalfim;
        useVavToDoubled = originalUseVavToDoubled;
    }
}
