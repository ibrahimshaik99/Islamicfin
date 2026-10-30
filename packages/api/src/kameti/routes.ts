import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  kametiGroups,
  kametiMembers,
  kametiPeriods,
  kametiContributions,
  kametiPayouts,
} from '../db/schema/kameti';
import { auditLogs } from '../db/schema/audit';
import { conversations, conversationMembers, messages } from '../db/schema/messaging';
import { communityMemberships } from '../db/schema/communities';
import { users } from '../db/schema/users';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const kametiRoutes = new Hono();

/**
 * Post an automated SYSTEM message into the community's KAMETI conversation.
 * Financial chat notices are only ever derived from verified transaction
 * records (contribution/payout rows) — never manually typed. Best-effort:
 * failures never break the financial transaction.
 */
async function postKametiSystemMessage(
  communityId: string,
  actorId: string,
  body: string,
): Promise<void> {
  try {
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.communityId, communityId), eq(conversations.type, 'KAMETI')),
      )
      .limit(1);
    if (!conv) return;

    await db.insert(messages).values({
      conversationId: conv.id,
      senderId: actorId,
      messageType: 'SYSTEM',
      body,
    });
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conv.id));
  } catch (err) {
    console.error('kameti_system_message_failed', {
      communityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ──────────────────────────────────────────
// Create Kameti Group (Admin)
// ──────────────────────────────────────────

const createKametiGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  contributionAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  totalMembers: z.number().int().min(2).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

kametiRoutes.post(
  '/:communityId/kameti/groups',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createKametiGroupSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [group] = await db
      .insert(kametiGroups)
      .values({
        communityId,
        name: result.data.name,
        description: result.data.description,
        contributionAmount: result.data.contributionAmount,
        frequency: result.data.frequency,
        totalMembers: result.data.totalMembers,
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        createdBy: user.id,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.group.create',
      entityType: 'kameti_group',
      entityId: group.id,
      newValues: { name: group.name, contributionAmount: group.contributionAmount },
    });

    // Auto-create periods based on totalMembers and frequency.
    // dueDate is the only date column — step by the group's frequency.
    const startDate = new Date(`${result.data.startDate}T00:00:00Z`);
    const stepDays =
      result.data.frequency === 'WEEKLY' ? 7 : result.data.frequency === 'BIWEEKLY' ? 14 : 0;
    const periodsToCreate = [];
    for (let i = 0; i < result.data.totalMembers; i++) {
      const due = new Date(startDate);
      if (result.data.frequency === 'MONTHLY') {
        // Same day next month(s), clamped to month length
        const targetMonth = due.getUTCMonth() + i;
        const lastDay = new Date(Date.UTC(due.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
        due.setUTCDate(Math.min(due.getUTCDate(), lastDay));
        due.setUTCMonth(targetMonth);
      } else {
        due.setUTCDate(due.getUTCDate() + stepDays * i);
      }
      periodsToCreate.push({
        kametiGroupId: group.id,
        periodNumber: i + 1,
        dueDate: due.toISOString().split('T')[0],
        status: i === 0 ? ('ACTIVE' as const) : ('PENDING' as const),
      });
    }
    if (periodsToCreate.length > 0) {
      await db.insert(kametiPeriods).values(periodsToCreate);
    }

    return c.json({ data: group }, 201);
  },
);

// ──────────────────────────────────────────
// List Kameti Groups
// ──────────────────────────────────────────

kametiRoutes.get(
  '/:communityId/kameti/groups',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    // Include ACTIVE member counts. NOTE: the correlated subquery reference is
    // written as literal qualified SQL — interpolating the Column object would
    // compile to an unqualified "id" and resolve to the inner table.
    const groups = await db
      .select({
        id: kametiGroups.id,
        communityId: kametiGroups.communityId,
        name: kametiGroups.name,
        description: kametiGroups.description,
        contributionAmount: kametiGroups.contributionAmount,
        frequency: kametiGroups.frequency,
        totalMembers: kametiGroups.totalMembers,
        startDate: kametiGroups.startDate,
        endDate: kametiGroups.endDate,
        status: kametiGroups.status,
        createdBy: kametiGroups.createdBy,
        createdAt: kametiGroups.createdAt,
        updatedAt: kametiGroups.updatedAt,
        currentMembers: sql<number>`(select count(*) from "kameti_members" mm where mm."kameti_group_id" = "kameti_groups"."id" and mm."status" = 'ACTIVE')`,
      })
      .from(kametiGroups)
      .where(eq(kametiGroups.communityId, communityId))
      .orderBy(desc(kametiGroups.createdAt));

    return c.json({ data: groups });
  },
);

// ──────────────────────────────────────────
// Get Kameti Group Details
// ──────────────────────────────────────────

kametiRoutes.get(
  '/:communityId/kameti/groups/:groupId',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const [group] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!group) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } },
        404,
      );
    }

    return c.json({ data: group });
  },
);

