# Angular 17 React-Like Recipe — Take 3

This document supersedes Take 2. It is a complete standalone recipe.

Changes from Take 2:
- Actions are always accessed through the `actions.sliceName.actionName()` namespace
- State is read through a parallel `state.sliceName.signalName()` namespace
- Collapsible usage examples throughout
- Formalized marshalling pattern
- React ↔ Angular parallel examples for `useState`, `useMemo`, `useEffect`, `useCallback`
- Section on deprecating patterns you want to prevent re-introduction of
- Migration guide for existing NgRx code
- Infrastructure middleware equivalents (logging, notify, coverage, request)
- Expanded performance, memory, and debugging section

---

## Dependencies

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

## 1. Application State Shape

```typescript
// src/app/state/app.state.ts
import { TicketState }   from './ticket/ticket.state';
import { ChatState }     from './chat/chat.state';
import { UsersState }    from './users/users.state';
import { NotifyState }   from './notify/notify.state';
import { RequestState }  from './request/request.state';
import { CoverageState } from './coverage/coverage.state';
import { LocalState }    from './local/local.state';

// Equivalent to the monorepo's TotalState
export interface AppState {
  ticket:   TicketState;
  chat:     ChatState;
  users:    UsersState;
  notify:   NotifyState;
  request:  RequestState;
  coverage: CoverageState;
  local:    LocalState;
}
```

---

## 2. Defining a Slice

Each slice is three files: actions, reducer, selectors. They map directly from the
monorepo's `creators` / `reducers` / `SliceConfig` pattern.

```typescript
// ticket.actions.ts
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
// Produces: TicketActions.resetGame(), TicketActions.addPlayer({ player }), …
```

```typescript
// ticket.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { TicketActions } from './ticket.actions';

export const ticketReducer = createReducer(
  initialTicketState,
  on(TicketActions.resetGame,  ():      TicketState => ({ ...initialTicketState })),
  on(TicketActions.addPlayer,  (s, { player }): TicketState =>
    ({ ...s, players: [...s.players, { ...playerTemplate, ...player }] })),
  on(TicketActions.nextPlayer, (s):     TicketState =>
    ({ ...s, whoPlaysNow: (s.whoPlaysNow + 1) % s.players.length })),
  on(TicketActions.claimRoute, (s, { route, cards }): TicketState => ({
    ...s, /* immutable route-claim update */
  })),
);
```

```typescript
// ticket.selectors.ts
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { TicketState } from './ticket.state';

export const selectTicket        = createFeatureSelector<TicketState>('ticket');
export const selectPlayers       = createSelector(selectTicket, s => s.players);
export const selectWhoPlaysNow   = createSelector(selectTicket, s => s.whoPlaysNow);
export const selectCurrentPlayer = createSelector(
  selectPlayers, selectWhoPlaysNow, (players, idx) => players[idx] ?? null,
);
```

---

## 3. The `bindToStore` Utility

Write once. Equivalent to Redux's `bindActionCreators`.

```typescript
// src/app/state/bind-to-store.ts
import { Store, TypedAction } from '@ngrx/store';

type CreatorMap = Record<string, (...args: any[]) => TypedAction<string>>;
type Bound<T extends CreatorMap> = { readonly [K in keyof T]: (...args: Parameters<T[K]>) => void };

export function bindToStore<T extends CreatorMap>(store: Store, creators: T): Bound<T> {
  return Object.fromEntries(
    Object.entries(creators)
      .filter(([, v]) => typeof v === 'function')
      .map(([key, creator]) => [key, (...args: unknown[]) => store.dispatch(creator(...args))]),
  ) as Bound<T>;
}
```

---

## 4. Action Services and State Services

Two kinds of injectable, kept separate so components can import only what they need.

**Action Service** — dispatch only, no state.

```typescript
// ticket.action-service.ts
import { Injectable, inject } from '@angular/core';
import { Store }              from '@ngrx/store';
import { TicketActions }      from './ticket.actions';
import { bindToStore }        from '../bind-to-store';

@Injectable({ providedIn: 'root' })
export class TicketActionService {
  private bound = bindToStore(inject(Store), TicketActions);

  // One property per action — no implementation body needed
  readonly resetGame  = this.bound.resetGame;
  readonly addPlayer  = this.bound.addPlayer;
  readonly nextPlayer = this.bound.nextPlayer;
  readonly drawColors = this.bound.drawColors;
  readonly claimRoute = this.bound.claimRoute;
}
```

**State Service** — signals only, no dispatch.

```typescript
// ticket.state-service.ts
import { Injectable, inject } from '@angular/core';
import { Store }              from '@ngrx/store';
import { selectPlayers, selectWhoPlaysNow, selectCurrentPlayer } from './ticket.selectors';

@Injectable({ providedIn: 'root' })
export class TicketStateService {
  private store = inject(Store);

  readonly players       = this.store.selectSignal(selectPlayers);
  readonly whoPlaysNow   = this.store.selectSignal(selectWhoPlaysNow);
  readonly currentPlayer = this.store.selectSignal(selectCurrentPlayer);
}
```

---

## 5. The `injectActions` and `injectState` Entry Points

This is the Angular equivalent of `import { actions } from '../actions-integration'`.

```typescript
// src/app/actions.ts  — single file, like actions-integration/index.tsx
import { TicketActionService }   from './state/ticket/ticket.action-service';
import { ChatActionService }     from './state/chat/chat.action-service';
import { NotifyActionService }   from './state/notify/notify.action-service';
import { RequestActionService }  from './state/request/request.action-service';
import { CoverageActionService } from './state/coverage/coverage.action-service';
import { LocalActionService }    from './state/local/local.action-service';
import { UsersActionService }    from './state/users/users.action-service';

/**
 * Returns the namespaced actions object.
 * Usage mirrors the React pattern exactly:
 *
 *   const actions = injectActions()
 *   actions.ticket.resetGame()
 *   actions.notify.error({ msg: 'Something failed', kind: 'api' })
 *
 *   // Or alias a slice (matches: import actions.ticket as ta)
 *   const { ticket: ta } = injectActions()
 *   ta.addPlayer(player)
 */
export function injectActions() {
  return {
    ticket:   inject(TicketActionService),
    chat:     inject(ChatActionService),
    notify:   inject(NotifyActionService),
    request:  inject(RequestActionService),
    coverage: inject(CoverageActionService),
    local:    inject(LocalActionService),
    users:    inject(UsersActionService),
  } as const;
}
```

