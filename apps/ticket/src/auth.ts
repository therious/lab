import { useState, useEffect }               from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp }      from 'firebase/firestore';
import { firebaseAuth, db }                  from './firebase';

type SessionRec     = User | null;
type SetSessionFunc = (session: SessionRec) => void;

export const useSession = (): [SessionRec, SetSessionFunc] => {
  const [session, setSession] = useState<SessionRec>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
      setSession(user);
      if (user) {
        // Upsert user profile so others can see who is around
        setDoc(doc(db, 'users', user.uid), {
          uid:         user.uid,
          email:       user.email,
          displayName: user.displayName ?? user.email,
          photoURL:    user.photoURL,
          lastSeen:    serverTimestamp(),
        }, { merge: true });
      }
    });
    return unsubscribe;
  }, []);
  return [session, setSession];
};

export const signout = () => signOut(firebaseAuth);
