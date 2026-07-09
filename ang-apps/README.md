# Angular Signal Store — React-Redux-Like Pattern

## Introduction

This app demonstrates a state management pattern for Angular 17+ that deliberately
mirrors the slice-based Redux architecture used in the React apps in this monorepo.
The goal is structural parity: a developer familiar with either codebase can read the
other without learning a new conceptual model.

The pattern is built on `@ngrx/signals` (NgRx Signal Store) rather than the traditional
`@ngrx/store`. The key idea is that slices are pure TypeScript — no Angular, no NgRx
imports — and a thin integration layer translates them into reactive Angular signals.

### Core benefits

- **Slices are framework-free.** `counter-slice.ts` and `todos-slice.ts` contain only
  plain TypeScript interfaces and functions. They can be unit-tested without TestBed,
  moved into a shared library, or reused in a non-Angular context.

- **One unified store, one DevTools connection.** All slices compose into a single
  `AppStore`. Redux DevTools shows the combined state tree
  `{ counter: { count, step }, todos: { items } }` and every action from every slice
  appears in the same timeline with its real name (`counter/increment`,
  `todos/addTodo`). Actions from one slice never reset the visible state of another.

- **No boilerplate per action.** `buildAllActions` derives the entire dispatch layer
  from each slice's `creators` and `reducers` at runtime. Adding a new action means
  adding it to the slice; nothing else changes.

- **Components are decoupled from the store.** They import only `injectActions()` and
  `injectState()` — never `AppStore`, `patchState`, or any `@ngrx/signals` symbol.
  This is the facade pattern, applied uniformly.

### Structural parallel to the React apps

| React (e.g. ticket app)                        | This Angular app                          |
|------------------------------------------------|-------------------------------------------|
| `actions/ticket-slice.ts` — `{ name, initialState, creators, reducers }` | `signal-store/counter-slice.ts` — identical shape |
| `actions/combined-slices.ts` — `allSlices`, `TotalState` | `signal-store/combined-slices.ts` — `allSlices`, `AppState` |
| `actions-integration/index.tsx` — `integrate()` | `signal-store/app.store.ts` + `actions.ts` |
| `dispatch(actions.counter.increment())` → `combineReducers` | `patchState(store, s => ({ counter: reducer(s.counter) }))` |
| `useSelector(s => s.counter)` | `injectState().counter` → `DeepSignal<CounterState>` |
| `useMemo(() => count * 2, [count])` | `computed(() => this.count() * 2)` in component |

---

## File structure

```
src/
├── testing/
│   └── store-testing.ts          shared test utilities (real store, no mocks)
└── app/
    ├── actions.ts                injectActions() — dispatch entry point
    ├── state.ts                  injectState()  — signal read entry point
    ├── signal-store/
    │   ├── combined-slices.ts    slice registry + AppState type
    │   ├── app.store.ts          single AppStore built from combined-slices
    │   ├── build-slice-actions.ts  buildAllActions() utility
    │   ├── with-devtools.ts      Redux DevTools integration
    │   ├── counter-slice.ts      pure slice (no Angular)
    │   ├── counter-slice.spec.ts pure reducer unit tests
    │   ├── todos-slice.ts        pure slice (no Angular)
    │   └── todos-slice.spec.ts   pure reducer unit tests
    └── components/
        ├── counter/
        │   ├── counter.component.ts
        │   └── counter.component.spec.ts
        └── todos/
            ├── todos.component.ts
            └── todos.component.spec.ts
```

---

## Q&A

### Is it necessary to make `injectActions()` and `injectState()` instance variables (`this.x`)? Can I import actions without `this`?

No, it is not possible to avoid `this`. `injectActions()` internally calls
`inject(AppStore)`, which requires an Angular injection context. That context only
exists during field initialization or the constructor body. Both produce instance
variables accessed via `this`. There is no way to call `inject` at module scope or
inside a free function outside a component or service.

---

### Can I narrow the injection to a single slice?

Yes. If a component only needs todos actions and todos state you can write:

```typescript
private ta = injectActions().todos;
private ts = injectState().todos;
```

Both `injectActions()` and `injectState()` call `inject(AppStore)` internally. Angular
deduplicates the injection and returns the same store instance both times, so there is
no performance cost to calling them separately or in parts.

You can then write `this.ta.addTodo(text)` and `this.ts.items` without carrying the
full namespace. The same narrowing works for state: `this.ts.items` is a
`Signal<Todo[]>`, `this.ts.items()` reads its current value.