```typescript
// src/app/state.ts
import { TicketStateService }   from './state/ticket/ticket.state-service';
import { ChatStateService }     from './state/chat/chat.state-service';
import { NotifyStateService }   from './state/notify/notify.state-service';
import { RequestStateService }  from './state/request/request.state-service';
import { CoverageStateService } from './state/coverage/coverage.state-service';
import { LocalStateService }    from './state/local/local.state-service';
import { UsersStateService }    from './state/users/users.state-service';

/**
 * Returns the namespaced state signals object.
 * Equivalent to useSelector, but returns Signals rather than values.
 *
 *   const state = injectState()
 *   const players = state.ticket.players         // Signal<Player[]>
 *   const count   = computed(() => state.ticket.players().length)
 */
export function injectState() {
  return {
    ticket:   inject(TicketStateService),
    chat:     inject(ChatStateService),
    notify:   inject(NotifyStateService),
    request:  inject(RequestStateService),
    coverage: inject(CoverageStateService),
    local:    inject(LocalStateService),
    users:    inject(UsersStateService),
  } as const;
}
```

```typescript
// src/app/app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({
      ticket: ticketReducer, chat: chatReducer, users: usersReducer,
      notify: notifyReducer, request: requestReducer,
      coverage: coverageReducer, local: localReducer,
    }),
    provideEffects(TicketEffects, ChatEffects, CoverageEffects, RequestEffects),
    provideStoreDevtools({ maxAge: 50 }),
    provideMetaReducers([loggingMetaReducer]),   // see Infrastructure section
  ],
};
```

---

## 6. Component Shape

The only Angular-specific imports in a component: `Component`, `ChangeDetectionStrategy`,
`inject`, `computed`, `signal`. No NgRx.

```typescript
// game.component.ts
import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { injectActions } from '../../actions';
import { injectState }   from '../../state';

@Component({
  selector: 'app-game',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game.component.html',
})
export class GameComponent {
  // ── Namespaced access — matches React import style ────────────────────────
  private actions = injectActions();
  private state   = injectState();
  private ta      = this.actions.ticket;   // slice alias: const ta = actions.ticket

  // ── State signals — read like: this.players() in class, players() in template
  readonly players       = this.state.ticket.players;
  readonly currentPlayer = this.state.ticket.currentPlayer;

  // ── Derived values (computed) ─────────────────────────────────────────────
  readonly canAddPlayer    = computed(() => this.players().length < 5);
  readonly nextPlayerLabel = computed(() => `Player ${playerOrdinals[this.players().length]}`);

  // ── Component-local state (not in store) ──────────────────────────────────
  readonly isPanelOpen = signal(false);
  readonly searchTerm  = signal('');

  // ── Simple handlers — one line, direct action call ────────────────────────
  readonly resetGame  = () => this.ta.resetGame();
  readonly nextPlayer = () => this.ta.nextPlayer();
  readonly togglePanel = () => this.isPanelOpen.update(v => !v);

  // ── Marshallers — assemble non-trivial payloads before dispatching ─────────
  // See Section 7 for the full marshalling pattern.
  readonly addPlayer = () => {
    const name = prompt(`${this.nextPlayerLabel()} name?`);
    if (!name) return;
    this.ta.addPlayer({ name, color: playerColors[this.players().length] });
  };
}
```

```html
<!-- game.component.html -->
<div class="game">
  <button (click)="resetGame()">Reset Game</button>
  <button (click)="addPlayer()" [disabled]="!canAddPlayer()">Add Player</button>

  @for (player of players(); track player.id) {
    <app-player-view [player]="player" />
  }

  @if (currentPlayer(); as cp) {
    <app-active-player [player]="cp" />
  }

  @if (isPanelOpen()) {
    <app-side-panel />
  }
</div>
```

<details>
<summary><strong>Full example — MapComponent with route-claim logic</strong></summary>

```typescript
// map.component.ts
import { Component, ChangeDetectionStrategy, inject, computed,
         afterNextRender }                              from '@angular/core';
import { DestroyRef }                                  from '@angular/core';
import { injectActions }                               from '../../actions';
import { injectState }                                 from '../../state';
import { NodeToRouteMapper }                           from '../../vis/node-to-route-mapper';

@Component({
  selector: 'app-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #container style="width:100%;height:600px"></div>`,
})
export class MapComponent {
  private actions = injectActions();
  private state   = injectState();
  private ta      = this.actions.ticket;

  // State
  readonly players       = this.state.ticket.players;
  readonly whoPlaysNow   = this.state.ticket.whoPlaysNow;
  readonly currentPlayer = this.state.ticket.currentPlayer;

  // Derived
  readonly currentHand = computed(() =>
    this.currentPlayer()?.colorCardsInHand ?? {}
  );

  // Marshaller — see Section 7
  private marshalClaimRoute(routeId: string) {
    const route  = NodeToRouteMapper.costNodeIdToRouteInfo(routeId);
    if (!route) return null;
    const player = this.currentPlayer()!;
    const same   = player.colorCardsInHand[route.color] ?? 0;
    const wild   = player.colorCardsInHand[Color.Wild]  ?? 0;
    if (same + wild < route.cost) return null;
    const sameToUse = Math.min(same, route.cost);
    return { route, cards: { [route.color]: sameToUse, [Color.Wild]: route.cost - sameToUse } };
  }

  constructor() {
    const container = viewChild.required<ElementRef>('container');
    let network: Network;

    afterNextRender(() => {
      network = new Network(container().nativeElement, visData, visOptions);
      network.on('click', (event: VisClick) => {
        const nodeId = event.nodes[0] as string;
        if (!nodeId) return;
        const payload = this.marshalClaimRoute(nodeId);
        if (!payload) { playError(); return; }
        this.ta.claimRoute(payload.route, payload.cards);
        playClick();
      });
    });

    inject(DestroyRef).onDestroy(() => network?.destroy());
  }
}
```

</details>

<details>
<summary><strong>Full example — ChatComponent</strong></summary>

```typescript
// chat.component.ts
import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { injectActions } from '../../actions';
import { injectState }   from '../../state';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat.component.html',
})
export class ChatComponent {
  private actions = injectActions();
  private state   = injectState();

