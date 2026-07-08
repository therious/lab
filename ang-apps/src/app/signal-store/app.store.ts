import { signalStore, withState } from '@ngrx/signals';
import { withDevtools }           from './with-devtools';
import { counterSlice }           from './counter-slice';
import { todosSlice }             from './todos-slice';

/**
 * The single application store — a reactive state container.
 *
 * State is keyed by each slice's name, giving DevTools:
 *   { counter: { count, step }, todos: { items } }
 *
 * There are no methods here.  Dispatch is handled by injectActions()
 * which applies each slice's pure reducers via patchState() directly —
 * the same role that combineReducers + dispatch plays in the React apps.
 *
 * To add a slice: import it, add its initialState to withState, and
 * register it in combined-slices.ts.
 */
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState({
    counter: counterSlice.initialState,
    todos:   todosSlice.initialState,
  }),
  withDevtools('AppStore'),
);
