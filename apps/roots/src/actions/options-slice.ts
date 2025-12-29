import {Mischalef, arrMischalfim, MischalefChoices, allChoices, filterChosen} from '../roots/mischalfim';

export interface OptionsState {
  mischalfim: Mischalef[];
  allmischalfim:Mischalef[];
  choices:MischalefChoices;
  otherChoices:Record<string, boolean>;
  includeLinked: boolean;
  maxNodes: number;
  maxEdges: number;
  relatedMeaningsThreshold: number; // 6 = don't include, 5-1 = include grade >= threshold
  linkByMeaningThreshold: number; // 6 = only filtered, 5-0 = include roots with grade >= threshold
  pruneByGradeThreshold: number; // 6-0, default 0, removes nodes not connected by at least this grade
  // Visualization UI state
  maxGeneration: number;
  localExtraDegrees: number;
  searchTerm: string;
  isPhysicsEnabled: boolean;
  viewMode: 'everything' | 'matchingOnly' | 'matchingAndConnected';
}

type OptionsCreator = (...rest: any)=>unknown;
type OptionsCreators = Record<string, OptionsCreator>;
type OptionsReducer = (s:OptionsState,...rest: any)=>OptionsState;
type OptionsReducers = Record<string, OptionsReducer>;

interface SliceConfig {
  name: string;
  reducers: OptionsReducers;
  creators: OptionsCreators;
  initialState: OptionsState;
}

const initialState:OptionsState = {
  mischalfim: arrMischalfim,
  allmischalfim: arrMischalfim,
  choices: allChoices(arrMischalfim),
  otherChoices: {vavToDoubled: true, jumbled: false, atbash: false, removeFree:false},
  includeLinked: false,
  maxNodes: 2001,
  maxEdges: 200_000,
  relatedMeaningsThreshold: 6,
  linkByMeaningThreshold: 6, // Default: only filtered roots
  pruneByGradeThreshold: 0, // Default: no pruning
  // Visualization UI state
  maxGeneration: 1,
  localExtraDegrees: 0,
  searchTerm: '',
  isPhysicsEnabled: true,
  viewMode: 'everything',
};


// type value will be added automatically to creators to match the key, or better yet to match the slice/key
const creators = {
  choose: (choices:MischalefChoices) => ({choices}),
  chooseOne: (choice:string, value:boolean) => ({choice, value}),
  chooseOtherOne: (choice:string, value:boolean) => ({choice, value}),
  clearChoices: () => ({}),
  allChoices:()=> ({}),
  setIncludeLinked: (includeLinked: boolean) => ({ includeLinked }),
  setMaxNodes: (maxNodes: number) => ({ maxNodes }),
  setMaxEdges: (maxEdges: number) => ({ maxEdges }),
  setRelatedMeaningsThreshold: (relatedMeaningsThreshold: number) => ({ relatedMeaningsThreshold }),
  setLinkByMeaningThreshold: (linkByMeaningThreshold: number) => ({ linkByMeaningThreshold }),
  setPruneByGradeThreshold: (pruneByGradeThreshold: number) => ({ pruneByGradeThreshold }),
  // Visualization UI state creators
  setMaxGeneration: (maxGeneration: number) => ({ maxGeneration }),
  setLocalExtraDegrees: (localExtraDegrees: number) => ({ localExtraDegrees }),
  setSearchTerm: (searchTerm: string) => ({ searchTerm }),
  setPhysicsEnabled: (isPhysicsEnabled: boolean) => ({ isPhysicsEnabled }),
  setViewMode: (viewMode: 'everything' | 'matchingOnly' | 'matchingAndConnected') => ({ viewMode }),
};

const reducers:OptionsReducers = {
  allChoices: (s) => {
    const choices = {...s.choices};
    Object.keys(choices).forEach(k=>choices[k]=true);
    return {...s, choices, mischalfim:filterChosen(s.allmischalfim, choices)};
  },

  clearChoices: (s) => {
    const choices = {...s.choices};
    Object.keys(choices).forEach(k=>choices[k]=false);
    // Also clear vavToDoubled, jumbled, and atbash when clearing all checkboxes
    const otherChoices = {...s.otherChoices, vavToDoubled: false, jumbled: false, atbash: false};
    return {...s, choices, mischalfim:filterChosen(s.allmischalfim, choices), otherChoices};
  },
  choose: (s, {choices})=>({...s, choices, mischalfim:filterChosen(s.allmischalfim, choices)}),
  chooseOne: (s, {choice, value} )=>
  {
    const choices= {...s.choices, [choice]:value };
    return {...s, choices, mischalfim:filterChosen(s.allmischalfim, choices)};
  },
  chooseOtherOne: (s, {choice, value} )=>
  {
    const otherChoices= {...s.otherChoices, [choice]:value };
    return {...s, otherChoices};
  },
  setIncludeLinked: (s, { includeLinked }) => ({
    ...s,
    includeLinked,
  }),
  setMaxNodes: (s, { maxNodes }) => ({
    ...s,
    maxNodes,
  }),
  setMaxEdges: (s, { maxEdges }) => ({
    ...s,
    maxEdges,
  }),
  setRelatedMeaningsThreshold: (s, { relatedMeaningsThreshold }) => ({
    ...s,
    relatedMeaningsThreshold,
  }),
  setLinkByMeaningThreshold: (s, { linkByMeaningThreshold }) => ({
    ...s,
    linkByMeaningThreshold,
  }),
  setPruneByGradeThreshold: (s, { pruneByGradeThreshold }) => ({
    ...s,
    pruneByGradeThreshold,
  }),
  // Visualization UI state reducers
  setMaxGeneration: (s, { maxGeneration }) => ({
    ...s,
    maxGeneration,
  }),
  setLocalExtraDegrees: (s, { localExtraDegrees }) => ({
    ...s,
    localExtraDegrees,
  }),
  setSearchTerm: (s, { searchTerm }) => ({
    ...s,
    searchTerm,
  }),
  setPhysicsEnabled: (s, { isPhysicsEnabled }) => ({
    ...s,
    isPhysicsEnabled,
  }),
  setViewMode: (s, { viewMode }) => ({
    ...s,
    viewMode,
  }),

};

export const sliceConfig:SliceConfig = {name: 'options', creators, initialState, reducers};

