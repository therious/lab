import { computed }                                         from '@angular/core';
import { signalStore, withState, withComputed, withMethods,
         patchState }                                        from '@ngrx/signals';
import { withDevtools }                                      from '../with-devtools';

// ── State shape ────────────────────────────────────────────────────────────────
export interface CounterState {
  count: number;
  step:  number;
}

const initial: CounterState = { count: 0, step: 1 };

// ── The slice ──────────────────────────────────────────────────────────────────
// One file = state + computed signals + methods (actions).
// No reducers, no action classes, no selectors file.
export const CounterStore = signalStore(
  { providedIn: 'root' },

  // Primitive state — each key becomes a Signal<T> on the store
  withState(initial),

  // Computed signals — derived automatically; recalculate only when deps change.
  // These are STORE-LEVEL computed: shared, part of the store's public API.
  withComputed(({ count, step }) => ({
    doubled:   computed(() => count() * 2),
    isZero:    computed(() => count() === 0),
    stepLabel: computed(() => `step = ${step()}`),
    summary:   computed(() => `${count()} · ×2 = ${count() * 2}`),
  })),

  // Methods (the "actions") — use patchState for immutable updates
  withMethods(store => ({
    increment: () => patchState(store, s => ({ count: s.count + s.step })),
    decrement: () => patchState(store, s => ({ count: s.count - s.step })),
    reset:     () => patchState(store, initial),
    setStep:   (step: number) => patchState(store, { step }),
  })),

  // Must come last so onInit can see all methods
  withDevtools('CounterStore'),
);
