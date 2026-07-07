import { inject }              from '@angular/core';
import { CounterStore }        from './signal-store/counter/counter.store';
import { TodosStore }          from './signal-store/todos/todos.store';
import { currentAction }       from './signal-store/with-devtools';

/**
 * Dispatch-only facade — the only place in the app that calls store methods.
 *
 * Before each call we set currentAction.name so that withDevtools()'s effect()
 * can label the DevTools entry with the real method name
 * (e.g. "CounterStore/increment") instead of a generic string.
 *
 * Usage:
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
      increment: () => { currentAction.name = 'CounterStore/increment'; counter.increment(); },
      decrement: () => { currentAction.name = 'CounterStore/decrement'; counter.decrement(); },
      reset:     () => { currentAction.name = 'CounterStore/reset';     counter.reset();     },
      setStep:   (step: number) => { currentAction.name = 'CounterStore/setStep'; counter.setStep(step); },
    },
    todos: {
      addTodo:    (text: string) => { currentAction.name = 'TodosStore/addTodo';    todos.addTodo(text);    },
      removeTodo: (id: string)   => { currentAction.name = 'TodosStore/removeTodo'; todos.removeTodo(id);   },
      toggleTodo: (id: string)   => { currentAction.name = 'TodosStore/toggleTodo'; todos.toggleTodo(id);   },
      clearDone:  ()             => { currentAction.name = 'TodosStore/clearDone';  todos.clearDone();      },
    },
  } as const;
}
