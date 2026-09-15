import { Context, Next } from 'hono';
import { hasPermission, hasAnyPermission, type Permission } from './roles';

export function requirePermission(...permissions: Permission[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const tenant = c.get('tenant');

    if (!tenant) {
      return c.json(
        {
          error: {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context is required.',
          },
        },
        400,
      );
    }

    if (!hasAnyPermission(tenant.role, ...permissions)) {
      return c.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Required permission: ${permissions.join(' or ')}.`,
          },
        },
        403,
      );
    }

    return next();
  };
}

export function requireAllPermissions(...permissions: Permission[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const tenant = c.get('tenant');

    if (!tenant) {
      return c.json(
        {
          error: {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context is required.',
          },
        },
        400,
      );
    }

    const missing = permissions.filter(
      (p) => !hasPermission(tenant.role, p),
    );

    if (missing.length > 0) {
      return c.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Missing permissions: ${missing.join(', ')}.`,
          },
        },
        403,
      );
    }

    return next();
  };
}

export { hasPermission, hasAnyPermission } from './roles';
export type { Permission } from './roles';
