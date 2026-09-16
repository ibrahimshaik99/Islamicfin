import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc } from 'drizzle-orm';
import { db } from '../db';
import { orderReturns } from '../db/schema/order-returns';
import { orders, orderItems } from '../db/schema/orders';
import { merchants } from '../db/schema/merchants';
import { users } from '../db/schema/users';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const returnRoutes = new Hono();

// Customer: create return request
returnRoutes.post(
  '/:communityId/orders/:orderId/return',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:create'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({ reason: z.string().min(10).max(1000) })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Reason must be at least 10 characters.' } },
        400,
      );
    }

    // Verify order exists and belongs to this customer
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
          eq(orders.customerId, user.id),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // Check if order is in a returnable state
    if (!['DELIVERED', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Only delivered orders can be returned.' } },
        400,
      );
    }

    // Check if return already exists
    const [existing] = await db
      .select()
      .from(orderReturns)
      .where(
        and(
          eq(orderReturns.orderId, orderId),
          eq(orderReturns.customerId, user.id),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(
        { error: { code: 'ALREADY_REQUESTED', message: 'A return request already exists for this order.' } },
        409,
      );
    }

    // Create return request
    const [returnReq] = await db
      .insert(orderReturns)
      .values({
        communityId,
        orderId,
        customerId: user.id,
        merchantId: order.merchantId,
        reason: result.data.reason,
        status: 'PENDING',
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'return.create',
      entityType: 'order_return',
      entityId: returnReq.id,
      newValues: { orderId, reason: result.data.reason },
    });

    return c.json({ data: returnReq }, 201);
  },
);

// Merchant/Community: list return requests
returnRoutes.get(
  '/:communityId/returns',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const status = c.req.query('status');
    const offset = (page - 1) * limit;

    const conditions = [eq(orderReturns.communityId, communityId)];

    // If merchant, only show returns for their orders
    if (c.get('role') === 'MERCHANT' || c.get('role') === 'MERCHANT_STAFF') {
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(and(eq(merchants.userId, user.id), eq(merchants.communityId, communityId)))
        .limit(1);
      if (merchant) {
        conditions.push(eq(orderReturns.merchantId, merchant.id));
      }
    }

    // If customer, only show their own returns
    if (c.get('role') === 'CUSTOMER') {
      conditions.push(eq(orderReturns.customerId, user.id));
    }

    if (status) {
      conditions.push(eq(orderReturns.status, status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'));
    }

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(orderReturns)
      .where(and(...conditions));

    const data = await db
      .select({
        id: orderReturns.id,
        orderId: orderReturns.orderId,
        customerId: orderReturns.customerId,
        merchantId: orderReturns.merchantId,
        reason: orderReturns.reason,
        status: orderReturns.status,
        createdAt: orderReturns.createdAt,
        updatedAt: orderReturns.updatedAt,
        customerName: users.name,
        customerEmail: users.email,
        orderNumber: orders.orderNumber,
        orderTotal: orders.total,
      })
      .from(orderReturns)
      .innerJoin(orders, eq(orderReturns.orderId, orders.id))
      .innerJoin(users, eq(orderReturns.customerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orderReturns.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
);

// Merchant: update return status (approve/reject)
returnRoutes.patch(
  '/:communityId/returns/:returnId/status',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { returnId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({
        status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
        adminNotes: z.string().optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid status.' } },
        400,
      );
    }

    // Verify return exists
    const [existing] = await db
      .select()
      .from(orderReturns)
      .where(
        and(
          eq(orderReturns.id, returnId),
          eq(orderReturns.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Return request not found.' } },
        404,
      );
    }

    if (existing.status !== 'PENDING') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Only pending returns can be updated.' } },
        400,
      );
    }

    // Update status
    const [updated] = await db
      .update(orderReturns)
      .set({
        status: result.data.status,
        adminNotes: result.data.adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(orderReturns.id, returnId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: `return.${result.data.status.toLowerCase()}`,
      entityType: 'order_return',
      entityId: returnId,
      newValues: { status: result.data.status, adminNotes: result.data.adminNotes },
    });

    return c.json({ data: updated });
  },
);

export default returnRoutes;