// ──────────────────────────────────────────
// Update Kameti Group (Admin)
// ──────────────────────────────────────────

const updateKametiGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED']).optional(),
});

kametiRoutes.patch(
  '/:communityId/kameti/groups/:groupId',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const body = await c.req.json();
    const result = updateKametiGroupSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } },
        404,
      );
    }

    const [updated] = await db
      .update(kametiGroups)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(kametiGroups.id, groupId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.group.update',
      entityType: 'kameti_group',
      entityId: groupId,
      oldValues: { name: existing.name, status: existing.status },
      newValues: result.data,
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Add Members to Kameti Group
// ──────────────────────────────────────────

const addMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});

kametiRoutes.post(
  '/:communityId/kameti/groups/:groupId/members',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const body = await c.req.json();
    const result = addMembersSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } },
        404,
      );
    }

    // Check current member count
    const [{ memberCount }] = await db
      .select({ memberCount: count() })
      .from(kametiMembers)
      .where(eq(kametiMembers.kametiGroupId, groupId));

    if (memberCount + result.data.userIds.length > existing.totalMembers) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Adding members would exceed total members limit.' } },
        400,
      );
    }

    // Check for duplicate users in the request
    const uniqueUserIds = [...new Set(result.data.userIds)];
    if (uniqueUserIds.length !== result.data.userIds.length) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Duplicate user IDs in request.' } },
        400,
      );
    }

    // Check if any users are already members
    const existingMembers = await db
      .select({ userId: kametiMembers.userId })
      .from(kametiMembers)
      .where(eq(kametiMembers.kametiGroupId, groupId));

    const existingUserIds = new Set(existingMembers.map((m) => m.userId));
    const newUserIds = uniqueUserIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'All users are already members.' } },
        400,
      );
    }

    const membersToAdd = newUserIds.map((userId, index) => ({
      kametiGroupId: groupId,
      userId,
      position: memberCount + index + 1,
    }));

    const addedMembers = await db
      .insert(kametiMembers)
      .values(membersToAdd)
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.members.add',
      entityType: 'kameti_group',
      entityId: groupId,
      newValues: { addedUserIds: newUserIds },
    });

    // Auto-create KAMETI conversation if it doesn't exist
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.communityId, communityId),
          eq(conversations.type, 'KAMETI'),
        ),
      )
      .limit(1);

    let convId = existingConv?.id;
    if (!convId) {
      const [newConv] = await db
        .insert(conversations)
        .values({ communityId, type: 'KAMETI' })
        .returning();
      convId = newConv.id;
    }

    // Add new members to the conversation (skip duplicates)
    if (convId) {
      for (const userId of newUserIds) {
        const [alreadyInConv] = await db
          .select()
          .from(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, convId),
              eq(conversationMembers.userId, userId),
            ),
          )
          .limit(1);
        if (!alreadyInConv) {
          await db.insert(conversationMembers).values({
            conversationId: convId,
            userId,
          });
        }
      }
    }

    return c.json({ data: addedMembers }, 201);
  },
);

// ──────────────────────────────────────────
// Self-Join Kameti Group (any authenticated user)
// ──────────────────────────────────────────

