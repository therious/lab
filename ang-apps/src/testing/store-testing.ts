import { TestBed }    from '@angular/core/testing';
import { patchState, getState } from '@ngrx/signals';
import { AppStore }   from '../app/signal-store/app.store';
import { allSlices }  from '../app/signal-store/combined-slices';
import { counterSlice } from '../app/signal-store/counter-slice';
import { todosSlice }   from '../app/signal-store/todos-slice';
import { buildAllActions } from '../app/signal-store/build-slice-actions';

export type TestStore   = InstanceType<typeof AppStore>;
export type TestActions = ReturnType<typeof buildAllActions<typeof allSlices>>;

/**
 * Grab AppStore from the already-configured TestBed and build actions.
 * Call this AFTER TestBed.configureTestingModule — never before.
 */
export function injectStore(): { store: TestStore; actions: TestActions } {
  const store = TestBed.inject(AppStore);
  return { store, actions: buildAllActions(allSlices, store) };
}

/**
 * For specs that only need the store (no component).
 * Calls configureTestingModule({}) internally so tests stay one-liners.
 */
export function setupStore(): { store: TestStore; actions: TestActions } {
  TestBed.configureTestingModule({});
  return injectStore();
}

export function storeState(store: TestStore) {
  return getState(store);
}

export function resetStore(store: TestStore): void {
  patchState(store, {
    counter: counterSlice.initialState,
    todos:   todosSlice.initialState,
  });
}

export { patchState };
