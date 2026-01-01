/**
 * Middleware to persist session-persisted state to sessionStorage.
 * 
 * Watches for actions that modify session-persisted fields and automatically
 * writes them to sessionStorage as a side effect.
 * 
 * Session-persisted fields:
 * - token -> 'vote_token'
 * - viewToken -> 'view_token'
 * - electionIdentifier -> 'election_identifier'
 * - userEmail -> 'user_email'
 * - submitted -> 'has_voted'
 */

import {Action, NextF} from '@therious/actions';
import {ElectionState} from './election-slice';
import {TotalState} from './combined-slices';

export const sessionStorageMiddleware = (store: {getState: () => TotalState}) => (next: NextF) => (action: Action) => {
  const result = next(action);
  
  // Only run in browser environment
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return result;
  }
  
  const state = store.getState();
  const electionState: ElectionState = state.election;
  
  try {
    // Persist session-persisted fields to sessionStorage
    if (electionState.token !== null) {
      sessionStorage.setItem('vote_token', electionState.token);
    }
    
    if (electionState.viewToken !== null) {
      sessionStorage.setItem('view_token', electionState.viewToken);
    }
    
    if (electionState.electionIdentifier !== null) {
      sessionStorage.setItem('election_identifier', electionState.electionIdentifier);
    }
    
    if (electionState.userEmail !== null) {
      sessionStorage.setItem('user_email', electionState.userEmail);
    }
    
    // Persist submitted status
    sessionStorage.setItem('has_voted', electionState.submitted ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to write to sessionStorage:', e);
  }
  
  return result;
};

