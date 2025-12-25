/**
 * Web Worker for graph computation to prevent UI freezing
 */

import { expandFilteredByMeaning, expandFilteredWithIndirectlyLinkedRoots, renderGraphData } from '../roots/myvis';
import { matchesDefinitionFilter } from '../roots/definitionFilter';

interface GraphComputeMessage {
  type: 'compute';
  payload: {
    computationId: number;
    filteredRoots: any[];
    allRoots: any[];
    linkByMeaningThreshold: number;
    maxGeneration: number;
    mischalfim: any[];
    otherChoices: any;
    maxNodes: number;
    maxEdges: number;
    pruneByGradeThreshold: number;
    maxNodesForExpansion: number;
  };
}

interface SearchMessage {
  type: 'search';
  payload: {
    searchId: number;
    searchTerm: string;
  };
}

interface GraphComputeResult {
  type: 'result';
  payload: {
    computationId: number;
    data: any;
    nodeMax: number;
    edgeMax: number;
    generationRange: { min: number; max: number };
    nodeIdToRootId: [number, number][]; // Array of [nodeId, rootId] tuples for search (serializable)
    tooltipCounts: {
      n: number; // Grid filter count
      x: number; // Roots added by similar meanings (not in grid filter)
      w: number; // Roots added only by extra degrees (not in grid filter or similar meanings)
      y: number; // Total roots after all processing
      q: number; // Roots with no edges (for Remove Free)
      pruneRemoved: number; // Number of nodes removed by pruning (for Prune by grade tooltip)
    };
  };
}

// Worker state - maintained between messages
let currentComputationId = 0;
let currentSearchId = 0;
let nodeIdToRootIdMap: Map<number, number> = new Map();
let allRootsCache: any[] = [];
let currentNodes: any[] = [];
let dictionaryCache: Map<number, any> | null = null;
let dictionaryLoadingPromise: Promise<Map<number, any>> | null = null;

// Load dictionary data in worker (workers can use fetch)
async function loadDictionaryInWorker(): Promise<Map<number, any>> {
  if (dictionaryCache) {
    return dictionaryCache;
  }

  if (dictionaryLoadingPromise) {
    return dictionaryLoadingPromise;
  }

  dictionaryLoadingPromise = (async () => {
    try {
      const paths = [
        '/root-dictionary-definitions.yaml',
        './root-dictionary-definitions.yaml',
      ];

      let response: Response | null = null;
      for (const yamlPath of paths) {
        try {
          response = await fetch(yamlPath);
          if (response.ok) break;
        } catch (e) {
          // Try next path
        }
      }

      if (!response || !response.ok) {
        dictionaryCache = new Map();
        return dictionaryCache;
      }

      const fileContent = await response.text();
      // Use dynamic import for yaml in worker
      const yaml = await import('js-yaml');
      const data = yaml.load(fileContent) as { roots: any[] };

      if (!data || !data.roots || !Array.isArray(data.roots)) {
        dictionaryCache = new Map();
        return dictionaryCache;
      }

      dictionaryCache = new Map();
      data.roots.forEach((entry: any) => {
        dictionaryCache!.set(entry.id, entry);
      });

      return dictionaryCache;
    } catch (error) {
      console.error('Error loading dictionary in worker:', error);
      dictionaryCache = new Map();
      return dictionaryCache;
    }
  })();

  return dictionaryLoadingPromise;
}

// Get dictionary words (synchronous, uses cache)
function getDictionaryWordsInWorker(rootId: number): any[] {
  if (!dictionaryCache) {
    // Trigger async load
    loadDictionaryInWorker().catch(console.error);
    return [];
  }
  const entry = dictionaryCache.get(rootId);
  return entry?.eg || [];
}

// Search result type
type NodeColor = {
  background: string;
  border: string;
  highlight: {
    background: string;
    border: string;
  };
};

interface SearchResult {
  type: 'searchResult';
  payload: {
    searchId: number;
    nodeColors: Array<{ nodeId: number; color: NodeColor }>;
  };
}

