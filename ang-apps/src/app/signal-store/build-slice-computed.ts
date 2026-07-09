import { computed, Signal } from '@angular/core';

export type ComputedDefs<S> = Record<string, (s: S) => unknown>;

// Maps each projection key to a Signal whose value type matches the projection's return.
export type ComputedSignals<C extends ComputedDefs<any>> = {
  [K in keyof C]: Signal<ReturnType<C[K]>>;
};

/**
 * Wraps a slice's plain projection functions in Angular computed() signals.
 * Called once per slice inside the singleton AppComputedState injectable —
 * the signals are created once and shared across all consumers.
 *
 *   buildSliceComputed({ doubled: s => s.count * 2 }, store.counter)
 *   // → { doubled: Signal<number> }
 */
export function buildSliceComputed<S, C extends ComputedDefs<S>>(
  defs: C,
  stateSignal: Signal<S>,
): ComputedSignals<C> {
  const result = {} as ComputedSignals<C>;
  for (const key of Object.keys(defs) as (keyof C & string)[]) {
    const proj = defs[key];
    (result as any)[key] = computed(() => proj(stateSignal()));
  }
  return result;
}