---

### Do `computed()` signals update automatically?

Yes. `computed(() => this.todos().filter(t => t.done).length)` tracks every signal it
reads during evaluation. When `todos()` emits a new array reference — which always
happens after `patchState` because the reducers return new objects — Angular marks
every dependent `computed` stale. On next read (which happens during change detection
for a template, or immediately for a direct call in a test) the computed re-evaluates.
No subscription, no manual trigger, no dependency array required.

---

### Can I call `set()` on state signals? Can I restrict mutations to actions only?

The `DeepSignal<T>` properties exposed by `injectState()` (e.g. `store.counter.count`)
have no `set()` method — they are read-only signals at the type level. Direct mutation
from a component is not possible through the `injectState()` surface.

However, anyone who holds a reference to `AppStore` can still call `patchState` on it.
The constraint is structural, not enforced by the signal type itself: as long as
components only import `injectActions()` and `injectState()` and never import
`AppStore` or `patchState` directly, all mutations must go through the action layer.
ESLint `no-restricted-imports` can enforce this at the project level:

```json
{
  "no-restricted-imports": ["error", {
    "paths": [{
      "name": "../signal-store/app.store",
      "message": "Use injectActions() and injectState() instead of AppStore directly."
    }]
  }]
}
```

---

### Is this a standard Angular pattern?

The goal — exposing only state signals and action methods to components, never the raw
store — is well-established in Angular and is known as the **facade pattern**. It has
been documented and recommended by the NgRx team and prominent Angular authors since
approximately NgRx 6-7 (2018–2019). The canonical form uses one `@Injectable` service
per slice that wraps the store and exposes observables or signals.

What this pattern adds on top of the standard facade:

- **Slice definitions in pure TypeScript** (`{ name, initialState, creators, reducers }`)
  rather than NgRx action groups and reducers. This mirrors the React monorepo's own
  slice shape and keeps slices framework-free.
- **`buildAllActions`** derives the entire dispatch layer from the slice array at
  runtime, so no action methods are written by hand.
- **Two functions** (`injectActions`, `injectState`) replace one class per slice,
  assembling the namespace dynamically from `allSlices`.

The underlying goal is the same as the Angular facade pattern; the mechanism and the
structural parallel to the React apps is the original contribution here.

---

## DeepSignals — benefits, limitations, and scaling

`withState()` wraps every top-level key in the store state with `toDeepSignal()`, which
creates a proxy that exposes nested object fields as their own `Signal<T>`. For a state
`{ counter: { count: 0, step: 1 } }`, the store has both `store.counter` (a
`Signal<CounterState>`, callable to get the whole object) and `store.counter.count` (a
`Signal<number>`, reactive to that field alone). This section covers when that is useful
and where it breaks down.

### Benefits

**Granular subscriptions without selector boilerplate.**
A `computed` that reads `store.counter.count()` only re-evaluates when `count` changes.
If `step` changes, that computed is not invalidated. With traditional NgRx you would
need `createSelector(selectCounter, s => s.count)` to achieve the same granularity.
DeepSignal gives it automatically for any field at any depth.

**Works at any nesting level.**
Given `{ user: { address: { city: '' } } }`, `store.user.address.city` is a
`Signal<string>` with no extra work. Primitives all the way down are individually
reactive.

**Consistent read API.**
Whether reading the whole slice (`store.counter()`) or a single field
(`store.counter.count()`), the call shape is the same — a zero-argument function.
Templates and `computed` expressions look uniform.

### Limitations

**Arrays are opaque.**
`store.todos.items` is a `Signal<Todo[]>`. The array is one reactive unit. Individual
elements do not get their own signals — there is no `store.todos.items[0].done` signal.
Any `computed` that reads `items()` re-evaluates whenever the array reference changes,
regardless of how many elements actually changed. For small-to-medium lists this is
acceptable. For very large arrays with frequent partial updates it can produce more
JavaScript work than necessary, though Angular's `@for (track id)` still minimises DOM
patching to only the changed nodes.

**Shallow patchState.**
`patchState` merges at the top level only. Updating a nested field requires spreading
the parent object manually:
```typescript
patchState(store, s => ({ counter: { ...s.counter, count: s.counter.count + 1 } }))
```
For two levels this is readable. For four or five levels it becomes noisy. The
conventional remedy is to keep state flat — prefer `{ todoText: string; todoDone: boolean }`
over deeply nested trees.

