/**
 * Shared type definitions for the roots application
 */

export type Root = {
  L: string;
  E: string;
  P: string;
  id: number;
  d: string;
  r: string;
  generation?: number;
};

export type RootData = Root & {
  examples: string;
};

export type GraphNode = {
  id: number;
  label: string;
  title: string;
  font?: { multi: boolean };
  color?: {
    background: string;
    border: string;
    highlight: {
      background: string;
      border: string;
    };
  };
};

export type GraphEdge = {
  from: number;
  to: number;
  color?: string;
  width?: number;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

