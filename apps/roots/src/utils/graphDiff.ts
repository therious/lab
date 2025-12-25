/**
 * Utilities for computing and applying incremental graph updates
 * to preserve node positions during live updates
 */

import type { GraphData, GraphNode, GraphEdge } from '../roots/types';

export type GraphDiff = {
  nodesToAdd: GraphNode[];
  nodesToUpdate: GraphNode[];
  nodesToRemove: number[]; // node IDs
  edgesToAdd: GraphEdge[];
  edgesToRemove: string[]; // edge IDs (from-to)
};

/**
 * Compute the difference between two graphs
 * Returns what needs to be added, updated, or removed
 */
export function computeGraphDiff(
  oldGraph: GraphData,
  newGraph: GraphData
): GraphDiff {
  const oldNodeIds = new Set(oldGraph.nodes.map(n => n.id));
  const newNodeIds = new Set(newGraph.nodes.map(n => n.id));
  const oldNodeMap = new Map(oldGraph.nodes.map(n => [n.id, n]));
  const newNodeMap = new Map(newGraph.nodes.map(n => [n.id, n]));

  // Find nodes to add (in new but not in old)
  const nodesToAdd = newGraph.nodes.filter(n => !oldNodeIds.has(n.id));

  // Find nodes to remove (in old but not in new)
  const nodesToRemove = oldGraph.nodes
    .filter(n => !newNodeIds.has(n.id))
    .map(n => n.id);

  // Find nodes to update (in both, but properties changed)
  // For now, we'll only update if title or other non-position properties changed
  // We preserve position (x, y) from old nodes
  const nodesToUpdate: GraphNode[] = [];
  for (const newNode of newGraph.nodes) {
    if (oldNodeIds.has(newNode.id)) {
      const oldNode = oldNodeMap.get(newNode.id)!;
      // Check if non-position properties changed
      if (
        oldNode.title !== newNode.title ||
        oldNode.label !== newNode.label ||
        JSON.stringify(oldNode.color) !== JSON.stringify(newNode.color)
      ) {
        // Preserve position from old node if it exists
        const updatedNode: GraphNode = {
          ...newNode,
          x: oldNode.x,
          y: oldNode.y,
        };
        nodesToUpdate.push(updatedNode);
      }
    }
  }

  // For edges, use a simple string ID: "from-to"
  const oldEdgeIds = new Set(
    oldGraph.edges.map(e => `${e.from}-${e.to}`)
  );
  const newEdgeIds = new Set(
    newGraph.edges.map(e => `${e.from}-${e.to}`)
  );
  const oldEdgeMap = new Map(
    oldGraph.edges.map(e => [`${e.from}-${e.to}`, e])
  );

  // Find edges to add
  const edgesToAdd = newGraph.edges.filter(
    e => !oldEdgeIds.has(`${e.from}-${e.to}`)
  );

  // Find edges to remove
  const edgesToRemove = oldGraph.edges
    .filter(e => !newEdgeIds.has(`${e.from}-${e.to}`))
    .map(e => `${e.from}-${e.to}`);

  return {
    nodesToAdd,
    nodesToUpdate,
    nodesToRemove,
    edgesToAdd,
    edgesToRemove,
  };
}

