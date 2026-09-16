import { Hono } from 'hono';
import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import {
  communities,
  communityMemberships,
  users,
  merchants,
  auditLogs,
  subscriptions,
  orders,
  financeReviews,
  crowdfundingProjects,
  kametiGroups,
  riskFlags,
} from '../db/schema';
import { requireSuperAdmin } from './middleware';

const adminRoutes = new Hono();

adminRoutes.use('*', requireSuperAdmin);

// Dashboard overview
adminRoutes.get('/dashboard', async (c) => {
  const totalCommunities = await db
    .select({ count: count() })
    .from(communities);

  const activeCommunities = await db
    .select({ count: count() })
    .from(communities)
    .where(eq(communities.status, 'ACTIVE'));

  const totalUsers = await db.select({ count: count() }).from(users);

  const activeUsers = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.status, 'ACTIVE'));

  const totalMerchants = await db.select({ count: count() }).from(merchants);

  const pendingMerchants = await db
    .select({ count: count() })
    .from(merchants)
    .where(eq(merchants.verificationStatus, 'PENDING'));

  const totalOrders = await db.select({ count: count() }).from(orders);

  const activeSubscriptions = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'ACTIVE'));

  const pendingFinanceReviews = await db
    .select({ count: count() })
    .from(financeReviews)
    .where(eq(financeReviews.status, 'PENDING_REVIEW'));

  const activeCrowdfunding = await db
    .select({ count: count() })
    .from(crowdfundingProjects)
    .where(eq(crowdfundingProjects.status, 'ACTIVE'));

  const totalKametiGroups = await db
    .select({ count: count() })
    .from(kametiGroups);

  const totalRiskFlags = await db
    .select({ count: count() })
    .from(riskFlags);

  const flaggedRiskFlags = await db
    .select({ count: count() })
    .from(riskFlags)
    .where(eq(riskFlags.status, 'FLAGGED'));

  const recentAuditLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  return c.json({
    data: {
      communities: {
        total: totalCommunities[0]?.count ?? 0,
        active: activeCommunities[0]?.count ?? 0,
      },
      users: {
        total: totalUsers[0]?.count ?? 0,
        active: activeUsers[0]?.count ?? 0,
      },
      merchants: {
        total: totalMerchants[0]?.count ?? 0,
        pending: pendingMerchants[0]?.count ?? 0,
      },
      orders: {
        total: totalOrders[0]?.count ?? 0,
      },
      subscriptions: {
        active: activeSubscriptions[0]?.count ?? 0,
      },
      finance: {
        pendingReviews: pendingFinanceReviews[0]?.count ?? 0,
      },
      crowdfunding: {
        active: activeCrowdfunding[0]?.count ?? 0,
      },
      kameti: {
        total: totalKametiGroups[0]?.count ?? 0,
      },
      riskFlags: {
        total: totalRiskFlags[0]?.count ?? 0,
        flagged: flaggedRiskFlags[0]?.count ?? 0,
      },
      recentAuditLogs,
    },
  });
});

// Communities - List
adminRoutes.get('/communities', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const search = c.req.query('search') ?? '';
  const status = c.req.query('status');

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(communities.name, `%${search}%`),
        ilike(communities.slug, `%${search}%`),
      ),
    );
  }
  if (status) {
    conditions.push(eq(communities.status, status as 'ACTIVE' | 'SUSPENDED'));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      status: communities.status,
      createdAt: communities.createdAt,
    })
    .from(communities)
    .where(where)
    .orderBy(desc(communities.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(communities)
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
});

// Communities - Detail
adminRoutes.get('/communities/:communityId', async (c) => {
  const communityId = c.req.param('communityId');

  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  if (!community) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Community not found.' } },
      404,
    );
  }

  const members = await db
    .select({
      id: communityMemberships.id,
      userId: communityMemberships.userId,
      role: communityMemberships.role,
      status: communityMemberships.status,
      joinedAt: communityMemberships.joinedAt,
    })
    .from(communityMemberships)
    .where(eq(communityMemberships.communityId, communityId));

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.communityId, communityId))
    .limit(1);

  return c.json({
    data: {
      ...community,
      members,
      subscription: subscription[0] ?? null,
    },
  });
});

