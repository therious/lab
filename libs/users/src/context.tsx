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
};

const Ctx = createContext<UsersCtxValue | null>(null);

export const useUsersCtx = (): UsersCtxValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUsersCtx must be used inside <UsersProvider>');
  return v;
};

type Props = UsersCtxValue & { children: React.ReactNode };

export const UsersProvider = ({ db, auth, actions, useSelector, children }: Props) => (
  <Ctx.Provider value={{ db, auth, actions, useSelector }}>
    {children}
  </Ctx.Provider>
);
