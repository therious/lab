# Angular 17 React-Like Recipe — Take 2

This document supersedes `angular-react-like-recipe.md`. It is a standalone recipe.
The opening section answers seven clarifying questions raised after Take 1;
the revised recipe below fully incorporates the answers.

---

## Questions and Answers

### Q1 — Does `OnPush` coexist with an application that does not yet use it?

Yes, completely. Angular runs change detection per-component, not per-application.
A component with `ChangeDetectionStrategy.OnPush` opts that component (and its
subtree, unless a descendant opts back in to Default) out of the global check cycle.
Components you haven't yet converted keep their existing Default strategy and are
unaffected. You can migrate one component at a time, one feature at a time. There
is no flag, migration script, or configuration needed — just add the property to the
decorator and it takes effect for that component only.

The one thing to be aware of during incremental migration: if a Default-strategy
parent passes a mutated object to an OnPush child (same reference, changed
properties), the OnPush child won't re-render. This is the same rule that applies
in React's `React.memo` / `PureComponent` world. The fix is the same: produce
new object references on change, or route state through the store (which always
produces new references on change). Once you are routing all state through NgRx
and signals, this is not a concern.

---

### Q2 — Can I auto-wrap all actions in dispatch without writing each method manually?

Yes. The monorepo uses `bindActionCreators` from Redux. The Angular equivalent is
a typed helper you write once. In Take 2, the recipe defines `bindToStore()` — a
ten-line utility that takes an action group and a store reference and returns an
object of the same shape where every function dispatches instead of returning an
action object. The facade then reduces to one-line property assignments, matching
the spirit of the React pattern exactly.

---

### Q3 — Can components avoid importing anything from NgRx?

Yes, and this is the preferred pattern. Take 1's components still called
`this.store.selectSignal()` directly, which leaks NgRx knowledge into the component.
The revision merges state signals into the same facade as the actions, giving the
component a single import that exposes both. The component ends up with zero NgRx
imports: it only imports the facade and Angular's `computed`.

---

### Q4a — What are signal inputs and why prefer them over `@Input`?

A traditional `@Input()` decorated property is a plain TypeScript field. Angular sets
it before `ngOnInit`, but after that it is just a value — not reactive. If the parent
passes a new value, Angular calls `ngOnChanges`, which you must implement to react.
The property cannot participate in `computed()` or `effect()` because it is not a
Signal.

`input()` (`[17.3+]` stable, `[17.2]` developer preview) declares the property as a
Signal from the start. The parent still passes a value with the same template syntax
`[player]="somePlayer"`. Inside the component, `this.player()` reads the current
value and `computed(() => this.player().name)` recomputes whenever the parent passes
a new value — no `ngOnChanges`, no imperative hook.

```typescript
// Traditional — not reactive in computed()
@Component({ ... })
class PlayerCard {
  @Input({ required: true }) player!: Player;

  // Must implement ngOnChanges to react; cannot compose with computed()
  get displayName() { return this.player.name.toUpperCase(); }
}

// Signal input [17.3+] — fully reactive
@Component({ ... })
class PlayerCard {
  readonly player = input.required<Player>();
  readonly displayName = computed(() => this.player().name.toUpperCase());
  // displayName re-evaluates automatically whenever parent passes a new player
}

// [17.2 fallback] — @Input with manual effect
@Component({ ... })
class PlayerCard {
  @Input({ required: true }) player!: Player;
  // Reactive derivation requires a manual effect, which is more verbose
}
```

For a component that consumes store signals and has no inputs (the common case in
this recipe), the distinction does not matter — you simply don't use `@Input` at all.
Signal inputs become relevant for presentational leaf components like `<app-player-card>`.

---

### Q4b — Is there a more declarative pattern for Effects / async actions?

The RxJS pipeline in Take 1's Effects section is the canonical NgRx style. It is
functional but not particularly readable to someone who doesn't think in RxJS operators.

Two alternatives are shown in Take 2:

**Option A — named operators.** Extract each step of the pipeline into a named
constant that reads like a description. The `createEffect` body then reads as a list
of named transformations rather than nested lambdas.

**Option B — `asyncEffect` helper.** A thin wrapper you write once that accepts a
config object (`on`, `run`, `onSuccess`, `onError`, `strategy`). The config object
is declarative: it describes intent in named keys rather than expressing it as
composed pipeline operators. This is close to Redux Toolkit's `createAsyncThunk`
in spirit. The RxJS is written once inside the helper and never touched again.