// Communities - Status change
const statusChangeSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

// Communities - Create
const createCommunitySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(1000).optional(),
});

adminRoutes.post('/communities', async (c) => {
  const body = await c.req.json();
  const result = createCommunitySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const existing = await db
    .select({ id: communities.id })
    .from(communities)
    .where(eq(communities.slug, result.data.slug))
    .limit(1);

  if (existing.length > 0) {
    return c.json(
      { error: { code: 'CONFLICT', message: 'A community with this slug already exists.' } },
      409,
    );
  }

  const [created] = await db
    .insert(communities)
    .values({
      name: result.data.name,
      slug: result.data.slug,
      description: result.data.description,
      status: 'PENDING',
    })
    .returning({ id: communities.id, name: communities.name, slug: communities.slug, status: communities.status });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'community.create',
    entityType: 'community',
    entityId: created.id,
    newValues: { name: result.data.name, slug: result.data.slug },
  });

  return c.json({ data: created }, 201);
});

adminRoutes.post('/communities/:communityId/status', async (c) => {
  const communityId = c.req.param('communityId');
  const body = await c.req.json();
  const result = statusChangeSchema.safeParse(body);

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

  const [updated] = await db
    .update(communities)
    .set({ status: result.data.status, updatedAt: new Date() })
    .where(eq(communities.id, communityId))
    .returning({ id: communities.id, status: communities.status });

  if (!updated) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Community not found.' } },
      404,
    );
  }

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'community.status_change',
    entityType: 'community',
    entityId: communityId,
    newValues: { status: result.data.status },
  });

  return c.json({ data: updated });
});

