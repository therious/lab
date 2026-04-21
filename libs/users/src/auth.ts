import { useState, useEffect }                          from 'react';
import { User, signOut, onAuthStateChanged, Auth }      from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { appKey } from './app-key';

type SessionRec     = User | null;
type SetSessionFunc = (session: SessionRec) => void;

export const useSession = (
  auth:    Auth,
  db:      Firestore,
  actions: any,
): [SessionRec, SetSessionFunc, boolean] => {
  const [session, setSession] = useState<SessionRec>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setSession(user);
      if (!user) {
        actions.chat.setMe(null);
        setLoading(false);
        return;
      }
      // Fetch roles before clearing loading so RoleGuard never sees a role-less frame
      getDoc(doc(db, 'userRoles', user.uid))
        .then(snap => {
          const roles: string[] = snap.exists() ? (snap.data().roles ?? []) : [];
          actions.chat.setMe({
            uid:         user.uid,
            email:       user.email        ?? '',
            displayName: user.displayName  ?? user.email ?? '',
            roles,
          });
        })
        .catch((err) => {
          console.error('[useSession] failed to fetch userRoles:', err?.code, err?.message);
          actions.chat.setMe({
            uid:         user.uid,
            email:       user.email        ?? '',
            displayName: user.displayName  ?? user.email ?? '',
            roles:       [],
          });
        })
        .finally(() => {
          setLoading(false);
          const key = appKey();
          // Register this app origin so the admin app can discover it
          setDoc(doc(db, 'apps', key), { appId: key, lastActive: serverTimestamp() }, { merge: true });
          // Write presence / profile for this user
          setDoc(doc(db, 'apps', key, 'users', user.uid), {
            uid:         user.uid,
            email:       user.email,
            displayName: user.displayName ?? user.email,
            photoURL:    user.photoURL,
            lastSeen:    serverTimestamp(),
            isOnline:    true,
          }, { merge: true });
        });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [session, setSession, loading];
};

export const signout = async (auth: Auth, db: Firestore): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, 'apps', appKey(), 'users', user.uid),
      { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
  }
  return signOut(auth);
};
