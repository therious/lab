import { inject }       from '@angular/core';
import { CounterStore } from './signal-store/counter/counter.store';
import { TodosStore }   from './signal-store/todos/todos.store';

/**
 * Dispatch-only facade.  Components call methods here; the underlying stores
 * are never imported in component files.
 *
 *   const actions = injectActions()
 *   actions.counter.increment()
 *   actions.todos.addTodo('Buy milk')
 *
 *   const { counter: ca } = injectActions()   // slice alias
 *   ca.setStep(5)
 */
export function injectActions() {
  const counter = inject(CounterStore);
  const todos   = inject(TodosStore);

  return {
    counter: {
      increment: () => counter.increment(),
      decrement: () => counter.decrement(),
      reset:     () => counter.reset(),
      setStep:   (step: number) => counter.setStep(step),
    },
    todos: {
      addTodo:    (text: string) => todos.addTodo(text),
      removeTodo: (id: string)   => todos.removeTodo(id),
      toggleTodo: (id: string)   => todos.toggleTodo(id),
      clearDone:  ()             => todos.clearDone(),
    },
  } as const;
}