Both are shown in the Effects section below.

---

### Q5 — How do functional lifecycle hooks relate to the traditional ones, and how do I sell this to Angular developers?

Every traditional lifecycle hook has a functional equivalent. The functional versions
are simpler because they require no interface, no method name the framework calls by
convention, no class-level state just to hold a subscription, and no forgetting to
clean up. They can also be extracted into shared utility functions — the traditional
hooks are locked to the class.

The full comparison is in the Component Lifecycle section below. The short version for
the sell:

- `ngOnInit` disappears: signal fields initialize at declaration time, not in a hook.
- `ngOnDestroy` becomes `destroyRef.onDestroy(() => cleanup())` — one line, inline.
- `ngAfterViewInit` becomes `afterNextRender(() => ...)` — same body, no interface.
- `ngOnChanges` disappears entirely: signal inputs + `computed()` replace it.

The result is a class body with no methods named `ngAnything`, no interfaces in the
`implements` clause, and no lifecycle-related fields scattered around the class.

---

### Q6 — Why would I want `inject()` over the constructor?

Four concrete reasons:

**1. No constructor boilerplate.** Five injected dependencies in the traditional
style require a five-parameter constructor signature. With `inject()` the constructor
disappears entirely unless you have other work to do there.

**2. Inheritance without parameter forwarding.** The traditional style forces every
subclass to re-declare every parent dependency and pass it to `super()`. With
`inject()`, a base class injects its own dependencies at field level; subclasses add
theirs the same way without touching the parent.

**3. Extractable utility functions.** `inject()` can be called anywhere an injection
context exists — field initializers, constructor bodies, and factory functions. This
enables "custom hook" equivalents: a plain function that calls `inject()` internally
and returns a bundle of signals and methods, usable across components without
inheritance or mixins.

**4. Ordering by concern, not by signature.** Constructor parameters must be listed
before they are used. Field initializers with `inject()` can be grouped by role —
all state signals together, all action bindings together — regardless of what they
depend on.

---

### Q7 — Performance summary, deviation from standard Angular practices, and migration impact

See the dedicated Performance and Migration section at the end of the recipe.

---

---

## The Recipe

### Dependencies

```json
{
  "@ngrx/store":     "^17.0.0",
  "@ngrx/effects":   "^17.0.0",
  "@ngrx/operators": "^17.0.0",
  "@ngrx/devtools":  "^17.0.0",
  "@angular/core":   "^17.2.0"
}
```

---

### 1. Application State Shape

```typescript
// src/app/state/app.state.ts
import { TicketState } from './ticket/ticket.state';
import { ChatState }   from './chat/chat.state';
import { UsersState }  from './users/users.state';

// Equivalent to the monorepo's TotalState
export interface AppState {
  ticket: TicketState;
  chat:   ChatState;
  users:  UsersState;
}
```

---

### 2. Defining a Slice

The monorepo's pattern is two parallel objects — `creators` (payload generators) and
`reducers` (state updaters) — verified to have matching keys. NgRx's equivalent is
`createActionGroup` for the creators side and `createReducer` with `on()` handlers
for the reducer side. Both sides are in separate files by convention.

```typescript
// src/app/state/ticket/ticket.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const TicketActions = createActionGroup({
  source: 'Ticket',
  events: {
    'Reset Game':  emptyProps(),
    'Add Player':  props<{ player: Player }>(),
    'Next Player': emptyProps(),
    'Draw Colors': props<{ cards: Card[] }>(),
    'Draw Ticket': props<{ ticket: string[] }>(),
    'Claim Route': props<{ route: Route; cards: Record<string, number> }>(),
    'Save Failed': emptyProps(),
  },
});
// Produces camelCase creators: TicketActions.resetGame(), TicketActions.addPlayer({player}), …
```

```typescript
// src/app/state/ticket/ticket.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { TicketActions }     from './ticket.actions';
import { TicketState, initialTicketState, playerTemplate } from './ticket.state';

export const ticketReducer = createReducer(
  initialTicketState,

  on(TicketActions.resetGame,  (): TicketState =>
    ({ ...initialTicketState })),

  on(TicketActions.addPlayer, (s, { player }): TicketState =>
    ({ ...s, players: [...s.players, { ...playerTemplate, ...player }] })),

  on(TicketActions.nextPlayer, (s): TicketState =>
    ({ ...s, whoPlaysNow: (s.whoPlaysNow + 1) % s.players.length })),

  on(TicketActions.drawColors, (s, { cards }): TicketState =>
    ({ ...s, colorDeck: s.colorDeck.returnDealt(cards) })),

  on(TicketActions.claimRoute, (s, { route, cards }): TicketState =>
    ({ ...s, /* immutable update */ })),
);
```

