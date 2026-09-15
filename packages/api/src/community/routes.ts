import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  communities,
  communityMemberships,
  communityRoleEnum,
  communityGroups,
  communityGroupMembers,
  announcements,
  users,
  merchants,
  products,
  orders,
} from '../db/schema';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const communityRoutes = new Hono();

// Dashboard overview
communityRoutes.get(
  '/:communityId/dashboard',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:read'),
  async (c) => {
    const tenant = c.get('tenant')!!;
    const communityId = tenant.communityId;

    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    if (!community) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Community not found' } }, 404);
    }

    const [memberCount] = await db
      .select({ value: count() })
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.communityId, communityId),
          eq(communityMemberships.status, 'ACTIVE'),
        ),
      );

    const [groupCount] = await db
      .select({ value: count() })
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.communityId, communityId),
          eq(communityGroups.status, 'ACTIVE'),
        ),
      );

    const [announcementCount] = await db
      .select({ value: count() })
      .from(announcements)
      .where(
        and(
          eq(announcements.communityId, communityId),
          eq(announcements.status, 'PUBLISHED'),
        ),
      );

    const [merchantCount] = await db
      .select({ value: count() })
      .from(merchants)
      .where(eq(merchants.communityId, communityId));

    const [productCount] = await db
      .select({ value: count() })
      .from(products)
      .where(eq(products.communityId, communityId));

    const [orderCount] = await db
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.communityId, communityId));

    const [pendingMerchantCount] = await db
      .select({ value: count() })
      .from(merchants)
      .where(
        and(
          eq(merchants.communityId, communityId),
          eq(merchants.verificationStatus, 'PENDING'),
        ),
      );

    return c.json({
      data: {
        community,
        stats: {
          members: memberCount?.value ?? 0,
          groups: groupCount?.value ?? 0,
          announcements: announcementCount?.value ?? 0,
          merchants: merchantCount?.value ?? 0,
          products: productCount?.value ?? 0,
          orders: orderCount?.value ?? 0,
          pendingApprovals: pendingMerchantCount?.value ?? 0,
        },
      },
    });
  },
);

// Members list (with pagination + search + user info)
communityRoutes.get(
  '/:communityId/members',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const search = c.req.query('search') || '';
    const offset = (page - 1) * limit;

    const whereConditions = [eq(communityMemberships.communityId, communityId)];
    if (search) {
      const matchingUserIds = db
        .select({ id: users.id })
        .from(users)
        .where(
          sql`(${ilike(users.name, `%${search}%`)} OR ${ilike(users.email, `%${search}%`)})`
        );
      whereConditions.push(
        sql`${communityMemberships.userId} IN ${matchingUserIds}`
      );
    }

    const [totalResult] = await db
      .select({ value: count() })
      .from(communityMemberships)
      .where(and(...whereConditions));

    const total = totalResult?.value ?? 0;

    const members = await db
      .select({
        id: communityMemberships.id,
        userId: communityMemberships.userId,
        role: communityMemberships.role,
        status: communityMemberships.status,
        joinedAt: communityMemberships.joinedAt,
        createdAt: communityMemberships.createdAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
      })
      .from(communityMemberships)
      .leftJoin(users, eq(communityMemberships.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(communityMemberships.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

// Update member role
communityRoutes.patch(
  '/:communityId/members/:memberId/role',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:members:update_role'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { memberId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({
        role: z.enum(communityRoleEnum.enumValues),
        status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.role?.[0] ?? 'Invalid role' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.id, memberId),
          eq(communityMemberships.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Member not found' } }, 404);
    }

    const updateData: Record<string, unknown> = {
      role: result.data.role,
      updatedAt: new Date(),
    };
    if (result.data.status) {
      updateData.status = result.data.status;
    }

    const [updated] = await db
      .update(communityMemberships)
      .set(updateData)
      .where(eq(communityMemberships.id, memberId))
      .returning();

    return c.json({ data: updated });
  },
);

// Remove member
communityRoutes.delete(
  '/:communityId/members/:memberId',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:members:remove'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { memberId } = c.req.param();

    const [existing] = await db
      .select()
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.id, memberId),
          eq(communityMemberships.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Member not found' } }, 404);
    }

    await db
      .update(communityMemberships)
      .set({ status: 'SUSPENDED', updatedAt: new Date() })
      .where(eq(communityMemberships.id, memberId));

    return c.json({ data: { success: true } });
  },
);

