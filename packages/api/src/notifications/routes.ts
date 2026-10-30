import { Hono } from 'hono';
import { and, desc, eq, isNull, count } from 'drizzle-orm';
import { db } from '../db';
import { notifications } from '../db/schema/notifications';
import { requireAuth } from '../auth/middleware';

/**
 * User notifications.
 *
 * Notifications are strictly user-scoped (never tenant-scoped): a user only
 * ever reads/updates their own rows. The communityId column is informational
 * so the UI can group or filter by community.
 *
 * This module is the ONLY writer of the notifications table. Other services
 * call createNotification() so notification content stays consistent.
 */

const notificationRoutes = new Hono();

/**
 * Create a notification. Never throws — a notification failure must not break
 * the business transaction that triggered it.
 */
export async function createNotification(input: {
  userId: string;
  communityId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      communityId: input.communityId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    });
  } catch (err) {
    console.error('notification_insert_failed', {
      type: input.type,
      userId: input.userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// GET /notifications?limit=20&unreadOnly=true
notificationRoutes.get('/notifications', requireAuth, async (c) => {
  const user = c.get('user')!;
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10) || 20, 50);
  const unreadOnly = c.req.query('unreadOnly') === 'true';

  const conditions = [eq(notifications.userId, user.id)];
  if (unreadOnly) conditions.push(isNull(notifications.readAt));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  return c.json({ data: rows, unreadCount: unread?.value ?? 0 });
});

// POST /notifications/:id/read
notificationRoutes.post('/notifications/:id/read', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { id } = c.req.param();

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id), isNull(notifications.readAt)))
    .returning();

  if (!updated) {
    // Either already read or not owned by this user — treat as no-op success
    // only when the row exists for this user; otherwise 404.
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .limit(1);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } }, 404);
    }
    return c.json({ data: existing });
  }

  return c.json({ data: updated });
});

// POST /notifications/read-all
notificationRoutes.post('/notifications/read-all', requireAuth, async (c) => {
  const user = c.get('user')!;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  return c.json({ data: { ok: true } });
});

export default notificationRoutes;