```typescript
// src/app/state/ticket/ticket.selectors.ts
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { TicketState } from './ticket.state';

export const selectTicket        = createFeatureSelector<TicketState>('ticket');
export const selectPlayers       = createSelector(selectTicket, s => s.players);
export const selectWhoPlaysNow   = createSelector(selectTicket, s => s.whoPlaysNow);

// Derived selector — memoized automatically. Projection only runs when inputs change.
export const selectCurrentPlayer = createSelector(
  selectPlayers, selectWhoPlaysNow,
  (players, idx) => players[idx] ?? null,
);
```

---

### 3. The `bindToStore` Utility

Write this once in a shared file. It is the `bindActionCreators` equivalent.

```typescript
// src/app/state/bind-to-store.ts
import { Store }       from '@ngrx/store';
import { TypedAction } from '@ngrx/store';

type ActionCreatorMap = Record<string, (...args: any[]) => TypedAction<string>>;

type BoundActions<T extends ActionCreatorMap> = {
  readonly [K in keyof T]: (...args: Parameters<T[K]>) => void;
};

/**
 * Takes an NgRx action group and a Store reference.
 * Returns an object of the same shape where every function dispatches
 * rather than returning an action object.
 *
 * Equivalent to Redux's bindActionCreators(actionCreators, dispatch).
 */
export function bindToStore<T extends ActionCreatorMap>(
  store: Store,
  creators: T,
): BoundActions<T> {
  return Object.fromEntries(
    Object.entries(creators)
      .filter(([, v]) => typeof v === 'function')
      .map(([key, creator]) => [
        key,
        (...args: unknown[]) => store.dispatch(creator(...args)),
      ]),
  ) as BoundActions<T>;
}
```

---

### 4. The Unified Facade

The facade exposes both **state signals** and **bound action methods** in one injectable.
Components import only this — no NgRx imports anywhere in a component file.

```typescript
// src/app/state/ticket/ticket.facade.ts
import { Injectable, inject } from '@angular/core';
import { Store }              from '@ngrx/store';
import { TicketActions }      from './ticket.actions';
import { selectPlayers, selectWhoPlaysNow, selectCurrentPlayer } from './ticket.selectors';
import { bindToStore }        from '../bind-to-store';

@Injectable({ providedIn: 'root' })
export class TicketFacade {
  private store = inject(Store);

  // ── State signals — equivalent to useSelector() ───────────────────────────
  // Components read these as: this.tf.players()
  readonly players       = this.store.selectSignal(selectPlayers);
  readonly whoPlaysNow   = this.store.selectSignal(selectWhoPlaysNow);
  readonly currentPlayer = this.store.selectSignal(selectCurrentPlayer);

  // ── Auto-bound actions — equivalent to bindActionCreators ─────────────────
  // One call does what used to require a method body per action.
  private bound = bindToStore(this.store, TicketActions);

  // Expose with the same names as the action group — one line each, no body.
  readonly resetGame  = this.bound.resetGame;
  readonly addPlayer  = this.bound.addPlayer;
  readonly nextPlayer = this.bound.nextPlayer;
  readonly drawColors = this.bound.drawColors;
  readonly claimRoute = this.bound.claimRoute;
}
```

For a multi-slice aggregate equivalent to the monorepo's `actions.ticket.*` / `actions.chat.*`:

```typescript
// src/app/facades.ts
import { TicketFacade } from './state/ticket/ticket.facade';
import { ChatFacade }   from './state/chat/chat.facade';
import { UsersFacade }  from './state/users/users.facade';

// Call inside any injection context (constructor body, field initializer):
//   const { ticket, chat } = injectFacades();
export function injectFacades() {
  return {
    ticket: inject(TicketFacade),
    chat:   inject(ChatFacade),
    users:  inject(UsersFacade),
  };
}
```

---

### 5. Application Bootstrap

