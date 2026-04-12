import { useState, useEffect }         from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth }                from './firebase';

type SessionRec    = User | null;
type SetSessionFunc = (session: SessionRec) => void;

export const useSession = (): [SessionRec, SetSessionFunc] => {
  const [session, setSession] = useState<SessionRec>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => setSession(user));
    return unsubscribe;
  }, []);
  return [session, setSession];
};

export const signout = () => signOut(firebaseAuth);
