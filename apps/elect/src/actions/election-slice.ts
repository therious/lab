import {produce} from 'immer';

export interface Candidate {
  name: string;
  affiliation?: string;
}

export interface Ballot {
  title: string;
  description?: string;
  candidates: Candidate[];
  number_of_winners?: number;
}

export interface Election {
  identifier: string;
  title: string;
  description?: string;
  ballots: Ballot[];
  voting_start?: string;
  voting_end?: string;
}

export interface BallotVote {
  [score: string]: string[]; // score "0" through "5", and "unranked"
}

export interface ElectionState {
  currentElection: Election | null;
  token: string | null;
  viewToken: string | null;
  electionIdentifier: string | null; // Restored from sessionStorage
  userEmail: string | null; // Restored from sessionStorage
  ballots: Ballot[]; // Ballots for current election
  votes: Record<string, BallotVote>; // keyed by ballot title
  confirmations: Record<string, boolean>; // keyed by ballot title
  submitted: boolean; // Whether the vote has been successfully submitted (restored from sessionStorage)
}

// Session-persisted subset of state (restored from sessionStorage on load)
// This structure must exactly match the properties in ElectionState
interface SessionPersistedState {
  token: string | null;
  viewToken: string | null;
  electionIdentifier: string | null;
  userEmail: string | null;
  submitted: boolean;
}

const SESSION_STORAGE_KEY = 'election_session';

// Restore session-persisted state from sessionStorage
function restoreFromSessionStorage(): Partial<SessionPersistedState> {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return {};
  }
  
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    
    const parsed = JSON.parse(stored) as SessionPersistedState;
    // Validate structure matches SessionPersistedState
    return {
      token: parsed.token ?? null,
      viewToken: parsed.viewToken ?? null,
      electionIdentifier: parsed.electionIdentifier ?? null,
      userEmail: parsed.userEmail ?? null,
      submitted: parsed.submitted ?? false,
    };
  } catch (e) {
    console.warn('Failed to read from sessionStorage:', e);
    return {};
  }
}

// Compute initial state with sessionStorage restoration
const sessionRestored = restoreFromSessionStorage();
const initialState: ElectionState = {
  currentElection: null,
  token: sessionRestored.token || null,
  viewToken: sessionRestored.viewToken || null,
  electionIdentifier: sessionRestored.electionIdentifier || null,
  userEmail: sessionRestored.userEmail || null,
  ballots: [],
  votes: {},
  confirmations: {},
  submitted: sessionRestored.submitted || false,
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

// Initialize election with ballots
const initializeElection = (state: ElectionState, {payload}: {payload: {election: Election; token: string; viewToken: string}}): ElectionState => {
  return produce(state, draft => {
    // Preserve existing votes and confirmations if re-initializing the same election
    const isSameElection = draft.currentElection?.identifier === payload.election.identifier;
    const preservedVotes = isSameElection ? draft.votes : {};
    const preservedConfirmations = isSameElection ? draft.confirmations : {};
    
    draft.currentElection = payload.election;
    draft.token = payload.token;
    draft.viewToken = payload.viewToken;
    draft.electionIdentifier = payload.election.identifier;
    draft.ballots = payload.election.ballots || [];
    
    // Only reset submitted flag if it's a different election
    // (submitted status is restored from sessionStorage at initialization)
    // Middleware will handle sessionStorage persistence
    
    // Initialize votes for each ballot, preserving existing votes if available
    draft.ballots.forEach(ballot => {
      if (preservedVotes[ballot.title]) {
        // Preserve existing vote structure
        draft.votes[ballot.title] = preservedVotes[ballot.title];
      } else {
        // Initialize new vote structure
        draft.votes[ballot.title] = {
          '0': [],
          '1': [],
          '2': [],
          '3': [],
          '4': [],
          '5': [],
          'unranked': [...ballot.candidates.map(c => c.name)],
        };
      }
      
      // Preserve confirmation status if available, otherwise default to false
      draft.confirmations[ballot.title] = preservedConfirmations[ballot.title] || false;
    });
  });
};

// Move candidate to a score band
const moveCandidate = (state: ElectionState, {payload}: {payload: {ballotTitle: string; candidateName: string; fromScore: string; toScore: string; toIndex?: number}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.ballotTitle];
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
      // Unconfirm ballot when rankings change
      if (!draft.submitted) {
        draft.confirmations[payload.ballotTitle] = false;
      }
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
    
    // Unconfirm ballot when rankings change
    if (!draft.submitted) {
      draft.confirmations[payload.ballotTitle] = false;
    }
  });
};

