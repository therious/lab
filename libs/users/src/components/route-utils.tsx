import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { useUsersCtx } from '../context';
import { hasAnyRoleInApp } from '../role-utils';
import { RoleGuard }    from './RoleGuard';

/**
 * Declare a route once — drives both the nav (which entries are visible)
 * and the router (which elements are rendered, wrapped in RoleGuard when needed).
 */
export type RouteConfig = {
  path:    string;
  label:   string;
  /** Roles required to access this route. Omit or use [] for no restriction. */
  roles?:  string[];
  element: React.ReactNode;
};

/**
 * Returns the subset of routes the current user can access.
 * Use this to render only the nav entries the user is permitted to see.
 *
 * Behaviour:
 *  - No roles / empty roles array  → always included (requireAuth=false or any logged-in user)
 *  - Has roles                     → included only if the user satisfies at least one
 *  - requireAuth=false (skip mode) → same rule; no roles = included, roles = excluded (no user)
 */
export const useAccessibleRoutes = (routes: RouteConfig[]): RouteConfig[] => {
  const { useSelector, appName } = useUsersCtx();
  const userRoles: string[] = useSelector((s: any) => s.chat.me?.roles ?? []);
  return routes.filter(r => hasAnyRoleInApp(userRoles, r.roles ?? [], appName));
};

/**
 * Renders a <Routes> block from a RouteConfig array.
 * Routes with roles are automatically wrapped in <RoleGuard>.
 */
export const GuardedRoutes = ({ routes }: { routes: RouteConfig[] }) => (
  <Routes>
    {routes.map(r => (
      <Route key={r.path} path={r.path} element={
        r.roles?.length
          ? <RoleGuard roles={r.roles}>{r.element}</RoleGuard>
          : r.element
      } />
    ))}
  </Routes>
);

/**
 * Conventional wrapper for the home route (path="/").
 *
 * When requireAuth=true  (default): only reached after login — content renders normally.
 * When requireAuth=false (skip mode): freely accessible to all — content renders normally.
 *
 * The transparency is in the setup: declare this route with no roles and it behaves
 * correctly in both modes without any conditional logic inside it.
 * Future versions will add role-request discovery UI here (Foyer concept).
 */
export const Foyer = ({ children }: { children: React.ReactNode }) => <>{children}</>;
