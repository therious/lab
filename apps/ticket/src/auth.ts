import { useState, useEffect }               from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp }      from 'firebase/firestore';
import { firebaseAuth, db }                  from './firebase';
import { actions }                           from './actions-integration';

type SessionRec     = User | null;
type SetSessionFunc = (session: SessionRec) => void;

export const useSession = (): [SessionRec, SetSessionFunc] => {
  const [session, setSession] = useState<SessionRec>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
      setSession(user);
      actions.chat.setMe(user ? { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? user.email ?? '' } : null);
      if (user) {
        setDoc(doc(db, 'users', user.uid), {
          uid:         user.uid,
          email:       user.email,
          displayName: user.displayName ?? user.email,
          photoURL:    user.photoURL,
          lastSeen:    serverTimestamp(),
          isOnline:    true,
        }, { merge: true });
      }
    });
    return unsubscribe;
  }, []);
  return [session, setSession];
};

export const signout = async () => {
  const user = firebaseAuth.currentUser;
  if (user) {
    await setDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
  }
  return signOut(firebaseAuth);
};
