import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  conversations,
  conversationMembers,
  messages,
} from '../db/schema/messaging';
import { users } from '../db/schema/users';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const messagingRoutes = new Hono();

// ──────────────────────────────────────────
// Helper: Check conversation membership
// ──────────────────────────────────────────

async function isConversationMember(conversationId: string, userId: string): Promise<boolean> {
  const [member] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);

  return !!member;
}

// ──────────────────────────────────────────
// Helper: Enrich conversation with memberCount, lastMessage, otherMember
// ──────────────────────────────────────────

async function enrichConversation(conv: typeof conversations.$inferSelect, currentUserId: string) {
  // Get member count
  const [memberCountResult] = await db
    .select({ cnt: count() })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conv.id));

  const memberCount = memberCountResult?.cnt ?? 0;

  // Get last message
  const [lastMsg] = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      messageType: messages.messageType,
      body: messages.body,
      attachmentUrl: messages.attachmentUrl,
      createdAt: messages.createdAt,
      senderName: users.name,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(
      and(
        eq(messages.conversationId, conv.id),
        sql`${messages.deletedAt} IS NULL`,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);

  // For DIRECT conversations, get the other member's name
  let otherMemberName: string | null = null;
  let otherMemberId: string | null = null;
  if (conv.type === 'DIRECT') {
    const [otherMember] = await db
      .select({
        userId: conversationMembers.userId,
        name: users.name,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(
        and(
          eq(conversationMembers.conversationId, conv.id),
          sql`${conversationMembers.userId} != ${currentUserId}`,
        ),
      )
      .limit(1);
    if (otherMember) {
      otherMemberName = otherMember.name;
      otherMemberId = otherMember.userId;
    }
  }

  return {
    ...conv,
    memberCount,
    lastMessage: lastMsg || undefined,
    name: conv.type === 'DIRECT' ? otherMemberName : conv.type,
    otherMemberId,
  };
}

// ──────────────────────────────────────────
// Create Conversation
// ──────────────────────────────────────────

const createConversationSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP', 'ORDER', 'KAMETI', 'PROJECT']),
  memberIds: z.array(z.string().uuid()).min(1).max(100),
});

messagingRoutes.post(
  '/:communityId/conversations',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:send'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createConversationSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const { type, memberIds } = result.data;

    // Ensure creator is included in members
    const allMemberIds = [...new Set([user.id, ...memberIds])];

    // For DIRECT conversations, ensure exactly 2 members
    if (type === 'DIRECT' && allMemberIds.length !== 2) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Direct conversations must have exactly 2 members.' } },
        400,
      );
    }

    // Check for existing DIRECT conversation between same users
    if (type === 'DIRECT') {
      // Find all DIRECT conversations the current user is in
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

      if (userDirectConvs.length > 0) {
        const userConvIds = userDirectConvs.map((uc) => uc.conversationId);

        // For each DIRECT conversation, check if the other user matches
        for (const convId of userConvIds) {
          const members = await db
            .select({ userId: conversationMembers.userId })
            .from(conversationMembers)
            .where(eq(conversationMembers.conversationId, convId));

          const memberUserIds = members.map((m) => m.userId).sort();
          const sortedNewIds = allMemberIds.slice().sort();

          if (
            memberUserIds.length === sortedNewIds.length &&
            memberUserIds.every((id, i) => id === sortedNewIds[i])
          ) {
            return c.json({ data: { id: convId, type: 'DIRECT' } });
          }
        }
      }
    }

    const [conversation] = await db
      .insert(conversations)
      .values({
        communityId,
        type,
      })
      .returning();

    // Add members
    const membersToAdd = allMemberIds.map((userId) => ({
      conversationId: conversation.id,
      userId,
    }));

    await db.insert(conversationMembers).values(membersToAdd);

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'conversation.create',
      entityType: 'conversation',
      entityId: conversation.id,
      newValues: { type, memberCount: allMemberIds.length },
    });

    return c.json({ data: conversation }, 201);
  },
);

// ──────────────────────────────────────────
// List Conversations (enriched)
// ──────────────────────────────────────────

messagingRoutes.get(
  '/:communityId/conversations',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    // Get conversations the user is a member of
    const userConversations = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.communityId, communityId),
          eq(conversationMembers.userId, user.id),
        ),
      );

    if (userConversations.length === 0) {
      return c.json({ data: [] });
    }

    const convIds = userConversations.map((uc) => uc.conversationId);

    const convs = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.updatedAt));

    // Enrich each conversation
    const enriched = await Promise.all(
      convs.map((conv) => enrichConversation(conv, user.id)),
    );

    return c.json({ data: enriched });
  },
);

// ──────────────────────────────────────────
// Get Conversation Details
// ──────────────────────────────────────────

messagingRoutes.get(
  '/:communityId/conversations/:conversationId',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const conversationId = c.req.param('conversationId')!;

    // Check membership
    const member = await isConversationMember(conversationId, user.id);
    if (!member) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You are not a member of this conversation.' } },
        403,
      );
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.communityId, communityId),
        ),
      )
      .limit(1);

    if (!conversation) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Conversation not found.' } },
        404,
      );
    }

    // Get members with user names
    const members = await db
      .select({
        conversationId: conversationMembers.conversationId,
        userId: conversationMembers.userId,
        joinedAt: conversationMembers.joinedAt,
        lastReadMessageId: conversationMembers.lastReadMessageId,
        name: users.name,
        email: users.email,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(eq(conversationMembers.conversationId, conversationId));

    return c.json({ data: { ...conversation, members } });
  },
);

