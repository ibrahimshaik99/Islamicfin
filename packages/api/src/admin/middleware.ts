import { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { communityMemberships } from '../db/schema';

export async function requireSuperAdmin(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const user = c.get('user');

  if (!user) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      },
      401,
    );
  }

  const memberships = await db
    .select({ role: communityMemberships.role })
    .from(communityMemberships)
    .where(eq(communityMemberships.userId, user.id));

  const isSuperAdmin = memberships.some((m) => m.role === 'SUPER_ADMIN');

  if (!isSuperAdmin) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Super Admin access required.',
        },
      },
      403,
    );
  }

  return next();
}