**`DeepSignal<T>` is not a public type.**
The type exists in the NgRx internals and is inferred correctly through the store, but
you cannot import and annotate a variable as `DeepSignal<CounterState>` without reaching
into private APIs. In practice this rarely matters because TypeScript infers the type
through `injectState()` return values and template bindings, but it means you cannot
declare a standalone variable of that type in a test or utility without an `as` cast.

### How it scales by unit size

| Unit of state | Behaviour |
|---|---|
| **Primitive** (`count: number`) | Ideal — one signal, fires only on value change, zero overhead |
| **Small flat object** (`CounterState`) | Good — read at object level for convenience or at field level for precision |
| **Medium object** (5–15 fields) | Acceptable — read individual fields via deep signals to avoid unnecessary re-evaluation |
| **Large flat object** (20+ fields) | Workable — but consider splitting into multiple slices so the signal graph stays legible |
| **Array of primitives** | Good — one signal for the whole array, fine for typical list lengths |
| **Array of objects** (`Todo[]`) | Acceptable for <500 items; above that, profile before assuming a problem |
| **Deeply nested object** (3+ levels) | Caution — patchState spreads become verbose; prefer flattening state |

The practical rule: keep each slice's `initialState` shallow (one or two levels), and
let slice boundaries do the work that nesting would otherwise do. That is the same
discipline that keeps Redux reducers maintainable.

---

## Shared computed state

Currently, derived values like `completedCount` and `hasItems` are defined as
`computed()` calls directly in whichever component needs them. This is the correct
approach for component-specific derivations — identical to `useMemo` in the React
components. However, when the same derived value is needed in more than one component,
repeating the `computed` expression in each is wasteful and a maintenance liability.

### The problem with putting `computed()` inside `injectState()`

A tempting shortcut is to add `computed()` calls inside the `injectState()` function:

```typescript
export function injectState() {
  const store = inject(AppStore);
  const items = store.todos.items;
  return {
    todos: {
      items,
      completedCount: computed(() => items().filter(t => t.done).length), // ← wrong
    },
  };
}
```

This looks convenient but creates a **new `computed` instance on every call** to
`injectState()`. Five components each calling `injectState()` produces five independent
`completedCount` signals that each evaluate the same filter on every change. The values
are identical but the work is duplicated. `computed()` signals are cheap, but this
pattern breaks the expectation that shared state is computed once.

### The correct approach: `withComputed()` on the store

Computed signals that should be shared belong on the store itself, declared once via
`withComputed()` in `app.store.ts`. The store is `providedIn: 'root'` — a singleton —
so the signal is created once and every consumer reads the same instance:

```typescript
// app.store.ts
import { computed } from '@angular/core';
import { signalStore, withState, withComputed } from '@ngrx/signals';

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState({
    counter: counterSlice.initialState,
    todos:   todosSlice.initialState,
  }),
  withComputed(({ todos }) => ({
    completedCount:  computed(() => todos().items.filter(t => t.done).length),
    pendingCount:    computed(() => todos().items.filter(t => !t.done).length),
    hasItems:        computed(() => todos().items.length > 0),
    hasDone:         computed(() => todos().items.some(t => t.done)),
    allDone:         computed(() => todos().items.length > 0 && todos().items.every(t => t.done)),
    progressLabel:   computed(() => {
      const items = todos().items;
      return `${items.filter(t => t.done).length} / ${items.length} done`;
    }),
  })),
  withDevtools('AppStore'),
);
```

Then expose them in `state.ts` alongside the raw state signals:

```typescript
export function injectState() {
  const store = inject(AppStore);
  return {
    counter: store.counter,
    todos: {
      items:         store.todos.items,      // DeepSignal — raw state
      completedCount: store.completedCount,  // Signal<number> — shared computed
      pendingCount:   store.pendingCount,
      hasItems:       store.hasItems,
      hasDone:        store.hasDone,
      allDone:        store.allDone,
      progressLabel:  store.progressLabel,
    },
  } as const;
}
```

Every component that calls `injectState().todos.completedCount` reads the **same
`Signal<number>` instance**. It evaluates once when `todos.items` changes, regardless
of how many components are subscribed to it.

### Where computed signals belong — decision guide

| Derived value | Where to define it |
|---|---|
| Used in one component only | `computed()` in the component class |
| Used in two or more components | `withComputed()` in `app.store.ts`, exposed via `injectState()` |
| Component-specific formatting or combination of store + local state | `computed()` in the component |
| Expensive filter/sort over a large array | `withComputed()` on the store — compute once, share everywhere |