// ──────────────────────────────────────────
// Send Message (returns enriched message)
// ──────────────────────────────────────────

const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
  attachmentUrl: z.string().url().optional(),
});

messagingRoutes.post(
  '/:communityId/conversations/:conversationId/messages',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:send'),
  async (c) => {
    const user = c.get('user')!;
    const conversationId = c.req.param('conversationId')!;

    // Check membership
    const member = await isConversationMember(conversationId, user.id);
    if (!member) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You are not a member of this conversation.' } },
        403,
      );
    }

    const body = await c.req.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const { body: messageBody, messageType, attachmentUrl } = result.data;

    // Validate attachment if provided
    if (attachmentUrl && messageType === 'TEXT') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'TEXT messages cannot have attachments.' } },
        400,
      );
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: user.id,
        messageType: messageType || 'TEXT',
        body: messageBody,
        attachmentUrl,
      })
      .returning();

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    // Get sender name for the response
    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const enrichedMessage = {
      ...message,
      senderName: sender?.name || 'Unknown',
    };

    return c.json({ data: enrichedMessage }, 201);
  },
);

// ──────────────────────────────────────────
// Get Messages (enriched with senderName)
// ──────────────────────────────────────────

messagingRoutes.get(
  '/:communityId/conversations/:conversationId/messages',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:read'),
  async (c) => {
    const user = c.get('user')!;
    const conversationId = c.req.param('conversationId')!;

    // Check membership
    const member = await isConversationMember(conversationId, user.id);
    if (!member) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You are not a member of this conversation.' } },
        403,
      );
    }

    const msgs = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        messageType: messages.messageType,
        body: messages.body,
        attachmentUrl: messages.attachmentUrl,
        createdAt: messages.createdAt,
        editedAt: messages.editedAt,
        deletedAt: messages.deletedAt,
        senderName: users.name,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(messages.createdAt));

    return c.json({ data: msgs });
  },
);

// ──────────────────────────────────────────
// Edit Message
// ──────────────────────────────────────────

const editMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

messagingRoutes.patch(
  '/:communityId/messages/:messageId',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:send'),
  async (c) => {
    const user = c.get('user')!;
    const messageId = c.req.param('messageId')!;

    const [existing] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Message not found.' } },
        404,
      );
    }

    // Can only edit own messages
    if (existing.senderId !== user.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only edit your own messages.' } },
        403,
      );
    }

    // Cannot edit deleted messages
    if (existing.deletedAt) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot edit deleted messages.' } },
        400,
      );
    }

    const body = await c.req.json();
    const result = editMessageSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [updated] = await db
      .update(messages)
      .set({
        body: result.data.body,
        editedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Delete Message (Soft Delete)
// ──────────────────────────────────────────

messagingRoutes.delete(
  '/:communityId/messages/:messageId',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:send'),
  async (c) => {
    const user = c.get('user')!;
    const messageId = c.req.param('messageId')!;

    const [existing] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Message not found.' } },
        404,
      );
    }

    // Can only delete own messages
    if (existing.senderId !== user.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own messages.' } },
        403,
      );
    }

    await db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, messageId));

    return c.json({ message: 'Message deleted successfully' });
  },
);

// ──────────────────────────────────────────
// Report Message
// ──────────────────────────────────────────

const reportMessageSchema = z.object({
  reason: z.string().min(1).max(500),
});

messagingRoutes.post(
  '/:communityId/messages/:messageId/report',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const messageId = c.req.param('messageId')!;

    const [existing] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Message not found.' } },
        404,
      );
    }

    const body = await c.req.json();
    const result = reportMessageSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'message.report',
      entityType: 'message',
      entityId: messageId,
      newValues: { reason: result.data.reason, conversationId: existing.conversationId },
    });

    return c.json({ message: 'Message reported successfully' });
  },
);

// ──────────────────────────────────────────
// Mute Conversation
// ──────────────────────────────────────────

messagingRoutes.post(
  '/:communityId/conversations/:conversationId/mute',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:read'),
  async (c) => {
    const user = c.get('user')!;
    const conversationId = c.req.param('conversationId')!;

    // Check membership
    const member = await isConversationMember(conversationId, user.id);
    if (!member) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You are not a member of this conversation.' } },
        403,
      );
    }

    await db.insert(auditLogs).values({
      communityId: c.get('tenant')!.communityId,
      actorId: user.id,
      action: 'conversation.mute',
      entityType: 'conversation',
      entityId: conversationId,
      newValues: { userId: user.id },
    });

    return c.json({ message: 'Conversation muted successfully' });
  },
);

// ──────────────────────────────────────────
// Block User
// ──────────────────────────────────────────

messagingRoutes.post(
  '/:communityId/users/:targetUserId/block',
  requireAuth,
  tenantMiddleware,
  requirePermission('messaging:read'),
  async (c) => {
    const user = c.get('user')!;
    const targetUserId = c.req.param('targetUserId')!;
    const communityId = c.get('tenant')!.communityId;

    if (user.id === targetUserId) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot block yourself.' } },
        400,
      );
    }

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'user.block',
      entityType: 'user',
      entityId: targetUserId,
      newValues: { blockedBy: user.id },
    });

    return c.json({ message: 'User blocked successfully' });
  },
);

export default messagingRoutes;
