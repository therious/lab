// Pure TypeScript — no Angular, no NgRx imports.

export interface Todo {
  id:   string;
  text: string;
  done: boolean;
}

export interface TodosState {
  items: Todo[];
}

const initialState: TodosState = { items: [] };

const creators = {
  addTodo:    (text: string) => ({ text }),
  removeTodo: (id: string)   => ({ id }),
  toggleTodo: (id: string)   => ({ id }),
  clearDone:  ()             => ({}),
};

const reducers = {
  addTodo:    (s: TodosState, { text }: { text: string }) => ({
    ...s, items: [...s.items, { id: crypto.randomUUID(), text, done: false }],
  }),
  removeTodo: (s: TodosState, { id }: { id: string }) => ({
    ...s, items: s.items.filter(t => t.id !== id),
  }),
  toggleTodo: (s: TodosState, { id }: { id: string }) => ({
    ...s, items: s.items.map(t => t.id === id ? { ...t, done: !t.done } : t),
  }),
  clearDone:  (s: TodosState) => ({
    ...s, items: s.items.filter(t => !t.done),
  }),
};

const computedDefs = {
  completedCount: (s: TodosState) => s.items.filter(t => t.done).length,
  pendingCount:   (s: TodosState) => s.items.filter(t => !t.done).length,
  hasItems:       (s: TodosState) => s.items.length > 0,
  hasDone:        (s: TodosState) => s.items.some(t => t.done),
  allDone:        (s: TodosState) => s.items.length > 0 && s.items.every(t => t.done),
  progressLabel:  (s: TodosState) => `${s.items.filter(t => t.done).length} / ${s.items.length} done`,
};

export const todosSlice = {
  name: 'todos' as const,
  initialState,
  creators,
  reducers,
  computed: computedDefs,
};
