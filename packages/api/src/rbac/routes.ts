import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from './middleware';
import { changeMemberRole } from './service';

const rbacRoutes = new Hono();

const changeRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum([
    'COMMUNITY_OWNER',
    'COMMUNITY_ADMIN',
    'COMMUNITY_MODERATOR',
    'COMMUNITY_FINANCE_MANAGER',
    'MERCHANT',
    'MERCHANT_STAFF',
    'CUSTOMER',
  ]),
});

rbacRoutes.post(
  '/:communityId/roles/change',
  requireAuth,
  tenantMiddleware,
  requirePermission('role:change'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const body = await c.req.json();
    const result = changeRoleSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: result.error.errors[0].message,
          },
        },
        422,
      );
    }

    const { membershipId, role } = result.data;

    const changeResult = await changeMemberRole(
      tenant.userId,
      tenant.role,
      tenant.communityId,
      membershipId,
      role,
    );

    if (!changeResult.success) {
      return c.json(
        {
          error: {
            code: 'ROLE_CHANGE_FAILED',
            message: changeResult.error!,
          },
        },
        403,
      );
    }

    return c.json({ data: { message: 'Role changed successfully.' } });
  },
);

rbacRoutes.get(
  '/:communityId/roles/permissions',
  requireAuth,
  tenantMiddleware,
  async (c) => {
    const tenant = c.get('tenant')!;
    const { ROLE_PERMISSIONS } = await import('./roles');
    const permissions = ROLE_PERMISSIONS[tenant.role] ?? [];

    return c.json({
      data: {
        role: tenant.role,
        permissions,
      },
    });
  },
);

export default rbacRoutes;