```typescript
// src/app/app.config.ts
import { ApplicationConfig }    from '@angular/core';
import { provideStore }         from '@ngrx/store';
import { provideEffects }       from '@ngrx/effects';
import { provideStoreDevtools }  from '@ngrx/store-devtools';
import { ticketReducer }        from './state/ticket/ticket.reducer';
import { TicketEffects }        from './state/ticket/ticket.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ ticket: ticketReducer, chat: chatReducer, users: usersReducer }),
    provideEffects(TicketEffects, ChatEffects),
    provideStoreDevtools({ maxAge: 50 }),
  ],
};
```

---

### 6. Component Shape

The only Angular-specific imports in the component are `Component`, `ChangeDetectionStrategy`,
`inject`, and `computed`. There are no NgRx imports.

```typescript
// src/app/components/game/game.component.ts
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { TicketFacade } from '../../state/ticket/ticket.facade';
import { playerColors, playerOrdinals } from '../../constants';

@Component({
  selector: 'app-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game.component.html',
})
export class GameComponent {
  // ── One import for everything — state and actions ─────────────────────────
  private tf = inject(TicketFacade);

  // ── State — directly alias facade signals; no selectSignal in sight ───────
  readonly players       = this.tf.players;        // Signal<Player[]>
  readonly currentPlayer = this.tf.currentPlayer;  // Signal<Player | null>

  // ── Derived view values — recompute only when their signal deps change ─────
  // Equivalent to useMemo / reselect
  readonly canAddPlayer    = computed(() => this.tf.players().length < 5);
  readonly nextPlayerLabel = computed(() =>
    `Player ${playerOrdinals[this.tf.players().length]}`
  );

  // ── Event handlers — arrow functions, no useCallback equivalent needed ─────
  // Angular's class instance doesn't re-create on each render cycle the way a
  // React function body does. Memoization of handlers is never required here.
  readonly resetGame = () => this.tf.resetGame();

  readonly addPlayer = () => {
    const name = prompt(`${this.nextPlayerLabel()} name?`);
    if (name) this.tf.addPlayer({ name, color: playerColors[this.tf.players().length] });
  };

  readonly dealColorCards = (count: number) => {
    const clipped = Math.min(this.colorDeck.remaining().length, count);
    dealCardsSoundEffect(clipped,
      () => this.tf.drawColors(this.colorDeck.deal(1)),
      this.tf.nextPlayer,
    );
  };
}
```

```html
<!-- game.component.html -->
<!-- @if, @for — the 17.0+ built-in control flow; no *ngIf / *ngFor needed -->
<div class="game">
  <button (click)="resetGame()">Reset Game</button>
  <button (click)="addPlayer()" [disabled]="!canAddPlayer()">Add Player</button>

  @for (player of players(); track player.id) {
    <app-player-view [player]="player" />
  }

  @if (currentPlayer(); as cp) {
    <app-active-player [player]="cp" />
  }
</div>
```

#### Why `OnPush` is required

Without `ChangeDetectionStrategy.OnPush`, Angular re-checks every component on every
browser event (click, keydown, HTTP response, timer tick) — even if no relevant state
changed. With `OnPush`, a component only re-renders when:

1. A Signal it reads during rendering changes value (primary mechanism here)
2. An `@Input` reference is replaced (secondary)

This gives the same render-on-state-change guarantee as React's selective re-render
model. Adding it to an existing component that doesn't use signals yet is safe — inputs
and async pipes still trigger re-renders as before.

---

### 7. Consuming Nested State

```typescript
// Fine-grained selector — reusable, memoized automatically
export const selectCurrentPlayerHand = createSelector(
  selectCurrentPlayer,
  p => p?.colorCardsInHand ?? {}
);

// In the facade:
readonly currentPlayerHand = this.store.selectSignal(selectCurrentPlayerHand);

// In the component — no NgRx:
readonly hand      = this.tf.currentPlayerHand;
readonly handTotal = computed(() =>
  Object.values(this.hand()).reduce((sum, n) => sum + n, 0)
);
```

Use a named selector for anything consumed in more than one place. Use `computed()` in
the component for view-only derivations that are not worth exporting as selectors.

---

### 8. Avoiding RxJS in Components

You will encounter Observables at boundaries (routing, HTTP, third-party libraries).
Convert them at the boundary with `toSignal()` so the rest of the component stays
signal-only. `toSignal()` unsubscribes automatically when the injection context is
destroyed — there is no `unsubscribe()` call to forget.

```typescript
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';

@Component({ ... })
export class ShellComponent {
  private router = inject(Router);

  // Observable converted to Signal at the boundary.
  // The rest of this component is signal-only.
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: '/' },
  );
}
```

