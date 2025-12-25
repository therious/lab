/**
 * Graph Iframe Component
 * Creates a blob URL iframe for isolated graph rendering
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { GraphData } from '../roots/types';

interface GraphIframeProps {
  graph: GraphData;
  onReady?: () => void;
  onTooltipRequest?: (rootId: number, definition: string) => void;
  nodeColors?: Array<{ id: number; color: { background: string } }>;
  iframeRef?: React.RefObject<{ setPhysics: (enabled: boolean) => void; updateTooltips: (updates: Array<{ id: number; title: string }>) => void }>;
  iframeElementRef?: React.RefObject<HTMLIFrameElement | null>;
  style?: React.CSSProperties;
}

export const GraphIframe: React.FC<GraphIframeProps> = ({ graph, onReady, onTooltipRequest, nodeColors, iframeRef: externalRef, iframeElementRef: externalElementRef, style }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const iframeReadyRef = useRef<boolean>(false);

  // Expose iframe element ref to parent
  useEffect(() => {
    if (externalElementRef) {
      (externalElementRef as React.MutableRefObject<HTMLIFrameElement | null>).current = iframeRef.current;
    }
  }, [externalElementRef]);

  // Create blob URL with iframe content - only once, don't recreate on graph changes
  useEffect(() => {
    // If blob URL already exists, don't recreate
    if (blobUrlRef.current) {
      return;
    }

    const iframeHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Graph Visualization</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: midnightblue;
    }
    #root {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/vis-network@latest/standalone/umd/vis-network.min.js"></script>
  <link href="https://unpkg.com/vis-network@latest/styles/vis-network.min.css" rel="stylesheet" type="text/css" />
  <script>
    let graphData = { nodes: [], edges: [] };
    let networkInstance = null;
    const container = document.getElementById('root');

    // Notify parent that iframe is ready as soon as script loads
    // This allows parent to send graph data even if network isn't created yet
    console.log('[iframe] Script loaded, sending iframeReady message');
    window.parent.postMessage({ type: 'iframeReady' }, '*');

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'updateGraph') {
        graphData = event.data.payload;
        console.log('[iframe] Received graph data:', graphData.nodes.length, 'nodes,', graphData.edges.length, 'edges');
        if (networkInstance) {
          // Update existing network without recreating - preserve physics state and view
          const currentPhysics = networkInstance.getOptions().physics;
          networkInstance.setData({ nodes: new vis.DataSet(graphData.nodes), edges: new vis.DataSet(graphData.edges) });
          // Restore physics state after update
          if (currentPhysics) {
            networkInstance.setOptions({ physics: currentPhysics });
          }
        } else {
          // Initial setup
          const data = { nodes: new vis.DataSet(graphData.nodes), edges: new vis.DataSet(graphData.edges) };
          const options = {
            width: '100%',
            height: '100%',
            nodes: {
              color: {
                background: 'white',
                border: 'cyan',
                highlight: {
                  background: 'pink',
                  border: 'red'
                }
              },
              shape: 'circle'
            },
            edges: {
              color: 'yellow',
              width: 1,
              arrows: { to: { enabled: false }, from: { enabled: false } }
            },
            interaction: {
              keyboard: { speed: { x: 10, y: 10, zoom: 0.02 } },
              dragNodes: true,
              dragView: true,
              zoomView: true
            },
            layout: { improvedLayout: true },
            configure: { enabled: false },
            physics: {
              enabled: true,
              stabilization: { enabled: false }
            }
          };
          networkInstance = new vis.Network(container, data, options);
          console.log('[iframe] Network instance created with', graphData.nodes.length, 'nodes');
          
          // Handle node hover for tooltip requests
          networkInstance.on('hoverNode', (params) => {
            const nodeId = params.node;
            const node = graphData.nodes.find(n => n.id === nodeId);
            if (node && node.title && !node.title.includes('Example words')) {
              // Request tooltip from parent if not already enriched
              window.parent.postMessage({
                type: 'tooltipRequest',
                payload: { rootId: nodeId, definition: node.title }
              }, '*');
            }
          });
        }
      } else if (event.data.type === 'updateNodeColors') {
        // Update node colors for search highlighting
        const { nodeColors } = event.data.payload;
        if (networkInstance && nodeColors) {
          const updates = nodeColors.map(({ id, color }) => ({ id, color }));
          networkInstance.body.data.nodes.update(updates);
        }
      } else if (event.data.type === 'updateTooltips') {
        // Update node tooltips
        const { updates } = event.data.payload;
        if (networkInstance && updates) {
          networkInstance.body.data.nodes.update(updates);
        }
      } else if (event.data.type === 'setPhysics') {
        // Toggle physics
        const { enabled } = event.data.payload;
        if (networkInstance) {
          networkInstance.setOptions({
            physics: {
              enabled: enabled,
              stabilization: { enabled: false }
            }
          });
        }
      }
    });

    // Handle tooltip result
    window.addEventListener('message', (event) => {
      if (event.data.type === 'tooltipResult') {
        const { rootId, tooltip } = event.data.payload;
        // Update node tooltip
        if (networkInstance) {
          const node = graphData.nodes.find(n => n.id === rootId);
          if (node) {
            node.title = tooltip;
            networkInstance.body.data.nodes.update([node]);
          }
        }
      }
    });
  </script>
</body>
</html>
    `;

    const blob = new Blob([iframeHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Store tooltip request handler ref to send responses back
  const tooltipRequestHandlerRef = useRef<((rootId: number, definition: string) => void) | null>(null);
  tooltipRequestHandlerRef.current = onTooltipRequest || null;

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (event.data.type === 'iframeReady') {
        console.log('[GraphIframe] Iframe ready, graph has', graph?.nodes?.length || 0, 'nodes');
        iframeReadyRef.current = true;
        if (onReady) {
          onReady();
        }
        // Send initial graph data immediately when iframe is ready
        // The iframe sends this message only after it's fully initialized
        if (iframeRef.current?.contentWindow && graph && graph.nodes.length > 0) {
          console.log('[GraphIframe] Sending graph data to iframe:', graph.nodes.length, 'nodes');
          iframeRef.current.contentWindow.postMessage({
            type: 'updateGraph',
            payload: graph
          }, '*');
        } else {
          console.log('[GraphIframe] Not sending graph - iframe:', !!iframeRef.current?.contentWindow, 'graph:', !!graph, 'nodes:', graph?.nodes?.length || 0);
        }
      } else if (event.data.type === 'tooltipRequest') {
        const { rootId, definition } = event.data.payload;
        if (tooltipRequestHandlerRef.current) {
          tooltipRequestHandlerRef.current(rootId, definition);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [graph, onReady]);

  // Update graph when it changes - only send if iframe is ready and graph has nodes
  // This handles the case where graph is computed after iframe becomes ready
  useEffect(() => {
    if (iframeReadyRef.current && iframeRef.current?.contentWindow && graph && graph.nodes.length > 0) {
      console.log('[GraphIframe] Graph changed, sending update:', graph.nodes.length, 'nodes');
      iframeRef.current.contentWindow.postMessage({
        type: 'updateGraph',
        payload: graph
      }, '*');
    } else {
      console.log('[GraphIframe] Not sending graph update - ready:', iframeReadyRef.current, 'hasWindow:', !!iframeRef.current?.contentWindow, 'hasGraph:', !!graph, 'nodes:', graph?.nodes?.length || 0);
    }
  }, [graph]);

  // Update node colors when they change (for search highlighting)
  useEffect(() => {
    if (iframeRef.current?.contentWindow && nodeColors) {
      iframeRef.current.contentWindow.postMessage({
        type: 'updateNodeColors',
        payload: { nodeColors }
      }, '*');
    }
  }, [nodeColors]);

  // Expose methods via ref if provided
  useEffect(() => {
    if (externalRef) {
      (externalRef as React.MutableRefObject<{ setPhysics: (enabled: boolean) => void; updateTooltips: (updates: Array<{ id: number; title: string }>) => void }>).current = {
        setPhysics: (enabled: boolean) => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'setPhysics',
              payload: { enabled }
            }, '*');
          }
        },
        updateTooltips: (updates: Array<{ id: number; title: string }>) => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'updateTooltips',
              payload: { updates }
            }, '*');
          }
        }
      };
    }
  }, [externalRef]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        ...style
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};


