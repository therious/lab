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
