/**
 * React hook wrapper for graph computation worker
 * Uses generic utilities from utils/graphWorker.ts
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { GraphData } from '../roots/types';
import {
  createGraphWorker,
  setupWorkerMessageHandler,
  sendComputeRequest,
  type GenerationRange,
  type TooltipCounts,
  type GraphComputePayload,
  type PendingGraphData,
} from '../utils/graphWorker';

export type { GraphComputePayload };
export interface UseGraphWorkerResult {
  workerRef: React.MutableRefObject<Worker | null>;
  computationIdRef: React.MutableRefObject<number>;
  isComputing: boolean;
  graph: GraphData;
  tooltipCounts: TooltipCounts;
  nodeIdToRootIdRef: React.MutableRefObject<Map<number, number>>;
  computeGraph: (payload: GraphComputePayload) => void;
  setSearchResultHandler: (handler: (searchId: number, nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>) => void) => void;
}

export function useGraphWorker(): UseGraphWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const computationIdRef = useRef<number>(0);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [generationRange, setGenerationRange] = useState<GenerationRange>({ min: 1, max: 1 });
  const [tooltipCounts, setTooltipCounts] = useState<TooltipCounts>({ n: 0, x: 0, w: 0, y: 0, q: 0, pruneRemoved: 0 });
  const pendingGraphDataRef = useRef<PendingGraphData | null>(null);
  const graphUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeIdToRootIdRef = useRef<Map<number, number>>(new Map());
  const searchResultHandlerRef = useRef<((searchId: number, nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>) => void) | null>(null);

  // Graph state is kept in worker memory, not Redux

  // Initialize worker using generic utility with state management
  useEffect(() => {
    workerRef.current = createGraphWorker();

    const cleanup = setupWorkerMessageHandler(
      workerRef.current,
      {
        computationIdRef, pendingGraphDataRef, graphUpdateTimeoutRef, nodeIdToRootIdRef,
        setIsComputing, setTooltipCounts, setGraph, setGenerationRange,
        onSearchResult: (searchId, nodeColors) => {
          if (searchResultHandlerRef.current)
            searchResultHandlerRef.current(searchId, nodeColors);
        },
      }
    );

    return cleanup;
  }, [setIsComputing, setTooltipCounts, setGraph, setGenerationRange]);

  const computeGraph = useCallback((payload: GraphComputePayload): void => {
    if (!workerRef.current)
      return;

    setIsComputing(true);
    // Note: computationIdRef.current is incremented in the caller before calling this
    sendComputeRequest(workerRef.current, payload);
  }, []);

  const setSearchResultHandler = useCallback((handler: (searchId: number, nodeColors: Array<{ nodeId: number; color: { background: string; border: string; highlight: { background: string; border: string } } }>) => void): void => {
    searchResultHandlerRef.current = handler;
  }, []);

  return {
    workerRef,
    computationIdRef,
    isComputing,
    graph,
    tooltipCounts,
    nodeIdToRootIdRef,
    computeGraph,
    setSearchResultHandler,
  };
}