// Users - List
adminRoutes.get('/users', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const search = c.req.query('search') ?? '';
  const status = c.req.query('status');

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`),
      ),
    );
  }
  if (status) {
    conditions.push(
      eq(users.status, status as 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING'),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      status: users.status,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(users)
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
});

// Users - Detail
adminRoutes.get('/users/:userId', async (c) => {
  const userId = c.req.param('userId');

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      status: users.status,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'User not found.' } },
      404,
    );
  }

  const memberships = await db
    .select({
      communityId: communityMemberships.communityId,
      role: communityMemberships.role,
      status: communityMemberships.status,
      joinedAt: communityMemberships.joinedAt,
    })
    .from(communityMemberships)
    .where(eq(communityMemberships.userId, userId));

  return c.json({
    data: {
      ...user,
      memberships,
    },
  });
});

// Users - Status change
const userStatusChangeSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']),
});

// Users - Create
const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(10).max(20).optional(),
  status: z.enum(['ACTIVE', 'PENDING']).optional(),
});

adminRoutes.post('/users', async (c) => {
  const body = await c.req.json();
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const { name, email, password, phone, status } = result.data;

  // Check for existing email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return c.json(
      { error: { code: 'CONFLICT', message: 'A user with this email already exists.' } },
      409,
    );
  }

  const { hashPassword } = await import('../auth/password');
  const passwordHash = await hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      phone: phone || null,
      status: status || 'ACTIVE',
    })
    .returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, status: users.status, createdAt: users.createdAt });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'user.create',
    entityType: 'user',
    entityId: created.id,
    newValues: { name: created.name, email: created.email, status: created.status },
  });

  return c.json({ data: created }, 201);
});

adminRoutes.post('/users/:userId/status', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const result = userStatusChangeSchema.safeParse(body);

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

  const [updated] = await db
    .update(users)
    .set({ status: result.data.status, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, status: users.status });

  if (!updated) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'User not found.' } },
      404,
    );
  }

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'user.status_change',
    entityType: 'user',
    entityId: userId,
    newValues: { status: result.data.status },
  });

  return c.json({ data: updated });
});

// Merchants - List
adminRoutes.get('/merchants', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const search = c.req.query('search') ?? '';
  const status = c.req.query('status');

  const conditions = [];
  if (search) {
    conditions.push(ilike(merchants.businessName, `%${search}%`));
  }
  if (status) {
    conditions.push(
      eq(
        merchants.verificationStatus,
        status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED',
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: merchants.id,
      communityId: merchants.communityId,
      userId: merchants.userId,
      businessName: merchants.businessName,
      description: merchants.description,
      phone: merchants.phone,
      verificationStatus: merchants.verificationStatus,
      createdAt: merchants.createdAt,
    })
    .from(merchants)
    .where(where)
    .orderBy(desc(merchants.createdAt))
    .limit(limit)
    .offset(offset);

  // Get order counts for each merchant
  const merchantIds = data.map(m => m.id);
  const orderCounts = merchantIds.length > 0
    ? await db
        .select({ merchantId: orders.merchantId, count: count() })
        .from(orders)
        .where(sql`${orders.merchantId} IN ${merchantIds}`)
        .groupBy(orders.merchantId)
    : [];
  const orderCountMap = new Map(orderCounts.map(o => [o.merchantId, Number(o.count)]));

  const dataWithOrders = data.map(m => ({
    ...m,
    orderCount: orderCountMap.get(m.id) ?? 0,
  }));

  const total = await db
    .select({ count: count() })
    .from(merchants)
    .where(where);

  return c.json({
    data: dataWithOrders,
    pagination: {
      page,
      limit,
      total: total[0]?.count ?? 0,
      totalPages: Math.ceil((total[0]?.count ?? 0) / limit),
    },
  });
});

// Merchants - Detail
adminRoutes.get('/merchants/:merchantId', async (c) => {
  const merchantId = c.req.param('merchantId');

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);

  if (!merchant) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Merchant not found.' } },
      404,
    );
  }

  return c.json({ data: merchant });
});

// Merchants - Status change
const merchantStatusChangeSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
});

adminRoutes.post('/merchants/:merchantId/status', async (c) => {
  const merchantId = c.req.param('merchantId');
  const body = await c.req.json();
  const result = merchantStatusChangeSchema.safeParse(body);

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

  const [updated] = await db
    .update(merchants)
    .set({ verificationStatus: result.data.status, updatedAt: new Date() })
    .where(eq(merchants.id, merchantId))
    .returning({
      id: merchants.id,
      verificationStatus: merchants.verificationStatus,
    });

  if (!updated) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Merchant not found.' } },
      404,
    );
  }

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'merchant.status_change',
    entityType: 'merchant',
    entityId: merchantId,
    newValues: { status: result.data.status },
  });

  return c.json({ data: updated });
});

// Audit logs - Searchable
adminRoutes.get('/audit', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const action = c.req.query('action') ?? '';
  const entityType = c.req.query('entityType') ?? '';
  const actorId = c.req.query('actorId') ?? '';
  const communityId = c.req.query('communityId') ?? '';
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');

  const conditions = [];
  if (action) {
    conditions.push(ilike(auditLogs.action, `%${action}%`));
  }
  if (entityType) {
    conditions.push(ilike(auditLogs.entityType, `%${entityType}%`));
  }
  if (actorId) {
    conditions.push(eq(auditLogs.actorId, actorId));
  }
  if (communityId) {
    conditions.push(eq(auditLogs.communityId, communityId));
  }
  if (dateFrom) {
    conditions.push(sql`${auditLogs.createdAt} >= ${new Date(dateFrom)}`);
  }
  if (dateTo) {
    conditions.push(sql`${auditLogs.createdAt} <= ${new Date(dateTo)}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: auditLogs.id,
      communityId: auditLogs.communityId,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(auditLogs)
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
});