kametiRoutes.post(
  '/:communityId/kameti/groups/:groupId/join',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const [group] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!group) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } }, 404);
    }

    if (group.status !== 'ACTIVE') {
      return c.json({ error: { code: 'INVALID_STATE', message: 'This kameti group is not active.' } }, 400);
    }

    const [existingMember] = await db
      .select()
      .from(kametiMembers)
      .where(
        and(
          eq(kametiMembers.kametiGroupId, groupId),
          eq(kametiMembers.userId, user.id),
        ),
      )
      .limit(1);

    if (existingMember) {
      return c.json({ error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this kameti.' } }, 409);
    }

    const [{ memberCount }] = await db
      .select({ memberCount: count() })
      .from(kametiMembers)
      .where(eq(kametiMembers.kametiGroupId, groupId));

    if (memberCount >= group.totalMembers) {
      return c.json({ error: { code: 'FULL', message: 'This kameti group is full.' } }, 400);
    }

    const [added] = await db
      .insert(kametiMembers)
      .values({
        kametiGroupId: groupId,
        userId: user.id,
        position: memberCount + 1,
      })
      .returning();

    // Auto-create KAMETI conversation if it doesn't exist
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.communityId, communityId),
          eq(conversations.type, 'KAMETI'),
        ),
      )
      .limit(1);

    let convId = existingConv?.id;
    if (!convId) {
      const [newConv] = await db
        .insert(conversations)
        .values({ communityId, type: 'KAMETI' })
        .returning();
      convId = newConv.id;
    }

    // Add user to conversation
    const [alreadyInConv] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, convId),
          eq(conversationMembers.userId, user.id),
        ),
      )
      .limit(1);

    if (!alreadyInConv) {
      await db.insert(conversationMembers).values({
        conversationId: convId,
        userId: user.id,
      });
    }

    // Auto-create DIRECT chats with community owners/admins
    const communityOwners = await db
      .select({ userId: communityMemberships.userId })
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.communityId, communityId),
          inArray(communityMemberships.role, ['COMMUNITY_OWNER', 'COMMUNITY_ADMIN']),
          eq(communityMemberships.status, 'ACTIVE'),
        ),
      );

    for (const owner of communityOwners) {
      if (owner.userId === user.id) continue;

      // Check for existing DIRECT conversation between these two users
      const userDirectConvs = await db
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.communityId, communityId),
            eq(conversations.type, 'DIRECT'),
            eq(conversationMembers.userId, user.id),
          ),
        );

      let existingDirectConv = false;
      for (const uc of userDirectConvs) {
        const members = await db
          .select({ userId: conversationMembers.userId })
          .from(conversationMembers)
          .where(eq(conversationMembers.conversationId, uc.conversationId));
        const memberUserIds = members.map((m) => m.userId).sort();
        if (memberUserIds.length === 2 && memberUserIds.includes(owner.userId)) {
          existingDirectConv = true;
          break;
        }
      }

      if (!existingDirectConv) {
        const [directConv] = await db
          .insert(conversations)
          .values({ communityId, type: 'DIRECT' })
          .returning();

        await db.insert(conversationMembers).values([
          { conversationId: directConv.id, userId: user.id },
          { conversationId: directConv.id, userId: owner.userId },
        ]);
      }
    }

    return c.json({ data: added, conversationId: convId }, 201);
  },
);

// ──────────────────────────────────────────
// Remove Member from Kameti Group
// ──────────────────────────────────────────

kametiRoutes.delete(
  '/:communityId/kameti/groups/:groupId/members/:memberId',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;
    const memberId = c.req.param('memberId')!;

    const [existing] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } },
        404,
      );
    }

    const [member] = await db
      .select()
      .from(kametiMembers)
      .where(
        and(
          eq(kametiMembers.id, memberId),
          eq(kametiMembers.kametiGroupId, groupId),
        ),
      )
      .limit(1);

    if (!member) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Member not found.' } },
        404,
      );
    }

    // Check if member has any contributions
    const [{ contributionCount }] = await db
      .select({ contributionCount: count() })
      .from(kametiContributions)
      .where(eq(kametiContributions.memberId, memberId));

    if (contributionCount > 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot remove member with existing contributions.' } },
        400,
      );
    }

    await db
      .update(kametiMembers)
      .set({ status: 'REMOVED', updatedAt: new Date() })
      .where(eq(kametiMembers.id, memberId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.members.remove',
      entityType: 'kameti_group',
      entityId: groupId,
      oldValues: { memberId, userId: member.userId },
    });

    return c.json({ message: 'Member removed successfully' });
  },
);

