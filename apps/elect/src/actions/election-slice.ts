import {produce} from 'immer';

export interface Candidate {
  name: string;
}

export interface Election {
  title: string;
  candidates: Candidate[];
}

export interface ElectionVote {
  [score: string]: string[]; // score "0" through "5", and "unranked"
}

export interface ElectionState {
  elections: Election[];
  votes: Record<string, ElectionVote>; // keyed by election title
}

const initialState: ElectionState = {
  elections: [],
  votes: {},
};

type ElectionCreator = (...rest: any) => unknown;
type ElectionCreators = Record<string, ElectionCreator>;
type ElectionReducer = (s: ElectionState, ...rest: any) => ElectionState;
type ElectionReducers = Record<string, ElectionReducer>;

interface SliceConfig {
  name: string;
  reducers: ElectionReducers;
  creators: ElectionCreators;
  initialState: ElectionState;
}

// Initialize elections from config
const initializeElections = (state: ElectionState, {payload}: {payload: Election[]}): ElectionState => {
  return produce(state, draft => {
    draft.elections = payload;
    // Initialize votes for each election with empty bands
    payload.forEach(election => {
      if (!draft.votes[election.title]) {
        draft.votes[election.title] = {
          '0': [],
          '1': [],
          '2': [],
          '3': [],
          '4': [],
          '5': [],
          'unranked': [...election.candidates.map(c => c.name)],
        };
      }
    });
  });
};

// Move candidate to a score band
const moveCandidate = (state: ElectionState, {payload}: {payload: {electionTitle: string; candidateName: string; fromScore: string; toScore: string; toIndex?: number}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.electionTitle];
    if (!vote) return;

    // If moving within the same band, handle reordering
    if (payload.fromScore === payload.toScore && payload.fromScore !== 'unranked') {
      const band = vote[payload.fromScore];
      const fromIndex = band.indexOf(payload.candidateName);
      if (fromIndex === -1) return;
      
      let toIndex = payload.toIndex ?? band.length;
      // Adjust toIndex if moving within the same array
      if (fromIndex < toIndex) {
        toIndex--;
      }
      
      const [removed] = band.splice(fromIndex, 1);
      band.splice(toIndex, 0, removed);
      return;
    }

    // Remove from source
    if (payload.fromScore === 'unranked') {
      vote.unranked = vote.unranked.filter(name => name !== payload.candidateName);
    } else {
      vote[payload.fromScore] = vote[payload.fromScore].filter(name => name !== payload.candidateName);
    }

    // Add to destination
    if (payload.toScore === 'unranked') {
      if (!vote.unranked.includes(payload.candidateName)) {
        vote.unranked.push(payload.candidateName);
      }
    } else {
      const targetArray = vote[payload.toScore];
      if (payload.toIndex !== undefined && payload.toIndex >= 0 && payload.toIndex <= targetArray.length) {
        targetArray.splice(payload.toIndex, 0, payload.candidateName);
      } else {
        targetArray.push(payload.candidateName);
      }
    }
  });
};

// Reorder candidate within a band
const reorderCandidate = (state: ElectionState, {payload}: {payload: {electionTitle: string; score: string; fromIndex: number; toIndex: number}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.electionTitle];
    if (!vote) return;

    const band = vote[payload.score];
    if (!band || payload.fromIndex < 0 || payload.fromIndex >= band.length || payload.toIndex < 0 || payload.toIndex >= band.length) {
      return;
    }

    const [removed] = band.splice(payload.fromIndex, 1);
    band.splice(payload.toIndex, 0, removed);
  });
};

// Reset election votes
const resetElection = (state: ElectionState, {payload}: {payload: {electionTitle: string}}): ElectionState => {
  return produce(state, draft => {
    const election = draft.elections.find(e => e.title === payload.electionTitle);
    if (!election) return;

    draft.votes[payload.electionTitle] = {
      '0': [],
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      'unranked': [...election.candidates.map(c => c.name)],
    };
  });
};

export const sliceConfig: SliceConfig = {
  name: 'election',
  initialState,
  reducers: {
    initializeElections,
    moveCandidate,
    reorderCandidate,
    resetElection,
  },
  creators: {
    initializeElections: (elections: Election[]) => ({payload: elections}),
    moveCandidate: (electionTitle: string, candidateName: string, fromScore: string, toScore: string, toIndex?: number) => ({
      payload: {electionTitle, candidateName, fromScore, toScore, toIndex},
    }),
    reorderCandidate: (electionTitle: string, score: string, fromIndex: number, toIndex: number) => ({
      payload: {electionTitle, score, fromIndex, toIndex},
    }),
    resetElection: (electionTitle: string) => ({payload: {electionTitle}}),
  },
};