### Relation to the slice pattern

Computed signals defined in `withComputed()` live in `app.store.ts`, not in the slice
files. This is intentional: slice files are pure TypeScript with no Angular imports.
Computed signals require `computed()` from `@angular/core`. The separation mirrors how
the React apps treat selectors — they are not part of the slice config, they live in a
separate selectors file or are derived inline at the component. The same discipline
applies here.

If a computed value is complex enough to test independently, extract it as a pure
function alongside the slice file and call it from `withComputed()`:

```typescript
// todos-slice.ts  (pure, no Angular)
export function countDone(items: Todo[]): number {
  return items.filter(t => t.done).length;
}

// app.store.ts
withComputed(({ todos }) => ({
  completedCount: computed(() => countDone(todos().items)),
}))
```

The pure function is trivially unit-testable. The `computed` wrapper is a one-liner.

---

## Coexistence with a traditional `@ngrx/store`

If this app needs to share state with other parts of an application that use the
traditional `@ngrx/store` (action groups, reducers, selectors, effects), the two
stores can coexist in the same Angular application without conflict. Here is what
changes and what stays the same.

### What stays the same

- The slice files (`counter-slice.ts`, `todos-slice.ts`) are pure TypeScript and do
  not change at all.
- The `combined-slices.ts` registry, `allSlices`, and `AppState` type do not change.
- The `injectActions()` and `injectState()` facades do not change.
- Components do not change.

### Option A — run both stores side by side (recommended starting point)

Register the traditional NgRx store in `app.config.ts` alongside the Signal Store.
They operate completely independently:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    // Traditional NgRx store for slices that already live there
    provideStore({ auth: authReducer, router: routerReducer }),
    provideEffects(AuthEffects),
    provideStoreDevtools({ maxAge: 50 }),

    // Signal Store slices via AppStore (providedIn: 'root', self-registering)
    // No extra provider needed — AppStore is already providedIn: 'root'
  ],
};
```

Components that need traditional NgRx state use `Store` (or its own facade) directly.
Components that need Signal Store state use `injectActions()` / `injectState()`. There
is no interference between the two.

The one limitation: the two stores appear as separate instances in Redux DevTools. The
traditional store registers under its own name; `AppStore` registers under `'AppStore'`
via `withDevtools`. They are inspectable but not in a single unified timeline.

### Option B — migrate signal slices into the traditional store

If you later want the signal slices to appear in the same DevTools timeline as the
traditional store, or if a slice needs to react to NgRx effects or router state, the
migration path is:

1. Convert the slice's `creators` / `reducers` to `createActionGroup` +
   `createReducer`. The shape maps directly:
   - each `creators.X` becomes one event in `createActionGroup`
   - each `reducers.X` becomes one `on(Actions.x, ...)` handler

2. Add the reducer to `provideStore({ ..., counter: counterReducer })`.

3. Add selectors and a traditional state service (or use `store.selectSignal()`
   directly in `injectState()`).

4. Remove the slice from `allSlices` and from `AppStore`'s `withState` call.

The `injectActions()` and `injectState()` facades remain. Only their internals change:
instead of calling `patchState`, the action methods call `store.dispatch()`; instead of
reading a `DeepSignal`, state methods call `store.selectSignal(selector)`. Components
see no difference.

### Option C — expose traditional NgRx state through `injectState()`

If you want components to read both signal-store state and traditional NgRx state
through the same `injectState()` surface, extend the function:

```typescript
// state.ts
export function injectState() {
  const appStore  = inject(AppStore);
  const ngrxStore = inject(Store);          // traditional @ngrx/store Store

  return {
    // Signal Store slices
    counter: appStore.counter,
    todos:   appStore.todos,

    // Traditional NgRx slice exposed as a signal
    auth: ngrxStore.selectSignal(selectAuthState),
  } as const;
}
```

Components remain completely unaware of which underlying store each slice comes from.

### Deciding which store to use for new slices

| Slice characteristic | Recommended store |
|---|---|
| Pure local/UI state, no effects needed | Signal Store (`@ngrx/signals`) |
| Needs effects (HTTP, WebSocket, router) | Traditional NgRx (`@ngrx/store` + effects) |
| Must share state with existing NgRx slices | Traditional NgRx |
| Will eventually move to a shared library | Signal Store (framework-free slice shape) |
| Needs to coexist with server-side rendering | Either (both support SSR in Angular 17+) |

The facade layer (`injectActions`, `injectState`) means this decision can be changed
later without touching any component.
