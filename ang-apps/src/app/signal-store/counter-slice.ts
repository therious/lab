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

// computed: pure (state) => derivedValue — no Angular, wrapping happens in app-computed.ts
const computedDefs = {
  doubled:   (s: CounterState) => s.count * 2,
  isZero:    (s: CounterState) => s.count === 0,
  isNeg:     (s: CounterState) => s.count < 0,
  stepLabel: (s: CounterState) => `step = ${s.step}`,
  summary:   (s: CounterState) => `${s.count} · ×2 = ${s.count * 2}`,
};

export const counterSlice = {
  name: 'counter' as const,
  initialState,
  creators,
  reducers,
  computed: computedDefs,
};