// Reorder candidate within a band
const reorderCandidate = (state: ElectionState, {payload}: {payload: {ballotTitle: string; score: string; fromIndex: number; toIndex: number}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.ballotTitle];
    if (!vote) return;

    const band = vote[payload.score];
    if (!band || payload.fromIndex < 0 || payload.fromIndex >= band.length || payload.toIndex < 0 || payload.toIndex >= band.length) {
      return;
    }

    const [removed] = band.splice(payload.fromIndex, 1);
    band.splice(payload.toIndex, 0, removed);
    
    // Unconfirm ballot when rankings change
    if (!draft.submitted) {
      draft.confirmations[payload.ballotTitle] = false;
    }
  });
};

// Reset ballot votes
const resetBallot = (state: ElectionState, {payload}: {payload: {ballotTitle: string}}): ElectionState => {
  return produce(state, draft => {
    const ballot = draft.ballots.find(b => b.title === payload.ballotTitle);
    if (!ballot) return;

    draft.votes[payload.ballotTitle] = {
      '0': [],
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      'unranked': [...ballot.candidates.map(c => c.name)],
    };
    draft.confirmations[payload.ballotTitle] = false;
  });
};

// Confirm a ballot
const confirmBallot = (state: ElectionState, {payload}: {payload: {ballotTitle: string}}): ElectionState => {
  return produce(state, draft => {
    draft.confirmations[payload.ballotTitle] = true;
  });
};

// Unconfirm a ballot (undo confirmation)
const unconfirmBallot = (state: ElectionState, {payload}: {payload: {ballotTitle: string}}): ElectionState => {
  return produce(state, draft => {
    draft.confirmations[payload.ballotTitle] = false;
  });
};

// Clear all confirmations (for testing/reset)
const clearConfirmations = (state: ElectionState): ElectionState => {
  return produce(state, draft => {
    Object.keys(draft.confirmations).forEach(key => {
      draft.confirmations[key] = false;
    });
  });
};

// Setter actions for session-persisted state (middleware will handle sessionStorage persistence)
const setToken = (state: ElectionState, {payload}: {payload: {token: string}}): ElectionState => {
  return produce(state, draft => {
    draft.token = payload.token;
  });
};

const setViewToken = (state: ElectionState, {payload}: {payload: {viewToken: string}}): ElectionState => {
  return produce(state, draft => {
    draft.viewToken = payload.viewToken;
  });
};

const setUserEmail = (state: ElectionState, {payload}: {payload: {email: string | null}}): ElectionState => {
  return produce(state, draft => {
    draft.userEmail = payload.email;
  });
};

const setElectionIdentifier = (state: ElectionState, {payload}: {payload: {identifier: string | null}}): ElectionState => {
  return produce(state, draft => {
    draft.electionIdentifier = payload.identifier;
  });
};

// Mark vote as submitted
const markSubmitted = (state: ElectionState): ElectionState => {
  return produce(state, draft => {
    draft.submitted = true;
    // Lock all confirmations
    Object.keys(draft.confirmations).forEach(key => {
      draft.confirmations[key] = true;
    });
    // Middleware will handle sessionStorage persistence
  });
};

export const sliceConfig: SliceConfig = {
  name: 'election',
  initialState,
  reducers: {
    initializeElection,
    setToken,
    setViewToken,
    setUserEmail,
    setElectionIdentifier,
    moveCandidate,
    reorderCandidate,
    resetBallot,
    confirmBallot,
    unconfirmBallot,
    clearConfirmations,
    markSubmitted,
  },
  creators: {
    initializeElection: (election: Election, token: string, viewToken: string) => ({
      payload: {election, token, viewToken},
    }),
    setToken: (token: string) => ({
      payload: {token},
    }),
    setViewToken: (viewToken: string) => ({
      payload: {viewToken},
    }),
    setUserEmail: (email: string | null) => ({
      payload: {email},
    }),
    setElectionIdentifier: (identifier: string | null) => ({
      payload: {identifier},
    }),
    moveCandidate: (ballotTitle: string, candidateName: string, fromScore: string, toScore: string, toIndex?: number) => ({
      payload: {ballotTitle, candidateName, fromScore, toScore, toIndex},
    }),
    reorderCandidate: (ballotTitle: string, score: string, fromIndex: number, toIndex: number) => ({
      payload: {ballotTitle, score, fromIndex, toIndex},
    }),
    resetBallot: (ballotTitle: string) => ({payload: {ballotTitle}}),
    confirmBallot: (ballotTitle: string) => ({payload: {ballotTitle}}),
    unconfirmBallot: (ballotTitle: string) => ({payload: {ballotTitle}}),
    clearConfirmations: () => ({payload: {}}),
    markSubmitted: () => ({payload: {}}),
  },
};

