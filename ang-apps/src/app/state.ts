import { inject }             from '@angular/core';
import { AppStore }           from './signal-store/app.store';
import { AppComputedState }   from './signal-store/app-computed';

/**
 * Single signal-read facade.
 *
 * Returns a unified surface of raw state signals and slice-computed signals.
 * The computed signals come from the singleton AppComputedState — they are
 * created once regardless of how many components call injectState().
 *
 *   const state = injectState()
 *   state.counter.count        // Signal<number>  — raw DeepSignal field
 *   state.counter.doubled      // Signal<number>  — from counterSlice.computed
 *   state.todos.items          // Signal<Todo[]>  — raw DeepSignal field
 *   state.todos.completedCount // Signal<number>  — from todosSlice.computed
 *
 *   // Component-specific derivations that don't belong in the slice:
 *   readonly doneRatio = computed(() => this.completedCount() / this.todos().length)
 */
export function injectState() {
  const store   = inject(AppStore);
  const derived = inject(AppComputedState);

  return {
    counter: {
      count: store.counter.count,
      step:  store.counter.step,
      ...derived.counter,         // doubled, isZero, isNeg, stepLabel, summary
    },
    todos: {
      items: store.todos.items,
      ...derived.todos,           // completedCount, pendingCount, hasItems, hasDone, allDone, progressLabel
    },
  } as const;
}
