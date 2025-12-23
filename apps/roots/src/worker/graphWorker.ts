/**
 * Web Worker for graph computation to prevent UI freezing
 */

import { expandFilteredByMeaning, expandFilteredWithIndirectlyLinkedRoots, renderGraphData } from '../roots/myvis.js';

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
  };
}

let currentComputationId = 0;

self.onmessage = function(e: MessageEvent<GraphComputeMessage>) {
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
    } = e.data.payload;

    // Update current computation ID - if a new computation comes in, we'll ignore old results
    currentComputationId = computationId;

    try {
      // PIPELINE STAGE 1: Grid-filtered roots (input from grid filters)
      const gridFilteredRoots = filteredRoots;
      
      // PIPELINE STAGE 2: Apply Link by Meaning slider - add roots connected by meaning grades
      const rootsWithMeaningLinks = expandFilteredByMeaning(
        gridFilteredRoots,
        allRoots,
        linkByMeaningThreshold
      );

      // PIPELINE STAGE 3: Apply Max Generation slider - expand by letter-based connections
      const rootsWithLetterLinks = expandFilteredWithIndirectlyLinkedRoots(
        rootsWithMeaningLinks,
        allRoots,
        mischalfim,
        otherChoices
      );

      // Calculate generation range for slider
      const generations = rootsWithLetterLinks
        .filter((r: any) => r && r.generation !== undefined)
        .map((r: any) => r.generation);
      const generationRange = {
        min: generations.length > 0 ? Math.min(...generations) : 1,
        max: generations.length > 0 ? Math.max(...generations) : 1,
      };

      // PIPELINE STAGE 4: Filter by maxGeneration value
      const rootsFilteredByGeneration = rootsWithLetterLinks.filter((root: any) => {
        if (root.generation === undefined) {
          return maxGeneration >= generationRange.min;
        }
        return root.generation <= maxGeneration;
      });

      const showGenerations = maxGeneration > generationRange.min;

      // PIPELINE STAGE 5: Create graph data (nodes and edges)
      const { data, nodeMax, edgeMax } = renderGraphData(
        rootsFilteredByGeneration,
        mischalfim,
        otherChoices,
        maxNodes,
        maxEdges,
        showGenerations,
        1 // relatedMeaningsThreshold always 1
      );
      
      // Log summary before pruning
      console.log('=== Graph Pipeline Summary ===');
      console.log(`Stage 1 (Grid Filtered): ${gridFilteredRoots.length} roots`);
      console.log(`Stage 2 (With Meaning Links): ${rootsWithMeaningLinks.length} roots`);
      console.log(`Stage 3 (With Letter Links): ${rootsWithLetterLinks.length} roots`);
      console.log(`Stage 4 (Filtered by Generation): ${rootsFilteredByGeneration.length} roots`);
      console.log(`Stage 5 (Graph Data): ${data.nodes.length} nodes, ${data.edges.length} edges`);

      // PIPELINE STAGE 6: Apply Prune by Grade slider
      // Remove nodes that are NOT linked by BOTH Osios Mischalfos AND requisite meaning grade
      // UNLESS they are in the original grid filter
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
        
        console.log(`Stage 6 (After Pruning): ${data.nodes.length} nodes (removed ${nodesBeforePruning - data.nodes.length}), ${data.edges.length} edges`);
      } else {
        console.log(`Stage 6 (Pruning): Skipped (threshold = 0)`);
      }
      
      // PIPELINE STAGE 7: Apply Remove Free - remove all nodes with no edges
      if (otherChoices.removeFree) {
        const nodesWithEdges = new Set();
        data.edges.forEach((edge: any) => {
          nodesWithEdges.add(edge.from);
          nodesWithEdges.add(edge.to);
        });
        
        const nodesBeforeRemoveFree = data.nodes.length;
        data.nodes = data.nodes.filter((node: any) => nodesWithEdges.has(node.id));
        
        console.log(`Stage 7 (Remove Free): ${data.nodes.length} nodes (removed ${nodesBeforeRemoveFree - data.nodes.length} unlinked nodes)`);
      } else {
        console.log(`Stage 7 (Remove Free): Skipped`);
      }
      
      // Final summary
      console.log(`=== Final Graph: ${data.nodes.length} nodes, ${data.edges.length} edges ===`);

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
  }
};

