/**
 * Persistent Graph Container - keeps iframe alive across route changes
 * This component is always mounted at the App level
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useSelector } from '../actions-integration';
import { GraphIframe } from './GraphIframe';
import type { GraphData } from '../roots/types';

// Global ref to share iframe instance across components
export const persistentGraphIframeRef = React.createRef<{
  setPhysics: (enabled: boolean) => void;
  updateTooltips: (updates: Array<{ id: number; title: string }>) => void;
  recenter: () => void;
  toggleNonMatchedNodes: (hide: boolean, matchedNodeIds: number[]) => void;
}>();

export const persistentGraphIframeElementRef = React.createRef<HTMLIFrameElement | null>();

// Global tooltip request handler - set by RtStarView
let globalTooltipRequestHandler: ((rootId: number, definition: string) => void) | null = null;

export function setGlobalTooltipRequestHandler(handler: ((rootId: number, definition: string) => void) | null) {
  globalTooltipRequestHandler = handler;
}

export const PersistentGraphContainer: React.FC = () => {
  // Graph state is kept in worker/iframe memory, not Redux
  // This container keeps the iframe alive but doesn't manage graph state
  const graph = { nodes: [], edges: [] } as GraphData;
  const nodeColors: Array<{ id: number; color: { background: string } }> = [];
  
  const handleTooltipRequest = useCallback((rootId: number, definition: string) => {
    if (globalTooltipRequestHandler) {
      globalTooltipRequestHandler(rootId, definition);
    }
  }, []);
  
  // Keep iframe mounted - it will be displayed in RtStarView's layout
  // The iframe persists across route changes, preserving graph state
  return (
    <GraphIframe
      graph={graph}
      nodeColors={nodeColors}
      iframeRef={persistentGraphIframeRef}
      iframeElementRef={persistentGraphIframeElementRef}
      onReady={() => {
        console.log('[PersistentGraphContainer] Iframe ready - graph state will persist across routes');
      }}
      onTooltipRequest={handleTooltipRequest}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}
    />
  );
};