// ──────────────────────────────────────────
// Get Kameti Periods
// ──────────────────────────────────────────

kametiRoutes.get(
  '/:communityId/kameti/groups/:groupId/periods',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const [existing] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } },
        404,
      );
    }

    const periods = await db
      .select()
      .from(kametiPeriods)
      .where(eq(kametiPeriods.kametiGroupId, groupId))
      .orderBy(kametiPeriods.periodNumber);

    return c.json({ data: periods });
  },
);

// ──────────────────────────────────────────
// Record Contribution (Member)
// ──────────────────────────────────────────

const recordContributionSchema = z.object({
  memberId: z.string().uuid(),
  periodId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.string().max(50).optional(),
  referenceNumber: z.string().max(255).optional(),
  proofUrl: z.string().url().optional(),
});

kametiRoutes.post(
  '/:communityId/kameti/contributions',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = recordContributionSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const { memberId, periodId, amount, paymentMethod, referenceNumber, proofUrl } = result.data;

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' } },
        400,
      );
    }

    // Check member exists and belongs to this community's kameti
    const [member] = await db
      .select({ member: kametiMembers, group: kametiGroups })
      .from(kametiMembers)
      .innerJoin(kametiGroups, eq(kametiMembers.kametiGroupId, kametiGroups.id))
      .where(
        and(
          eq(kametiMembers.id, memberId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!member) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Member not found.' } },
        404,
      );
    }

    // Check period exists and belongs to the same group
    const [period] = await db
      .select()
      .from(kametiPeriods)
      .where(
        and(
          eq(kametiPeriods.id, periodId),
          eq(kametiPeriods.kametiGroupId, member.member.kametiGroupId),
        ),
      )
      .limit(1);

    if (!period) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Period not found.' } },
        404,
      );
    }

    // Check for duplicate contribution
    const [existingContribution] = await db
      .select()
      .from(kametiContributions)
      .where(
        and(
          eq(kametiContributions.memberId, memberId),
          eq(kametiContributions.periodId, periodId),
        ),
      )
      .limit(1);

    if (existingContribution) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Contribution already recorded for this period.' } },
        409,
      );
    }

    // Check for duplicate reference number
    if (referenceNumber) {
      const [existingRef] = await db
        .select()
        .from(kametiContributions)
        .where(eq(kametiContributions.referenceNumber, referenceNumber))
        .limit(1);

      if (existingRef) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'Reference number already used.' } },
          409,
        );
      }
    }

    const [contribution] = await db
      .insert(kametiContributions)
      .values({
        kametiGroupId: member.member.kametiGroupId,
        memberId,
        periodId,
        amount,
        paymentMethod,
        referenceNumber,
        proofUrl,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.contribution.record',
      entityType: 'kameti_contribution',
      entityId: contribution.id,
      newValues: { amount, memberId, periodId },
    });

    return c.json({ data: contribution }, 201);
  },
);

// ──────────────────────────────────────────
// Mark Contribution as PAID (Admin)
// ──────────────────────────────────────────

