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

export const todosSlice = {
  name: 'todos' as const,
  initialState,
  creators,
  reducers,
};