For NgRx state specifically, use `store.selectSignal()` directly in the facade — it is
`toSignal` over a selector, already bundled. Only reach for `toSignal()` manually when
you need to compose an Observable pipeline before the signal conversion.

---

### 9. Async Actions — Effects (Two Patterns)

**Pattern A — named operators (declarative pipeline)**

Extract each pipeline step into a named constant. The `createEffect` body reads as a
list of named transformations.

```typescript
// src/app/state/ticket/ticket.effects.ts
import { Injectable, inject }           from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map, catchError }   from 'rxjs/operators';
import { of }                            from 'rxjs';
import { TicketActions }                 from './ticket.actions';
import { TicketApiService }              from './ticket-api.service';

// Named operators — each line reads as a description
const whenClaimRoute   = ofType(TicketActions.claimRoute);
const afterClaim       = map(() => TicketActions.nextPlayer());
const onSaveError      = catchError(() => of(TicketActions.saveFailed()));

@Injectable()
export class TicketEffects {
  private actions$ = inject(Actions);
  private api      = inject(TicketApiService);

  saveGame$ = createEffect(() =>
    this.actions$.pipe(
      whenClaimRoute,
      exhaustMap(({ route, cards }) =>
        this.api.persist(route, cards).pipe(afterClaim, onSaveError)
      ),
    )
  );
}
```

**Pattern B — `asyncEffect` config helper (most declarative)**

Write this helper once. It replaces the RxJS pipeline with a config object for
the common action → async call → success/failure pattern.

```typescript
// src/app/state/async-effect.ts
import { inject }                             from '@angular/core';
import { Actions, createEffect, ofType }       from '@ngrx/effects';
import { Observable, of }                      from 'rxjs';
import { exhaustMap, switchMap, concatMap,
         mergeMap, map, catchError }            from 'rxjs/operators';
import { TypedAction, ActionCreator }           from '@ngrx/store';

type Strategy = 'exhaust' | 'switch' | 'concat' | 'merge';
const strategyMap = {
  exhaust: exhaustMap,
  switch:  switchMap,
  concat:  concatMap,
  merge:   mergeMap,
} as const;

export interface AsyncEffectConfig<P, R> {
  on:        ActionCreator;
  run:       (payload: P) => Observable<R>;
  onSuccess: (result: R, payload: P) => TypedAction<string>;
  onError:   (err: unknown, payload: P) => TypedAction<string>;
  strategy?: Strategy;
}

export function asyncEffect<P, R>(config: AsyncEffectConfig<P, R>) {
  return createEffect(
    (actions$ = inject(Actions)) =>
      actions$.pipe(
        ofType(config.on),
        strategyMap[config.strategy ?? 'exhaust']((payload: P) =>
          config.run(payload).pipe(
            map(result  => config.onSuccess(result, payload)),
            catchError(err => of(config.onError(err, payload))),
          )
        ),
      ),
    { functional: true },
  );
}
```

Usage — the effect is now a config object, not a pipeline:

```typescript
// src/app/state/ticket/ticket.effects.ts
import { asyncEffect }    from '../async-effect';
import { TicketActions }  from './ticket.actions';
import { TicketApiService } from './ticket-api.service';

export const saveGame = asyncEffect({
  on:        TicketActions.claimRoute,
  run:       ({ route, cards }) => inject(TicketApiService).persist(route, cards),
  onSuccess: ()                 => TicketActions.nextPlayer(),
  onError:   ()                 => TicketActions.saveFailed(),
  strategy:  'exhaust',
});
```

For Firestore / WebSocket real-time subscriptions (equivalent to `chatMiddleware`):

```typescript
// src/app/state/chat/chat.effects.ts
export const listenToChannel = createEffect(
  (actions$ = inject(Actions), chatSvc = inject(ChatService)) =>
    actions$.pipe(
      ofType(ChatActions.joinChannel),
      switchMap(({ channelId }) =>
        chatSvc.messages$(channelId).pipe(       // Observable<Message[]> from Firestore
          map(messages => ChatActions.messagesReceived({ messages })),
        )
      ),
    ),
  { functional: true },
);
```

---

### 10. Component Lifecycle — Functional vs Traditional

The goal is a component with no methods named `ngAnything` and no `implements` clauses.

#### Initialization — replacing `ngOnInit`

With signal-based state, `ngOnInit` is rarely needed. Signal fields initialize at
declaration time; they are already reactive before the component renders.

