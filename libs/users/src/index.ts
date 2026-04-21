// ── Redux slices — register these in the consuming app's combined-slices ──────
export { sliceConfig as chatSlice }    from './slices/chat-slice';
export { sliceConfig as usersSlice }   from './slices/users-slice';
export { chatMiddleware, initChatMiddleware } from './slices/chat-middleware';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { ChatState, ChatMessage, ChatTarget, GroupChat, UserRec } from './slices/chat-slice';
export type { UsersState, UserProfile }                                 from './slices/users-slice';

// ── Provider — wrap app routes that include UsersView ─────────────────────────
export { UsersProvider } from './context';

// ── Components ────────────────────────────────────────────────────────────────
export { UsersView }                                    from './components/UsersView';
export { AdminView }                                    from './components/AdminView';
export { Login }                                        from './components/Login';
export { RoleGuard }                                    from './components/RoleGuard';
export { Foyer, GuardedRoutes, useAccessibleRoutes }    from './components/route-utils';
export type { RouteConfig }                             from './components/route-utils';

// ── Auth utilities — call from App.tsx ───────────────────────────────────────
export { useSession, signout } from './auth';

// ── App-origin key — used to namespace Firestore paths ───────────────────────
export { appKey } from './app-key';

// ── Role utilities ────────────────────────────────────────────────────────────
export { satisfies, hasAnyRole, satisfiesInApp, hasAnyRoleInApp } from './role-utils';
