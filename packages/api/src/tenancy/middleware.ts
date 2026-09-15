import { Context, Next } from 'hono';
import { resolveTenantContext, type TenantContext } from './membership';

declare module 'hono' {
  interface ContextVariableMap {
    tenant?: TenantContext;
  }
}

export async function tenantMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const user = c.get('user');

  if (!user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      401,
    );
  }

  const communityId =
    c.req.param('communityId') || c.req.query('communityId');

  if (!communityId) {
    return c.json(
      {
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Community ID is required.',
        },
      },
      400,
    );
  }

  const tenant = await resolveTenantContext(user.id, communityId);

  if (!tenant) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a member of this community.',
        },
      },
      403,
    );
  }

  c.set('tenant', tenant);

  return next();
}

export async function requireRole(
  ...roles: string[]
) {
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

    if (!roles.includes(tenant.role)) {
      return c.json(
        {
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: `Required role: ${roles.join(' or ')}. Your role: ${tenant.role}.`,
          },
        },
        403,
      );
    }

    return next();
  };
}
