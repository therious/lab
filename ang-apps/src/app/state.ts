import { inject }   from '@angular/core';
import { AppStore } from './signal-store/app.store';

/**
 * Parallel to the typed useSelector hook in the React apps.
 *
 * AppStore.counter is a DeepSignal<CounterState> so nested keys
 * (count, step, items …) are accessible as Signal<T> directly.
 *
 * Computed signals (doubled, isZero, …) are NOT on the store — they
 * belong in the component that needs them, the same way useMemo()
 * stays in the React component rather than in the slice.
 *
 *   const state = injectState()
 *   state.counter.count     // Signal<number>   — pure store state
 *   state.todos.items       // Signal<Todo[]>   — pure store state
 *
 *   // In the component:
 *   readonly doubled = computed(() => this.count() * 2)   // local memoization
 */
export function injectState() {
  const store = inject(AppStore);

  return {
    counter: store.counter,   // DeepSignal<CounterState> — .count, .step as Signal<T>
    todos:   store.todos,     // DeepSignal<TodosState>   — .items as Signal<Todo[]>
  } as const;
}