  // State
  readonly messages   = this.state.chat.messages;
  readonly activeUser = this.state.users.activeUser;
  readonly notices    = this.state.notify.notices;

  // Local state — draft message stays in component, not store
  readonly draft = signal('');

  // Marshaller
  readonly sendMessage = () => {
    const text = this.draft().trim();
    if (!text) return;
    this.actions.chat.sendMessage({
      text,
      fromUid:   this.activeUser()!.uid,
      fromEmail: this.activeUser()!.email,
      timestamp: Date.now(),
    });
    this.draft.set('');
  };

  readonly dismissNotice = (key: string) => this.actions.notify.dismiss({ key });
}
```

</details>

---

## 7. The Marshalling Pattern

A **marshaller** assembles a complete action payload from a combination of current
signal state and external inputs (event data, form values, computed context). It is
distinct from a simple handler (which calls an action with its argument directly) and
from a reducer (which transforms state after the action arrives).

### Classification

| Handler type | When to use | Example |
|---|---|---|
| **Direct** | Payload comes entirely from the call site | `resetGame = () => this.ta.resetGame()` |
| **Input-only** | Payload comes from a UI event, no state needed | `selectTab = (id: string) => this.ta.setTab({ id })` |
| **Marshaller** | Payload requires reading signals + transforming | `claimRoute` needs player hand + route cost |
| **Extracted marshaller** | Marshaller complex enough to test independently | Pure function in `*.marshallers.ts` |

### Inline marshaller — in the component

Name the method after what it does, not what action it calls. Comment section
separates them visually from simple handlers.

```typescript
// ── Marshallers ───────────────────────────────────────────────────────────────

readonly claimRoute = (routeId: string) => {
  const player = this.state.ticket.currentPlayer()!;
  const route  = RouteMap.fromId(routeId);
  if (!route) return;

  const same = player.colorCardsInHand[route.color] ?? 0;
  const wild = player.colorCardsInHand[Color.Wild]  ?? 0;
  if (same + wild < route.cost) { playError(); return; }

  const sameToUse = Math.min(same, route.cost);
  this.ta.claimRoute(route, {
    [route.color]: sameToUse,
    [Color.Wild]:  route.cost - sameToUse,
  });
  playClick();
};
```

### Extracted marshaller — pure function, independently testable

Extract when the assembly logic is complex, reused across components, or worth unit
testing without a component instance.

```typescript
// ticket.marshallers.ts — pure functions, no Angular, no NgRx
import { Player, Route, Color } from './ticket.state';

export type ClaimPayload = { route: Route; cards: Record<string, number> } | null;

/**
 * Assembles the claimRoute payload from the player's current hand.
 * Returns null if the player cannot afford the route.
 */
export function marshalClaimRoute(player: Player, route: Route): ClaimPayload {
  const same = player.colorCardsInHand[route.color] ?? 0;
  const wild = player.colorCardsInHand[Color.Wild]  ?? 0;
  if (same + wild < route.cost) return null;
  const sameToUse = Math.min(same, route.cost);
  return { route, cards: { [route.color]: sameToUse, [Color.Wild]: route.cost - sameToUse } };
}
```

```typescript
// In the component — marshaller is a pure function, handler is one line
readonly claimRoute = (routeId: string) => {
  const payload = marshalClaimRoute(
    this.state.ticket.currentPlayer()!,
    RouteMap.fromId(routeId),
  );
  if (!payload) { playError(); return; }
  this.ta.claimRoute(payload.route, payload.cards);
  playClick();
};
```

<details>
<summary><strong>Example — multi-signal marshaller assembling a chat message</strong></summary>

```typescript
// chat.marshallers.ts
export function marshalSendMessage(
  text: string,
  sender: User,
  channelId: string,
): SendMessagePayload | null {
  const trimmed = text.trim();
  if (!trimmed || !sender || !channelId) return null;
  return {
    text: trimmed,
    fromUid:   sender.uid,
    fromEmail: sender.email,
    channelId,
    timestamp: Date.now(),
  };
}

// In component:
readonly sendMessage = () => {
  const payload = marshalSendMessage(
    this.draft(),
    this.state.users.activeUser()!,
    this.state.chat.activeChannelId()!,
  );
  if (!payload) return;
  this.actions.chat.sendMessage(payload);
  this.draft.set('');
};
```

</details>

---

## 8. React ↔ Angular Parallel Examples

### `useState` → `signal()`

Component-local state that does not need to go into the store.

```typescript
// React
const [count,    setCount]    = useState(0);
const [isOpen,   setIsOpen]   = useState(false);
const [draft,    setDraft]    = useState('');

const increment = () => setCount(c => c + 1);
const toggle    = () => setIsOpen(v => !v);
```

```typescript
// Angular
readonly count   = signal(0);
readonly isOpen  = signal(false);
readonly draft   = signal('');

readonly increment = () => this.count.update(n => n + 1);
readonly toggle    = () => this.isOpen.update(v => !v);
// Direct set:
//   this.draft.set(newValue)
//   this.count.set(0)
```

<details>
<summary><strong>Example — form with local draft state</strong></summary>

```typescript
@Component({ ... })
export class AddPlayerFormComponent {
  private ta = injectActions().ticket;

  readonly name  = signal('');
  readonly color = signal<Color | null>(null);
  readonly error = signal('');

  readonly isValid = computed(() => this.name().trim().length > 0 && this.color() !== null);

  readonly submit = () => {
    if (!this.isValid()) { this.error.set('Name and color required'); return; }
    this.ta.addPlayer({ name: this.name().trim(), color: this.color()! });
    this.name.set('');
    this.color.set(null);
    this.error.set('');
  };
}
```

</details>

---

### `useMemo` → `computed()`

`computed()` is memoized automatically: the projection runs only when at least one
of its signal dependencies changes. No dependency array required.

```typescript
// React
const sortedPlayers = useMemo(
  () => [...players].sort((a, b) => b.score - a.score),
  [players],
);

const currentHand = useMemo(
  () => players[whoPlaysNow]?.colorCardsInHand ?? {},
  [players, whoPlaysNow],
);
```

```typescript
// Angular — deps tracked automatically by reading signals inside the function
readonly sortedPlayers = computed(() =>
  [...this.state.ticket.players()].sort((a, b) => b.score - a.score)
);

