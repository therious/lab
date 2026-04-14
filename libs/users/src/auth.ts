import { useState, useEffect }                    from 'react';
import { User, signOut, onAuthStateChanged, Auth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { appKey } from './app-key';

type SessionRec     = User | null;
type SetSessionFunc = (session: SessionRec) => void;

export const useSession = (
  auth:    Auth,
  db:      Firestore,
  actions: any,
): [SessionRec, SetSessionFunc] => {
  const [session, setSession] = useState<SessionRec>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setSession(user);
      actions.chat.setMe(user
        ? { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? user.email ?? '' }
        : null,
      );
      if (user) {
        setDoc(doc(db, 'apps', appKey(), 'users', user.uid), {
          uid:         user.uid,
          email:       user.email,
          displayName: user.displayName ?? user.email,
          photoURL:    user.photoURL,
          lastSeen:    serverTimestamp(),
          isOnline:    true,
        }, { merge: true });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [session, setSession];
};

export const signout = async (auth: Auth, db: Firestore): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, 'apps', appKey(), 'users', user.uid),
      { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
  }
  return signOut(auth);
};
