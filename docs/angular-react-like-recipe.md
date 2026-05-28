# Angular 17 React-Like Recipe

A recipe for writing Angular 17 applications that mirror the architecture of this monorepo's React apps: all state in NgRx, actions abstracted so components never touch the store directly, signal-based reactive consumption, no prop drilling, no `@Output`, minimal RxJS contact, and a functional component style.

## Version notes

Most of this recipe works identically on **17.2 and 17.3**. Items that differ are marked:
- `[17.3+]` — stable in 17.3, available as developer preview in 17.2 (works but may have minor API surface changes before stable)
- `[17.2 fallback]` — the alternative when you need to stay strictly on 17.2 stable APIs

---

## Dependencies

```json
{
  "@ngrx/store": "^17.0.0",
  "@ngrx/effects": "^17.0.0",
  "@ngrx/devtools": "^17.0.0",
  "@angular/core": "^17.2.0"
}
```

`@ngrx/signals` is intentionally omitted — it is a per-feature store designed for local component state. For a global Redux-equivalent, `@ngrx/store` is the right choice.

---

## 1. Application State Shape

Equivalent to the monorepo's `TotalState` type.

```typescript
// src/app/state/app.state.ts
import { TicketState } from './ticket/ticket.state';
import { ChatState }   from './chat/chat.state';
import { UsersState }  from './users/users.state';

export interface AppState {
  ticket: TicketState;
  chat:   ChatState;
  users:  UsersState;
}
```

---

## 2. Defining a Slice

Equivalent to the `creators` + `reducers` + `sliceConfig` pattern. In NgRx the two parallel objects are `createAction` calls and `on()` handlers inside `createReducer`.

```typescript
// src/app/state/ticket/ticket.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Player, Card, Route } from '../models';

// createActionGroup produces a namespaced object of action creators —
// equivalent to the monorepo's creators object, with the slice name as prefix.
export const TicketActions = createActionGroup({
  source: 'Ticket',
  events: {
    'Reset Game':  emptyProps(),
    'Add Player':  props<{ player: Player }>(),
    'Next Player': emptyProps(),
    'Draw Colors': props<{ cards: Card[] }>(),
    'Draw Ticket': props<{ ticket: string[] }>(),
    'Claim Route': props<{ route: Route; cards: Record<string, number> }>(),
  },
});
// Produces: TicketActions.resetGame(), TicketActions.addPlayer({ player }), etc.
```

```typescript
// src/app/state/ticket/ticket.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { TicketActions } from './ticket.actions';
import { TicketState, initialTicketState } from './ticket.state';

export const ticketReducer = createReducer(
  initialTicketState,

  on(TicketActions.resetGame, (): TicketState => ({ ...initialTicketState })),

  on(TicketActions.addPlayer, (state, { player }): TicketState => ({
    ...state,
    players: [...state.players, { ...playerTemplate, ...player }],
  })),

  on(TicketActions.nextPlayer, (state): TicketState => ({
    ...state,
    whoPlaysNow: (state.whoPlaysNow + 1) % state.players.length,
  })),

  on(TicketActions.claimRoute, (state, { route, cards }): TicketState => ({
    // ... spread-based immutable update
  })),
);
```

```typescript
// src/app/state/ticket/ticket.selectors.ts
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { TicketState } from './ticket.state';

export const selectTicket       = createFeatureSelector<TicketState>('ticket');
export const selectPlayers      = createSelector(selectTicket, s => s.players);
export const selectWhoPlaysNow  = createSelector(selectTicket, s => s.whoPlaysNow);
// Derived selector — equivalent to a computed() or reselect selector.
// NgRx selectors are memoized automatically; the projection only runs when inputs change.
export const selectCurrentPlayer = createSelector(
  selectPlayers, selectWhoPlaysNow,
  (players, idx) => players[idx],
);
```

```typescript
// src/app/app.config.ts  (standalone bootstrap)
import { ApplicationConfig } from '@angular/core';
import { provideStore }       from '@ngrx/store';
import { provideEffects }     from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { ticketReducer }      from './state/ticket/ticket.reducer';
import { TicketEffects }      from './state/ticket/ticket.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ ticket: ticketReducer, chat: chatReducer, users: usersReducer }),
    provideEffects(TicketEffects, ChatEffects),
    provideStoreDevtools({ maxAge: 50 }),
  ],
};
```

---

## 3. The Actions Facade — No Store in Components

This is the central pattern. It mirrors the monorepo's `bindActionCreators`-based `actions` object. Components import a typed facade service and call methods on it; they never see `Store` or `dispatch`.

