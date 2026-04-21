import React from 'react';
import { useUsersCtx } from '../context';
import { hasAnyRoleInApp } from '../role-utils';

type Props = {
  /** At least one of these roles must be satisfied (OR semantics). */
  roles:     string[];
  children:  React.ReactNode;
  /** Rendered when the user lacks the required roles. Defaults to null. */
  fallback?: React.ReactNode;
};

/**
 * Renders children if the current user satisfies at least one of the required roles.
 * A wildcard role "*:rolename" in the user's role set satisfies any "appname:rolename"
 * requirement where the role names match.
 *
 * Usage:
 *   <Route path="/game" element={
 *     <RoleGuard roles={['ticket:player']}>
 *       <Game />
 *     </RoleGuard>
 *   } />
 *
 * Pass a fallback prop (e.g. <Navigate to="/" />) to redirect instead of rendering null.
 */
export const RoleGuard = ({ roles, children, fallback = null }: Props) => {
  const { useSelector, appName } = useUsersCtx();
  const userRoles: string[] = useSelector((s: any) => s.chat.me?.roles ?? []);

  return hasAnyRoleInApp(userRoles, roles, appName) ? <>{children}</> : <>{fallback}</>;
};
