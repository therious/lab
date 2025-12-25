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
  style?: React.CSSProperties;
}

export const GraphIframe: React.FC<GraphIframeProps> = ({ graph, onReady, onTooltipRequest, style }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Create blob URL with iframe content
  useEffect(() => {
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
  <script type="module">
    import React from 'https://esm.sh/react@18';
    import ReactDOM from 'https://esm.sh/react-dom@18/client';
    import Graph from 'https://esm.sh/react-vis-graph-wrapper@1.0.2';
    import 'https://esm.sh/vis-network@latest/styles/vis-network.css';

    let graphData = { nodes: [], edges: [] };
    let networkInstance = null;

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'updateGraph') {
        graphData = event.data.payload;
        if (networkInstance) {
          networkInstance.body.data.nodes.update(graphData.nodes);
          networkInstance.body.data.edges.update(graphData.edges);
        }
      } else if (event.data.type === 'requestTooltip') {
        const { rootId, definition } = event.data.payload;
        // Request tooltip from parent
        window.parent.postMessage({
          type: 'tooltipRequest',
          payload: { rootId, definition }
        }, '*');
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

    const defaultOptions = {
      width: '2000px',
      height: '2000px',
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
      configure: { enabled: false }
    };

    const events = {
      select: ({ nodes, edges }) => {},
      doubleClick: ({ pointer: { canvas } }) => {},
      init: (network) => {
        networkInstance = network;
        // Notify parent that iframe is ready
        window.parent.postMessage({ type: 'iframeReady' }, '*');
      }
    };

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      React.createElement(Graph, {
        graph: graphData,
        options: defaultOptions,
        events: events,
        style: { backgroundColor: 'midnightblue' }
      })
    );
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

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'iframeReady') {
        if (onReady) {
          onReady();
        }
        // Send initial graph data
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'updateGraph',
            payload: graph
          }, '*');
        }
      } else if (event.data.type === 'tooltipRequest') {
        const { rootId, definition } = event.data.payload;
        if (onTooltipRequest) {
          onTooltipRequest(rootId, definition);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [graph, onReady, onTooltipRequest]);

  // Update graph when it changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow && graph) {
      iframeRef.current.contentWindow.postMessage({
        type: 'updateGraph',
        payload: graph
      }, '*');
    }
  }, [graph]);

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