```typescript
// Traditional — imperative setup in hook
export class OldComponent implements OnInit {
  players: Player[] = [];
  private sub!: Subscription;

  ngOnInit() {
    this.sub = this.store.select(selectPlayers).subscribe(p => this.players = p);
  }
  ngOnDestroy() { this.sub.unsubscribe(); }
}

// Revised — no hook needed; the signal is live from the moment the field is declared
export class NewComponent {
  readonly players = this.tf.players;  // Signal<Player[]>, already reactive
}
```

When you do need to run code once after the component exists (e.g., reading a
query parameter from the router), use a constructor body or an `effect()`:

```typescript
constructor() {
  effect(() => {
    // Runs once immediately, then whenever this.tf.players() changes.
    // No ngOnInit, no subscription.
    if (this.tf.players().length === 0) this.tf.resetGame();
  });
}
```

#### Cleanup — replacing `ngOnDestroy`

```typescript
// Traditional — implements interface, separate method
export class OldComponent implements OnDestroy {
  private chart!: Chart;
  ngOnDestroy() { this.chart.destroy(); }
}

// Functional — inline, no interface, no method
export class NewComponent {
  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.chart?.destroy());
  }
}
```

`destroyRef.onDestroy()` can be called multiple times; each callback is independent.
It can also be called from a utility function (see Custom Hooks below), unlike
`ngOnDestroy` which is locked to the class.

#### DOM access after render — replacing `ngAfterViewInit`

```typescript
// Traditional
export class OldMap implements AfterViewInit {
  @ViewChild('container') container!: ElementRef;
  private network!: VisNetwork;

  ngAfterViewInit() {
    this.network = new VisNetwork(this.container.nativeElement, ...);
  }
  ngOnDestroy() { this.network.destroy(); }
}

// Functional [17.3+ stable] / [17.2 fallback: ngAfterViewInit + ngOnDestroy]
export class NewMap {
  private container = viewChild.required<ElementRef>('container');

  constructor() {
    let network: VisNetwork;

    afterNextRender(() => {
      network = new VisNetwork(this.container().nativeElement, ...);
    });

    inject(DestroyRef).onDestroy(() => network?.destroy());
  }
}
```

`afterNextRender` runs once after the first render. `afterRender` runs after every
render (useful for updating a canvas or chart when signal data changes).

#### Reacting to input changes — replacing `ngOnChanges`

```typescript
// Traditional — verbose, untyped SimpleChanges
export class OldCard implements OnChanges {
  @Input({ required: true }) player!: Player;
  displayName = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['player']) {
      this.displayName = changes['player'].currentValue.name.toUpperCase();
    }
  }
}

// Signal input [17.3+] — no hook, no SimpleChanges
export class NewCard {
  readonly player      = input.required<Player>();
  readonly displayName = computed(() => this.player().name.toUpperCase());
  // Recomputes automatically when parent passes a new player. No hook needed.
}
```

#### Selling it to Angular developers

The functional alternatives produce shorter code, but the more important argument is
**composability**. Traditional lifecycle hooks are methods on a class — they cannot be
moved, shared, or extracted without inheritance or mixins. Functional equivalents are
plain function calls. A utility function can call `inject(DestroyRef).onDestroy()` or
`afterNextRender()` internally, and every component that calls that utility gets the
cleanup for free. The traditional approach requires every component to duplicate the
lifecycle code.

---

### 11. The `inject()` Style

```typescript
// Traditional — constructor declares every dependency
@Component({ ... })
export class OldStyle {
  constructor(
    private store: Store,
    private facade: TicketFacade,
    private router: Router,
    private chatFacade: ChatFacade,
    private destroyRef: DestroyRef,
  ) {}
}

// inject() — no constructor, dependencies declared where they are used
@Component({ ... })
export class NewStyle {
  private tf    = inject(TicketFacade);
  private chat  = inject(ChatFacade);
  private router = inject(Router);
}
```

**Inheritance without forwarding:**

```typescript
// Traditional — child must re-declare parent deps and call super()
class Base {
  constructor(protected store: Store) {}
}
class Child extends Base {
  constructor(store: Store, private router: Router) {
    super(store);   // fragile; adding a dep to Base breaks all subclasses
  }
}

// inject() — no super() needed
class Base   { protected store = inject(Store);  }
class Child extends Base { private router = inject(Router); }
// Adding a dep to Base does not touch Child at all.
```

**Extractable utility functions (custom hook equivalent):**

