import { patchState } from '@ngrx/signals';
import { currentAction } from './with-devtools';

type Creator  = (...args: any[]) => object;
type Reducer<S> = (state: S, payload: any) => S;

// Map each creator's parameter list to a void-returning action function.
// e.g. creators.setStep: (step: number) => { step }
//  →   actions.setStep: (step: number) => void
export type SliceActions<C extends Record<string, Creator>> = {
  [K in keyof C]: (...args: Parameters<C[K]>) => void;
};

type AnySlice = {
  name: string;
  creators: Record<string, Creator>;
  reducers: Record<string, Reducer<any>>;
};

// Mapped type: distribute over a union of slice types, use each slice's
// literal name as the key and derive actions from its creators.
// e.g. allSlices → { counter: SliceActions<counterCreators>, todos: SliceActions<todosCreators> }
export type ActionsFromSlices<Slices extends readonly AnySlice[]> = {
  [S in Slices[number] as S['name']]: SliceActions<S['creators']>;
};

/**
 * Derives a typed action-dispatch object from a single slice config.
 */
export function buildSliceActions<
  N extends string,
  C extends Record<string, Creator>,
>(
  slice: { name: N; creators: C; reducers: Record<keyof C, Reducer<any>> },
  store: any,
): SliceActions<C> {
  const actions = {} as SliceActions<C>;

  for (const key of Object.keys(slice.creators) as (keyof C & string)[]) {
    const creator = slice.creators[key];
    const reducer = slice.reducers[key];

    (actions as any)[key] = (...args: unknown[]) => {
      currentAction.name = `${slice.name}/${key}`;
      patchState(store, (s: any) => ({
        [slice.name]: reducer(s[slice.name], creator(...args)),
      }));
    };
  }

  return actions;
}

/**
 * Builds the full namespaced actions object from all slices.
 * The return type is derived entirely from the slice list — no manual
 * name/type declarations needed in the call site.
 */
export function buildAllActions<Slices extends readonly AnySlice[]>(
  slices: Slices,
  store: any,
): ActionsFromSlices<Slices> {
  const result: any = {};
  for (const slice of slices) {
    result[slice.name] = buildSliceActions(slice, store);
  }
  return result;
}
