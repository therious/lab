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
  ballots: Ballot[]; // Ballots for current election
  votes: Record<string, BallotVote>; // keyed by ballot title
  confirmations: Record<string, boolean>; // keyed by ballot title
  submitted: boolean; // Whether the vote has been successfully submitted
}

const initialState: ElectionState = {
  currentElection: null,
  token: null,
  viewToken: null,
  ballots: [],
  votes: {},
  confirmations: {},
  submitted: false,
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
    draft.ballots = payload.election.ballots || [];
    
    // Only reset submitted flag if it's a different election
    if (!isSameElection) {
      draft.submitted = false;
    }
    
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

// Helper function to check if all candidates are ranked for a ballot
const areAllCandidatesRanked = (vote: BallotVote, ballot: Ballot): boolean => {
  if (!vote || !ballot) return false;
  const unrankedCount = (vote.unranked || []).length;
  return unrankedCount === 0;
};

// Move candidate to a score band
const moveCandidate = (state: ElectionState, {payload}: {payload: {ballotTitle: string; candidateName: string; fromScore: string; toScore: string; toIndex?: number}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.ballotTitle];
    if (!vote) return;

    const ballot = draft.ballots.find(b => b.title === payload.ballotTitle);
    if (!ballot) return;

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
      // Update confirmation state based on whether all candidates are ranked
      if (!draft.submitted) {
        draft.confirmations[payload.ballotTitle] = areAllCandidatesRanked(vote, ballot);
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
    
    // Update confirmation state based on whether all candidates are ranked
    if (!draft.submitted) {
      draft.confirmations[payload.ballotTitle] = areAllCandidatesRanked(vote, ballot);
    }
  });
};

// Reorder candidate within a band
const reorderCandidate = (state: ElectionState, {payload}: {payload: {ballotTitle: string; score: string; fromIndex: number; toIndex: number}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.ballotTitle];
    if (!vote) return;

    const ballot = draft.ballots.find(b => b.title === payload.ballotTitle);
    if (!ballot) return;

    const band = vote[payload.score];
    if (!band || payload.fromIndex < 0 || payload.fromIndex >= band.length || payload.toIndex < 0 || payload.toIndex >= band.length) {
      return;
    }

    const [removed] = band.splice(payload.fromIndex, 1);
    band.splice(payload.toIndex, 0, removed);
    
    // Update confirmation state based on whether all candidates are ranked
    if (!draft.submitted) {
      draft.confirmations[payload.ballotTitle] = areAllCandidatesRanked(vote, ballot);
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

// Confirm a ballot (only if all candidates are ranked)
const confirmBallot = (state: ElectionState, {payload}: {payload: {ballotTitle: string}}): ElectionState => {
  return produce(state, draft => {
    const vote = draft.votes[payload.ballotTitle];
    const ballot = draft.ballots.find(b => b.title === payload.ballotTitle);
    if (vote && ballot) {
      // Only confirm if all candidates are ranked
      draft.confirmations[payload.ballotTitle] = areAllCandidatesRanked(vote, ballot);
    }
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

// Mark vote as submitted
const markSubmitted = (state: ElectionState): ElectionState => {
  return produce(state, draft => {
    draft.submitted = true;
    // Lock all confirmations
    Object.keys(draft.confirmations).forEach(key => {
      draft.confirmations[key] = true;
    });
  });
};

export const sliceConfig: SliceConfig = {
  name: 'election',
  initialState,
  reducers: {
    initializeElection,
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

