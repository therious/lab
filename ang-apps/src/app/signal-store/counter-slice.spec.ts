import { counterSlice, CounterState } from './counter-slice';

const { creators: c, reducers: r, initialState: init } = counterSlice;

describe('counter-slice creators', () => {
  it('increment produces an empty payload', () => {
    expect(c.increment()).toEqual({});
  });

  it('decrement produces an empty payload', () => {
    expect(c.decrement()).toEqual({});
  });

  it('reset produces an empty payload', () => {
    expect(c.reset()).toEqual({});
  });

  it('setStep carries the step value', () => {
    expect(c.setStep(5)).toEqual({ step: 5 });
  });
});

describe('counter-slice reducers', () => {
  const base: CounterState = { count: 10, step: 3 };

  it('increment adds step to count', () => {
    expect(r.increment(base).count).toBe(13);
  });

  it('decrement subtracts step from count', () => {
    expect(r.decrement(base).count).toBe(7);
  });

  it('increment does not mutate input', () => {
    r.increment(base);
    expect(base.count).toBe(10);
  });

  it('reset returns the initial state regardless of input', () => {
    expect(r.reset()).toEqual(init);
  });

  it('setStep updates step without changing count', () => {
    const result = r.setStep(base, { step: 10 });
    expect(result.step).toBe(10);
    expect(result.count).toBe(10);
  });

  it('increment uses the current step, not the initial step', () => {
    const modified = r.setStep(base, { step: 7 });
    expect(r.increment(modified).count).toBe(17);
  });

  it('count can go negative', () => {
    const atZero: CounterState = { count: 0, step: 1 };
    expect(r.decrement(atZero).count).toBe(-1);
  });
});
