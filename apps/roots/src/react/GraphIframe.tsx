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
  iframeRef?: React.RefObject<{ setPhysics: (enabled: boolean) => void; updateTooltips: (updates: Array<{ id: number; title: string }>) => void; recenter: () => void; toggleNonMatchedNodes: (hide: boolean) => void }>;
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
    let graphData = { nodes: [], edges: [], hiddenNodes: [], hiddenEdges: [] };
    let networkInstance = null;
    let currentPhysicsEnabled = true; // Track physics state separately
    const container = document.getElementById('root');

    // Notify parent that iframe is ready as soon as script loads
    // This allows parent to send graph data even if network isn't created yet
    console.log('[iframe] Script loaded, sending iframeReady message');
    window.parent.postMessage({ type: 'iframeReady' }, '*');

    // Function to compute and apply incremental graph updates
    function applyIncrementalGraphUpdate(newGraphData) {
      if (!networkInstance) {
        return false; // Network not ready, will be created in initial setup
      }

      // Compute diff between current and new graph
      const oldNodes = networkInstance.body.data.nodes.get();
      const oldEdges = networkInstance.body.data.edges.get();
      const oldGraph = { nodes: oldNodes, edges: oldEdges };
      
      // Find differences
      const nodesToAdd = newGraphData.nodes.filter(newNode => 
        !oldNodes.find(oldNode => oldNode.id === newNode.id)
      );
      const nodesToRemove = oldNodes.filter(oldNode => 
        !newGraphData.nodes.find(newNode => newNode.id === oldNode.id)
      ).map(n => n.id);
      
      // For nodes that exist in both, preserve position but update other properties
      const nodesToUpdate = newGraphData.nodes
        .filter(newNode => oldNodes.find(oldNode => oldNode.id === newNode.id))
        .map(newNode => {
          const oldNode = oldNodes.find(n => n.id === newNode.id);
          return {
            ...newNode,
            x: oldNode.x, // Preserve x position
            y: oldNode.y, // Preserve y position
          };
        });

      const edgesToAdd = newGraphData.edges.filter(function(newEdge) {
        return !oldEdges.find(function(oldEdge) {
          return oldEdge.from === newEdge.from && oldEdge.to === newEdge.to;
        });
      });
      // For edges, vis-network auto-generates IDs, so we need to use the actual edge objects
      // Filter edges that should be removed and get their IDs from the DataSet
      const edgesToRemove = oldEdges
        .filter(function(oldEdge) {
          return !newGraphData.edges.find(function(newEdge) {
            return newEdge.from === oldEdge.from && newEdge.to === oldEdge.to;
          });
        })
        .map(function(e) { return e.id; }); // vis-network always provides an id

      console.log('[iframe] Incremental update - edges to add:', edgesToAdd.length, 'edges to remove:', edgesToRemove.length, 'total new edges:', newGraphData.edges.length, 'total old edges:', oldEdges.length);

      // Apply incremental updates
      if (nodesToRemove.length > 0) {
        networkInstance.body.data.nodes.remove(nodesToRemove);
      }
      if (nodesToAdd.length > 0) {
        networkInstance.body.data.nodes.add(nodesToAdd);
      }
      if (nodesToUpdate.length > 0) {
        networkInstance.body.data.nodes.update(nodesToUpdate);
      }
      if (edgesToRemove.length > 0) {
        networkInstance.body.data.edges.remove(edgesToRemove);
      }
      if (edgesToAdd.length > 0) {
        networkInstance.body.data.edges.add(edgesToAdd);
      }

      // Update graphData reference, preserving hidden nodes/edges if they exist
      graphData = {
        nodes: newGraphData.nodes,
        edges: newGraphData.edges,
        hiddenNodes: graphData.hiddenNodes || [],
        hiddenEdges: graphData.hiddenEdges || []
      };
      
      return true; // Successfully applied incrementally
    }

    // Listen for messages from parent
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'updateGraph' && event.data.payload) {
        const newGraphData = event.data.payload;
        console.log('[iframe] Received graph data:', newGraphData.nodes.length, 'nodes,', newGraphData.edges.length, 'edges');
        if (networkInstance) {
          // Try incremental update first to preserve node positions
          const applied = applyIncrementalGraphUpdate(newGraphData);
          if (!applied) {
            // Fallback to full update if incremental failed
            // Use stored physics state
            networkInstance.setData({ nodes: new vis.DataSet(newGraphData.nodes), edges: new vis.DataSet(newGraphData.edges) });
            // Restore physics state
            networkInstance.setOptions({ 
              physics: {
                enabled: currentPhysicsEnabled,
                stabilization: { enabled: false }
              }
            });
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
              color: {
                color: 'yellow',
                highlight: 'orange',
                hover: 'orange'
              },
              width: 2,
              arrows: { to: { enabled: false }, from: { enabled: false } },
              smooth: {
                type: 'continuous',
                roundness: 0.5
              }
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
          networkInstance.on('hoverNode', function(params) {
            const nodeId = params.node;
            const node = graphData.nodes.find(function(n) { return n.id === nodeId; });
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
        if (event.data.payload && event.data.payload.nodeColors) {
          const nodeColors = event.data.payload.nodeColors;
          console.log('[iframe] Received node color updates:', nodeColors.length, 'nodes');
          if (networkInstance) {
            // vis-network needs the full color object structure
            const updates = nodeColors.map(function(item) {
              return {
                id: item.id,
                color: {
                  background: item.color.background || 'white',
                  border: item.color.border || 'cyan',
                  highlight: {
                    background: item.color.highlight?.background || item.color.background || 'pink',
                    border: item.color.highlight?.border || 'red'
                  }
                }
              };
            });
            console.log('[iframe] Updating', updates.length, 'nodes with colors');
            networkInstance.body.data.nodes.update(updates);
          }
        }
      } else if (event.data.type === 'updateTooltips') {
        // Update node tooltips
        if (event.data.payload && event.data.payload.updates) {
          const updates = event.data.payload.updates;
          if (networkInstance) {
            networkInstance.body.data.nodes.update(updates);
          }
        }
      } else if (event.data.type === 'setPhysics') {
        // Toggle physics
        if (event.data.payload) {
          const enabled = event.data.payload.enabled;
          currentPhysicsEnabled = enabled; // Update stored state
          if (networkInstance) {
            networkInstance.setOptions({
              physics: {
                enabled: enabled,
                stabilization: { enabled: false }
              }
            });
          }
        }
      } else if (event.data.type === 'recenter') {
        // Recenter and fit all nodes to view
        if (networkInstance) {
          networkInstance.fit({
            animation: {
              duration: 500,
              easingFunction: 'easeInOutQuad'
            }
          });
        }
      } else if (event.data.type === 'toggleNonMatchedNodes') {
        // Hide or show non-search-matched nodes
        // This actually removes/adds nodes from the DataSet so physics recalculates
        if (event.data.payload) {
          const hide = event.data.payload.hide;
          const matchedNodeIds = event.data.payload.matchedNodeIds || [];
          console.log('[iframe] toggleNonMatchedNodes:', hide, 'matched:', matchedNodeIds.length);
          if (networkInstance) {
            const allNodes = networkInstance.body.data.nodes.get();
            const allEdges = networkInstance.body.data.edges.get();
            
            if (hide) {
              // Hide non-matched nodes: remove them from the DataSet
              const nodesToHide = allNodes.filter(function(node) {
                return matchedNodeIds.indexOf(node.id) === -1;
              }).map(function(n) { return n.id; });
              
              // Also remove edges connected to hidden nodes
              const edgesToRemove = allEdges.filter(function(edge) {
                return nodesToHide.indexOf(edge.from) !== -1 || nodesToHide.indexOf(edge.to) !== -1;
              }).map(function(e) { return e.id; });
              
              console.log('[iframe] Hiding', nodesToHide.length, 'nodes and', edgesToRemove.length, 'edges');
              
              if (edgesToRemove.length > 0) {
                networkInstance.body.data.edges.remove(edgesToRemove);
              }
              if (nodesToHide.length > 0) {
                networkInstance.body.data.nodes.remove(nodesToHide);
              }
              
              // Store hidden nodes/edges for later restoration
              graphData.hiddenNodes = allNodes.filter(function(node) {
                return nodesToHide.indexOf(node.id) !== -1;
              });
              graphData.hiddenEdges = allEdges.filter(function(edge) {
                return edgesToRemove.indexOf(edge.id) !== -1;
              });
            } else {
              // Show all nodes: restore hidden nodes and edges
              if (graphData.hiddenNodes && graphData.hiddenNodes.length > 0) {
                console.log('[iframe] Restoring', graphData.hiddenNodes.length, 'nodes and', graphData.hiddenEdges ? graphData.hiddenEdges.length : 0, 'edges');
                if (graphData.hiddenEdges && graphData.hiddenEdges.length > 0) {
                  networkInstance.body.data.edges.add(graphData.hiddenEdges);
                }
                networkInstance.body.data.nodes.add(graphData.hiddenNodes);
                graphData.hiddenNodes = [];
                graphData.hiddenEdges = [];
              }
            }
            
            // Auto-recenter after toggling
            setTimeout(function() {
              if (networkInstance) {
                networkInstance.fit({
                  animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuad'
                  }
                });
              }
            }, 100);
          }
        }
      }
    });

    // Handle tooltip result
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'tooltipResult' && event.data.payload) {
        const rootId = event.data.payload.rootId;
        const tooltip = event.data.payload.tooltip;
        // Update node tooltip
        if (networkInstance) {
          const node = graphData.nodes.find(function(n) { return n.id === rootId; });
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
      // Fallback: send graph data when iframe loads, even if iframeReady message isn't received
      const onLoadHandler = () => {
        console.log('[GraphIframe] Iframe loaded event fired');
        setTimeout(() => {
          if (iframeRef.current?.contentWindow && graph && graph.nodes.length > 0) {
            console.log('[GraphIframe] Fallback: Sending graph data after iframe load, nodes:', graph.nodes.length);
            iframeReadyRef.current = true; // Mark as ready
            iframeRef.current.contentWindow.postMessage({
              type: 'updateGraph',
              payload: graph
            }, '*');
          } else {
            console.log('[GraphIframe] Fallback: Cannot send - iframe:', !!iframeRef.current?.contentWindow, 'graph:', !!graph, 'nodes:', graph?.nodes?.length || 0);
          }
        }, 1000); // Wait 1s for iframe script to initialize
      };
      
      iframeRef.current.addEventListener('load', onLoadHandler);
      iframeRef.current.src = url;
      
      return () => {
        if (iframeRef.current) {
          iframeRef.current.removeEventListener('load', onLoadHandler);
        }
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
      };
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [graph]);

  // Store tooltip request handler ref to send responses back
  const tooltipRequestHandlerRef = useRef<((rootId: number, definition: string) => void) | null>(null);
  tooltipRequestHandlerRef.current = onTooltipRequest || null;

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log all messages for debugging
      if (event.data && event.data.type) {
        console.log('[GraphIframe] Received message:', event.data.type, 'from origin:', event.origin, 'source:', event.source === iframeRef.current?.contentWindow);
      }

      // Accept iframeReady from any origin (blob URLs can have different origins)
      if (event.data && event.data.type === 'iframeReady') {
        // Verify it's from our iframe by checking if we have the iframe ref
        if (!iframeRef.current) {
          return;
        }
        console.log('[GraphIframe] Iframe ready message received, graph has', graph?.nodes?.length || 0, 'nodes');
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
      } else if (event.data && event.data.type === 'tooltipRequest') {
        // Only process tooltip requests from our iframe
        const isFromOurIframe = iframeRef.current && event.source === iframeRef.current.contentWindow;
        if (!isFromOurIframe) {
          return;
        }
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
    if (iframeReadyRef.current && iframeRef.current?.contentWindow && nodeColors && nodeColors.length > 0) {
      console.log('[GraphIframe] Sending node color updates:', nodeColors.length, 'nodes');
      iframeRef.current.contentWindow.postMessage({
        type: 'updateNodeColors',
        payload: { nodeColors }
      }, '*');
    }
  }, [nodeColors]);

  // Expose methods via ref if provided
  useEffect(() => {
    if (externalRef) {
      (externalRef as React.MutableRefObject<{ setPhysics: (enabled: boolean) => void; updateTooltips: (updates: Array<{ id: number; title: string }>) => void; recenter: () => void; toggleNonMatchedNodes: (hide: boolean, matchedNodeIds: number[]) => void }>).current = {
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
        },
        recenter: () => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'recenter',
              payload: {}
            }, '*');
          }
        },
        toggleNonMatchedNodes: (hide: boolean, matchedNodeIds: number[]) => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'toggleNonMatchedNodes',
              payload: { hide, matchedNodeIds }
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


