# Ticket App

A multiplayer Ticket to Ride implementation built with React, Redux, Firebase, and Vite.

## Running locally

```bash
pnpm f ticket start          # from monorepo root
# or from this directory:
pnpm start
```

Requires `.env.local` — see [Firebase setup](docs/firebase-setup.md).

## Key docs

| Document | Contents |
|---|---|
| [docs/firebase-setup.md](docs/firebase-setup.md) | Firebase project setup, auth providers, Firestore data model, security rules, required indexes |
| [docs/readme.md](docs/readme.md) | Game rules reference and implementation todos |
| [docs/state.yaml](docs/state.yaml) | Redux state shape |

## Architecture notes

- **State**: custom Redux integration via `@therious/actions` — slices live in `src/actions/`.
  All slices + middlewares are registered in `src/actions/combined-slices.ts`.
- **Auth + presence**: `src/auth.ts` writes `isOnline`/`lastSeen` to Firestore on login/logout.
  `src/actions/chat-middleware.ts` keeps `lastSeen` fresh during activity.
- **Real-time chat**: 1-1 chats use `chats/{chatId}/messages`; group chats use
  `groupChats/{chatId}/messages`. Both cap history at `HISTORY_LIMIT` messages
  (see `src/actions/chat-slice.ts`).
- **Users view**: `src/react/UsersView.tsx` — users grid + group chats grid + chat panel,
  with resizable splits between panes.
