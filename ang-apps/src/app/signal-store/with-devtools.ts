import { isDevMode, isSignal }                               from '@angular/core';
import { getState, patchState, signalStoreFeature, withHooks } from '@ngrx/signals';

interface DevToolsConnection {
  init(state: unknown): void;
  send(action: { type: string }, state: unknown): void;
  subscribe(listener: (message: DevToolsMessage) => void): () => void;
}
interface DevToolsMessage {
  type: string;
  state?: string;
  payload?: { type?: string };
}

function getExtension(): { connect(o: { name: string }): DevToolsConnection } | null {
  return typeof window !== 'undefined'
    ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ ?? null
    : null;
}

/**
 * Adds Redux DevTools integration to any signalStore.
 *
 * Place after withMethods so all methods are present when onInit wraps them.
 *
 *   export const CounterStore = signalStore(
 *     withState(initial),
 *     withComputed(...),
 *     withMethods(...),
 *     withDevtools('CounterStore'),   ← last
 *   );
 *
 * What you get in DevTools:
 * - State tree visible under the store name
 * - Each method call logged as `StoreName/methodName` (with its args)
 * - Time-travel and RESET supported via JUMP_TO_STATE / JUMP_TO_ACTION
 * - No-op in production (isDevMode() guard)
 */
export function withDevtools(storeName: string) {
  return signalStoreFeature(
    withHooks((store) => ({
      onInit() {
        if (!isDevMode()) return;
        const ext = getExtension();
        if (!ext) return;

        const conn = ext.connect({ name: storeName });
        conn.init(getState(store));

        // Support time-travel and reset from DevTools panel
        conn.subscribe((msg) => {
          if (msg.type !== 'DISPATCH' || !msg.state) return;
          const kind = msg.payload?.type;
          if (kind === 'JUMP_TO_ACTION' || kind === 'JUMP_TO_STATE' || kind === 'RESET') {
            patchState(store as any, JSON.parse(msg.state));
          }
        });

        // Wrap every method so DevTools shows the real action name.
        // Signals are functions too — isSignal() filters them out.
        const s = store as Record<string, unknown>;
        for (const key of Object.keys(s)) {
          const val = s[key];
          if (typeof val !== 'function' || isSignal(val)) continue;
          const original = val as (...a: unknown[]) => unknown;
          s[key] = (...args: unknown[]) => {
            original(...args);
            // State is already updated by patchState inside the method
            conn.send({ type: `${storeName}/${key}` }, getState(store));
          };
        }
      },
    })),
  );
}