// Groups - list (with pagination + member count)
communityRoutes.get(
  '/:communityId/groups',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ value: count() })
      .from(communityGroups)
      .where(eq(communityGroups.communityId, communityId));

    const total = totalResult?.value ?? 0;

    const groups = await db
      .select({
        id: communityGroups.id,
        name: communityGroups.name,
        description: communityGroups.description,
        status: communityGroups.status,
        createdAt: communityGroups.createdAt,
        updatedAt: communityGroups.updatedAt,
        memberCount: sql<number>`(SELECT COUNT(*) FROM ${communityGroupMembers} WHERE ${communityGroupMembers.groupId} = ${communityGroups.id} AND ${communityGroupMembers.status} = 'ACTIVE')`,
      })
      .from(communityGroups)
      .where(eq(communityGroups.communityId, communityId))
      .orderBy(desc(communityGroups.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

// Groups - create
communityRoutes.post(
  '/:communityId/groups',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:settings:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const user = c.get('user')!;

    const body = await c.req.json();
    const result = z
      .object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        maxMembers: z.number().int().min(2).max(100).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.name?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const [group] = await db
      .insert(communityGroups)
      .values({
        communityId,
        name: result.data.name,
        description: result.data.description,
        createdBy: user.id,
      })
      .returning();

    return c.json({ data: group }, 201);
  },
);

// Groups - get detail
communityRoutes.get(
  '/:communityId/groups/:groupId',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { groupId } = c.req.param();

    const [group] = await db
      .select()
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.id, groupId),
          eq(communityGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!group) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Group not found' } }, 404);
    }

    return c.json({ data: group });
  },
);

// Groups - update
communityRoutes.patch(
  '/:communityId/groups/:groupId',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:settings:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { groupId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.id, groupId),
          eq(communityGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Group not found' } }, 404);
    }

    const [updated] = await db
      .update(communityGroups)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(communityGroups.id, groupId))
      .returning();

    return c.json({ data: updated });
  },
);

// Groups - delete
communityRoutes.delete(
  '/:communityId/groups/:groupId',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:settings:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { groupId } = c.req.param();

    const [existing] = await db
      .select()
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.id, groupId),
          eq(communityGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Group not found' } }, 404);
    }

    await db.delete(communityGroups).where(eq(communityGroups.id, groupId));

    return c.json({ data: { success: true } });
  },
);

// Groups - get members
communityRoutes.get(
  '/:communityId/groups/:groupId/members',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { groupId } = c.req.param();

    const [existing] = await db
      .select()
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.id, groupId),
          eq(communityGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Group not found' } }, 404);
    }

    const members = await db
      .select({
        id: communityGroupMembers.id,
        userId: communityGroupMembers.userId,
        status: communityGroupMembers.status,
        joinedAt: communityGroupMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(communityGroupMembers)
      .leftJoin(users, eq(communityGroupMembers.userId, users.id))
      .where(eq(communityGroupMembers.groupId, groupId));

    return c.json({ data: members });
  },
);

// Groups - add member
communityRoutes.post(
  '/:communityId/groups/:groupId/members',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:settings:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { groupId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({ userId: z.string().uuid() })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' } },
        400,
      );
    }

    const [existingGroup] = await db
      .select()
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.id, groupId),
          eq(communityGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existingGroup) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Group not found' } }, 404);
    }

    const [existingMember] = await db
      .select()
      .from(communityGroupMembers)
      .where(
        and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.userId, result.data.userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      if (existingMember.status === 'ACTIVE') {
        return c.json({ error: { code: 'ALREADY_MEMBER', message: 'User is already a member of this group' } }, 409);
      }
      const [reactivated] = await db
        .update(communityGroupMembers)
        .set({ status: 'ACTIVE' })
        .where(eq(communityGroupMembers.id, existingMember.id))
        .returning();
      return c.json({ data: reactivated });
    }

    const [member] = await db
      .insert(communityGroupMembers)
      .values({
        groupId,
        userId: result.data.userId,
      })
      .returning();

    return c.json({ data: member }, 201);
  },
);

