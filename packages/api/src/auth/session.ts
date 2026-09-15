import { eq, and, gt, lt } from 'drizzle-orm';
import { db } from '../db';
import { sessions, users } from '../db/schema';
import { generateToken, createSessionCookie, clearSessionCookie } from './password';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return createSessionCookie(token, SESSION_COOKIE_MAX_AGE);
}

export async function getSessionUser(
  token: string,
): Promise<SessionUser | null> {
  const now = new Date();

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      sessionExpiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  if (row.status !== 'ACTIVE') return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
  };
}

export async function deleteSession(token: string): Promise<string> {
  await db.delete(sessions).where(eq(sessions.token, token));
  return clearSessionCookie();
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });
  return result.length;
}

export async function refreshSession(token: string): Promise<string | null> {
  const now = new Date();

  const result = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);

  if (result.length === 0) return null;

  const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db
    .update(sessions)
    .set({ expiresAt: newExpiresAt })
    .where(eq(sessions.id, result[0].id));

  return createSessionCookie(token, SESSION_COOKIE_MAX_AGE);
}

export { SESSION_COOKIE_MAX_AGE };
