/**
 * Shared test utilities for specs that need the real AppStore.
 * Import from here rather than setting up TestBed individually.
 */
import { TestBed }    from '@angular/core/testing';
import { patchState, getState } from '@ngrx/signals';
import { AppStore }   from '../app/signal-store/app.store';
import { allSlices }  from '../app/signal-store/combined-slices';
import { counterSlice } from '../app/signal-store/counter-slice';
import { todosSlice }   from '../app/signal-store/todos-slice';
import { buildAllActions } from '../app/signal-store/build-slice-actions';

export type TestStore   = InstanceType<typeof AppStore>;
export type TestActions = ReturnType<typeof buildAllActions<typeof allSlices>>;

/** Call in beforeEach. Returns the real store + typed actions. */
export function setupStore(): { store: TestStore; actions: TestActions } {
  TestBed.configureTestingModule({});
  const store = TestBed.inject(AppStore);
  return { store, actions: buildAllActions(allSlices, store) };
}

/** Snapshot the full app state. Thin wrapper kept here so specs don't import @ngrx/signals directly. */
export function storeState(store: TestStore) {
  return getState(store);
}

/** Reset all slices to their initial values between tests. */
export function resetStore(store: TestStore): void {
  patchState(store, {
    counter: counterSlice.initialState,
    todos:   todosSlice.initialState,
  });
}

/** Re-export patchState for specs that need to set arbitrary state. */
export { patchState };
