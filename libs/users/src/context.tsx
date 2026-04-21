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
  /** Symbolic name for this app (e.g. "ticket", "roots", "admin").
   *  Distinct from appKey() which is the runtime origin used for Firestore paths. */
  appName:     string;
};

const Ctx = createContext<UsersCtxValue | null>(null);

export const useUsersCtx = (): UsersCtxValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUsersCtx must be used inside <UsersProvider>');
  return v;
};

type Props = Omit<UsersCtxValue, 'requireAuth' | 'appName'> & {
  appName?:    string;  // symbolic app name — defaults to appKey() if omitted
  requireAuth?: boolean;
  children:    React.ReactNode;
};

export const UsersProvider = ({ db, auth, actions, useSelector, appName, requireAuth = true, children }: Props) => (
  <Ctx.Provider value={{ db, auth, actions, useSelector, requireAuth, appName: appName ?? '' }}>
    {children}
  </Ctx.Provider>
);