// Subscriptions - Overview
adminRoutes.get('/subscriptions', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');

  const conditions = [];
  if (status) {
    conditions.push(
      eq(
        subscriptions.status,
        status as 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING',
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: subscriptions.id,
      communityId: subscriptions.communityId,
      plan: subscriptions.plan,
      price: subscriptions.price,
      currency: subscriptions.currency,
      billingPeriod: subscriptions.billingPeriod,
      status: subscriptions.status,
      startedAt: subscriptions.startedAt,
      expiresAt: subscriptions.expiresAt,
    })
    .from(subscriptions)
    .where(where)
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(subscriptions)
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
});

// Subscriptions - Create
const createSubscriptionSchema = z.object({
  communityId: z.string().uuid(),
  plan: z.string().min(1).max(100),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal'),
  currency: z.string().max(10).default('INR'),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  expiresAt: z.string().datetime().optional(),
});

adminRoutes.post('/subscriptions', async (c) => {
  const body = await c.req.json();
  const result = createSubscriptionSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const community = await db
    .select({ id: communities.id })
    .from(communities)
    .where(eq(communities.id, result.data.communityId))
    .limit(1);

  if (community.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Community not found.' } },
      404,
    );
  }

  const [created] = await db
    .insert(subscriptions)
    .values({
      communityId: result.data.communityId,
      plan: result.data.plan,
      price: result.data.price,
      currency: result.data.currency,
      billingPeriod: result.data.billingPeriod,
      status: 'ACTIVE',
      startedAt: new Date(),
      expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
    })
    .returning({
      id: subscriptions.id,
      communityId: subscriptions.communityId,
      plan: subscriptions.plan,
      price: subscriptions.price,
      status: subscriptions.status,
    });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'subscription.create',
    entityType: 'subscription',
    entityId: created.id,
    communityId: result.data.communityId,
    newValues: { plan: result.data.plan, price: result.data.price },
  });

  return c.json({ data: created }, 201);
});

// Subscriptions - Update
const updateSubscriptionSchema = z.object({
  plan: z.string().min(1).max(100).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal').optional(),
  status: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING']).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

adminRoutes.patch('/subscriptions/:subscriptionId', async (c) => {
  const subscriptionId = c.req.param('subscriptionId');
  const body = await c.req.json();
  const result = updateSubscriptionSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!existing) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Subscription not found.' } },
      404,
    );
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (result.data.plan) updateData.plan = result.data.plan;
  if (result.data.price) updateData.price = result.data.price;
  if (result.data.status) updateData.status = result.data.status;
  if (result.data.expiresAt !== undefined) updateData.expiresAt = result.data.expiresAt ? new Date(result.data.expiresAt) : null;

  const [updated] = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, subscriptionId))
    .returning({
      id: subscriptions.id,
      communityId: subscriptions.communityId,
      plan: subscriptions.plan,
      price: subscriptions.price,
      status: subscriptions.status,
    });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'subscription.update',
    entityType: 'subscription',
    entityId: subscriptionId,
    newValues: updateData,
  });

  return c.json({ data: updated });
});

// Fraud & Risk overview
adminRoutes.get('/fraud', async (c) => {
  const pendingMerchantVerifications = await db
    .select({ count: count() })
    .from(merchants)
    .where(eq(merchants.verificationStatus, 'PENDING'));

  const suspendedUsers = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.status, 'SUSPENDED'));

  const suspendedMerchants = await db
    .select({ count: count() })
    .from(merchants)
    .where(eq(merchants.verificationStatus, 'SUSPENDED'));

  const recentAuditLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  return c.json({
    data: {
      pendingMerchantVerifications: pendingMerchantVerifications[0]?.count ?? 0,
      suspendedUsers: suspendedUsers[0]?.count ?? 0,
      suspendedMerchants: suspendedMerchants[0]?.count ?? 0,
      recentActivity: recentAuditLogs,
    },
  });
});

