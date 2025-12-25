/**
 * Generic utilities for node search functionality
 * Not React-specific - can be used in any context
 */

export interface VisNetworkInstance {
  body: {
    data: {
      nodes: {
        update: (node: { id: number; color?: NodeColor } | Array<{ id: number; color?: NodeColor }>) => void;
      };
    };
  };
  setOptions?: (options: { physics?: { stabilization?: { enabled?: boolean } } }) => void;
}

export type NodeColor = {
  background: string;
  border: string;
  highlight: {
    background: string;
    border: string;
  };
};

export type NodeColorUpdate = {
  nodeId: number;
  color: NodeColor;
};

/**
 * Apply node color updates to vis-network instance
 * Temporarily disables stabilization to prevent animation interruption
 */
export function applyNodeColors(
  network: VisNetworkInstance,
  nodeColors: NodeColorUpdate[]
): void {
  try {
    const nodesDataSet = network.body.data.nodes;
    
    // Temporarily disable stabilization to prevent animation interruption
    // This allows physics to continue running while we update colors
    if (network.setOptions) {
      network.setOptions({ physics: { stabilization: { enabled: false } } });
    }
    
    // Batch all updates into a single call to prevent multiple physics recalculations
    // DataSet.update() accepts an array, which is more efficient and doesn't interrupt animation
    const updates = nodeColors.map(({ nodeId, color }) => ({ id: nodeId, color }));
    nodesDataSet.update(updates);
    
    // Re-enable stabilization after a brief delay to allow updates to complete
    // The physics simulation continues running, we're just preventing stabilization restart
    if (network.setOptions) {
      // Use requestAnimationFrame to ensure updates are applied before re-enabling
      requestAnimationFrame(() => {
        if (network.setOptions) {
          network.setOptions({ physics: { stabilization: { enabled: true } } });
        }
      });
    }
  } catch (error) {
    console.error('Error updating node colors:', error);
  }
}

/**
 * Create a search request message for the worker
 */
export function createSearchRequest(searchId: number, searchTerm: string): {
  type: 'search';
  payload: {
    searchId: number;
    searchTerm: string;
  };
} {
  return {
    type: 'search',
    payload: {
      searchId,
      searchTerm,
    },
  };
}

/**
 * Check if search result should be applied (based on search ID)
 */
export function shouldApplySearchResult(
  resultSearchId: number,
  currentSearchId: number
): boolean {
  return resultSearchId === currentSearchId;
}

export interface NodeSearchState {
  searchIdRef: { current: number };
  searchDebounceTimeoutRef: { current: NodeJS.Timeout | null };
  networkRef: { current: VisNetworkInstance | null };
  workerRef: { current: Worker | null };
  graph: { nodes: unknown[] };
}

/**
 * Setup debounced search effect
 * Returns cleanup function
 */
export function setupDebouncedSearch(
  state: NodeSearchState,
  searchTerm: string,
  onSearch: (term: string) => void
): () => void {
  // Clear any pending search timeout
  if (state.searchDebounceTimeoutRef.current) {
    clearTimeout(state.searchDebounceTimeoutRef.current);
    state.searchDebounceTimeoutRef.current = null;
  }

  // Only search if we have nodes and a worker
  if (!state.graph.nodes || state.graph.nodes.length === 0 || !state.workerRef.current) {
    return () => {};
  }

  // Debounce the search - wait for user to stop typing
  state.searchDebounceTimeoutRef.current = setTimeout(() => {
    if (searchTerm !== undefined) {
      onSearch(searchTerm);
    }
  }, 300); // 300ms debounce

  // Return cleanup function to cancel pending search
  return () => {
    if (state.searchDebounceTimeoutRef.current) {
      clearTimeout(state.searchDebounceTimeoutRef.current);
      state.searchDebounceTimeoutRef.current = null;
    }
  };
}

/**
 * Trigger search in worker
 */
export function triggerSearch(
  state: NodeSearchState,
  term: string
): void {
  if (!state.workerRef.current) return;

  // Cancel previous search by incrementing ID
  state.searchIdRef.current += 1;
  const currentSearchId = state.searchIdRef.current;

  // Send search request using generic utility
  const message = createSearchRequest(currentSearchId, term);
  state.workerRef.current.postMessage(message);
}

