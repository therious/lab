/**
 * Utility to update node tooltips after dictionary loads
 * Not React-specific - can be used in any context
 */

import { getRootTooltipSync } from '../roots/loadDictionary';
import type { VisNetworkInstance } from './nodeSearch';
import type { GraphData, Root } from '../roots/types';

export interface NodeTooltipUpdate {
  nodeId: number;
  title: string;
}

/**
 * Generate tooltip updates for all nodes in the graph
 * Maps node IDs to root IDs and generates updated tooltips
 */
export function generateTooltipUpdates(
  graph: GraphData,
  nodeIdToRootId: Map<number, number>,
  allRoots: Root[]
): NodeTooltipUpdate[] {
  const updates: NodeTooltipUpdate[] = [];

  graph.nodes.forEach(node => {
    const rootId = nodeIdToRootId.get(node.id);
    if (!rootId) return;

    const root = allRoots.find(r => r.id === rootId);
    if (!root) return;

    // Generate updated tooltip with dictionary data
    const tooltip = getRootTooltipSync(rootId, root.d);
    const definition = root.d;
    
    // Format: rootId: definition (then examples if available)
    let tooltipWithId: string;
    if (tooltip === definition) {
      // No examples, just definition
      tooltipWithId = `${rootId}: ${definition}`;
    } else {
      // Has examples, replace the definition part with "rootId: definition"
      tooltipWithId = tooltip.replace(definition, `${rootId}: ${definition}`);
    }

    // Only update if tooltip has changed (has examples now)
    if (tooltipWithId !== node.title) {
      updates.push({
        nodeId: node.id,
        title: tooltipWithId,
      });
    }
  });

  return updates;
}

/**
 * Apply tooltip updates to vis-network instance
 * Uses the same pattern as node color updates to avoid interrupting animation
 */
export function applyTooltipUpdates(
  network: VisNetworkInstance,
  updates: NodeTooltipUpdate[]
): void {
  if (updates.length === 0) return;

  try {
    const nodesDataSet = network.body.data.nodes;
    
    // Temporarily disable stabilization to prevent animation interruption
    if (network.setOptions) {
      network.setOptions({ physics: { stabilization: { enabled: false } } });
    }
    
    // Batch all updates into a single call
    const updateData = updates.map(({ nodeId, title }) => ({ id: nodeId, title }));
    nodesDataSet.update(updateData);
    
    // Re-enable stabilization after a brief delay
    if (network.setOptions) {
      requestAnimationFrame(() => {
        if (network.setOptions) {
          network.setOptions({ physics: { stabilization: { enabled: true } } });
        }
      });
    }
  } catch (error) {
    console.error('Error updating node tooltips:', error);
  }
}

