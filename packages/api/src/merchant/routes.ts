import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc } from 'drizzle-orm';
import { db } from '../db';
import { merchants } from '../db/schema/merchants';
import { communityMemberships } from '../db/schema/communities';
import { auditLogs } from '../db/schema/audit';
import { conversations, conversationMembers, messages } from '../db/schema/messaging';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const merchantRoutes = new Hono();

// Merchant apply (any authenticated community member)
merchantRoutes.post(
  '/:communityId/merchants/apply',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:apply'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = z
      .object({
        businessName: z.string().min(1).max(255),
        description: z.string().optional(),
        phone: z.string().max(20).optional(),
        whatsapp: z.string().max(20).optional(),
        address: z.string().optional(),
        upiId: z.string().max(255).optional(),
        upiQrUrl: z.string().optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.businessName?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.communityId, communityId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(
        { error: { code: 'ALREADY_APPLIED', message: 'You have already applied as a merchant in this community.' } },
        409,
      );
    }

    const [merchant] = await db
      .insert(merchants)
      .values({
        communityId,
        userId: user.id,
        businessName: result.data.businessName,
        description: result.data.description,
        phone: result.data.phone,
        whatsapp: result.data.whatsapp,
        address: result.data.address,
        upiId: result.data.upiId,
        upiQrUrl: result.data.upiQrUrl,
        verificationStatus: 'PENDING',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'merchant.apply',
      entityType: 'merchant',
      entityId: merchant.id,
      newValues: { businessName: result.data.businessName },
    });

    return c.json({ data: merchant }, 201);
  },
);

// List community merchants (admin)
merchantRoutes.get(
  '/:communityId/merchants',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = parseInt(c.req.query('page') ?? '1');
    const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const status = c.req.query('status');

    const conditions = [eq(merchants.communityId, communityId)];
    if (status) {
      conditions.push(
        eq(
          merchants.verificationStatus,
          status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED',
        ),
      );
    }

    const where = and(...conditions);

    const data = await db
      .select({
        id: merchants.id,
        userId: merchants.userId,
        businessName: merchants.businessName,
        verificationStatus: merchants.verificationStatus,
        phone: merchants.phone,
        createdAt: merchants.createdAt,
      })
      .from(merchants)
      .where(where)
      .orderBy(desc(merchants.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: count() })
      .from(merchants)
      .where(where);

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total: total[0]?.count ?? 0,
        totalPages: Math.ceil((total[0]?.count ?? 0) / limit),
      },
    });
  },
);

// Get own merchant profile
merchantRoutes.get(
  '/:communityId/merchants/my',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.communityId, communityId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'You do not have a merchant profile in this community.' } },
        404,
      );
    }

    return c.json({ data: merchant });
  },
);

// Update own merchant profile
const updateProfileSchema = z.object({
  businessName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  address: z.string().optional(),
  upiId: z.string().max(255).optional(),
  upiQrUrl: z.string().optional(),
});

merchantRoutes.patch(
  '/:communityId/merchants/my',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.communityId, communityId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'You do not have a merchant profile in this community.' } },
        404,
      );
    }

    if (existing.verificationStatus === 'SUSPENDED') {
      return c.json(
        { error: { code: 'SUSPENDED', message: 'Suspended merchants cannot update their profile.' } },
        403,
      );
    }

    const [updated] = await db
      .update(merchants)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(merchants.id, existing.id))
      .returning();

    return c.json({ data: updated });
  },
);

// Get merchant details (admin)
merchantRoutes.get(
  '/:communityId/merchants/:merchantId',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { merchantId } = c.req.param();

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, merchantId),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Merchant not found.' } },
        404,
      );
    }

    return c.json({ data: merchant });
  },
);

// Approve/reject merchant (admin)
const verifySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(500).optional(),
});