readonly currentHand = computed(() =>
  this.state.ticket.currentPlayer()?.colorCardsInHand ?? {}
);
```

A `computed()` signal is read-only. If you need a writable computed (seeded from
state but independently editable), use `linkedSignal()` `[Angular 19+]`:

```typescript
// Angular 19+
readonly draftName = linkedSignal(() => this.state.ticket.currentPlayer()?.name ?? '');
// draftName.set('override') works; resets when currentPlayer changes
```

---

### `useEffect` → `effect()`, `afterNextRender()`, `destroyRef`

`useEffect` in React covers three distinct intentions. Each maps to a different
Angular primitive.

**Intention A: react to changing state**

```typescript
// React — run whenever `players` changes
useEffect(() => {
  if (players.length === 0) ta.resetGame();
}, [players]);
```

```typescript
// Angular — effect() re-runs whenever a signal it reads changes
constructor() {
  effect(() => {
    if (this.state.ticket.players().length === 0) this.ta.resetGame();
  });
}
```

**Intention B: run once on mount, with cleanup**

```typescript
// React
useEffect(() => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}, []);
```

```typescript
// Angular
constructor() {
  let timer: ReturnType<typeof setInterval>;
  afterNextRender(() => {
    timer = setInterval(this.tick, 1000);
  });
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
}
```

**Intention C: DOM setup after render**

```typescript
// React
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  const chart = new Chart(ref.current!, options);
  return () => chart.destroy();
}, []);
```

```typescript
// Angular [17.3+]
readonly container = viewChild.required<ElementRef>('container');
constructor() {
  let chart: Chart;
  afterNextRender(() => {
    chart = new Chart(this.container().nativeElement, options);
  });
  inject(DestroyRef).onDestroy(() => chart?.destroy());
}
```

<details>
<summary><strong>Example — analytics tracking on state change</strong></summary>

```typescript
constructor() {
  const analytics = inject(AnalyticsService);

  // Tracks whenever the active player changes — no dependency array
  effect(() => {
    const player = this.state.ticket.currentPlayer();
    if (player) analytics.track('player_turn', { playerId: player.id });
  });
}
```

</details>

---

### `useCallback` → not needed

React requires `useCallback` because the function component body re-runs on every
render, re-creating arrow functions and causing child components to think props
changed. Angular class fields are created once per component instance. Arrow function
fields never re-create.

```typescript
// React — memoize to stabilize reference
const handleSelect = useCallback((id: string) => {
  ta.selectPlayer(id);
}, [ta]);
```

```typescript
// Angular — no equivalent needed
readonly handleSelect = (id: string) => this.ta.selectPlayer(id);
// Reference is stable for the lifetime of the component instance
```

---

## 9. Lifecycle — Functional vs Traditional

Every traditional lifecycle interface has a functional replacement. The functional
versions compose: they can be extracted into shared utility functions. The traditional
ones are locked to the class.

| Traditional | Functional equivalent | Notes |
|---|---|---|
| `implements OnInit` + `ngOnInit()` | Field initializers + `effect()` | Signal state is live at declaration; `ngOnInit` usually unnecessary |
| `implements OnDestroy` + `ngOnDestroy()` | `inject(DestroyRef).onDestroy(fn)` | Call multiple times for multiple cleanups |
| `implements AfterViewInit` + `ngAfterViewInit()` | `afterNextRender(() => ...)` `[17.3+]` | Fallback: `ngAfterViewInit` |
| `implements OnChanges` + `ngOnChanges()` | `input()` signal + `computed()` `[17.3+]` | Fallback: `@Input` setter |
| — | `afterRender(() => ...)` | Runs after every render, not just the first |

<details>
<summary><strong>Side-by-side — full lifecycle comparison</strong></summary>

```typescript
// Traditional Angular
@Component({ ... })
export class OldComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input({ required: true }) player!: Player;
  @ViewChild('canvas') canvas!: ElementRef;
  private chart!: Chart;
  private sub!: Subscription;
  displayName = '';

  ngOnInit() {
    this.sub = this.store.select(selectMessages).subscribe(m => this.messages = m);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['player']) this.displayName = changes['player'].currentValue.name.toUpperCase();
  }
  ngAfterViewInit() {
    this.chart = new Chart(this.canvas.nativeElement, chartOptions);
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
    this.chart.destroy();
  }
}

// Functional Angular [17.3+]
@Component({ changeDetection: ChangeDetectionStrategy.OnPush, ... })
export class NewComponent {
  readonly player      = input.required<Player>();          // Signal<Player>
  readonly displayName = computed(() => this.player().name.toUpperCase());
  readonly messages    = this.state.chat.messages;          // Signal — no ngOnInit needed
  private canvas       = viewChild.required<ElementRef>('canvas');

  constructor() {
    let chart: Chart;
    afterNextRender(() => { chart = new Chart(this.canvas().nativeElement, chartOptions); });
    inject(DestroyRef).onDestroy(() => chart?.destroy());
    // No sub to manage — toSignal/selectSignal cleans itself up
  }
}
```

</details>

**Selling it to Angular developers:**

The concrete argument is error surface reduction. The traditional pattern has four
failure modes this recipe eliminates:

1. Forgetting `unsubscribe()` → `toSignal` / `selectSignal` cleans up automatically
2. Forgetting `ngOnDestroy` entirely → `destroyRef.onDestroy()` is inline with the
   setup it pairs with
3. `SimpleChanges` string key typos → signal inputs have no strings, compile-time checked
4. Lifecycle hook ordering confusion (`ngOnInit` vs `ngAfterViewInit`) → `afterNextRender`
   fires at exactly the right time with no ambiguity

---

## 10. The `inject()` Style

```typescript
// Traditional — constructor required for 5 injections
constructor(
  private store:     Store,
  private router:    Router,
  private facade:    TicketActionService,
  private analytics: AnalyticsService,
  private destroyRef: DestroyRef,
) {}

// inject() — no constructor, fields grouped by concern
private state     = injectState();
private actions   = injectActions();
private ta        = this.actions.ticket;
private router    = inject(Router);
private analytics = inject(AnalyticsService);
```

**Inheritance without forwarding:**

```typescript
// Traditional — adding a dep to Base breaks all subclasses
class Base  { constructor(protected store: Store) {} }
class Child extends Base {
  constructor(store: Store, private router: Router) { super(store); }
}

