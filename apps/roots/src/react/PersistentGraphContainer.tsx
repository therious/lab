/**
 * Persistent Graph Container - keeps iframe alive across route changes
 * This component is always mounted at the App level
 */

import React, { useRef, useEffect } from 'react';
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

export const PersistentGraphContainer: React.FC = () => {
  const graph = useSelector((s) => s.visualization?.graph || { nodes: [], edges: [] }) as GraphData;
  const nodeColors = useSelector((s) => s.visualization?.nodeColors || []);
  
  // Keep iframe mounted but hidden when not on visualization route
  // The iframe will be shown/hidden via CSS in RtStarView
  return (
    <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
      <GraphIframe
        graph={graph}
        nodeColors={nodeColors}
        iframeRef={persistentGraphIframeRef}
        iframeElementRef={persistentGraphIframeElementRef}
        onReady={() => {
          console.log('[PersistentGraphContainer] Iframe ready');
        }}
        onTooltipRequest={(rootId, definition) => {
          // Tooltip requests will be handled by RtStarView
          console.log('[PersistentGraphContainer] Tooltip request for rootId:', rootId);
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

