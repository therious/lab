/**
 * Role matching utilities for RoleModel.
 *
 * Roles are namespaced strings: "appname:rolename"
 * A wildcard role "*:rolename" satisfies any "appname:rolename" requirement
 * because role names are globally unique by convention.
 */

/**
 * Returns true if the user's role set satisfies a single required role.
 * "*:rolename" in userRoles satisfies any "appname:rolename" requirement.
 */
export const satisfies = (userRoles: string[], required: string): boolean => {
  if (userRoles.includes(required)) return true;
  const name = required.split(':')[1];
  return !!name && userRoles.includes(`*:${name}`);
};

/**
 * Returns true if the user satisfies at least one of the required roles (OR semantics).
 * An empty required array means no restriction — always returns true.
 * Use this for route/feature gating where any qualifying role grants access.
 */
export const hasAnyRole = (userRoles: string[], required: string[]): boolean =>
  required.length === 0 || required.some(r => satisfies(userRoles, r));

/**
 * Like satisfies(), but accepts unqualified role names (no colon).
 * An unqualified name like "admin" is expanded to "{appName}:admin", then
 * satisfies() resolves both the exact match and the "*:admin" wildcard.
 * Fully-qualified names (containing ":") are passed through unchanged.
 */
export const satisfiesInApp = (userRoles: string[], required: string, appName: string): boolean =>
  satisfies(userRoles, required.includes(':') ? required : `${appName}:${required}`);

/**
 * hasAnyRole with app-aware short-name expansion.
 * Routes can declare roles: ['admin'] instead of ['ticket:admin', '*:admin'] —
 * the appName prefix is injected here, and * wildcards are resolved by satisfies().
 */
export const hasAnyRoleInApp = (userRoles: string[], required: string[], appName: string): boolean =>
  required.length === 0 || required.some(r => satisfiesInApp(userRoles, r, appName));
