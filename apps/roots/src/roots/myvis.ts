/**
 * Created by hzamir on 10/13/14. revised 10/2/2023
 */
import {Mischalef, arrMischalfim, vav} from "./mischalfim";
import {getDefinitionSimilarityGrade, getMeaningConnectedRoots} from "./definition-similarity-grades";
import { getRootTooltipSync } from './loadDictionary';
import type {Root, GraphNode, GraphEdge, GraphData} from './types';

type MischalfimMap = Record<string, Record<string, number>>;

function buildMischalfim(arr: Mischalef[]): MischalfimMap {
    const result: MischalfimMap = {};

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
                    o[m] = 1;
                }
            }  // each item in the set as an entry (excepting the current key itself)
        } // each item in set as the key to create in map
    } // for each set of interchangeable characters

    return result;
}

// check a map of maps mischalfim for letters that substitute for other letters
// and use those to generate a connection. Any mischalef relationship will do
let mischalfim: MischalfimMap = buildMischalfim(arrMischalfim);

export function mischalef(a: string, b: string): boolean {
    const ao = mischalfim[a];

    return !!(ao && ao[b]);
}


function populateNodes(roots: Root[], nodeMax: number, showGenerations = false): GraphNode[] {
    const max = Math.min(nodeMax, roots.length);

    return roots.slice(0, max).map((o, i) => {
        // Use dictionary tooltip with example words
        const tooltip = getRootTooltipSync(o.id, o.d);
        // Format: rootId: definition (then examples if available)
        const rootId = o.id;
        const definition = o.d;
        // getRootTooltipSync returns "definition\n\nExample words:\n..." if examples exist, or just "definition" if not
        // We want: "rootId: definition\n\nExample words:\n..." or just "rootId: definition"
        let tooltipWithId: string;
        if (tooltip === definition) {
            // No examples, just definition
            tooltipWithId = `${rootId}: ${definition}`;
        } else {
            // Has examples, replace the definition part with "rootId: definition"
            tooltipWithId = tooltip.replace(definition, `${rootId}: ${definition}`);
        }
        const nodeId = i + 1;
        const node: GraphNode = {id: nodeId, label: o.r, title: tooltipWithId};

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

function atLeastTwoMatch(p: string, e: string, l: string, cand: Root): boolean {
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
function doubledLast(p: string, e: string, l: string, root: Root): boolean {
    return (e === vav && root.L === l && p === root.P &&  root.E === root.L );
}

// Check if two roots are jumbled (anagrams) - same letters in different order
function isJumbled(p: string, e: string, l: string, cand: Root): boolean {
    // Get all letters from source root
    const sourceLetters = [p, e, l].sort();
    // Get all letters from candidate root
    const candLetters = [cand.P, cand.E, cand.L].sort();
    // Compare sorted arrays - if they're equal, roots are jumbled
    return sourceLetters.length === candLetters.length && 
           sourceLetters.every((letter, index) => letter === candLetters[index]);
}

// Atbash mapping: Hebrew alphabet reversed (א↔ת, ב↔ש, ג↔ר, etc.)
// Shin and Sin are treated as the same letter for atbash purposes
const atbashMap: Record<string, string> = {
    '\u05d0': '\u05ea', // א (Alef) ↔ ת (Taf)
    '\u05d1': '\u05e9', // ב (Bet) ↔ ש (Shin) - also matches sin
    '\u05d2': '\u05e8', // ג (Gimmel) ↔ ר (Resh)
    '\u05d3': '\u05e7', // ד (Dalet) ↔ ק (Qof)
    '\u05d4': '\u05e6', // ה (He) ↔ צ (Tzadi)
    '\u05d5': '\u05e4', // ו (Vav) ↔ פ (Pe)
    '\u05d6': '\u05e2', // ז (Zayin) ↔ ע (Ayin)
    '\u05d7': '\u05e1', // ח (Chet) ↔ ס (Samekh)
    '\u05d8': '\u05e0', // ט (Tet) ↔ נ (Nun)
    '\u05d9': '\u05de', // י (Yod) ↔ מ (Mem)
    '\u05db': '\u05dc', // כ (Kaf) ↔ ל (Lamed)
    '\u05dc': '\u05db', // ל (Lamed) ↔ כ (Kaf)
    '\u05de': '\u05d9', // מ (Mem) ↔ י (Yod)
    '\u05e0': '\u05d8', // נ (Nun) ↔ ט (Tet)
    '\u05e1': '\u05d7', // ס (Samekh) ↔ ח (Chet)
    '\u05e2': '\u05d6', // ע (Ayin) ↔ ז (Zayin)
    '\u05e4': '\u05d5', // פ (Pe) ↔ ו (Vav)
    '\u05e6': '\u05d4', // צ (Tzadi) ↔ ה (He)
    '\u05e7': '\u05d3', // ק (Qof) ↔ ד (Dalet)
    '\u05e8': '\u05d2', // ר (Resh) ↔ ג (Gimmel)
    '\u05e9': '\u05d1', // ש (Shin) ↔ ב (Bet)
    '\ufb2b': '\u05d1', // שׂ (Sin) ↔ ב (Bet) - treated same as shin
    '\u05ea': '\u05d0', // ת (Taf) ↔ א (Alef)
};

// Normalize letter for atbash: treat shin and sin as the same
function normalizeForAtbash(letter: string): string {
    // Treat sin (שׂ) as shin (ש) for atbash purposes
    if (letter === '\ufb2b') { // sin
        return '\u05e9'; // shin
    }
    return letter;
}

// Get atbash of a letter
function getAtbash(letter: string): string | undefined {
    const normalized = normalizeForAtbash(letter);
    return atbashMap[normalized];
}

// Check if two roots are in atbash correspondence - all three letters must match
function isAtbash(p: string, e: string, l: string, cand: Root): boolean {
    // All three positions must be in atbash correspondence
    const pAtbash = getAtbash(p);
    const eAtbash = getAtbash(e);
    const lAtbash = getAtbash(l);
    
    if (!pAtbash || !eAtbash || !lAtbash) {
        return false; // If any letter doesn't have an atbash mapping, can't be atbash
    }
    
    // Normalize candidate letters for comparison (treat sin as shin)
    const candPNormalized = normalizeForAtbash(cand.P);
    const candENormalized = normalizeForAtbash(cand.E);
    const candLNormalized = normalizeForAtbash(cand.L);
    
    // Check if all three positions match
    return pAtbash === candPNormalized && 
           eAtbash === candENormalized && 
           lAtbash === candLNormalized;
}

// maybe revise with option that first letter is identical, and not always connect because first letter is also mischalef
function pairMischalef(p: string, e: string, l: string, cand: Root): boolean {
     return !!(e === l &&       // doubled src last letters
       cand.E === cand.L &&       // doubled dst last letters
       (mischalef(e, cand.E)) &&    // pairs are interchangeable
       (p === cand.P || mischalef(p, cand.P)));
}
let  useVavToDoubled: boolean = true;
let useJumbled: boolean = false;
let useAtbash: boolean = false;
let removeFree: boolean = false;

// return index of matching item from
function findEdge(p: string, e: string, l: string, roots: Root[], index: number): number {
    const cand = roots[index];

    // Check atbash first (independent of atLeastTwoMatch) - all three letters must match
    if (useAtbash && isAtbash(p, e, l, cand)) {
        return index;
    }

    // Check jumbled (independent of atLeastTwoMatch)
    if (useJumbled && isJumbled(p, e, l, cand)) {
        return index;
    }

    if (atLeastTwoMatch(p, e, l, cand)) { // if two of the three letters of shoresh are the same

        // if a remaining letter is a mischalef
        if(mischalef(p, cand.P) || mischalef(e, cand.E) || mischalef(l, cand.L)) {
            return index;
        } else if(useVavToDoubled && doubledLast(p,e,l,cand)) {
            // doubledLast is controlled by vavToDoubled checkbox, not mischalfim
            return index;
        }
    // } else if(pairMischalef(p,e,l,cand)) {  // not sure which cases this adds
    //     return index;
    }
    return -1;
}

let mappedNodes: Record<string, boolean> = {};
let mappedEdges: Record<string, boolean> = {};
let edgeCount: number = 0;


function createEdge(aidx: number, bidx: number, edges: GraphEdge[], roots: Root[], relatedMeaningsThreshold = 6): GraphEdge | null {
    if(bidx < 0)
        return null;
    if (aidx === bidx)
        return null;

    // canonical key
    const key = '' + ((aidx < bidx)? (aidx + '_' + bidx) : (bidx + '_' + aidx));

    if (mappedEdges[key])
        return null;

    const root1 = roots[aidx];
    const root2 = roots[bidx];
    const edge: GraphEdge = {from: aidx + 1, to: bidx + 1};

    // Always check for meaning-based connection and adjust edge width and color based on grade
    // Edge strength (width) always reflects the meaning grade if one exists
    if (root1 && root2) {
        const meaningGrade = getDefinitionSimilarityGrade(root1.id, root2.id);
        if (meaningGrade > 0) {
            // Adjust edge width based on grade (5 = thickest, 1 = thinnest)
            // Scale width for better visibility: grade 5 = width 8, grade 4 = width 6, etc.
            // This makes the thickness more visible
            edge.width = meaningGrade * 1.5 + 0.5; // Grade 5 -> 8, Grade 4 -> 6.5, Grade 3 -> 5, etc.
            // Use white color for meaning-based connections
            edge.color = 'white';
        } else {
            // Letter-based edges (no meaning connection) get default thin width
            edge.width = 1;
        }
    } else {
        // Default width for letter-based edges
        edge.width = 1;
    }

    mappedEdges[key] = true;
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

function populateEdges(roots: Root[], hardMax: number, edgeMax: number, relatedMeaningsThreshold = 6): GraphEdge[] {
    const edges: GraphEdge[] = [];

   mappedEdges = {};
   mappedNodes = {};
   edgeCount = 0;


  // console.log('populate edges: hardMax', hardMax);
    for (let i = 0, len = hardMax; i < len; ++i) {
        const src = roots[i];
        for(let j = 0, mlen = hardMax; j < mlen; ++j)
        {
            if (edgeCount === edgeMax)
                return edges;
            if (j !== i) {
                const matchindex = findEdge(src.P, src.E, src.L, roots, j);
                if (matchindex >= 0) {
                    createEdge(i, matchindex, edges, roots, relatedMeaningsThreshold);
                    mappedNodes[src.r] = true;
                    const targetRoot = roots[j];
                    if (targetRoot) mappedNodes[targetRoot.r] = true;
                }
            }
        }
    } // end for each src root
    return  edges;
}


type DiagramResult = {
    nodeMax: number;
    edgeMax: number;
    data: GraphData;
};

function diagram(list: Root[], nodeMax: number, edgeMax: number, showGenerations = false, relatedMeaningsThreshold = 6): DiagramResult {
     nodeMax = Math.min(nodeMax, list.length);


    let nodes = populateNodes(list, nodeMax, showGenerations);

    let edges = populateEdges(list, nodeMax, edgeMax, relatedMeaningsThreshold);

    // remove anything from list that is not contained in mapped edges
    if(removeFree) {
        const unfreelist = list.filter(o => mappedNodes[o.r]); // shrink the list, and do it again!
        nodeMax = Math.min(nodeMax, unfreelist.length);

        nodes = populateNodes(unfreelist, nodeMax, showGenerations);
        edges = populateEdges(unfreelist, nodeMax, edgeMax, relatedMeaningsThreshold);
    }
//
//        dumpNodes(nodes);
//        dumpEdges(edges);

    const data: GraphData = {
        nodes: nodes,
        edges: edges
    };
    // const network = new vis.Network(container, data, options);
    return {nodeMax, edgeMax, data};

}

type OtherChoices = {
    vavToDoubled?: boolean;
    jumbled?: boolean;
    atbash?: boolean;
    removeFree?: boolean;
};

export function renderGraphData(list: Root[], amischalfim: Mischalef[], otherChoices: OtherChoices, maxNodes: number, maxEdges: number, showGenerations = false, relatedMeaningsThreshold = 6): DiagramResult {
    mischalfim = buildMischalfim(amischalfim);
    useVavToDoubled = otherChoices.vavToDoubled ?? true;
    useJumbled = otherChoices.jumbled ?? false;
    useAtbash = otherChoices.atbash ?? false;
    removeFree = otherChoices.removeFree ?? false;
    return diagram(list, maxNodes, maxEdges, showGenerations, relatedMeaningsThreshold);
}

// reset graphableRows from outside to communicate what to render
export const toRender: {
    graphableRows: Record<string, unknown>;
    expandedLinkedRows: Root[];
    indirectlyLinkedRows: Root[];
    linkedByMeaningRows: Root[];
} = {graphableRows: {}, expandedLinkedRows: [], indirectlyLinkedRows: [], linkedByMeaningRows: []};

// Expand filtered roots to include roots connected by meaning grades
// linkByMeaningThreshold: 6 = only filtered roots, 5-0 = include roots with grade >= threshold
export function expandFilteredByMeaning(filteredRoots: Root[], allRoots: Root[], linkByMeaningThreshold: number): Root[] {
    if (!filteredRoots || !Array.isArray(filteredRoots) || filteredRoots.length === 0) {
        return [];
    }

    // If threshold is 6, return only filtered roots
    if (linkByMeaningThreshold >= 6) {
        return filteredRoots.map(root => ({ ...root }));
    }

    if (!allRoots || !Array.isArray(allRoots) || allRoots.length === 0) {
        return filteredRoots.map(root => ({ ...root }));
    }

    // Create a map of all roots by ID for quick lookup
    const allRootsMap = new Map<number, Root>();
    allRoots.forEach(root => {
        if (root && root.id !== undefined && root.id !== null) {
            allRootsMap.set(root.id, root);
        }
    });

    // Use a Map to track unique roots by id
    const includedRoots = new Map<number, Root>();

    // Add all filtered roots first
    filteredRoots.forEach(root => {
        if (root && root.id !== undefined && root.id !== null) {
            includedRoots.set(root.id, { ...root });
        }
    });

    // For each filtered root, find all roots connected by meaning
    filteredRoots.forEach(filteredRoot => {
        if (!filteredRoot || filteredRoot.id === undefined || filteredRoot.id === null) {
            return;
        }

        // Get all roots connected by meaning with grade >= threshold
        const minGrade = linkByMeaningThreshold; // 5, 4, 3, 2, 1, or 0
        const connectedRoots = getMeaningConnectedRoots(filteredRoot.id, minGrade);

        // Add connected roots to the list
        connectedRoots.forEach(({ rootId, grade }) => {
            if (!includedRoots.has(rootId)) {
                const candidate = allRootsMap.get(rootId);
                if (candidate) {
                    includedRoots.set(rootId, { ...candidate });
                }
            }
        });
    });

    // Return as array
    return Array.from(includedRoots.values());
}

// Expand filtered roots to include all linked roots from the full list
// This function checks each filtered root against every root in the full list
// to find linked roots based on the linking rules (mischalfim, etc.)
// Returns roots with generation numbers: filtered = 1, directly linked = 2
export function expandFilteredWithLinkedRoots(filteredRoots: Root[], allRoots: Root[], amischalfim: Mischalef[], otherChoices: OtherChoices): Root[] {
    if (!filteredRoots || !Array.isArray(filteredRoots) || filteredRoots.length === 0) {
        return [];
    }

    if (!allRoots || !Array.isArray(allRoots) || allRoots.length === 0) {
        return filteredRoots.map(root => ({ ...root, generation: 1 }));
    }

    // Build mischalfim and set useVavToDoubled, useJumbled, and useAtbash for the linking logic
    const currentMischalfim = buildMischalfim(amischalfim || []);
    const currentUseVavToDoubled = (otherChoices && otherChoices.vavToDoubled !== undefined) ? otherChoices.vavToDoubled : true;
    const currentUseJumbled = (otherChoices && otherChoices.jumbled !== undefined) ? otherChoices.jumbled : false;
    const currentUseAtbash = (otherChoices && otherChoices.atbash !== undefined) ? otherChoices.atbash : false;

    // Temporarily set globals for findEdge function
    const originalMischalfim = mischalfim;
    const originalUseVavToDoubled = useVavToDoubled;
    const originalUseJumbled = useJumbled;
    const originalUseAtbash = useAtbash;
    mischalfim = currentMischalfim;
    useVavToDoubled = currentUseVavToDoubled;
    useJumbled = currentUseJumbled;
    useAtbash = currentUseAtbash;
    useAtbash = otherChoices.atbash ?? false;

    try {
        // Use a Map to track unique roots by id, preserving order
        const includedRoots = new Map<number, Root>();

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
        useJumbled = originalUseJumbled;
        useAtbash = originalUseAtbash;
    }
}

// Expand filtered roots to include all indirectly linked roots (transitive closure)
// This iteratively expands the list until no new linked roots are found
// Returns roots with generation numbers: filtered = 1, each iteration adds +1
export function expandFilteredWithIndirectlyLinkedRoots(filteredRoots: Root[], allRoots: Root[], amischalfim: Mischalef[], otherChoices: OtherChoices): Root[] {
    if (!filteredRoots || !Array.isArray(filteredRoots) || filteredRoots.length === 0) {
        return [];
    }

    if (!allRoots || !Array.isArray(allRoots) || allRoots.length === 0) {
        return filteredRoots.map(root => ({ ...root, generation: 1 }));
    }

    // Build mischalfim and set useVavToDoubled, useJumbled, and useAtbash for the linking logic
    const currentMischalfim = buildMischalfim(amischalfim || []);
    const currentUseVavToDoubled = (otherChoices && otherChoices.vavToDoubled !== undefined) ? otherChoices.vavToDoubled : true;
    const currentUseJumbled = (otherChoices && otherChoices.jumbled !== undefined) ? otherChoices.jumbled : false;
    const currentUseAtbash = (otherChoices && otherChoices.atbash !== undefined) ? otherChoices.atbash : false;

    // Temporarily set globals for findEdge function
    const originalMischalfim = mischalfim;
    const originalUseVavToDoubled = useVavToDoubled;
    const originalUseJumbled = useJumbled;
    const originalUseAtbash = useAtbash;
    mischalfim = currentMischalfim;
    useVavToDoubled = currentUseVavToDoubled;
    useJumbled = currentUseJumbled;
    useAtbash = currentUseAtbash;
    useAtbash = otherChoices.atbash ?? false;

    try {
        // Use a Map to track unique roots by id with their generation
        const includedRoots = new Map<number, Root>();

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
            // console.warn('expandFilteredWithIndirectlyLinkedRoots: Reached max iterations limit');
        }

        // Return as array, maintaining order: filtered roots first, then newly linked roots
        const result = Array.from(includedRoots.values());
        return result;
    } finally {
        // Restore globals
        mischalfim = originalMischalfim;
        useVavToDoubled = originalUseVavToDoubled;
        useJumbled = originalUseJumbled;
        useAtbash = originalUseAtbash;
    }
}

