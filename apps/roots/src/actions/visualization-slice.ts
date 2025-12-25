import type { GraphData } from '../roots/types';
import type { GenerationRange, TooltipCounts } from '../utils/graphWorker';

export interface VisualizationState {
  graph: GraphData;
  isComputing: boolean;
  generationRange: GenerationRange;
  tooltipCounts: TooltipCounts;
  isPhysicsEnabled: boolean;
  searchTerm: string;
  searchMatchCounts: { definitions: number; examples: number };
  nodeColors: Array<{ id: number; color: { background: string } }>;
  matchedNodeIds: number[];
  hideNonMatched: boolean;
  maxGeneration: number;
  localExtraDegrees: number;
  localPruneByGrade: number;
}

type VisualizationCreator = (...rest: any) => unknown;

type VisualizationReducers = {
  setGraph: (s: VisualizationState, payload: { graph: GraphData }) => VisualizationState;
  setIsComputing: (s: VisualizationState, payload: { isComputing: boolean }) => VisualizationState;
  setGenerationRange: (s: VisualizationState, payload: { generationRange: GenerationRange }) => VisualizationState;
  setTooltipCounts: (s: VisualizationState, payload: { tooltipCounts: TooltipCounts }) => VisualizationState;
  setPhysicsEnabled: (s: VisualizationState, payload: { enabled: boolean }) => VisualizationState;
  setSearchTerm: (s: VisualizationState, payload: { searchTerm: string }) => VisualizationState;
  setSearchMatchCounts: (s: VisualizationState, payload: { searchMatchCounts: { definitions: number; examples: number } }) => VisualizationState;
  setNodeColors: (s: VisualizationState, payload: { nodeColors: Array<{ id: number; color: { background: string } }> }) => VisualizationState;
  setMatchedNodeIds: (s: VisualizationState, payload: { matchedNodeIds: number[] }) => VisualizationState;
  setHideNonMatched: (s: VisualizationState, payload: { hideNonMatched: boolean }) => VisualizationState;
  setMaxGeneration: (s: VisualizationState, payload: { maxGeneration: number }) => VisualizationState;
  setLocalExtraDegrees: (s: VisualizationState, payload: { localExtraDegrees: number }) => VisualizationState;
  setLocalPruneByGrade: (s: VisualizationState, payload: { localPruneByGrade: number }) => VisualizationState;
};

interface SliceConfig {
  name: 'visualization';
  creators: VisualizationCreators;
  initialState: VisualizationState;
}

type VisualizationCreators = {
  setGraph: (graph: GraphData) => { graph: GraphData };
  setIsComputing: (isComputing: boolean) => { isComputing: boolean };
  setGenerationRange: (generationRange: GenerationRange) => { generationRange: GenerationRange };
  setTooltipCounts: (tooltipCounts: TooltipCounts) => { tooltipCounts: TooltipCounts };
  setPhysicsEnabled: (enabled: boolean) => { enabled: boolean };
  setSearchTerm: (searchTerm: string) => { searchTerm: string };
  setSearchMatchCounts: (searchMatchCounts: { definitions: number; examples: number }) => { searchMatchCounts: { definitions: number; examples: number } };
  setNodeColors: (nodeColors: Array<{ id: number; color: { background: string } }>) => { nodeColors: Array<{ id: number; color: { background: string } }> };
  setMatchedNodeIds: (matchedNodeIds: number[]) => { matchedNodeIds: number[] };
  setHideNonMatched: (hideNonMatched: boolean) => { hideNonMatched: boolean };
  setMaxGeneration: (maxGeneration: number) => { maxGeneration: number };
  setLocalExtraDegrees: (localExtraDegrees: number) => { localExtraDegrees: number };
  setLocalPruneByGrade: (localPruneByGrade: number) => { localPruneByGrade: number };
};

const initialState: VisualizationState = {
  graph: { nodes: [], edges: [] },
  isComputing: false,
  generationRange: { min: 1, max: 1 },
  tooltipCounts: { n: 0, x: 0, w: 0, y: 0, q: 0, pruneRemoved: 0 },
  isPhysicsEnabled: true,
  searchTerm: '',
  searchMatchCounts: { definitions: 0, examples: 0 },
  nodeColors: [],
  matchedNodeIds: [],
  hideNonMatched: false,
  maxGeneration: 1,
  localExtraDegrees: 0,
  localPruneByGrade: 0,
};

const creators: VisualizationCreators = {
  setGraph: (graph) => ({ graph }),
  setIsComputing: (isComputing) => ({ isComputing }),
  setGenerationRange: (generationRange) => ({ generationRange }),
  setTooltipCounts: (tooltipCounts) => ({ tooltipCounts }),
  setPhysicsEnabled: (enabled) => ({ enabled }),
  setSearchTerm: (searchTerm) => ({ searchTerm }),
  setSearchMatchCounts: (searchMatchCounts) => ({ searchMatchCounts }),
  setNodeColors: (nodeColors) => ({ nodeColors }),
  setMatchedNodeIds: (matchedNodeIds) => ({ matchedNodeIds }),
  setHideNonMatched: (hideNonMatched) => ({ hideNonMatched }),
  setMaxGeneration: (maxGeneration) => ({ maxGeneration }),
  setLocalExtraDegrees: (localExtraDegrees) => ({ localExtraDegrees }),
  setLocalPruneByGrade: (localPruneByGrade) => ({ localPruneByGrade }),
};

const reducers: VisualizationReducers = {
  setGraph: (s, { graph }) => ({ ...s, graph }),
  setIsComputing: (s, { isComputing }) => ({ ...s, isComputing }),
  setGenerationRange: (s, { generationRange }) => ({ ...s, generationRange }),
  setTooltipCounts: (s, { tooltipCounts }) => ({ ...s, tooltipCounts }),
  setPhysicsEnabled: (s, { enabled }) => ({ ...s, isPhysicsEnabled: enabled }),
  setSearchTerm: (s, { searchTerm }) => ({ ...s, searchTerm }),
  setSearchMatchCounts: (s, { searchMatchCounts }) => ({ ...s, searchMatchCounts }),
  setNodeColors: (s, { nodeColors }) => ({ ...s, nodeColors }),
  setMatchedNodeIds: (s, { matchedNodeIds }) => ({ ...s, matchedNodeIds }),
  setHideNonMatched: (s, { hideNonMatched }) => ({ ...s, hideNonMatched }),
  setMaxGeneration: (s, { maxGeneration }) => ({ ...s, maxGeneration }),
  setLocalExtraDegrees: (s, { localExtraDegrees }) => ({ ...s, localExtraDegrees }),
  setLocalPruneByGrade: (s, { localPruneByGrade }) => ({ ...s, localPruneByGrade }),
};

export const sliceConfig: SliceConfig = {
  name: 'visualization',
  creators,
  initialState,
  reducers,
};