kametiRoutes.post(
  '/:communityId/kameti/contributions/:contributionId/pay',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contributionId = c.req.param('contributionId')!;

    const [contribution] = await db
      .select({ contribution: kametiContributions, group: kametiGroups })
      .from(kametiContributions)
      .innerJoin(kametiGroups, eq(kametiContributions.kametiGroupId, kametiGroups.id))
      .where(
        and(
          eq(kametiContributions.id, contributionId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contribution) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contribution not found.' } },
        404,
      );
    }

    if (contribution.contribution.status !== 'PENDING') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only mark PENDING contributions as PAID.' } },
        400,
      );
    }

    const [updated] = await db
      .update(kametiContributions)
      .set({
        status: 'PAID',
        paidAt: new Date(),
      })
      .where(eq(kametiContributions.id, contributionId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.contribution.pay',
      entityType: 'kameti_contribution',
      entityId: contributionId,
      newValues: { status: 'PAID' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Get Contribution Details
// ──────────────────────────────────────────

kametiRoutes.get(
  '/:communityId/kameti/contributions/:contributionId',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contributionId = c.req.param('contributionId')!;

    const [contribution] = await db
      .select({ contribution: kametiContributions, group: kametiGroups })
      .from(kametiContributions)
      .innerJoin(kametiGroups, eq(kametiContributions.kametiGroupId, kametiGroups.id))
      .where(
        and(
          eq(kametiContributions.id, contributionId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contribution) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contribution not found.' } },
        404,
      );
    }

    return c.json({ data: contribution.contribution });
  },
);

// ──────────────────────────────────────────
// Verify Contribution (Admin)
// ──────────────────────────────────────────

kametiRoutes.post(
  '/:communityId/kameti/contributions/:contributionId/verify',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contributionId = c.req.param('contributionId')!;

    const [contribution] = await db
      .select({ contribution: kametiContributions, group: kametiGroups })
      .from(kametiContributions)
      .innerJoin(kametiGroups, eq(kametiContributions.kametiGroupId, kametiGroups.id))
      .where(
        and(
          eq(kametiContributions.id, contributionId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contribution) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contribution not found.' } },
        404,
      );
    }

    if (contribution.contribution.status !== 'PAID') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only verify PAID contributions.' } },
        400,
      );
    }

    const [updated] = await db
      .update(kametiContributions)
      .set({
        status: 'VERIFIED',
        verifiedBy: user.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kametiContributions.id, contributionId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.contribution.verify',
      entityType: 'kameti_contribution',
      entityId: contributionId,
      oldValues: { status: contribution.contribution.status },
      newValues: { status: 'VERIFIED' },
    });

    // Automated financial notice in the Kameti chat, derived from the
    // verified transaction record.
    const [period] = await db
      .select({ periodNumber: kametiPeriods.periodNumber })
      .from(kametiPeriods)
      .where(eq(kametiPeriods.id, contribution.contribution.periodId))
      .limit(1);
    await postKametiSystemMessage(
      communityId,
      user.id,
      `✅ Contribution verified — Period ${period?.periodNumber ?? '?'} (₹${contribution.contribution.amount})`,
    );

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// My Contribution Report (member self-report)
// ──────────────────────────────────────────
// A member reports their own payment. The contribution is created as PENDING
// and only becomes PAID/VERIFIED after a treasurer with kameti:manage confirms
// it — a member can never mark their own contribution as paid.
const myContributionSchema = z.object({
  periodId: z.string().uuid(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).optional(),
  referenceNumber: z.string().max(255).optional(),
  proofUrl: z.string().url().max(1000).optional(),
});

kametiRoutes.post(
  '/:communityId/kameti/groups/:groupId/my-contribution',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const body = await c.req.json();
    const result = myContributionSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [group] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(eq(kametiGroups.id, groupId), eq(kametiGroups.communityId, communityId)),
      )
      .limit(1);
    if (!group || group.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Active Kameti group not found.' } },
        404,
      );
    }

    // Caller must be an ACTIVE member of this group
    const [myMember] = await db
      .select()
      .from(kametiMembers)
      .where(
        and(
          eq(kametiMembers.kametiGroupId, groupId),
          eq(kametiMembers.userId, user.id),
          eq(kametiMembers.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!myMember) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only active members can report contributions.' } },
        403,
      );
    }

    // Period must belong to this group and be open
    const [period] = await db
      .select()
      .from(kametiPeriods)
      .where(
        and(
          eq(kametiPeriods.id, result.data.periodId),
          eq(kametiPeriods.kametiGroupId, groupId),
        ),
      )
      .limit(1);
    if (!period) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Period not found.' } }, 404);
    }
    if (period.status === 'COMPLETED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'This period is already completed.' } },
        400,
      );
    }

    // Duplicate self-report for the same period
    const [existing] = await db
      .select({ id: kametiContributions.id, status: kametiContributions.status })
      .from(kametiContributions)
      .where(
        and(
          eq(kametiContributions.kametiGroupId, groupId),
          eq(kametiContributions.memberId, myMember.id),
          eq(kametiContributions.periodId, period.id),
        ),
      )
      .limit(1);
    if (existing) {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message:
              existing.status === 'VERIFIED'
                ? 'Your contribution for this period is already verified.'
                : 'You already reported a contribution for this period. It is awaiting verification.',
          },
        },
        409,
      );
    }

    // Amount is server-set from the group agreement — never client-supplied.
    const [contribution] = await db
      .insert(kametiContributions)
      .values({
        kametiGroupId: groupId,
        memberId: myMember.id,
        periodId: period.id,
        amount: group.contributionAmount,
        paymentMethod: result.data.paymentMethod,
        referenceNumber: result.data.referenceNumber,
        proofUrl: result.data.proofUrl,
        status: 'PENDING',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.contribution.self_report',
      entityType: 'kameti_contribution',
      entityId: contribution.id,
      newValues: {
        periodNumber: period.periodNumber,
        amount: contribution.amount,
        status: 'PENDING',
      },
    });

    return c.json({ data: contribution }, 201);
  },
);

