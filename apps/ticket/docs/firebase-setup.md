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
  {uid}/              ← written on every login by auth.ts
    uid:         string
    email:       string
    displayName: string
    photoURL:    string | null
    lastSeen:    Timestamp

chats/
  {chatId}/           ← chatId = [uidA, uidB].sort().join('__')
    messages/
      {msgId}/
        from:      string   ← sender uid
        fromEmail: string
        text:      string
        timestamp: Timestamp
```

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

    // Chat participants are the two UIDs embedded in the chatId
    match /chats/{chatId}/messages/{msgId} {
      allow read:  if request.auth != null
                   && request.auth.uid in chatId.split('__');
      allow create: if request.auth != null
                    && request.auth.uid in chatId.split('__')
                    && request.resource.data.from == request.auth.uid;
    }
  }
}
```

> **Why split on `__`?**  
> `chatId` is built as `[uidA, uidB].sort().join('__')` (see `chatId()` in
> `Chat.tsx`). The rules verify that the requesting user is one of the two
> participants without storing a separate ACL document.

---

## 5. Local development checklist

- [ ] `.env.local` present with the three `VITE_FIREBASE_*` vars
- [ ] Google sign-in provider enabled
- [ ] Email/Password + Email link providers enabled
- [ ] `localhost` in Authorised domains
- [ ] Firestore database created
- [ ] Security rules deployed (not still in test mode)