`inject()` can be called from any function that runs inside an injection context
(field initializers and constructor bodies are injection contexts). This enables
composable setup utilities:

```typescript
// A reusable "hook" — equivalent to a custom React hook
function useColorDeck() {
  const tf         = inject(TicketFacade);
  const hand       = computed(() => tf.currentPlayerHand());
  const dealColors = (count: number) => tf.drawColors(dealFromDeck(count));
  return { hand, dealColors };
}

// In any component:
export class MapComponent {
  private deck = useColorDeck();  // field initializer is an injection context
  readonly hand = this.deck.hand;
  readonly deal = this.deck.dealColors;
}
```

---

### 12. Signal Inputs — Presentational Components

For components that receive data from a parent rather than from the store (leaf UI
components like cards, badges, panels):

```typescript
// [17.3+] stable
import { input, output } from '@angular/core';

@Component({
  selector: 'app-player-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <span>{{ displayName() }}</span>
      <span>{{ hand() | json }}</span>
    </div>
  `,
})
export class PlayerCardComponent {
  readonly player = input.required<Player>();     // Signal<Player>
  readonly hand   = input<CardHand>({});          // Signal<CardHand>, default {}

  // Derived from input signal — recomputes when parent passes a new value.
  // No ngOnChanges, no SimpleChanges, no setter.
  readonly displayName = computed(() => this.player().name.toUpperCase());
}

// [17.2 fallback] — @Input with getter for derived values
@Component({ ... })
export class PlayerCardComponent {
  @Input({ required: true }) player!: Player;
  @Input() hand: CardHand = {};
  get displayName() { return this.player.name.toUpperCase(); }
  // Works but displayName is a getter, not a Signal — cannot feed into effect()
}
```

---

### 13. Communication Without Prop Drilling or `@Output`

Route all cross-component state through the store. A child component that needs to
communicate upward dispatches through its facade; the parent reads the result from a
signal. No `@Output`, no callback props.

```typescript
// app-claim-panel has no @Output — it owns its action
@Component({ selector: 'app-claim-panel', ... })
export class ClaimPanelComponent {
  private tf = inject(TicketFacade);

  readonly selectedRoute = this.tf.selectedRoute;  // Signal from store
  readonly currentPlayer = this.tf.currentPlayer;