// ──────────────────────────────────────────
// Record Payout (Admin)
// ──────────────────────────────────────────

const recordPayoutSchema = z.object({
  memberId: z.string().uuid(),
  periodId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  referenceNumber: z.string().max(255).optional(),
});

kametiRoutes.post(
  '/:communityId/kameti/payouts',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = recordPayoutSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const { memberId, periodId, amount, referenceNumber } = result.data;

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' } },
        400,
      );
    }

    // Check member exists and belongs to this community's kameti
    const [member] = await db
      .select({ member: kametiMembers, group: kametiGroups })
      .from(kametiMembers)
      .innerJoin(kametiGroups, eq(kametiMembers.kametiGroupId, kametiGroups.id))
      .where(
        and(
          eq(kametiMembers.id, memberId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!member) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Member not found.' } },
        404,
      );
    }

    // Check period exists and belongs to the same group
    const [period] = await db
      .select()
      .from(kametiPeriods)
      .where(
        and(
          eq(kametiPeriods.id, periodId),
          eq(kametiPeriods.kametiGroupId, member.member.kametiGroupId),
        ),
      )
      .limit(1);

    if (!period) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Period not found.' } },
        404,
      );
    }

    // Check for duplicate payout
    const [existingPayout] = await db
      .select()
      .from(kametiPayouts)
      .where(
        and(
          eq(kametiPayouts.memberId, memberId),
          eq(kametiPayouts.periodId, periodId),
        ),
      )
      .limit(1);

    if (existingPayout) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'Payout already recorded for this period.' } },
        409,
      );
    }

    // Check for duplicate reference number
    if (referenceNumber) {
      const [existingRef] = await db
        .select()
        .from(kametiPayouts)
        .where(eq(kametiPayouts.referenceNumber, referenceNumber))
        .limit(1);

      if (existingRef) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'Reference number already used.' } },
          409,
        );
      }
    }

    const [payout] = await db
      .insert(kametiPayouts)
      .values({
        kametiGroupId: member.member.kametiGroupId,
        memberId,
        periodId,
        amount,
        referenceNumber,
        status: 'COMPLETED',
        paidAt: new Date(),
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'kameti.payout.record',
      entityType: 'kameti_payout',
      entityId: payout.id,
      newValues: { amount, memberId, periodId },
    });

    // Automated payout notice in the Kameti chat, derived from the payout
    // record. Recipient position = payout slot for that period.
    await postKametiSystemMessage(
      communityId,
      user.id,
      `💰 Payout recorded — Period ${period.periodNumber} (₹${amount})`,
    );

    return c.json({ data: payout }, 201);
  },
);

// ──────────────────────────────────────────
// Get Payout Details
// ──────────────────────────────────────────

