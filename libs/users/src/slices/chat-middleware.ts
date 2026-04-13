import { Action, NextF } from '@therious/actions';

// Injected at init time — writes lastSeen to Firestore for the given uid
type UpdateLastSeen = (uid: string) => void;

let updateFn: UpdateLastSeen | null = null;

// Throttle coverage-driven updates; messageSent always fires immediately
const kCoverageThrottleMs = 60_000;
let lastCoverageUpdate = 0;

const maybeUpdate = (store: any, force: boolean) => {
  if (!updateFn) return;
  const uid: string | undefined = store.getState().chat?.me?.uid;
  if (!uid) return;
  const now = Date.now();
  if (!force && now - lastCoverageUpdate < kCoverageThrottleMs) return;
  lastCoverageUpdate = now;
  updateFn(uid);
};

export const chatMiddleware = (store: any) => (next: NextF) => (a: Action) => {
  const result = next(a);
  if (a.type === 'chat/messageSent' || a.type === 'chat/groupMessageSent') maybeUpdate(store, true);
  else if (a.type === 'coverage/updateSlice')                              maybeUpdate(store, false);
  return result;
};

// Called after store + firebase are ready. Provide the Firestore updater.
export const initChatMiddleware = (fn: UpdateLastSeen) => { updateFn = fn; };