self.onmessage = function(e: MessageEvent<GraphComputeMessage | SearchMessage>) {
  if (e.data.type === 'compute') {
    const {
      computationId,
      filteredRoots,
      allRoots,
      linkByMeaningThreshold,
      maxGeneration,
      mischalfim,
      otherChoices,
      maxNodes,
      maxEdges,
      pruneByGradeThreshold,
      maxNodesForExpansion,
    } = e.data.payload;

    // Update current computation ID - if a new computation comes in, we'll ignore old results
    currentComputationId = computationId;

    try {
      // PIPELINE STAGE 1: Grid-filtered roots (input from grid filters)
      const gridFilteredRoots = filteredRoots;
      const n = gridFilteredRoots.length; // Grid filter count

      // OPTIMIZATION: If grid-filtered roots exceed threshold, skip expensive expansion operations
      // These operations (meaning links, extra degrees, pruning) are not useful with large node sets
      // and cause significant performance degradation
      const shouldSkipExpansion = n > maxNodesForExpansion;

      // Create gridFilteredRootIds set once for use in both branches
      const gridFilteredRootIds = new Set(gridFilteredRoots.map((r: any) => r.id));

      // PIPELINE STAGE 2: Apply Link by Meaning slider - add roots connected by meaning grades
      const rootsWithMeaningLinks = shouldSkipExpansion
        ? gridFilteredRoots
        : expandFilteredByMeaning(
            gridFilteredRoots,
            allRoots,
            linkByMeaningThreshold
          );

      // x = roots added by similar meanings (not in original grid filter)
      const x = shouldSkipExpansion
        ? 0
        : rootsWithMeaningLinks.filter((r: any) => !gridFilteredRootIds.has(r.id)).length;

      // PIPELINE STAGE 3: Apply Max Generation slider - expand by letter-based connections
      const rootsWithLetterLinks = shouldSkipExpansion
        ? gridFilteredRoots
        : expandFilteredWithIndirectlyLinkedRoots(
            rootsWithMeaningLinks,
            allRoots,
            mischalfim,
            otherChoices
          );

      // Calculate generation range for slider
      const generations = shouldSkipExpansion
        ? []
        : rootsWithLetterLinks
            .filter((r: any) => r && r.generation !== undefined)
            .map((r: any) => r.generation);

      const generationRange: { min: number; max: number } = generations.length > 0
        ? { min: Math.min(...generations), max: Math.max(...generations) }
        : { min: 1, max: 1 };

      // PIPELINE STAGE 4: Filter by maxGeneration value
      const rootsFilteredByGeneration = shouldSkipExpansion
        ? gridFilteredRoots
        : rootsWithLetterLinks.filter((root: any) =>
            root.generation === undefined
              ? maxGeneration >= generationRange.min
              : root.generation <= maxGeneration
          );

      // w = roots added only by extra degrees (not in grid filter or similar meanings)
      const meaningLinkRootIds = shouldSkipExpansion
        ? new Set<number>()
        : new Set(rootsWithMeaningLinks.map((r: any) => r.id));
      const w = shouldSkipExpansion
        ? 0
        : rootsFilteredByGeneration.filter((r: any) =>
            !gridFilteredRootIds.has(r.id) && !meaningLinkRootIds.has(r.id)
          ).length;

      const showGenerations = shouldSkipExpansion
        ? false
        : maxGeneration > generationRange.min;

      // PIPELINE STAGE 5: Create graph data (nodes and edges)
      // Temporarily disable Remove Free to calculate q correctly
      const otherChoicesWithoutRemoveFree = { ...otherChoices, removeFree: false };
      const { data, nodeMax, edgeMax } = renderGraphData(
        rootsFilteredByGeneration,
        mischalfim,
        otherChoicesWithoutRemoveFree,
        maxNodes,
        maxEdges,
        showGenerations,
        1 // relatedMeaningsThreshold always 1
      );

      // y = total roots after extra degrees but BEFORE pruning (for prune by grade tooltip)
      const y = data.nodes.length;

      // Log summary before pruning
      // console.log('=== Graph Pipeline Summary ===');
      // console.log(`Stage 1 (Grid Filtered): ${gridFilteredRoots.length} roots`);
      // console.log(`Stage 2 (With Meaning Links): ${rootsWithMeaningLinks.length} roots`);
      // console.log(`Stage 3 (With Letter Links): ${rootsWithLetterLinks.length} roots`);
      // console.log(`Stage 4 (Filtered by Generation): ${rootsFilteredByGeneration.length} roots`);
      // console.log(`Stage 5 (Graph Data): ${data.nodes.length} nodes, ${data.edges.length} edges`);

      // PIPELINE STAGE 6: Apply Prune by Grade slider
      // Remove nodes that are NOT linked by BOTH Osios Mischalfos AND requisite meaning grade
      // UNLESS they are in the original grid filter
      let pruneRemoved = 0; // Number of nodes removed by pruning
      if (pruneByGradeThreshold > 0) {
        // Original grid filter set - these always stay
        const originalGridFilterRootIds = new Set();
        gridFilteredRoots.forEach((root: any) => {
          if (root && root.id !== undefined && root.id !== null) {
            originalGridFilterRootIds.add(root.id);
          }
        });

        // Create maps: nodeId -> rootId and nodeId -> edges
        const nodeIdToRootId = new Map();
        const nodeIdToEdges = new Map();

        // Map each node to its root ID based on rootsFilteredByGeneration list
        rootsFilteredByGeneration.forEach((root: any, index: number) => {
          const nodeId = index + 1; // populateNodes uses index + 1
          nodeIdToRootId.set(nodeId, root.id);
          nodeIdToEdges.set(nodeId, []);
        });

        // Build edge map: nodeId -> array of edges
        data.edges.forEach((edge: any) => {
          if (nodeIdToEdges.has(edge.from)) {
            nodeIdToEdges.get(edge.from)!.push(edge);
          }
          if (nodeIdToEdges.has(edge.to)) {
            nodeIdToEdges.get(edge.to)!.push(edge);
          }
        });

        // Find valid nodes: nodes that have BOTH letter-based AND meaning-based connections
        const validNodeIds = new Set();

        // Pass 1: Mark all nodes in original grid filter as valid (these always stay)
        data.nodes.forEach((node: any) => {
          const nodeId = node.id;
          const rootId = nodeIdToRootId.get(nodeId);

          if (rootId !== undefined && originalGridFilterRootIds.has(rootId)) {
            validNodeIds.add(nodeId);
          }
        });

        // Pass 2: Find nodes that have BOTH:
        // - A letter-based edge (yellow, or any edge that's not white)
        // - A meaning-based edge (white) with sufficient grade
        // Note: edge.width is scaled (grade * 1.5 + 0.5)
        const minWidthForThreshold = pruneByGradeThreshold * 1.5 + 0.5;

        data.nodes.forEach((node: any) => {
          const nodeId = node.id;

          // Skip if already valid (in original grid filter)
          if (validNodeIds.has(nodeId)) {
            return;
          }

          const edges = nodeIdToEdges.get(nodeId) || [];

          // Check if this node has BOTH a letter-based edge AND a meaning-based edge with sufficient grade
          let hasLetterEdge = false;
          let hasMeaningEdge = false;

          for (const edge of edges) {
            // Letter-based edge: not white (yellow or default)
            if (edge.color !== 'white') {
              hasLetterEdge = true;
            }
            // Meaning-based edge: white with sufficient grade
            if (edge.color === 'white' && edge.width >= minWidthForThreshold) {
              hasMeaningEdge = true;
            }
          }

          // Keep if has BOTH letter-based AND meaning-based connections
          if (hasLetterEdge && hasMeaningEdge) {
            validNodeIds.add(nodeId);
          }
        });

        // Pass 3: Iteratively add nodes connected to valid nodes by meaning-based edges
        // This allows transitive connections
        let changed = true;
        while (changed) {
          changed = false;
          data.nodes.forEach((node: any) => {
            const nodeId = node.id;

            // Skip if already valid
            if (validNodeIds.has(nodeId)) {
              return;
            }

            const edges = nodeIdToEdges.get(nodeId) || [];

            // Check if this node has a meaning-based edge with sufficient grade to a valid node
            for (const edge of edges) {
              if (edge.color === 'white' && edge.width >= minWidthForThreshold) {
                const otherNodeId = edge.from === nodeId ? edge.to : edge.from;
                if (validNodeIds.has(otherNodeId)) {
                  // Also check that this node has a letter-based edge
                  let hasLetterEdge = false;
                  for (const e of edges) {
                    if (e.color !== 'white') {
                      hasLetterEdge = true;
                      break;
                    }
                  }
                  if (hasLetterEdge) {
                    validNodeIds.add(nodeId);
                    changed = true;
                    break;
                  }
                }
              }
            }
          });
        }

        // Filter edges: only keep edges between valid nodes
        data.edges = data.edges.filter((edge: any) =>
          validNodeIds.has(edge.from) && validNodeIds.has(edge.to)
        );

        // Filter nodes: only keep valid nodes
        const nodesBeforePruning = data.nodes.length;
        data.nodes = data.nodes.filter((node: any) => validNodeIds.has(node.id));
        pruneRemoved = nodesBeforePruning - data.nodes.length;

        // console.log(`Stage 6 (After Pruning): ${data.nodes.length} nodes (removed ${nodesBeforePruning - data.nodes.length}), ${data.edges.length} edges`);
      } else {
        // console.log(`Stage 6 (Pruning): Skipped (threshold = 0)`);
      }

      // q = roots with no edges (for Remove Free tooltip)
      // Calculate this after pruning but BEFORE Remove Free is applied
      // This represents how many nodes would have no edges if Remove Free were NOT checked
      // Note: renderGraphData was called with removeFree=false, so data still has all nodes
      const nodesWithEdgesForQ = new Set();
      data.edges.forEach((edge: any) => {
        nodesWithEdgesForQ.add(edge.from);
        nodesWithEdgesForQ.add(edge.to);
      });
      const q = data.nodes.filter((node: any) => !nodesWithEdgesForQ.has(node.id)).length;

      // PIPELINE STAGE 7: Apply Remove Free - remove all nodes with no edges
      // Note: q is calculated above from data that hasn't had Remove Free applied yet
      if (otherChoices.removeFree) {
        const nodesWithEdges = new Set();
        data.edges.forEach((edge: any) => {
          nodesWithEdges.add(edge.from);
          nodesWithEdges.add(edge.to);
        });

        const nodesBeforeRemoveFree = data.nodes.length;
        data.nodes = data.nodes.filter((node: any) => nodesWithEdges.has(node.id));

        // console.log(`Stage 7 (Remove Free): ${data.nodes.length} nodes (removed ${nodesBeforeRemoveFree - data.nodes.length} unlinked nodes)`);
      } else {
        // console.log(`Stage 7 (Remove Free): Skipped`);
      }

      // Final summary
      // console.log(`=== Final Graph: ${data.nodes.length} nodes, ${data.edges.length} edges ===`);

      // Build nodeId to rootId mapping for search functionality
      // Convert Map to array for serialization (Maps can't be sent via postMessage)
      const nodeIdToRootIdArray: [number, number][] = [];
      const nodeIdToRootIdMapLocal = new Map<number, number>();
      rootsFilteredByGeneration.forEach((root: any, index: number) => {
        const nodeId = index + 1; // populateNodes uses index + 1
        nodeIdToRootIdArray.push([nodeId, root.id]);
        nodeIdToRootIdMapLocal.set(nodeId, root.id);
      });

      // Update worker state for search functionality
      nodeIdToRootIdMap = nodeIdToRootIdMapLocal;
      allRootsCache = allRoots;
      currentNodes = data.nodes;

      // Only send result if this is still the current computation
      if (currentComputationId === computationId) {
        const result: GraphComputeResult = {
          type: 'result',
          payload: {
            computationId,
            data,
            nodeMax,
            edgeMax,
            generationRange,
            nodeIdToRootId: nodeIdToRootIdArray,
            tooltipCounts: {
              n,
              x,
              w,
              y,
              q,
              pruneRemoved,
            },
          },
        };

        self.postMessage(result);
      }
    } catch (error: any) {
      self.postMessage({
        type: 'error',
        payload: { error: error.message || String(error) },
      });
    }
  } else if (e.data.type === 'search') {
    const { searchId, searchTerm } = e.data.payload;
    
    console.log('[graphWorker] Search request:', searchId, 'term:', searchTerm, 'currentNodes:', currentNodes.length, 'nodeIdToRootIdMap:', nodeIdToRootIdMap.size, 'allRootsCache:', allRootsCache.length);
    
    // Update current search ID - if a new search comes in, we'll ignore old results
    currentSearchId = searchId;

    // Check if we have nodes to search - if not, return empty result
    if (currentNodes.length === 0 || nodeIdToRootIdMap.size === 0 || allRootsCache.length === 0) {
      console.warn('[graphWorker] Search cannot proceed - missing data. Nodes:', currentNodes.length, 'Map:', nodeIdToRootIdMap.size, 'Roots:', allRootsCache.length);
      self.postMessage({
        type: 'searchResult',
        payload: {
          searchId,
          nodeColors: [],
        },
      });
      return;
    }

    // Ensure dictionary is loaded before searching
    loadDictionaryInWorker().then(() => {
      // Only proceed if this is still the current search
      if (currentSearchId !== searchId) return;

      try {
        const nodeColors: Array<{ nodeId: number; color: NodeColor }> = [];

      if (!searchTerm || !searchTerm.trim()) {
        // Clear all colors - reset to default
        currentNodes.forEach((node: any) => {
          nodeColors.push({
            nodeId: node.id,
            color: {
              background: 'white',
              border: 'cyan',
              highlight: {
                background: 'pink',
                border: 'red'
              }
            }
          });
        });
      } else {
        // Search through nodes
        const trimmedSearchTerm = searchTerm.trim();
        
        currentNodes.forEach((node: any) => {
          const nodeId = node.id;
          const rootId = nodeIdToRootIdMap.get(nodeId);

          if (!rootId) {
            // Reset to default if we can't find the root
            nodeColors.push({
              nodeId,
              color: {
                background: 'white',
                border: 'cyan',
                highlight: {
                  background: 'pink',
                  border: 'red'
                }
              }
            });
            return;
          }

          // Find root data
          const root = allRootsCache.find((r: any) => r.id === rootId);
          if (!root) {
            nodeColors.push({
              nodeId,
              color: {
                background: 'white',
                border: 'cyan',
                highlight: {
                  background: 'pink',
                  border: 'red'
                }
              }
            });
            return;
          }

          const rootDefinition = root.d || '';

          // Check definition first (faster)
          const matchesDefinition = matchesDefinitionFilter(rootDefinition, trimmedSearchTerm);

          let matchesExamples = false;
          if (!matchesDefinition) {
            // Only check examples if definition doesn't match
            const dictionaryWords = getDictionaryWordsInWorker(rootId);
            for (const word of dictionaryWords) {
              const exampleText = word.e || '';
              if (matchesDefinitionFilter(exampleText, trimmedSearchTerm)) {
                matchesExamples = true;
                break;
              }
            }
          }

          if (matchesDefinition || matchesExamples) {
            nodeColors.push({
              nodeId,
              color: {
                background: matchesDefinition ? 'orange' : 'yellow',
                border: matchesDefinition ? 'darkorange' : 'gold',
                highlight: {
                  background: matchesDefinition ? 'darkorange' : 'gold',
                  border: matchesDefinition ? 'red' : 'darkgoldenrod'
                }
              }
            });
          } else {
            // Reset to default
            nodeColors.push({
              nodeId,
              color: {
                background: 'white',
                border: 'cyan',
                highlight: {
                  background: 'pink',
                  border: 'red'
                }
              }
            });
          }
        });
      }

        // Only send result if this is still the current search
        if (currentSearchId === searchId) {
          const matchedCount = nodeColors.filter(c => c.color.background === 'orange' || c.color.background === 'yellow').length;
          console.log('[graphWorker] Search result:', searchId, 'matched:', matchedCount, 'total nodes:', nodeColors.length);
          const result: SearchResult = {
            type: 'searchResult',
            payload: {
              searchId,
              nodeColors,
            },
          };

          self.postMessage(result);
        }
      } catch (error: any) {
        self.postMessage({
          type: 'error',
          payload: { error: error.message || String(error) },
        });
      }
    }).catch((error: any) => {
      self.postMessage({
        type: 'error',
        payload: { error: error.message || String(error) },
      });
    });
  }
};