// Shariah Governance overview
adminRoutes.get('/shariah', async (c) => {
  const pendingReviews = await db
    .select({ count: count() })
    .from(financeReviews)
    .where(eq(financeReviews.status, 'PENDING_REVIEW'));

  const reviewedContracts = await db
    .select({ count: count() })
    .from(financeReviews)
    .where(eq(financeReviews.status, 'REVIEWED'));

  const needsRevision = await db
    .select({ count: count() })
    .from(financeReviews)
    .where(eq(financeReviews.status, 'NEEDS_REVISION'));

  const recentReviews = await db
    .select({
      id: financeReviews.id,
      contractId: financeReviews.contractId,
      reviewer: financeReviews.reviewer,
      status: financeReviews.status,
      reviewedAt: financeReviews.reviewedAt,
      version: financeReviews.version,
    })
    .from(financeReviews)
    .orderBy(desc(financeReviews.createdAt))
    .limit(20);

  return c.json({
    data: {
      pendingReviews: pendingReviews[0]?.count ?? 0,
      reviewedContracts: reviewedContracts[0]?.count ?? 0,
      needsRevision: needsRevision[0]?.count ?? 0,
      recentReviews,
    },
  });
});

// Shariah - List all reviews
adminRoutes.get('/shariah/reviews', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');

  const conditions = [];
  if (status) {
    conditions.push(
      eq(financeReviews.status, status as 'PENDING_REVIEW' | 'REVIEWED' | 'NEEDS_REVISION' | 'ARCHIVED'),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: financeReviews.id,
      contractId: financeReviews.contractId,
      reviewer: financeReviews.reviewer,
      status: financeReviews.status,
      comments: financeReviews.comments,
      reviewedAt: financeReviews.reviewedAt,
      version: financeReviews.version,
      createdAt: financeReviews.createdAt,
    })
    .from(financeReviews)
    .where(where)
    .orderBy(desc(financeReviews.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(financeReviews)
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
});

// Shariah - Update review status
const updateReviewSchema = z.object({
  status: z.enum(['REVIEWED', 'NEEDS_REVISION', 'ARCHIVED']),
  comments: z.string().max(2000).optional(),
});

adminRoutes.patch('/shariah/reviews/:reviewId', async (c) => {
  const reviewId = c.req.param('reviewId');
  const body = await c.req.json();
  const result = updateReviewSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const [existing] = await db
    .select({ id: financeReviews.id })
    .from(financeReviews)
    .where(eq(financeReviews.id, reviewId))
    .limit(1);

  if (!existing) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Review not found.' } },
      404,
    );
  }

  const updateData: Record<string, unknown> = {
    status: result.data.status,
    updatedAt: new Date(),
  };
  if (result.data.comments) updateData.comments = result.data.comments;
  if (result.data.status === 'REVIEWED') updateData.reviewedAt = new Date();

  const [updated] = await db
    .update(financeReviews)
    .set(updateData)
    .where(eq(financeReviews.id, reviewId))
    .returning({
      id: financeReviews.id,
      status: financeReviews.status,
      comments: financeReviews.comments,
      reviewedAt: financeReviews.reviewedAt,
    });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'shariah.review.update',
    entityType: 'finance_review',
    entityId: reviewId,
    newValues: { status: result.data.status },
  });

  return c.json({ data: updated });
});

