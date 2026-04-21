# Firebase Schema

This document describes every collection and document shape used by apps in this monorepo. All apps share a single Firebase project. App-specific data is scoped under `apps/{appId}` (see [App ID](#app-id) below). Identity data (roles) lives at the root so it is portable across apps.

---

## App ID

All per-app collections are nested under:

```
apps/{appId}/...
```

`appId` is derived at runtime from the browser's origin:

| Environment       | appId              |
|-------------------|--------------------|
| localhost dev     | `localhost_5173`   |
| localhost roots   | `localhost_5174`   |
| Production domain | `app.example.com`  |

Code: `libs/users/src/app-key.ts`

---

## Global Collections

### `userRoles/{uid}`

Stores a user's roles across all apps. Lives at the Firestore root — not under `apps/{appId}` — because identity is portable.

**Document shape:**

```
userRoles/{uid}
  roles: string[]     // e.g. ["ticket:admin", "*:admin", "roots:editor"]
```

**Role format:** `appname:rolename`. The wildcard prefix `*:rolename` satisfies any `appname:rolename` check when the role name is unique by convention.

**Bootstrap:** The first `*:admin` document must be created manually in the Firebase Console. Thereafter, admin users can grant/revoke roles via the AdminView screen.

**Access rules:**
- Any authenticated user can read their own document
- Users holding `*:admin` or any `appname:admin` role can read and write any document
- All other client writes are denied (roles are managed via AdminView or the Admin SDK)

---

## Per-App Collections

All paths below are prefixed with `apps/{appId}/`.

---

### `apps/{appId}/users/{uid}`

Written on every login/logout. Used for the users grid, presence indicators, and avatar display.

**Document shape:**

```
apps/{appId}/users/{uid}
  uid:          string        // Firebase Auth UID
  email:        string
  displayName:  string        // falls back to email if no display name set
  photoURL:     string | null // Google profile photo URL, or null
  lastSeen:     Timestamp     // server timestamp, updated on login and periodic heartbeat
  isOnline:     boolean       // set true on login, false on sign-out
```

**Written by:** `useSession` on login (merge), `signout` on logout (sets `isOnline: false`), and `initChatMiddleware` heartbeat (updates `lastSeen`).

**Access rules:**
- Any authenticated user can read all documents (required for the users grid)
- Only the document owner can write their own document

---

### `apps/{appId}/chats/{chatId}/messages/{msgId}`

1-1 direct messages between two users.

**Chat ID format:** `[uidA, uidB].sort().join('__')` — deterministic, derived from the two participants. No separate ACL document needed.

**Message document shape:**

```
apps/{appId}/chats/{chatId}/messages/{msgId}
  from:      string     // sender UID
  fromEmail: string     // denormalized for display without extra lookups
  text:      string
  timestamp: Timestamp
```

**Access rules:**
- Only the two participants (UIDs extracted from `chatId.split('__')`) can read messages
- Only the sender can create a message (`from == request.auth.uid`)
- No update or delete

---

### `apps/{appId}/groupChats/{chatId}`

Group chat metadata. The `chatId` is a Firestore auto-generated ID.

**Document shape:**

```
apps/{appId}/groupChats/{chatId}
  participants:  string[]         // UIDs of all group members
  nickname:      string           // group display name, editable by any participant
  createdBy:     string           // UID of creator
  lastMessageAt: Timestamp | null // updated when a message is sent
```

**Access rules:**
- `get` (single doc): only participants can read
- `list` (query): any authenticated user (query is always filtered by `array-contains` on the client — Firestore rules cannot statically verify the filter implies membership)
- `create`: requester must be in `participants` and must be `createdBy`
- `update`: any participant (for nickname and `lastMessageAt` changes)

**Lazy creation:** Group chats are not written to Firestore until the first message is sent. Until then they exist only in Redux state as `pending: true`.

---

### `apps/{appId}/groupChats/{chatId}/messages/{msgId}`

Messages within a group chat. Same shape as 1-1 messages.

**Message document shape:**

```
apps/{appId}/groupChats/{chatId}/messages/{msgId}
  from:      string     // sender UID
  fromEmail: string
  text:      string
  timestamp: Timestamp
```

**Access rules:**
- Any authenticated user can read (security relies on the unguessable auto-generated `chatId` — clients only discover group IDs through the scoped `groupChats` query)
- Only the sender can create (`from == request.auth.uid`)
- `get()` lookups in list rules are not supported by Firestore, so participant checks cannot be enforced here at the rules level

---

## Firebase Authentication

Google Sign-In is the only configured provider. Firebase Auth manages sessions; the `User` object from `onAuthStateChanged` provides `uid`, `email`, `displayName`, and `photoURL`.

`useSession` (in `libs/users/src/auth.ts`) hooks into `onAuthStateChanged` and:
1. Fetches `userRoles/{uid}` to load the user's roles before any component renders
2. Upserts `apps/{appId}/users/{uid}` with current presence data
3. Dispatches `chat/setMe` with `{ uid, email, displayName, roles }` into Redux

This ensures `RoleGuard` never sees a role-less authenticated frame.

---

## Firestore Rules

Full rules: `apps/ticket/docs/firestore-rules.txt`

Key design decisions:
- `get()` cross-document lookups are used only in single-document read/write rules, never in list/query rules (where they are unsupported and silently deny)
- Group chat message security relies on the unguessable chatId rather than participant checks in list rules
- Role enforcement is primarily client-side via `RoleGuard`; Firestore rules are a secondary backstop