// inject() — Base deps are invisible to Child
class Base  { protected store = inject(Store); }
class Child extends Base { private router = inject(Router); }
```

**Extractable as a custom hook:**

`inject()` runs in any injection context (field initializer, constructor body).
This enables composable setup functions — the Angular equivalent of a custom hook.

```typescript
// A reusable "hook" that any component can call in its field initializers
function useClipboard() {
  const destroyRef = inject(DestroyRef);
  const copied     = signal(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    copied.set(true);
    const t = setTimeout(() => copied.set(false), 2000);
    destroyRef.onDestroy(() => clearTimeout(t));
  };
  return { copied, copy };
}

// In any component — one field, no imports, no lifecycle code
export class SomeComponent {
  readonly clipboard = useClipboard();
  // this.clipboard.copy('text'), this.clipboard.copied()
}
```

---

## 11. Signal Inputs — Presentational Components

For leaf UI components that receive data from a parent:

```typescript
// [17.3+] stable — signal input, composable with computed()
@Component({
  selector: 'app-player-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ displayName() }} — {{ handTotal() }} cards</div>`,
})
export class PlayerCardComponent {
  readonly player = input.required<Player>();

  readonly displayName = computed(() => this.player().name.toUpperCase());
  readonly handTotal   = computed(() =>
    Object.values(this.player().colorCardsInHand).reduce((n, v) => n + v, 0)
  );
}

// [17.2 fallback] — @Input, getter for derived values
export class PlayerCardComponent {
  @Input({ required: true }) player!: Player;
  get displayName() { return this.player.name.toUpperCase(); }
}
```

---

## 12. Communication Without Prop Drilling or `@Output`

Route all inter-component state through the store. A child dispatches through its
action service; the parent reads updated state through a signal. No event chain.

`@Output` remains appropriate only at generic UI widget boundaries (date picker,
file upload, drag container) where the widget has no awareness of your store domain.
At that boundary, the nearest smart ancestor handles the output with an action call
or a marshaller.

<details>
<summary><strong>Example — refactoring an @Output chain into store-mediated communication</strong></summary>

```typescript
// Before: output chain
// <app-map> emits routeSelected → GameComponent receives it → dispatches
// <app-game> (click)="onRouteSelected($event)" emits claimRoute → parent handles

// After: each component owns its interaction
@Component({ selector: 'app-map', ... })
export class MapComponent {
  private ta = injectActions().ticket;
  // No @Output — claimRoute dispatched directly
  readonly onNodeClick = (nodeId: string) => {
    const payload = marshalClaimRoute(this.state.ticket.currentPlayer()!, RouteMap.fromId(nodeId));
    if (payload) this.ta.claimRoute(payload.route, payload.cards);
  };
}

@Component({ selector: 'app-game', ... })
export class GameComponent {
  // Reads result from state; never receives an event from MapComponent
  readonly lastClaimedRoute = this.state.ticket.lastClaimedRoute;
}
```

</details>

---

## 13. Async Actions — Effects

### Pattern A: named operators

```typescript
// ticket.effects.ts
import { Injectable, inject }           from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map, catchError }   from 'rxjs/operators';
import { of }                            from 'rxjs';
import { TicketActions }                 from './ticket.actions';

@Injectable()
export class TicketEffects {
  private actions$ = inject(Actions);
  private api      = inject(TicketApiService);

  private whenClaim  = ofType(TicketActions.claimRoute);
  private afterSave  = map(() => TicketActions.nextPlayer());
  private onError    = catchError(() => of(TicketActions.saveFailed()));

  saveGame$ = createEffect(() =>
    this.actions$.pipe(
      this.whenClaim,
      exhaustMap(({ route, cards }) =>
        this.api.persist(route, cards).pipe(this.afterSave, this.onError)
      ),
    )
  );
}
```

### Pattern B: `asyncEffect` config helper

```typescript
// src/app/state/async-effect.ts — write once
import { inject }                          from '@angular/core';
import { Actions, createEffect, ofType }   from '@ngrx/effects';
import { Observable, of }                  from 'rxjs';
import { exhaustMap, switchMap, concatMap,
         mergeMap, map, catchError }        from 'rxjs/operators';
import { TypedAction, ActionCreator }       from '@ngrx/store';

type Strategy = 'exhaust' | 'switch' | 'concat' | 'merge';
const strategyMap = { exhaust: exhaustMap, switch: switchMap, concat: concatMap, merge: mergeMap };

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
            map(result => config.onSuccess(result, payload)),
            catchError(err => of(config.onError(err, payload))),
          )
        ),
      ),
    { functional: true },
  );
}
```

Usage — no RxJS visible at the call site:

```typescript
export const saveGame = asyncEffect({
  on:        TicketActions.claimRoute,
  run:       ({ route, cards }) => inject(TicketApiService).persist(route, cards),
  onSuccess: () => TicketActions.nextPlayer(),
  onError:   () => TicketActions.saveFailed(),
  strategy:  'exhaust',
});
```

Firestore / WebSocket real-time subscription (equivalent to `chatMiddleware`):

```typescript
export const listenToChannel = createEffect(
  (actions$ = inject(Actions), svc = inject(ChatService)) =>
    actions$.pipe(
      ofType(ChatActions.joinChannel),
      switchMap(({ channelId }) =>
        svc.messages$(channelId).pipe(
          map(messages => ChatActions.messagesReceived({ messages })),
        )
      ),
    ),
  { functional: true },
);
```

---

## 14. Infrastructure Middleware Equivalents

The monorepo has four infrastructure slices and middleware. Each maps to an NgRx
pattern.

### `loggingMiddleware` → Meta-reducer

A meta-reducer wraps the root reducer and sees every action before and after state
update. It is the precise equivalent of Redux middleware.

```typescript
// src/app/state/meta/logging.meta-reducer.ts
import { ActionReducer } from '@ngrx/store';
import { AppState }       from '../app.state';

const actionStyle = 'padding:2px 8px;border:1px solid black;background-color:plum;color:black';
const errorStyle  = 'padding:2px 8px;border:1px solid black;background-color:red;color:black';

