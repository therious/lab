import { computed }                                         from '@angular/core';
import { signalStore, withState, withComputed, withMethods,
         patchState }                                        from '@ngrx/signals';
import { withDevtools }                                      from '../with-devtools';

// ── State shape ────────────────────────────────────────────────────────────────
export interface Todo {
  id:   string;
  text: string;
  done: boolean;
}

export interface TodosState {
  items: Todo[];
}

const initial: TodosState = { items: [] };

// ── The slice ──────────────────────────────────────────────────────────────────
export const TodosStore = signalStore(
  { providedIn: 'root' },

  withState(initial),

  // Computed signals — all derived counts/flags live here so any component
  // can consume them without repeating the logic.
  withComputed(({ items }) => ({
    completedCount: computed(() => items().filter(t => t.done).length),
    pendingCount:   computed(() => items().filter(t => !t.done).length),
    hasItems:       computed(() => items().length > 0),
    hasDone:        computed(() => items().some(t => t.done)),
    allDone:        computed(() => items().length > 0 && items().every(t => t.done)),
    progressLabel:  computed(() => {
      const done = items().filter(t => t.done).length;
      return `${done} / ${items().length} done`;
    }),
  })),

  // Methods — patchState always produces a new state object (no mutation)
  withMethods(store => ({
    addTodo:    (text: string) => patchState(store, s => ({
      items: [...s.items, { id: crypto.randomUUID(), text, done: false }],
    })),
    removeTodo: (id: string) => patchState(store, s => ({
      items: s.items.filter(t => t.id !== id),
    })),
    toggleTodo: (id: string) => patchState(store, s => ({
      items: s.items.map(t => t.id === id ? { ...t, done: !t.done } : t),
    })),
    clearDone: () => patchState(store, s => ({
      items: s.items.filter(t => !t.done),
    })),
  })),

  withDevtools('TodosStore'),
);
