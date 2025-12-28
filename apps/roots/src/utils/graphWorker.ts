/**
 * Generic utilities for graph computation worker management
 * Not React-specific - can be used in any context
 */

import type { GraphData } from '../roots/types';

export type GenerationRange = {
  min: number;
  max: number;
};

export type TooltipCounts = {
  n: number; // Grid filter count
  x: number; // Roots added by similar meanings (not in grid filter)
  w: number; // Roots added only by extra degrees (not in grid filter or similar meanings)
  y: number; // Total roots after all processing
  q: number; // Roots with no edges (for Remove Free)
  pruneRemoved: number; // Number of edges removed by pruning
  // Pipeline stage metrics
  afterMischalfim?: { nodes: number; edges: number }; // After grid filter + mischalfim checkboxes
  meaningStage?: { nodesAdded: number; edgesAdded: number }; // Link by Meaning stage
  extraDegreesStage?: { nodesAdded: number; edgesAdded: number }; // Extra Degrees stage
  pruneStage?: { edgesRemoved: number }; // Prune by Grade stage
  removeFreeStage?: { nodesRemoved: number }; // Remove Free stage
};

export type GraphComputePayload = {
  computationId: number;
  filteredRoots: unknown[];
  allRoots: unknown[];
  linkByMeaningThreshold: number;
  maxGeneration: number;
  mischalfim: unknown[];
  otherChoices: unknown;
  maxNodes: number;
  maxEdges: number;
  pruneByGradeThreshold: number;
  maxNodesForExpansion: number;
};

export type GraphComputeResult = {
  computationId: number;
  data: GraphData;
  nodeMax: number;
  edgeMax: number;
  generationRange: GenerationRange;
  nodeIdToRootId: [number, number][];
  tooltipCounts: TooltipCounts;
};

export type SearchResult = {
  searchId: number;
  nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>;
};

export type WorkerMessage =
  | { type: 'result'; payload: GraphComputeResult }
  | { type: 'searchResult'; payload: SearchResult }
  | { type: 'error'; payload: { error: unknown } };

export type PendingGraphData = {
  data: GraphData;
  generationRange: GenerationRange;
  nodeIdToRootId: [number, number][];
  tooltipCounts: TooltipCounts;
};

export interface GraphWorkerState {
  computationIdRef: { current: number };
  pendingGraphDataRef: { current: PendingGraphData | null };
  graphUpdateTimeoutRef: { current: NodeJS.Timeout | null };
  nodeIdToRootIdRef: { current: Map<number, number> };
  setIsComputing: (value: boolean) => void;
  setTooltipCounts: (value: TooltipCounts) => void;
  setGraph: (value: GraphData) => void;
  setGenerationRange: (value: GenerationRange) => void;
  onSearchResult?: (searchId: number, nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>) => void;
}

/**
 * Initialize a graph computation worker
 */
export function createGraphWorker(): Worker {
  return new Worker(
    new URL('../worker/graphWorker.ts', import.meta.url),
    { type: 'module' }
  );
}

/**
 * Setup message handler for graph worker with internal state management
 */
export function setupWorkerMessageHandler(worker: Worker, state: GraphWorkerState): () => void
{
    const handler = (e: MessageEvent<WorkerMessage>): void => {
    if (e.data.type === 'result') {
      const result = e.data.payload;
      const processed = processGraphResult(result, state.computationIdRef.current);

      if (!processed || !processed.shouldApply)
        return;

      // Store the computed data but don't render immediately
      state.pendingGraphDataRef.current = processed.data;
      state.setIsComputing(false);

      // Update tooltip counts
      if (processed.data.tooltipCounts)
        state.setTooltipCounts(processed.data.tooltipCounts);

      // Store nodeId to rootId mapping
      state.nodeIdToRootIdRef.current = nodeIdToRootIdArrayToMap(processed.data.nodeIdToRootId);

      // Clear any pending graph update
      if (state.graphUpdateTimeoutRef.current)
        clearTimeout(state.graphUpdateTimeoutRef.current);

      // Update graph visualization with throttling using requestAnimationFrame
      // This batches updates and prevents blocking during rapid slider changes
      requestAnimationFrame(() => {
        state.graphUpdateTimeoutRef.current = setTimeout(() => {
          if (state.pendingGraphDataRef.current) {
            state.setGraph(state.pendingGraphDataRef.current.data);
            state.setGenerationRange(state.pendingGraphDataRef.current.generationRange);
            // Update tooltip counts
            if (state.pendingGraphDataRef.current.tooltipCounts)
              state.setTooltipCounts(state.pendingGraphDataRef.current.tooltipCounts);
            // Update mapping
            state.nodeIdToRootIdRef.current = nodeIdToRootIdArrayToMap(state.pendingGraphDataRef.current.nodeIdToRootId);
            state.pendingGraphDataRef.current = null;
          }
        }, 50); // Small delay to batch rapid updates
      });
    } else if (e.data.type === 'searchResult') {
      const result = e.data.payload;
      // Call the registered search result handler if provided
      if (state.onSearchResult)
        state.onSearchResult(result.searchId, result.nodeColors);

    } else if (e.data.type === 'error') {
      console.error('Worker error:', e.data.payload.error);
      state.setIsComputing(false);
    }
  };

  worker.onmessage = handler;

  // Setup error handler
  worker.onerror = (error: ErrorEvent): void => {
    console.error('Worker error:', error);
    state.setIsComputing(false);
  };
  return () => worker.terminate();
}

/**
 * Send computation request to worker
 */
export const sendComputeRequest = (worker: Worker, payload: GraphComputePayload): void =>
  worker.postMessage({type: 'compute', payload,});

/**
 * Process graph computation result
 * Returns the processed data and a flag indicating if it should be applied
 */
export function processGraphResult(result: GraphComputeResult, currentComputationId: number)
  : { shouldApply: boolean; data: PendingGraphData } | null
{
    // Only process if this is the latest computation
    if (result.computationId !== currentComputationId)
      return null;

    const pendingData: PendingGraphData = {
      data: result.data,
      generationRange: result.generationRange,
      nodeIdToRootId: result.nodeIdToRootId,
      tooltipCounts: result.tooltipCounts,
    };

    return { shouldApply: true, data: pendingData };
}

/**
 * Convert nodeIdToRootId array to Map
 */
export function nodeIdToRootIdArrayToMap(nodeIdToRootId: [number, number][]): Map<number, number>
{
  const mapping = new Map<number, number>();
  if (nodeIdToRootId && Array.isArray(nodeIdToRootId))
    nodeIdToRootId.forEach(([nodeId, rootId]: [number, number]) => mapping.set(nodeId, rootId));
  return mapping;
}