  readonly claim = () => {
    const route = this.selectedRoute();
    const cards = computeCardsToUse(this.currentPlayer(), route);
    this.tf.claimRoute(route, cards);
    // Parent re-renders from the updated signal — no event emitted upward
  };
}
```

`@Output` is appropriate only at generic UI widget boundaries (e.g., a date picker,
a drag-and-drop list) where the widget has no knowledge of your store. At those
boundaries, the first smart ancestor component handles the output with a facade call.

---

### 14. Performance Summary

| Concern | This recipe | Default Angular |
|---|---|---|
| Change detection runs | Only when a consumed signal changes | Every browser event, every component |
| Derived value recomputation | `computed()` — only when signal deps change | `get` methods run on every CD cycle |
| Selector recomputation | NgRx `createSelector` memoizes — runs only when input slices change | N/A |
| RxJS subscriptions | Zero in components | Common; leak risk if unmanaged |
| Re-render from parent | Only if a signal passed through the facade changes | Any parent re-render triggers child |
| `useCallback` equivalent | Not needed — class fields don't re-create on render | N/A |

**Compared to the React apps in this monorepo:** The NgRx + signals approach is
comparable. NgRx selectors are memoized (unlike the React apps' inline `useSelector`
which has no memoization). `computed()` is equivalent to `useMemo`. The facade
abstraction is equivalent to `bindActionCreators`. The rendering model differs
(Angular's signal-based OnPush vs React's VDOM diffing) but the effective cost is
similar: re-render only when the consumed state changes.

**Zoneless mode** (Angular 18, see Migration below) eliminates zone.js entirely. All
signal-based updates in this recipe already bypass zone.js for scheduling; going
zoneless is a drop-in improvement with no code changes required.

---

### 15. Deviation from Standard Angular Practices

| Pattern | This recipe | Typical Angular | How far it deviates |
|---|---|---|---|
| Constructor injection | Not used | Universal | Moderate — `inject()` is well-established since v14, Angular team endorses it |
| `ngOnInit` / `ngOnDestroy` | Not used | Universal | Moderate — functional equivalents are newer but fully supported |
| `ngOnChanges` | Not used | Common | Low — signal inputs replace it cleanly; this is Angular's stated direction |
| RxJS in components | Not used | Very common | High — most tutorials show observable subscriptions in components |
| `@Output` for child-to-parent | Not used (store instead) | Very common | High — requires buy-in to store-first thinking |
| OnPush change detection | Required | Recommended but optional | Low — widely accepted best practice |
| Standalone components | Used | Since v17 preferred | Low — Angular team default since v17 |
| Facade pattern | Required | Common in NgRx apps | Low — well-documented NgRx best practice |

The highest-friction sell to traditional Angular developers is eliminating RxJS from
components and the store-first communication model (no `@Output`). Both are easily
demonstrated as reductions in code volume and elimination of entire classes of bugs
(forgotten unsubscribe, event chain spaghetti).

---

### 16. Migration Impact for Future Angular Versions

All patterns in this recipe are aligned with Angular's stated roadmap direction.
No migrations are anticipated to be breaking; most future versions add capabilities
this recipe can opt into incrementally.

#### Angular 18

- **Zoneless mode** (`provideExperimentalZonelessChangeDetection()`): drop-in addition
  to `app.config.ts`. All signal-based code in this recipe already schedules updates
  outside zone.js; enabling zoneless removes the zone.js bundle (~12 KB) and
  eliminates a category of performance issues caused by zone.js patching browser APIs.
  No component changes needed.
- **`resource()` API** (developer preview): a signal-based abstraction for async
  data fetching. Can replace simple Effects that load data via HTTP. Pattern:
  ```typescript
  readonly gameData = resource({
    request: () => ({ id: this.tf.gameId() }),
    loader: ({ request }) => this.api.loadGame(request.id),
  });
  // gameData.value() is a Signal<Game | undefined>
  // gameData.isLoading() is a Signal<boolean>
  ```

#### Angular 19

- **`resource()` stable**: adopt it for HTTP-backed state where it simplifies an
  Effect + selector pair into a single construct in the facade.
- **`linkedSignal()`**: a writable signal that derives its initial value from another
  signal and can be overwritten locally. Useful for local form state that is seeded
  from the store but edited independently before dispatch.
  ```typescript
  readonly draftName = linkedSignal(() => this.tf.currentPlayer()?.name ?? '');
  // draftName can be set() locally; when currentPlayer changes it resets.
  ```

#### NgRx 18 / 19

- NgRx's own roadmap is moving toward deeper signal integration. The `selectSignal`
  API used throughout this recipe is stable and will remain. The `@ngrx/signals`
  package (not used here) is maturing as a component-local state solution; it does
  not conflict with `@ngrx/store`.
- Effects API is stable; functional effects (`{ functional: true }`) are the NgRx
  team's preferred style going forward and are what the `asyncEffect` helper uses.

#### What would require changes

- If you adopt zoneless mode and also have third-party libraries that rely on zone.js
  timing, those libraries may need updated versions.
- `resource()` requires Angular 18+; if you later adopt it in the facade, the facade
  API surface for that state changes (it exposes `value()` and `isLoading()` signals
  instead of a single signal).
- `linkedSignal()` requires Angular 19+; no impact on existing code.

---

## Summary Checklist

For every new component:

- [ ] `ChangeDetectionStrategy.OnPush` on the decorator
- [ ] Only `inject(SomeFacade)` — no `Store`, no `Actions` in component files
- [ ] State from `this.facade.someSignal` — no `selectSignal` in components
- [ ] Derived values via `computed()` — not methods or getters
- [ ] No `.subscribe()` anywhere — use `toSignal()` at any Observable boundary
- [ ] Event handlers as arrow function fields — no `useCallback` equivalent needed
- [ ] No `@Output` for cross-component communication — route through the store
- [ ] No `implements OnInit / OnDestroy / OnChanges` — use functional alternatives
- [ ] Signal inputs `input()` on presentational components `[17.3+]`, `@Input` as `[17.2 fallback]`

For every new facade:

- [ ] Expose state signals from `store.selectSignal(selector)`
- [ ] Use `bindToStore(this.store, ActionGroup)` + one-line property assignments
- [ ] No component should need to import from `@ngrx/store` or `@ngrx/effects`

For every new effect:

- [ ] Use functional effects (`{ functional: true }`) or class-based with `inject()`
- [ ] Use `asyncEffect()` helper for the action → async → success/failure pattern
- [ ] Firestore / WebSocket listeners: `switchMap` to an Observable in the effect; component reads result from a signal
