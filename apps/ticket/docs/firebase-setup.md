# Firebase Setup — Ticket App

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. Give it a name (e.g. `ticket-dev`). Analytics is optional.
3. Once created, click the **Web** icon (`</>`) to register a web app.
   Copy the config values — you will need them for `.env.local`.

---

## 2. Environment variables

Create `apps/ticket/.env.local` (gitignored) with:

```
# Firebase web app config (from Firebase Console → Project settings → Your apps)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

For production, store these in Doppler and use `pnpm secstart` / `pnpm secbuild`
(scripts that prefix the vite command with `doppler run --`).

---

## 3. Authentication

### Enable providers

Firebase Console → your project → **Authentication** → **Sign-in method**:

| Provider | Notes |
|---|---|
| **Google** | Toggle on. No extra config needed for localhost. |
| **Email/Password** | Toggle on. |
| **Email link (passwordless)** | Under Email/Password → also toggle **Email link**. |

### Authorised domains

Firebase Console → **Authentication** → **Settings** → **Authorised domains**:

Add every domain that will host the app:

- `localhost` (already present)
- Your production domain (e.g. `ticket.example.com`)

The magic-link flow reads the redirect URL from `window.location.href`, so the
domain must be in this list or `signInWithEmailLink` will throw.

### Magic-link storage key

The login form stores the submitted email in `localStorage` under
`ticket:emailForSignIn` before sending the link.  
The completion handler (mounted in `Login.tsx`) reads it back to confirm sign-in.

---

## 4. Firestore

### Create the database

Firebase Console → **Firestore Database** → **Create database**.

- **Start in production mode** (apply rules below immediately).
- Pick a region close to your users; it cannot be changed later.

### Data model

```
users/
  {uid}/                ← written on every auth state change by auth.ts
    uid:          string
    email:        string
    displayName:  string
    photoURL:     string | null
    lastSeen:     Timestamp   ← updated on login, logout, message send,
                                and by chat-middleware on coverage activity ticks
    isOnline:     boolean     ← true on login, false on explicit signout

chats/
  {chatId}/             ← chatId = [uidA, uidB].sort().join('__')
                           see chatId() in actions/chat-slice.ts
    messages/
      {msgId}/
        from:       string    ← sender uid
        fromEmail:  string
        text:       string
        timestamp:  Timestamp

groupChats/
  {chatId}/             ← Firestore auto-generated ID
    participants:   string[]  ← array of UIDs
    nickname:       string
    createdBy:      string    ← UID
    createdAt:      Timestamp
    lastMessageAt:  Timestamp | null
    messages/
      {msgId}/
        from:       string
        fromEmail:  string
        text:       string
        timestamp:  Timestamp
```

### Online / idle status

`isOnline` is written `true` on login and `false` on sign-out.  
`lastSeen` is additionally updated by `chat-middleware.ts` whenever:
- A message is sent (`chat/messageSent` action) — immediate write.
- A coverage activity tick fires (`coverage/updateSlice`) — throttled to once per minute.

The users grid uses `lastSeen` + `INACTIVITY_TIMEOUT_MS` (from `users-slice.ts`) to
show three dot colours: **green** (active), **amber** (idle), **grey** (offline).

### Security rules

Paste these in Firebase Console → **Firestore Database** → **Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Any authenticated user can read profiles; only the owner can write their own
    match /users/{uid} {
      allow read:  if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // 1-1 chats — participants are the two UIDs embedded in chatId
    match /chats/{chatId}/messages/{msgId} {
      allow read:  if request.auth != null
                   && request.auth.uid in chatId.split('__');
      allow create: if request.auth != null
                    && request.auth.uid in chatId.split('__')
                    && request.resource.data.from == request.auth.uid;
    }

    // Group chats — participants stored as an array field
    match /groupChats/{chatId} {
      allow read:   if request.auth != null
                    && request.auth.uid in resource.data.participants;
      allow create: if request.auth != null
                    && request.auth.uid in request.resource.data.participants
                    && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null
                    && request.auth.uid in resource.data.participants;
    }

    match /groupChats/{chatId}/messages/{msgId} {
      allow read:   if request.auth != null
                    && request.auth.uid in get(/databases/$(database)/documents/groupChats/$(chatId)).data.participants;
      allow create: if request.auth != null
                    && request.auth.uid in get(/databases/$(database)/documents/groupChats/$(chatId)).data.participants
                    && request.resource.data.from == request.auth.uid;
    }
  }
}
```

> **Note on group chat rules:** the `get()` call in the messages rule performs one
> extra Firestore read per write. For small user counts this is fine; at scale,
> denormalize the participant list into each message or use a custom token claim.

### Required indexes

| Collection | Fields | Order |
|---|---|---|
| `chats/{id}/messages` | `timestamp` asc | created automatically on first query |
| `groupChats/{id}/messages` | `timestamp` asc | created automatically on first query |
| `groupChats` | `participants` array-contains + `lastMessageAt` desc | create via the link Firebase logs in console |

The background listener query (`where('participants','array-contains', uid)`) requires
the composite index above. Firebase will log a clickable link the first time the query
runs without it.

---

## 5. Local development checklist

- [ ] `.env.local` present with the three `VITE_FIREBASE_*` vars
- [ ] Google sign-in provider enabled
- [ ] Email/Password + Email link providers enabled
- [ ] `localhost` in Authorised domains
- [ ] Firestore database created
- [ ] Security rules deployed (not still in test mode)
- [ ] Composite index on `groupChats` created (or wait for the console link after first run)
