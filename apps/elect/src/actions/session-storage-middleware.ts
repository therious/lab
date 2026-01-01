/**
 * Middleware to persist session-persisted state to sessionStorage.
 * 
 * Stores a single JSON object in sessionStorage with key 'election_session'
 * that exactly matches the SessionPersistedState structure from the election slice.
 * 
 * Session-persisted fields (must match ElectionState structure):
 * - token: string | null
 * - viewToken: string | null
 * - electionIdentifier: string | null
 * - userEmail: string | null
 * - submitted: boolean
 */

import {Action, NextF} from '@therious/actions';
import {ElectionState} from './election-slice';
import {TotalState} from './combined-slices';

const SESSION_STORAGE_KEY = 'election_session';

export const sessionStorageMiddleware = (store: {getState: () => TotalState}) => (next: NextF) => (action: Action) => {
  // Check if this is a logout action - clear sessionStorage BEFORE running the action
  if (action.type === 'election/logout') {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to clear sessionStorage on logout:', e);
      }
    }
  }
  
  const result = next(action);
  
  // Only run in browser environment
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return result;
  }
  
  const state = store.getState();
  const electionState: ElectionState = state.election;
  
  try {
    // Build session-persisted subset matching ElectionState structure exactly
    const sessionPersisted = {
      token: electionState.token,
      viewToken: electionState.viewToken,
      electionIdentifier: electionState.electionIdentifier,
      userEmail: electionState.userEmail,
      submitted: electionState.submitted,
    };
    
    // Write single JSON object to sessionStorage
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionPersisted));
  } catch (e) {
    console.warn('Failed to write to sessionStorage:', e);
  }
  
  return result;
};

