import { Injectable, inject } from '@angular/core';
import { AppStore }           from './app.store';
import { counterSlice }       from './counter-slice';
import { todosSlice }         from './todos-slice';
import { buildSliceComputed } from './build-slice-computed';

/**
 * Singleton that holds all derived signals for every slice.
 *
 * providedIn: 'root' means buildSliceComputed() is called exactly once per
 * slice — the signals are shared across every component that reads them via
 * injectState(), not recreated per component injection.
 *
 * To add computed to a new slice:
 *   1. Add a `computed` section to the slice file (pure projection functions).
 *   2. Add one readonly field here: inject(AppStore).<sliceSignal>.
 */
@Injectable({ providedIn: 'root' })
export class AppComputedState {
  private store = inject(AppStore);

  readonly counter = buildSliceComputed(counterSlice.computed, this.store.counter);
  readonly todos   = buildSliceComputed(todosSlice.computed,   this.store.todos);
}
