import React, { createContext, useContext } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

// Loose types for the injected Redux bindings — strong types live in the
// consuming app where TotalState is defined.
export type UsersCtxValue = {
  db:          Firestore;
  auth:        Auth;
  actions:     any;
  useSelector: (selector: (s: any) => any) => any;
  requireAuth: boolean;
};

const Ctx = createContext<UsersCtxValue | null>(null);

export const useUsersCtx = (): UsersCtxValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUsersCtx must be used inside <UsersProvider>');
  return v;
};

type Props = Omit<UsersCtxValue, 'requireAuth'> & {
  requireAuth?: boolean;   // default true — set false when using useSession({ skip: true })
  children:     React.ReactNode;
};

export const UsersProvider = ({ db, auth, actions, useSelector, requireAuth = true, children }: Props) => (
  <Ctx.Provider value={{ db, auth, actions, useSelector, requireAuth }}>
    {children}
  </Ctx.Provider>
);
