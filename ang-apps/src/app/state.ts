import { inject }       from '@angular/core';
import { CounterStore } from './signal-store/counter/counter.store';
import { TodosStore }   from './signal-store/todos/todos.store';

/**
 * Signal-read facade.  Every property on the returned slice is a Signal<T>
 * (state signals from withState, computed signals from withComputed).
 *
 *   const state = injectState()
 *
 *   // Pure state signals:
 *   state.counter.count          // Signal<number>
 *   state.todos.items            // Signal<Todo[]>
 *
 *   // Store-level computed signals (defined via withComputed in the slice):
 *   state.counter.doubled        // Signal<number>
 *   state.todos.completedCount   // Signal<number>
 *
 *   // Component-level computed (derived locally):
 *   const isNeg = computed(() => state.counter.count() < 0)
 */
export function injectState() {
  return {
    counter: inject(CounterStore),
    todos:   inject(TodosStore),
  } as const;
}
