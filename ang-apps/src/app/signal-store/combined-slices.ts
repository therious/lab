// Parallel to apps/ticket/src/actions/combined-slices.ts
// Register every slice here; AppStore is built from this list.

import { counterSlice } from './counter/counter-slice';
import { todosSlice }   from './todos/todos-slice';

export type { CounterState } from './counter/counter-slice';
export type { TodosState, Todo } from './todos/todos-slice';

export const allSlices = [counterSlice, todosSlice] as const;

// The unified state tree — one key per slice name.
// Parallel to TotalState in the React apps.
export type AppState = {
  counter: typeof counterSlice.initialState;
  todos:   typeof todosSlice.initialState;
};
