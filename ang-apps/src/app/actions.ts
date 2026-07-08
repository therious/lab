import { inject }          from '@angular/core';
import { patchState }      from '@ngrx/signals';
import { AppStore }        from './signal-store/app.store';
import { counterSlice }    from './signal-store/counter-slice';
import { todosSlice }      from './signal-store/todos-slice';
import { currentAction }   from './signal-store/with-devtools';

/**
 * Parallel to actions-integration/index.tsx in the React apps.
 *
 * Each method sets the DevTools action label, then calls patchState()
 * with the slice's pure reducer — equivalent to dispatch(actionCreator(payload))
 * flowing through combineReducers in Redux.
 *
 * Usage:
 *   const actions = injectActions()
 *   actions.counter.increment()
 *   actions.todos.addTodo('Buy milk')
 *
 *   const { counter: ca } = injectActions()
 *   ca.setStep(5)
 */
export function injectActions() {
  const store = inject(AppStore);
  const c = counterSlice.reducers;
  const t = todosSlice.reducers;

  return {
    counter: {
      increment: ()             => { currentAction.name = 'counter/increment'; patchState(store, s => ({ counter: c.increment(s.counter) })); },
      decrement: ()             => { currentAction.name = 'counter/decrement'; patchState(store, s => ({ counter: c.decrement(s.counter) })); },
      reset:     ()             => { currentAction.name = 'counter/reset';     patchState(store, { counter: counterSlice.initialState }); },
      setStep:   (step: number) => { currentAction.name = 'counter/setStep';   patchState(store, s => ({ counter: c.setStep(s.counter, { step }) })); },
    },
    todos: {
      addTodo:    (text: string) => { currentAction.name = 'todos/addTodo';    patchState(store, s => ({ todos: t.addTodo(s.todos, { text }) })); },
      removeTodo: (id: string)   => { currentAction.name = 'todos/removeTodo'; patchState(store, s => ({ todos: t.removeTodo(s.todos, { id }) })); },
      toggleTodo: (id: string)   => { currentAction.name = 'todos/toggleTodo'; patchState(store, s => ({ todos: t.toggleTodo(s.todos, { id }) })); },
      clearDone:  ()             => { currentAction.name = 'todos/clearDone';  patchState(store, s => ({ todos: t.clearDone(s.todos) })); },
    },
  } as const;
}
