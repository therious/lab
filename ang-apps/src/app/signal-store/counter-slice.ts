// Pure TypeScript — no Angular, no NgRx imports.
// Shape is intentionally parallel to the React SliceConfig pattern in the monorepo.

export interface CounterState {
  count: number;
  step:  number;
}

const initialState: CounterState = { count: 0, step: 1 };

// creators: describe the payload each action carries
const creators = {
  increment: ()             => ({}),
  decrement: ()             => ({}),
  reset:     ()             => ({}),
  setStep:   (step: number) => ({ step }),
};

// reducers: pure (state, payload) => newState  — identical to the React pattern
const reducers = {
  increment: (s: CounterState)                        => ({ ...s, count: s.count + s.step }),
  decrement: (s: CounterState)                        => ({ ...s, count: s.count - s.step }),
  reset:     ()                                       => ({ ...initialState }),
  setStep:   (s: CounterState, { step }: { step: number }) => ({ ...s, step }),
};

export const counterSlice = {
  name: 'counter' as const,
  initialState,
  creators,
  reducers,
};