// Fraud & Risk - List risk flags
adminRoutes.get('/fraud/flags', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');
  const severity = c.req.query('severity');

  const conditions = [];
  if (status) {
    conditions.push(eq(riskFlags.status, status as 'FLAGGED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED'));
  }
  if (severity) {
    conditions.push(eq(riskFlags.severity, severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: riskFlags.id,
      communityId: riskFlags.communityId,
      entityType: riskFlags.entityType,
      entityId: riskFlags.entityId,
      severity: riskFlags.severity,
      reason: riskFlags.reason,
      status: riskFlags.status,
      reviewerId: riskFlags.reviewerId,
      notes: riskFlags.notes,
      resolvedAt: riskFlags.resolvedAt,
      createdAt: riskFlags.createdAt,
    })
    .from(riskFlags)
    .where(where)
    .orderBy(desc(riskFlags.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(riskFlags)
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
});

// Fraud & Risk - Create risk flag
const createRiskFlagSchema = z.object({
  communityId: z.string().uuid().optional(),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  reason: z.string().min(1).max(500),
});

adminRoutes.post('/fraud/flags', async (c) => {
  const body = await c.req.json();
  const result = createRiskFlagSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const [created] = await db
    .insert(riskFlags)
    .values({
      communityId: result.data.communityId,
      entityType: result.data.entityType,
      entityId: result.data.entityId,
      severity: result.data.severity,
      reason: result.data.reason,
      status: 'FLAGGED',
    })
    .returning({
      id: riskFlags.id,
      entityType: riskFlags.entityType,
      entityId: riskFlags.entityId,
      severity: riskFlags.severity,
      reason: riskFlags.reason,
      status: riskFlags.status,
    });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'risk_flag.create',
    entityType: 'risk_flag',
    entityId: created.id,
    communityId: result.data.communityId,
    newValues: { entityType: result.data.entityType, severity: result.data.severity, reason: result.data.reason },
  });

  return c.json({ data: created }, 201);
});

// Fraud & Risk - Update risk flag
const updateRiskFlagSchema = z.object({
  status: z.enum(['FLAGGED', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED']).optional(),
  notes: z.string().max(2000).optional(),
});

adminRoutes.patch('/fraud/flags/:flagId', async (c) => {
  const flagId = c.req.param('flagId');
  const body = await c.req.json();
  const result = updateRiskFlagSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const [existing] = await db
    .select({ id: riskFlags.id })
    .from(riskFlags)
    .where(eq(riskFlags.id, flagId))
    .limit(1);

  if (!existing) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Risk flag not found.' } },
      404,
    );
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (result.data.status) {
    updateData.status = result.data.status;
    if (result.data.status === 'CONFIRMED' || result.data.status === 'DISMISSED') {
      updateData.resolvedAt = new Date();
      updateData.reviewerId = c.get('user')!.id;
    }
  }
  if (result.data.notes !== undefined) updateData.notes = result.data.notes;

  const [updated] = await db
    .update(riskFlags)
    .set(updateData)
    .where(eq(riskFlags.id, flagId))
    .returning({
      id: riskFlags.id,
      status: riskFlags.status,
      notes: riskFlags.notes,
      resolvedAt: riskFlags.resolvedAt,
    });

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'risk_flag.update',
    entityType: 'risk_flag',
    entityId: flagId,
    newValues: updateData,
  });

  return c.json({ data: updated });
});

// Admin: list all orders across platform
adminRoutes.get('/orders', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const communityId = c.req.query('communityId');
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(orders.orderStatus, status as typeof orders.orderStatus.enumValues[number]));
  if (communityId) conditions.push(eq(orders.communityId, communityId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ value: total }] = await db
    .select({ count: count() })
    .from(orders)
    .where(whereClause);

  const data = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      merchantId: orders.merchantId,
      communityId: orders.communityId,
      total: orders.total,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
      customerName: users.name,
      customerEmail: users.email,
      communityName: communities.name,
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .innerJoin(communities, eq(orders.communityId, communities.id))
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// Admin: enhanced user detail with order history
adminRoutes.get('/users/:userId', async (c) => {
  const { userId } = c.req.param();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  // Get memberships
  const memberships = await db
    .select({
      id: communityMemberships.id,
      communityId: communityMemberships.communityId,
      role: communityMemberships.role,
      status: communityMemberships.status,
      joinedAt: communityMemberships.createdAt,
      communityName: communities.name,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(eq(communityMemberships.userId, userId));

  // Get order stats
  const [{ value: totalOrders }] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.customerId, userId));

  const [{ value: totalSpent }] = await db
    .select({ value: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)` })
    .from(orders)
    .where(eq(orders.customerId, userId));

  // Get recent orders
  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  return c.json({
    data: {
      ...user,
      memberships,
      orderStats: { totalOrders, totalSpent },
      recentOrders,
    },
  });
});

export default adminRoutes;