export function loggingMetaReducer(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state, action) => {
    const hasType = !!action.type;
    console[hasType ? 'log' : 'error'](
      `%c +action - ${action.type}`,
      hasType ? actionStyle : errorStyle,
      action,
    );
    return reducer(state, action);
  };
}
```

Register in `app.config.ts`:

```typescript
provideMetaReducers([loggingMetaReducer])
// or conditionally in dev only:
provideMetaReducers(isDevMode() ? [loggingMetaReducer] : [])
```

### `notifySlice` → NgRx slice + notification side-effect

The `notifySlice` holds structured notices (`level`, `kind`, `remedy`, `options`).
The NgRx equivalent is a feature slice with the same shape and an effect that
dispatches dismiss actions on timer if needed.

```typescript
// notify.actions.ts
export const NotifyActions = createActionGroup({
  source: 'Notify',
  events: {
    'Fatal':   props<PNoticeNoKey>(),
    'Error':   props<PNoticeNoKey>(),
    'Warn':    props<PNoticeNoKey>(),
    'Info':    props<PNoticeNoKey>(),
    'Dismiss': props<{ key: string }>(),
  },
});
// Usage: actions.notify.error({ msg: 'Save failed', kind: 'api', remedy: 'Dismiss' })
```

```typescript
// notify.reducer.ts
export const notifyReducer = createReducer(
  initialNotifyState,
  on(NotifyActions.fatal, NotifyActions.error, NotifyActions.warn, NotifyActions.info,
    (s, payload): NotifyState => ({
      ...s,
      notices: [makeNotice(payload), ...s.notices.slice(0, s.max - 1)],
    }),
  ),
  on(NotifyActions.dismiss, (s, { key }): NotifyState => ({
    ...s,
    notices: s.notices.filter(n => n.key !== key),
  })),
);
```

Any slice can signal a notification by dispatching `NotifyActions.error(...)` — no
circular dependency because `notify` is purely additive state. A component that
renders notices reads `state.notify.notices`.

<details>
<summary><strong>Example — fatality detection effect (equivalent to fatalMiddleware)</strong></summary>

```typescript
// fatal.effects.ts
export const detectFatal = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      // Intercept any action with 'error' in the type — adjust predicate as needed
      filter(action => action.type.toLowerCase().includes('/fatal')),
      map(action => NotifyActions.fatal({
        msg:     (action as any).message ?? 'A fatal error occurred',
        kind:    'fatal',
        remedy:  'Restart',
      })),
    ),
  { functional: true },
);
```

</details>

### `coverageSlice` → Meta-reducer

The coverage slice tracks how many times each action has been invoked. The meta-reducer
sees every action and can build the same per-slice hit map.

```typescript
// coverage.meta-reducer.ts
import { ActionReducer } from '@ngrx/store';
import { CoverageActions } from '../coverage/coverage.actions';
import { AppState }        from '../app.state';

export function coverageMetaReducer(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  // Track counts outside the store to avoid circular dispatch
  const hitMap: Record<string, number> = {};
  let flushPending = false;

  return (state, action) => {
    const nextState = reducer(state, action);

    if (action.type && !action.type.startsWith('@ngrx') && !action.type.includes('Coverage')) {
      const [slice, name] = action.type.split('/');
      const key = `${slice}/${name ?? 'unknown'}`;
      hitMap[key] = (hitMap[key] ?? 0) + 1;

      // Debounce: flush the accumulated hits to the store asynchronously
      if (!flushPending) {
        flushPending = true;
        queueMicrotask(() => {
          // Dispatch coverage update outside the current reducer call
          // This requires a reference to the store — see note below
          flushPending = false;
        });
      }
    }

    return nextState;
  };
}
```

> **Note:** dispatching from a meta-reducer synchronously would cause infinite loops.
> The coverage flush is better done as an **Effect** that listens to all non-coverage
> actions and periodically dispatches `CoverageActions.updateSlice(...)`:

```typescript
// coverage.effects.ts
export const trackCoverage = createEffect(
  (actions$ = inject(Actions)) => {
    const counts: Record<string, number> = {};
    return actions$.pipe(
      filter(a => !a.type.startsWith('@ngrx') && !a.type.includes('Coverage')),
      tap(action => { counts[action.type] = (counts[action.type] ?? 0) + 1; }),
      debounceTime(2000),
      map(() => CoverageActions.updateSlice({
        sliceName:      'all',
        hits:           Object.values(counts).reduce((a, b) => a + b, 0),
        lastUpdated:    Date.now(),
        percentCoverage: 0,
        sliceCoverage:  { ...counts },
      })),
    );
  },
  { functional: true },
);
```

### `requestSlice` → HTTP Interceptor + NgRx slice

The `requestSlice` tracks open/closed HTTP requests. Angular has a purpose-built
mechanism for this: HTTP interceptors. The interceptor opens and closes the request
in the store; the slice itself is unchanged in structure.

```typescript
// request.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject }            from '@angular/core';
import { tap, finalize }     from 'rxjs/operators';
import { RequestActionService } from '../state/request/request.action-service';
import { generateReqId }     from '../utils/req-id';

export const requestTrackingInterceptor: HttpInterceptorFn = (req, next) => {
  const ra    = inject(RequestActionService);
  const reqId = generateReqId();

  ra.openRequest({ reqId, url: req.url });

  return next(req).pipe(
    tap({
      next:  resp => ra.closeRequestR({ reqId, elapsed: 0, elapsedMicros: 0 }),
      error: err  => ra.closeRequestE({ reqId, elapsed: 0, elapsedMicros: 0,
                                        name: err.name, message: err.message, stack: err.stack }),
    }),
    finalize(() => { /* any final cleanup */ }),
  );
};
```

Register in `app.config.ts`:

```typescript
provideHttpClient(withInterceptors([requestTrackingInterceptor]))
```

<details>
<summary><strong>Full infrastructure registration in app.config.ts</strong></summary>

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ ticket: ticketReducer, chat: chatReducer, users: usersReducer,
                   notify: notifyReducer, request: requestReducer,
                   coverage: coverageReducer, local: localReducer }),
    provideEffects(
      TicketEffects, ChatEffects,
      [detectFatal, trackCoverage, listenToChannel],   // functional effects
    ),
    provideMetaReducers(
      isDevMode() ? [loggingMetaReducer] : [],
    ),
    provideHttpClient(withInterceptors([requestTrackingInterceptor])),
    provideStoreDevtools({ maxAge: 50, logOnly: !isDevMode() }),
  ],
};
```