// Groups - remove member
communityRoutes.delete(
  '/:communityId/groups/:groupId/members/:memberId',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:settings:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { groupId, memberId } = c.req.param();

    const [existingGroup] = await db
      .select()
      .from(communityGroups)
      .where(
        and(
          eq(communityGroups.id, groupId),
          eq(communityGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existingGroup) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Group not found' } }, 404);
    }

    const [existingMember] = await db
      .select()
      .from(communityGroupMembers)
      .where(
        and(
          eq(communityGroupMembers.id, memberId),
          eq(communityGroupMembers.groupId, groupId),
        ),
      )
      .limit(1);

    if (!existingMember) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Member not found in this group' } }, 404);
    }

    await db
      .update(communityGroupMembers)
      .set({ status: 'REMOVED' })
      .where(eq(communityGroupMembers.id, memberId));

    return c.json({ data: { success: true } });
  },
);

// Announcements - list (with pagination)
communityRoutes.get(
  '/:communityId/announcements',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const search = c.req.query('search') || '';
    const offset = (page - 1) * limit;

    const whereConditions = [eq(announcements.communityId, communityId)];
    if (search) {
      whereConditions.push(ilike(announcements.title, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ value: count() })
      .from(announcements)
      .where(and(...whereConditions));

    const total = totalResult?.value ?? 0;

    const items = await db
      .select()
      .from(announcements)
      .where(and(...whereConditions))
      .orderBy(desc(announcements.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

// Announcements - create
communityRoutes.post(
  '/:communityId/announcements',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:announcements:create'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const user = c.get('user')!;

    const body = await c.req.json();
    const result = z
      .object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        audience: z.string().max(50).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.title?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const [item] = await db
      .insert(announcements)
      .values({
        communityId,
        title: result.data.title,
        content: result.data.content,
        audience: result.data.audience ?? 'ALL',
        createdBy: user.id,
      })
      .returning();

    return c.json({ data: item }, 201);
  },
);

// Announcements - publish
communityRoutes.patch(
  '/:communityId/announcements/:announcementId/publish',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:announcements:publish'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { announcementId } = c.req.param();

    const [existing] = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.id, announcementId),
          eq(announcements.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, 404);
    }

    if (existing.status !== 'DRAFT') {
      return c.json({ error: { code: 'INVALID_STATE', message: 'Only draft announcements can be published' } }, 400);
    }

    const [updated] = await db
      .update(announcements)
      .set({ status: 'PUBLISHED', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(announcements.id, announcementId))
      .returning();

    return c.json({ data: updated });
  },
);

// Announcements - archive
communityRoutes.patch(
  '/:communityId/announcements/:announcementId/archive',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:announcements:create'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { announcementId } = c.req.param();

    const [existing] = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.id, announcementId),
          eq(announcements.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, 404);
    }

    if (existing.status !== 'PUBLISHED') {
      return c.json({ error: { code: 'INVALID_STATE', message: 'Only published announcements can be archived' } }, 400);
    }

    const [updated] = await db
      .update(announcements)
      .set({ status: 'ARCHIVED', archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(announcements.id, announcementId))
      .returning();

    return c.json({ data: updated });
  },
);

// Settings - update community
communityRoutes.patch(
  '/:communityId/settings',
  requireAuth,
  tenantMiddleware,
  requirePermission('community:settings:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = z
      .object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        city: z.string().max(255).optional(),
        state: z.string().max(255).optional(),
        country: z.string().max(100).optional(),
        contactPhone: z.string().max(20).optional(),
        logoUrl: z.string().optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [updated] = await db
      .update(communities)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(communities.id, communityId))
      .returning();

    return c.json({ data: updated });
  },
);

export default communityRoutes;