kametiRoutes.get(
  '/:communityId/kameti/payouts/:payoutId',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const payoutId = c.req.param('payoutId')!;

    const [payout] = await db
      .select({ payout: kametiPayouts, group: kametiGroups })
      .from(kametiPayouts)
      .innerJoin(kametiGroups, eq(kametiPayouts.kametiGroupId, kametiGroups.id))
      .where(
        and(
          eq(kametiPayouts.id, payoutId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!payout) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Payout not found.' } },
        404,
      );
    }

    return c.json({ data: payout.payout });
  },
);

// ──────────────────────────────────────────
// Get Kameti Report
// ──────────────────────────────────────────

kametiRoutes.get(
  '/:communityId/kameti/groups/:groupId/report',
  requireAuth,
  tenantMiddleware,
  requirePermission('kameti:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const groupId = c.req.param('groupId')!;

    const [group] = await db
      .select()
      .from(kametiGroups)
      .where(
        and(
          eq(kametiGroups.id, groupId),
          eq(kametiGroups.communityId, communityId),
        ),
      )
      .limit(1);

    if (!group) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Kameti group not found.' } },
        404,
      );
    }

    // Financial privacy: only ACTIVE members of this group (or community
    // managers) may read the full report. Emails are stripped for non-managers.
    const user = c.get('user')!;
    type MembershipRole = typeof communityMemberships.role.enumValues[number];
    const managerRoles: MembershipRole[] = ['SUPER_ADMIN', 'COMMUNITY_OWNER', 'COMMUNITY_ADMIN', 'COMMUNITY_FINANCE_MANAGER'];
    const [managerRow] = await db
      .select({ role: communityMemberships.role })
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.userId, user.id),
          eq(communityMemberships.communityId, communityId),
          inArray(communityMemberships.role, managerRoles),
        ),
      )
      .limit(1);
    const isManager = !!managerRow;

    if (!isManager) {
      const [membership] = await db
        .select({ status: kametiMembers.status })
        .from(kametiMembers)
        .where(
          and(
            eq(kametiMembers.kametiGroupId, groupId),
            eq(kametiMembers.userId, user.id),
          ),
        )
        .limit(1);
      if (!membership || membership.status !== 'ACTIVE') {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'Only active members of this Kameti group can view its financial report.' } },
          403,
        );
      }
    }

    const members = await db
      .select({
        id: kametiMembers.id,
        kametiGroupId: kametiMembers.kametiGroupId,
        userId: kametiMembers.userId,
        position: kametiMembers.position,
        status: kametiMembers.status,
        joinedAt: kametiMembers.joinedAt,
        createdAt: kametiMembers.createdAt,
        updatedAt: kametiMembers.updatedAt,
        name: users.name,
        email: isManager ? users.email : sql<string>`null`,
      })
      .from(kametiMembers)
      .innerJoin(users, eq(kametiMembers.userId, users.id))
      .where(eq(kametiMembers.kametiGroupId, groupId))
      .orderBy(kametiMembers.position);

    const periods = await db
      .select()
      .from(kametiPeriods)
      .where(eq(kametiPeriods.kametiGroupId, groupId))
      .orderBy(kametiPeriods.periodNumber);

    const contributions = await db
      .select()
      .from(kametiContributions)
      .where(eq(kametiContributions.kametiGroupId, groupId));

    const payouts = await db
      .select()
      .from(kametiPayouts)
      .where(eq(kametiPayouts.kametiGroupId, groupId));

    const totalContributions = contributions
      .filter((cn) => cn.status === 'VERIFIED')
      .reduce((sum, cn) => sum + parseFloat(cn.amount), 0);

    const totalPayouts = payouts
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return c.json({
      data: {
        group,
        summary: {
          totalMembers: members.length,
          activeMembers: members.filter((m) => m.status === 'ACTIVE').length,
          totalPeriods: periods.length,
          completedPeriods: periods.filter((p) => p.status === 'COMPLETED').length,
          totalContributions,
          totalPayouts,
          balance: totalContributions - totalPayouts,
        },
        members,
        periods,
        contributions,
        payouts,
      },
    });
  },
);

export default kametiRoutes;