```typescript
// src/app/state/ticket/ticket.facade.ts
import { Injectable, inject } from '@angular/core';
import { Store }               from '@ngrx/store';
import { TicketActions }       from './ticket.actions';
import { Player, Card, Route } from '../models';

@Injectable({ providedIn: 'root' })
export class TicketFacade {
  private store = inject(Store);

  // One method per action — equivalent to actions.ticket.* in the React apps
  resetGame  = ()                                    => this.store.dispatch(TicketActions.resetGame());
  addPlayer  = (player: Player)                      => this.store.dispatch(TicketActions.addPlayer({ player }));
  nextPlayer = ()                                    => this.store.dispatch(TicketActions.nextPlayer());
  drawColors = (cards: Card[])                       => this.store.dispatch(TicketActions.drawColors({ cards }));
  claimRoute = (route: Route, cards: Record<string,number>) =>
                                                        this.store.dispatch(TicketActions.claimRoute({ route, cards }));
}
```

If you want a single `actions` entry point across all slices (matching the monorepo's `actions.ticket.*`, `actions.chat.*` pattern), create an aggregate facade:

```typescript
// src/app/actions.ts
import { TicketFacade } from './state/ticket/ticket.facade';
import { ChatFacade }   from './state/chat/chat.facade';
import { UsersFacade }  from './state/users/users.facade';

// Use as:  const { ticket, chat } = injectActions();
export function injectActions() {
  return {
    ticket: inject(TicketFacade),
    chat:   inject(ChatFacade),
    users:  inject(UsersFacade),
  };
}
```

---

## 4. Component Shape

This is where the React→Angular translation is most visible. The goal: a class that looks nothing like a traditional Angular class — no constructor, no lifecycle hooks unless necessary, no banks of unrelated methods, DI at field level via `inject()`.

```typescript
// src/app/components/game/game.component.ts
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Store }         from '@ngrx/store';
import { TicketFacade }  from '../../state/ticket/ticket.facade';
import { selectPlayers, selectCurrentPlayer, selectWhoPlaysNow } from '../../state/ticket/ticket.selectors';
import { playerColors, playerOrdinals } from '../../constants';

@Component({
  selector: 'app-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  // essential: only signal changes trigger rendering
  templateUrl: './game.component.html',
})
export class GameComponent {
  // ── DI — no constructor needed ──────────────────────────────────────────────
  private store = inject(Store);
  private ta    = inject(TicketFacade);   // equivalent to: const ta = actions.ticket

  // ── State slices — these are Angular Signals ─────────────────────────────────
  // Equivalent to: const { players } = useSelector(s => s.ticket)
  // Signals update the template automatically; OnPush ensures minimal DOM work.
  readonly players       = this.store.selectSignal(selectPlayers);
  readonly whoPlaysNow   = this.store.selectSignal(selectWhoPlaysNow);
  readonly currentPlayer = this.store.selectSignal(selectCurrentPlayer);

  // ── Derived state — equivalent to useMemo / reselect ─────────────────────────
  // computed() re-evaluates only when its signal dependencies change.
  readonly canAddPlayer = computed(() => this.players().length < 5);
  readonly nextPlayerLabel = computed(() =>
    `Player ${playerOrdinals[this.players().length]}`
  );

  // ── Event handlers — equivalent to useCallback-wrapped handlers ───────────────
  // Angular doesn't re-render the class on each cycle the way React does,
  // so arrow functions here don't need memoization.
  readonly addPlayer = () => {
    const name = prompt(`${this.nextPlayerLabel()} name?`);
    if (name) this.ta.addPlayer({ name, color: playerColors[this.players().length] });
  };

  readonly resetGame   = () => this.ta.resetGame();
  readonly nextPlayer  = () => this.ta.nextPlayer();

  readonly dealColorCards = (count: number) => {
    const clipped = Math.min(this.colorDeck.remaining().length, count);
    dealCardsSoundEffect(clipped,
      () => this.ta.drawColors(this.colorDeck.deal(1)),
      this.ta.nextPlayer,
    );
  };
}
```

```html
<!-- game.component.html -->
<!-- @if / @for are the 17.0+ control flow — no *ngIf / *ngFor needed -->
<div class="game">
  <button (click)="resetGame()">Reset Game</button>
  <button (click)="addPlayer()" [disabled]="!canAddPlayer()">Add Player</button>

  @for (player of players(); track player.id) {
    <app-player-view [player]="player" />
  }

  @if (currentPlayer(); as cp) {
    <app-active-player [player]="cp" (deal)="dealColorCards($event)" />
  }
</div>
```

### Why `OnPush` is non-negotiable

Without `ChangeDetectionStrategy.OnPush`, Angular runs change detection on every browser event across the whole component tree. With `OnPush`, a component only re-checks when:
1. One of its signal reads changes (the primary mechanism here)
2. An `@Input` reference changes (secondary)
3. An async pipe emits (not used in this recipe)

This gives the same render-on-state-change guarantee that React's `useMemo` + `useSelector` combination provides.

---

## 5. Consuming Nested Pieces of State

Equivalent to `useSelector(s => s.ticket.players[idx].colorCardsInHand)`:

```typescript
// Fine-grained selector defined once — reused across components
export const selectCurrentPlayerHand = createSelector(
  selectCurrentPlayer,
  p => p?.colorCardsInHand ?? {},
);

// In a component:
readonly hand = this.store.selectSignal(selectCurrentPlayerHand);

// Or derive inline without a named selector when the logic is component-specific:
readonly handCount = computed(() =>
  Object.values(this.hand()).reduce((sum, n) => sum + n, 0)
);
```

Named selectors are preferable for anything used in more than one place; `computed()` in the component is fine for view-only derivations.

---

## 6. Avoiding RxJS Subscriptions

You will inevitably encounter Observables (NgRx selectors, HTTP, router events). Convert them to signals at the boundary with `toSignal()` so the rest of the component stays signal-only.

```typescript
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';

// In a component or service:
private router = inject(Router);

// Convert an Observable to a Signal — no subscribe(), no unsubscribe()
readonly currentUrl = toSignal(
  this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map(e => (e as NavigationEnd).urlAfterRedirects),
  ),
  { initialValue: '/' }   // required: the signal needs a synchronous initial value
);
```

`toSignal()` automatically unsubscribes when the injection context is destroyed. There is no equivalent of a forgotten `.unsubscribe()` bug.

For `Store.select()` specifically, prefer `store.selectSignal()` directly (it does the same conversion internally). Only reach for `toSignal()` when you need to compose an Observable pipeline before consuming the result.

### `[17.2 fallback]` for `toSignal`

`toSignal` has been stable since Angular 16.2. There is no fallback needed — it works identically on 17.2 and 17.3.

---

## 7. Avoiding Prop Drilling and `@Output`

The React apps communicate exclusively through the store — there are no chains of prop callbacks. Apply the same rule in Angular: **if data needs to travel more than one level, it lives in the store.**

**Prohibited pattern (prop drilling):**
```typescript
// parent passes data and callbacks three levels down — don't do this
<app-child [player]="currentPlayer()" (claim)="handleClaim($event)" />
```

**Preferred pattern (store-mediated):**
```typescript
// app-claim-panel reads its own state and dispatches its own actions
@Component({ selector: 'app-claim-panel', ... })
export class ClaimPanelComponent {
  private store = inject(Store);
  private ta    = inject(TicketFacade);

  readonly currentPlayer = this.store.selectSignal(selectCurrentPlayer);
  readonly selectedRoute = this.store.selectSignal(selectSelectedRoute);

  readonly claim = () => {
    const { route, cardsToUse } = this.computeClaim();
    this.ta.claimRoute(route, cardsToUse);
  };
}
```

When a child legitimately needs to communicate upward (e.g., a generic UI widget like a resizable split or a date picker), use `@Output` for that widget's own API boundary — but that event should flow into a facade call at the first smart component, not cascade upward.

### Signal Inputs `[17.3+]` / `[17.2 developer preview]`

When a component does accept inputs (e.g., a presentational widget), prefer signal inputs over decorator inputs so the value is directly usable in `computed()`:

```typescript
// [17.3 stable] — use this on 17.3+
import { input } from '@angular/core';

@Component({ ... })
export class PlayerCardComponent {
  readonly player = input.required<Player>();
  // player is now a Signal<Player>, composable with computed()
  readonly displayName = computed(() => this.player().name.toUpperCase());
}

// [17.2 fallback] — decorator input, not a signal
@Input({ required: true }) player!: Player;
// Use in template directly; cannot compose with computed() in class body
```

---

## 8. Async Actions — Effects

Equivalent to the monorepo's custom middleware (e.g., `chatMiddleware` for Firestore subscriptions). NgRx Effects handle side effects — HTTP calls, WebSocket subscriptions, timers.

```typescript
// src/app/state/ticket/ticket.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TicketActions } from './ticket.actions';
import { TicketApiService } from './ticket-api.service';

@Injectable()
export class TicketEffects {
  private actions$ = inject(Actions);
  private api      = inject(TicketApiService);

  // Equivalent to middleware that intercepts an action and dispatches follow-on actions
  saveGame$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TicketActions.claimRoute),
      exhaustMap(({ route, cards }) =>
        this.api.persist(route, cards).pipe(
          map(() => TicketActions.nextPlayer()),
          catchError(() => of(TicketActions.saveFailed())),
        )
      ),
    )
  );
}
```

For Firestore real-time subscriptions (equivalent to `chatMiddleware`):

```typescript
// Fires once, sets up a Firestore listener, dispatches on every emission
initChatListener$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ROOT_EFFECTS_INIT),           // fires once on app start
    switchMap(() =>
      this.chatService.messages$().pipe( // Observable<Message[]> from Firestore
        map(messages => ChatActions.messagesReceived({ messages })),
      )
    ),
  )
);
```

The component that renders the chat never touches a subscription — it calls `store.selectSignal(selectMessages)`.

---

## 9. Lifecycle Hooks in the Functional Style

Use Angular's functional lifecycle alternatives when possible:

```typescript
import { afterNextRender, afterRender, DestroyRef } from '@angular/core';

@Component({ ... })
export class MapComponent {
  private destroyRef = inject(DestroyRef);

  // Equivalent to useLayoutEffect — runs after the next render, once
  constructor() {
    afterNextRender(() => {
      this.network = new VisNetwork(this.container.nativeElement, ...);
    });

    // Register cleanup without implementing OnDestroy
    this.destroyRef.onDestroy(() => this.network?.destroy());
  }
}
```

`afterNextRender` and `afterRender` are `[17.3+]` stable. On `[17.2]` use `ngAfterViewInit` + `ngOnDestroy` as the fallback.

---

## 10. The `inject()` Style vs Constructor Style

Traditional Angular uses constructor injection. The `inject()` style is available since Angular 14 and works identically on 17.2 and 17.3.

```typescript
// Traditional — avoid in new code
@Component({ ... })
export class OldStyle {
  constructor(
    private store: Store,
    private facade: TicketFacade,
    private router: Router,
  ) {}
}

// inject() style — preferred
@Component({ ... })
export class NewStyle {
  private store   = inject(Store);
  private ta      = inject(TicketFacade);
  private router  = inject(Router);
  // No constructor needed unless you require afterNextRender/toSignal in constructor body
}
```

`inject()` must be called in an injection context: field initializer, constructor body, or a function called from one of those. Calling it in a method or setTimeout is a runtime error.

---

## 11. Minimal RxJS in Services

Services that wrap external data sources (Firestore, HTTP) return Observables internally, but the facade converts them before handing results to the store. Components never see a `Subject` or `BehaviorSubject`.

```typescript
// chat.service.ts — Observable stays inside the service
@Injectable({ providedIn: 'root' })
export class ChatService {
  private firestore = inject(Firestore);

  messages$(channelId: string): Observable<Message[]> {
    return collectionData(collection(this.firestore, `channels/${channelId}/messages`));
  }
}

// chat.effects.ts — Effect subscribes, dispatches; component sees none of this
channelMessages$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ChatActions.joinChannel),
    switchMap(({ channelId }) =>
      this.chatService.messages$(channelId).pipe(
        map(messages => ChatActions.messagesReceived({ messages })),
      )
    ),
  )
);

// chat.component.ts — pure signals
readonly messages = this.store.selectSignal(selectMessages);
```

---

## 12. Patterns from the React Apps Translated

| React pattern | Angular equivalent |
|---|---|
| `import { actions } from '../actions-integration'` | `inject(TicketFacade)` |
| `const ta = actions.ticket` | `private ta = inject(TicketFacade)` |
| `useSelector(s => s.ticket.players)` | `store.selectSignal(selectPlayers)` |
| `const x = useSelector(s => s.ticket)` then destructure | `selectSignal` per field, or `computed(() => this.ticket().x)` |
| `useCallback(() => ta.action(), [dep])` | Arrow function field — no memoization needed |
| `useMemo(() => derive(a, b), [a, b])` | `computed(() => derive(this.a(), this.b()))` |
| `useEffect(() => { sub(); return cleanup; }, [])` | `afterNextRender(() => { ... })` + `destroyRef.onDestroy` |
| Custom hook (`useVisNetwork`) | Injectable service + `inject()` |
| `connectRootComponent(App)` HOC wrapping `<Provider>` | `provideStore(...)` in `app.config.ts` |
| Redux middleware (chatMiddleware, Firestore) | NgRx Effect with `switchMap` / `mergeMap` |
| `TotalState` | `AppState` interface aggregating feature state interfaces |
| `SliceConfig { creators, reducers }` | `createActionGroup` + `createReducer(on(...))` |

---

## Summary Checklist

For each new component:

- [ ] `ChangeDetectionStrategy.OnPush` on every component
- [ ] All services injected via `inject()` at field level, no constructor params
- [ ] State consumed via `store.selectSignal(selector)` — returns Signal, not Observable
- [ ] Derived view values via `computed()`, not methods
- [ ] Async transformation at component level uses `toSignal()` — no `.subscribe()`
- [ ] Dispatching goes through a facade method — `Store` is never injected into components
- [ ] Observables confined to effects and services — facades and components are Observable-free
- [ ] Cross-component communication through the store — `@Output` only at widget boundaries
- [ ] Signal inputs `input()` on presentational components `[17.3+]`, decorator `@Input` as `[17.2 fallback]`
