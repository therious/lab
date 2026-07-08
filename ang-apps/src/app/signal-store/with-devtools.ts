import { effect, isDevMode }                                from '@angular/core';
import { getState, patchState, signalStoreFeature, withHooks } from '@ngrx/signals';

// ── Shared action-name cell ────────────────────────────────────────────────────
// injectActions() sets this before every method call so the effect() below
// can read the right name when it fires after the state change settles.
export const currentAction = { name: '@@INIT' };

// ── DevTools connection type ───────────────────────────────────────────────────
interface DevToolsConnection {
  init(state: unknown): void;
  send(action: { type: string }, state: unknown): void;
  subscribe(listener: (msg: { type: string; state?: string; payload?: { type?: string } }) => void): void;
}

function getExtension(): { connect(o: { name: string }): DevToolsConnection } | null {
  return typeof window !== 'undefined'
    ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ ?? null
    : null;
}

/**
 * Adds Redux DevTools visibility to a signalStore.
 *
 * Works in two halves:
 *
 *   1. withDevtools() installs an effect() that fires whenever any state signal
 *      changes and sends { type: currentAction.name, state } to DevTools.
 *
 *   2. injectActions() (in actions.ts) sets currentAction.name = 'Store/method'
 *      before calling each store method, so the effect sees the right label.
 *
 * Time-travel (JUMP_TO_ACTION / JUMP_TO_STATE / RESET) is also wired up.
 * No-ops in production (isDevMode() guard).
 *
 * Note: all signals (state + computed) are visible in DevTools state tree.
 * Computed values are included because getState() returns a snapshot.
 * Actually only base state is in getState() — computed is derived separately.
 */
export function withDevtools(storeName: string, enabled = true) {
  return signalStoreFeature(
    withHooks((store) => ({
      onInit() {
        if (!enabled || !isDevMode()) return;
        const ext = getExtension();
        if (!ext) return;

        const conn = ext.connect({ name: storeName });
        conn.init(getState(store));

        // Time-travel and reset
        conn.subscribe((msg) => {
          if (msg.type !== 'DISPATCH' || !msg.state) return;
          const kind = msg.payload?.type;
          if (kind === 'JUMP_TO_ACTION' || kind === 'JUMP_TO_STATE' || kind === 'RESET') {
            patchState(store as any, JSON.parse(msg.state));
          }
        });

        // effect() fires once immediately to establish signal dependencies,
        // then again on every subsequent patchState().  Skip the first run —
        // conn.init() above already sent the initial state as @@INIT.
        let initialized = false;
        effect(() => {
          const state = getState(store);
          if (!initialized) { initialized = true; return; }
          conn.send({ type: currentAction.name }, state);
        });
      },
    })),
  );
}
