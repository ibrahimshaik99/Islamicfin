import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc } from 'drizzle-orm';
import { db } from '../db';
import { financeRequests } from '../db/schema/finance-requests';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const financeRequestRoutes = new Hono();

// Create finance request
financeRequestRoutes.post(
  '/:communityId/finance-requests',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = z
      .object({
        requestType: z.enum(['INVESTMENT', 'LOAN', 'DONATION', 'PARTNERSHIP']),
        amount: z.string().optional(),
        description: z.string().min(10).max(2000),
        contactPhone: z.string().max(20).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.description?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const [request] = await db
      .insert(financeRequests)
      .values({
        communityId,
        userId: user.id,
        requestType: result.data.requestType,
        amount: result.data.amount,
        description: result.data.description,
        contactPhone: result.data.contactPhone,
        status: 'PENDING',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance_request.create',
      entityType: 'finance_request',
      entityId: request.id,
      newValues: { requestType: result.data.requestType },
    });

    return c.json({ data: request }, 201);
  },
);

// List finance requests (scoped by role)
financeRequestRoutes.get(
  '/:communityId/finance-requests',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const status = c.req.query('status');
    const requestType = c.req.query('requestType');
    const offset = (page - 1) * limit;

    const conditions = [eq(financeRequests.communityId, communityId)];

    // Customer: only their own requests
    if (c.get('role') === 'CUSTOMER') {
      conditions.push(eq(financeRequests.userId, user.id));
    }

    if (status) {
      conditions.push(eq(financeRequests.status, status as 'PENDING' | 'CONTACTED' | 'CLOSED'));
    }

    if (requestType) {
      conditions.push(eq(financeRequests.requestType, requestType as 'INVESTMENT' | 'LOAN' | 'DONATION' | 'PARTNERSHIP'));
    }

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(financeRequests)
      .where(and(...conditions));

    const data = await db
      .select()
      .from(financeRequests)
      .where(and(...conditions))
      .orderBy(desc(financeRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
);

// Update finance request status
financeRequestRoutes.patch(
  '/:communityId/finance-requests/:requestId/status',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { requestId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({ status: z.enum(['CONTACTED', 'CLOSED', 'PENDING']) })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid status.' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(financeRequests)
      .where(
        and(
          eq(financeRequests.id, requestId),
          eq(financeRequests.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Finance request not found.' } },
        404,
      );
    }

    const [updated] = await db
      .update(financeRequests)
      .set({ status: result.data.status, updatedAt: new Date() })
      .where(eq(financeRequests.id, requestId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: `finance_request.${result.data.status.toLowerCase()}`,
      entityType: 'finance_request',
      entityId: requestId,
      newValues: { status: result.data.status },
    });

    return c.json({ data: updated });
  },
);

export default financeRequestRoutes;