merchantRoutes.patch(
  '/:communityId/merchants/:merchantId/verify',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:verify'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { merchantId } = c.req.param();

    const body = await c.req.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.status?.[0] ?? 'Invalid status' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, merchantId),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Merchant not found.' } },
        404,
      );
    }

    if (existing.verificationStatus !== 'PENDING') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Only pending merchants can be verified.' } },
        400,
      );
    }

    const [updated] = await db
      .update(merchants)
      .set({
        verificationStatus: result.data.status,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: `merchant.${result.data.status.toLowerCase()}`,
      entityType: 'merchant',
      entityId: merchantId,
      oldValues: { verificationStatus: existing.verificationStatus },
      newValues: { verificationStatus: result.data.status, reason: result.data.reason },
    });

    if (result.data.status === 'APPROVED') {
      // Promote membership role to MERCHANT
      await db
        .update(communityMemberships)
        .set({ role: 'MERCHANT', updatedAt: new Date() })
        .where(
          and(
            eq(communityMemberships.userId, existing.userId),
            eq(communityMemberships.communityId, communityId),
          ),
        );

      const [conv] = await db
        .insert(conversations)
        .values({ communityId, type: 'DIRECT' })
        .returning();

      await db.insert(conversationMembers).values([
        { conversationId: conv.id, userId: user.id },
        { conversationId: conv.id, userId: existing.userId },
      ]);

      await db.insert(messages).values({
        conversationId: conv.id,
        senderId: user.id,
        messageType: 'SYSTEM',
        body: `Welcome! Your merchant account "${existing.businessName}" has been approved. You can now start selling in this community.`,
      });
    } else if (result.data.status === 'REJECTED') {
      // Revert membership role back to CUSTOMER on rejection
      await db
        .update(communityMemberships)
        .set({ role: 'CUSTOMER', updatedAt: new Date() })
        .where(
          and(
            eq(communityMemberships.userId, existing.userId),
            eq(communityMemberships.communityId, communityId),
          ),
        );
    }

    return c.json({ data: updated });
  },
);

// Suspend/reactivate merchant (admin)
const suspendSchema = z.object({
  status: z.enum(['SUSPENDED', 'APPROVED']),
  reason: z.string().max(500).optional(),
});

merchantRoutes.patch(
  '/:communityId/merchants/:merchantId/suspend',
  requireAuth,
  tenantMiddleware,
  requirePermission('merchant:suspend'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { merchantId } = c.req.param();

    const body = await c.req.json();
    const result = suspendSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.status?.[0] ?? 'Invalid status' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, merchantId),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Merchant not found.' } },
        404,
      );
    }

    if (result.data.status === 'SUSPENDED' && existing.verificationStatus !== 'APPROVED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Only approved merchants can be suspended.' } },
        400,
      );
    }

    if (result.data.status === 'APPROVED' && existing.verificationStatus !== 'SUSPENDED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Only suspended merchants can be reactivated.' } },
        400,
      );
    }

    const [updated] = await db
      .update(merchants)
      .set({
        verificationStatus: result.data.status,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId))
      .returning();

    // Update membership role on suspend/reactivate
    if (result.data.status === 'SUSPENDED') {
      await db
        .update(communityMemberships)
        .set({ role: 'CUSTOMER', updatedAt: new Date() })
        .where(
          and(
            eq(communityMemberships.userId, existing.userId),
            eq(communityMemberships.communityId, communityId),
          ),
        );
    } else if (result.data.status === 'APPROVED') {
      await db
        .update(communityMemberships)
        .set({ role: 'MERCHANT', updatedAt: new Date() })
        .where(
          and(
            eq(communityMemberships.userId, existing.userId),
            eq(communityMemberships.communityId, communityId),
          ),
        );
    }

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: result.data.status === 'SUSPENDED' ? 'merchant.suspend' : 'merchant.reactivate',
      entityType: 'merchant',
      entityId: merchantId,
      oldValues: { verificationStatus: existing.verificationStatus },
      newValues: { verificationStatus: result.data.status, reason: result.data.reason },
    });

    return c.json({ data: updated });
  },
);

export default merchantRoutes;