</details>

---

## 15. Deprecating Patterns You Want to Prevent

The patterns listed below are the ones this recipe replaces. Preventing
re-introduction requires enforcement at multiple layers.

### Patterns to block

| Pattern | Why block | Replacement |
|---|---|---|
| `inject(Store)` in component files | Leaks NgRx into component; bypasses facade | Use `injectActions()` / `injectState()` |
| `store.dispatch()` in component | Same as above | Action service method |
| `.subscribe()` in component | Leak risk; suppresses signal graph | `toSignal()` or `selectSignal()` |
| `ChangeDetectionStrategy.Default` | Unnecessary re-renders | Always `OnPush` |
| `implements OnInit/OnDestroy/OnChanges` | Verbose, non-composable | Functional alternatives |
| `@Output() EventEmitter` for domain events | Prop-chain coupling | Store dispatch |
| Inline `store.select()` in template via `async` pipe | Observable in template | Signal from `injectState()` |

### Layer 1: ESLint

Add project-specific rules. The most impactful is banning `Store` injection in
component files. The `@typescript-eslint/no-restricted-imports` rule handles this:

```json
// .eslintrc.json or eslint.config.mjs
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [
        {
          "name": "@ngrx/store",
          "importNames": ["Store"],
          "message": "Inject injectActions()/injectState() from app/actions and app/state instead of Store directly."
        },
        {
          "name": "@ngrx/effects",
          "importNames": ["Actions"],
          "message": "Actions should be injected inside effect functions, not in components."
        }
      ]
    }]
  }
}
```

For banning `.subscribe()` in component files, a custom ESLint rule or the
`rxjs/no-subscribe-in-component` rule from `eslint-plugin-rxjs-angular` can be used.

For banning `ChangeDetectionStrategy.Default`, the `@angular-eslint/prefer-on-push-component-change-detection` rule enforces `OnPush` on every component.

```json
{
  "rules": {
    "@angular-eslint/prefer-on-push-component-change-detection": "error"
  }
}
```

### Layer 2: Barrel file isolation

