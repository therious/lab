import { inject }              from '@angular/core';
import { AppStore }            from './signal-store/app.store';
import { counterSlice }        from './signal-store/counter-slice';
import { todosSlice }          from './signal-store/todos-slice';
import { buildSliceActions }   from './signal-store/build-slice-actions';

/**
 * Returns the namespaced actions object.
 * Each slice's creators drive the type and implementation —
 * no action names or patchState calls are written here.
 *
 *   const actions = injectActions()
 *   actions.counter.increment()        // (step: number) — typed from creators
 *   actions.todos.addTodo('Buy milk')  // (text: string) — typed from creators
 */
export function injectActions() {
  const store = inject(AppStore);
  return {
    counter: buildSliceActions(counterSlice, store),
    todos:   buildSliceActions(todosSlice, store),
  } as const;
}
