/**
 * React hook wrapper for node search functionality
 * Uses generic utilities from utils/nodeSearch.ts
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { GraphData } from '../roots/types';
import {
  applyNodeColors,
  setupDebouncedSearch,
  triggerSearch as triggerSearchUtil,
  type VisNetworkInstance,
  type NodeColorUpdate,
} from '../utils/nodeSearch';
import { actions } from '../actions-integration';

export interface UseNodeSearchResult {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchIdRef: React.MutableRefObject<number>;
  searchDebounceTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  applyNodeColors: (nodeColors: NodeColorUpdate[]) => void;
  triggerSearch: (term: string) => void;
}

export function useNodeSearch(graph: GraphData,
                              networkRef: React.MutableRefObject<VisNetworkInstance | null>,
                              workerRef: React.MutableRefObject<Worker | null>
): UseNodeSearchResult
{
  // Get searchTerm from Redux if available, otherwise use local state
  const [localSearchTerm, setLocalSearchTerm] = useState<string>('');
  const searchTerm = localSearchTerm; // Will be replaced with Redux selector if needed
  const setSearchTerm = useCallback((value: string) => {
    setLocalSearchTerm(value);
    actions.visualization.setSearchTerm(value);
  }, []);
  const searchIdRef = useRef<number>(0);
  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wrapper to apply node colors using generic utility
  const applyNodeColorsWrapper = useCallback((nodeColors: NodeColorUpdate[]): void => {
    if (!networkRef.current) return;
    applyNodeColors(networkRef.current, nodeColors);
  }, [networkRef]);

  // Wrapper to trigger search using generic utility
  const triggerSearch = useCallback((term: string): void =>
      triggerSearchUtil({ searchIdRef, searchDebounceTimeoutRef, networkRef, workerRef, graph }, term)
  , [workerRef, graph]);

  // Debounced search effect - input updates immediately, search is debounced
  useEffect(() => setupDebouncedSearch(
      { searchIdRef, searchDebounceTimeoutRef, networkRef, workerRef, graph },
      searchTerm, triggerSearch)
  , [searchTerm, graph, triggerSearch]);

  return {
    searchTerm, setSearchTerm, searchIdRef, triggerSearch,
    searchDebounceTimeoutRef, applyNodeColors: applyNodeColorsWrapper
  };
}