Components never import from `@ngrx/store` directly if the only entry point to state
is through `actions.ts` and `state.ts`. Keep those files as the only barrel exports
for domain state and never re-export `Store` or `Actions` from them. A module
boundary linter (Nx's `@nx/enforce-module-boundaries` or a hand-rolled ESLint rule)
can enforce that component files only import from designated state entry-point files.

### Layer 3: PR checklist

Add to your PR template:

```markdown
## State / component checklist
- [ ] No `inject(Store)` in component files
- [ ] No `.subscribe()` in component files
- [ ] `ChangeDetectionStrategy.OnPush` on all new components
- [ ] No `implements OnInit/OnDestroy/OnChanges` (use functional equivalents)
- [ ] No new `@Output() EventEmitter` for domain events (use store)
```

### Layer 4: Code generator

If you use Angular schematics or a custom component generator, configure it to
emit `OnPush`, `standalone: true`, and the `injectActions()`/`injectState()` imports
by default. New components start in compliance without discipline.

---

## 16. Migrating Existing NgRx Code

If you already have a working NgRx store (actions, reducers, selectors, effects) this
recipe requires no changes to those files. The migration path is additive: wrap
existing infrastructure, then update components one at a time.

### Step 1: Add `bindToStore` utility

No existing code changes. Add `src/app/state/bind-to-store.ts` from Section 3.

### Step 2: Create Action Services and State Services for each existing slice

Existing action creators and selectors are used unchanged inside the new services.

```typescript
// For an existing slice that already has actions and selectors:
@Injectable({ providedIn: 'root' })
export class ExistingSliceActionService {
  private bound = bindToStore(inject(Store), ExistingActions);
  readonly doThing    = this.bound.doThing;
  readonly otherThing = this.bound.otherThing;
}

@Injectable({ providedIn: 'root' })
export class ExistingSliceStateService {
  private store = inject(Store);
  readonly someValue  = this.store.selectSignal(selectSomeValue);
  readonly otherValue = this.store.selectSignal(selectOtherValue);
}
```

### Step 3: Add `injectActions()` and `injectState()` entry points

Add the two functions from Section 5, listing existing slices alongside any new ones.

### Step 4: Update components — one at a time

For each component, the migration is a find-and-replace pattern:

| Before | After |
|---|---|
| `private store = inject(Store)` | `private actions = injectActions(); private state = injectState()` |
| `store.dispatch(SomeActions.doThing(payload))` | `this.actions.someSlice.doThing(payload)` |
| `store.select(selectValue).pipe(...)` + `subscribe` | `this.state.someSlice.value` (Signal) |
| `store.selectSignal(selectValue)` | `this.state.someSlice.value` |
| `implements OnInit { ngOnInit() { this.sub = ... } }` | Remove; signal fields initialize at declaration |
| `implements OnDestroy { ngOnDestroy() { this.sub.unsubscribe() } }` | `inject(DestroyRef).onDestroy(...)` |

### Step 5: Add `OnPush` and verify

Add `changeDetection: ChangeDetectionStrategy.OnPush` to the component decorator.
If the component was using observables with the `async` pipe, those must be converted
to signals before `OnPush` will behave correctly. If any properties were mutated in
place (same object reference, changed field), those must be replaced with new
references (which NgRx reducers already guarantee).

### Step 6: Update meta-reducers and effects

Existing effects work unchanged. If you want to adopt the `asyncEffect` helper for
new effects, write new effects in that style and leave existing ones as they are.
Existing meta-reducers work unchanged; add `loggingMetaReducer` alongside them.

<details>
<summary><strong>Before/after — migrating a component with three patterns</strong></summary>

```typescript
// BEFORE
@Component({ changeDetection: ChangeDetectionStrategy.Default })
export class OldComponent implements OnInit, OnDestroy {
  players: Player[] = [];
  private sub!: Subscription;

  constructor(private store: Store) {}

  ngOnInit() {
    this.sub = this.store.select(selectPlayers).subscribe(p => this.players = p);
  }

  addPlayer(name: string) {
    this.store.dispatch(TicketActions.addPlayer({ player: { name, color: 'red' } }));
  }

  ngOnDestroy() { this.sub.unsubscribe(); }
}

// AFTER
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class NewComponent {
  private ta    = injectActions().ticket;
  readonly players = injectState().ticket.players;    // Signal — live, no subscription

  readonly addPlayer = (name: string) => this.ta.addPlayer({ player: { name, color: 'red' } });
  // No constructor, no ngOnInit, no ngOnDestroy
}
```

</details>

---

## 17. Performance, Memory, and Debugging

### Rendering cost

| Scenario | Zone.js Default CD | OnPush + Signals |
|---|---|---|
| Mouse move over document | Full tree check, every component | Zero checks (no subscription, no mutation) |
| HTTP response | Full tree check | Only components whose signals changed |
| Irrelevant store update | Full tree check | Zero (signal value unchanged, no notification) |
| Computed dependency changes | — | Recomputes once, then all consumers of that `computed()` re-render once |

Zone.js patches over 250 browser APIs. Every `setTimeout`, `Promise.then`, `XHR`,
and DOM event schedules a change detection sweep across the entire component tree.
In a busy UI this produces hundreds of sweeps per second even when nothing relevant
has changed. With `OnPush` and signals, the sweep for a given component only runs
when a signal it read during its last render changes value.

### Memory

**Forgotten subscriptions** are the primary memory issue in traditional Angular.
Each `subscribe()` creates a closure that holds references to the subscriber, the
observable chain, and any closed-over variables. If `ngOnDestroy` is absent or does
not unsubscribe, that closure keeps the entire component instance alive after the DOM
element is removed — a classic memory leak that compounds on navigation.

Signals and `toSignal()` are reference-counted through Angular's injection context.
When the context is destroyed (component destroyed), all signals created within it
are automatically cleaned up. There is no code to write and nothing to forget.

`computed()` signals add a small fixed overhead per instance (dependency tracking
node in the signal graph) but are otherwise constant. They do not hold closures over
mutable external state.

### Debugging

**NgRx DevTools** provides time-travel debugging regardless of which patterns you
use. Every dispatched action is recorded; you can replay forward and backward. This
is not affected by migrating to facades or signals.

**Angular DevTools** (browser extension) shows the signal graph for the selected
component: which signals exist, their current values, and which `computed()` signals
depend on them. This replaces the need to set breakpoints inside `ngOnChanges` to
figure out why a value changed.

**Effect debugging:** functional effects (`{ functional: true }`) produce clean stack
traces because they are plain functions rather than class methods decorated with
metadata. When an effect throws, the stack points directly to the problem line.

**Diagnosing a stale signal:** if a template shows a value that appears not to have
updated, the investigation path is:
1. Verify the component has `OnPush` — without it, signal scheduling still works but
   the timing may differ.
2. Check that the signal is actually read in the template (not in a method that is
   called conditionally).
3. Inspect the signal value in Angular DevTools.
4. Trace back to the selector and verify the reducer is producing a new object
   reference (not mutating in place).

**Diagnosing slow rendering:** Chrome DevTools Performance panel + Angular's
profiling mode (`enableProfiling()` in `platformBrowserDynamic`). With `OnPush` and
signals, the change detection graph shrinks dramatically; the performance view will
show only the components that actually changed.

**Zone.js overhead visibility:** in the Performance panel, look for
`ApplicationRef.tick` calls. In a Default-strategy app these appear constantly. With
`OnPush` + signals they should appear only when a signal-connected component renders.
Enabling zoneless mode (Angular 18) eliminates `ApplicationRef.tick` from zone
triggers entirely.

---

## 18. Future Angular Versions

All patterns in this recipe are aligned with Angular's signal-first roadmap. No
breaking changes are anticipated; each version adds capabilities this recipe can
adopt incrementally.

### Angular 18
- **Zoneless mode** (`provideExperimentalZonelessChangeDetection()`): drop-in in
  `app.config.ts`, no component changes. Removes zone.js (≈12 KB), eliminates
  the polling overhead described above.
- **`resource()` API** (developer preview): signal-based async data. A facade can
  expose `resource()` instances directly instead of a selector + effect pair for
  HTTP-backed state.

### Angular 19
- **`resource()` stable**: adopt for HTTP state in facades.
- **`linkedSignal()`**: writable computed (seed from store, edit locally, reset on
  store change). Useful for inline editing components.

### NgRx 18+
- `@ngrx/signals` matures as a local state option; does not conflict with `@ngrx/store`.
- Functional effects (`{ functional: true }`) are the team's preferred style going
  forward; the `asyncEffect` helper used here is forward-compatible.

---

## Summary Checklist

### Per component
- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Only `injectActions()` and `injectState()` for store access — no `inject(Store)`
- [ ] State read via `injectState().sliceName.signalName` — returns `Signal<T>`
- [ ] Actions called as `actions.sliceName.actionName()` — no `dispatch` visible
- [ ] Derived values via `computed()` — not methods
- [ ] Local state via `signal()` — not class fields with manual mutation
- [ ] No `.subscribe()` — use `toSignal()` at Observable boundaries
- [ ] Marshallers named and sectioned — complex payload assembly separated from handlers
- [ ] No `@Output` for domain events — dispatch through action service
- [ ] No `implements OnInit/OnDestroy/OnChanges`

### Per Action Service
- [ ] Uses `bindToStore()` — no manual `this.store.dispatch(...)` bodies
- [ ] Contains only dispatch methods — no signals, no selectors

### Per State Service
- [ ] Contains only `store.selectSignal()` calls — no dispatch
- [ ] No Observable exposure — signals only

### Per Effect
- [ ] Functional style (`{ functional: true }`) or class with `inject()`
- [ ] Use `asyncEffect()` helper for action → async → success/failure
- [ ] Real-time subscriptions via `switchMap` to Observable → action map

### Per new slice (infrastructure)
- [ ] Logging: meta-reducer registered in `provideMetaReducers()`
- [ ] Notifications: `NotifyActions.error/warn/info/fatal` dispatch from any effect
- [ ] Coverage: effect with `debounceTime` dispatching `CoverageActions.updateSlice`
- [ ] HTTP tracking: interceptor dispatches to `RequestActionService`
