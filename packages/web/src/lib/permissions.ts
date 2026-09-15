import { ROLE_PERMISSIONS } from './roles';

export type Permission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS][number];

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return (permissions as readonly Permission[]).includes(permission);
}

export function hasAnyPermission(role: string, ...permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
