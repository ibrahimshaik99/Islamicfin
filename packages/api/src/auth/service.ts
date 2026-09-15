import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, passwordResets } from '../db/schema';
import { hashPassword, verifyPassword, generateToken } from './password';
import { createSession, deleteAllUserSessions } from './session';

const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface AuthResult {
  success: boolean;
  error?: string;
  cookie?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      status: 'ACTIVE',
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  const cookie = await createSession(newUser.id);

  return {
    success: true,
    cookie,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (user.length === 0) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const found = user[0];

  if (found.status !== 'ACTIVE') {
    return { success: false, error: 'Invalid email or password.' };
  }

  const validPassword = await verifyPassword(password, found.passwordHash);
  if (!validPassword) {
    return { success: false, error: 'Invalid email or password.' };
  }

  await db
    .update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, found.id));

  const cookie = await createSession(found.id);

  return {
    success: true,
    cookie,
    user: {
      id: found.id,
      name: found.name,
      email: found.email,
    },
  };
}

export async function logout(sessionToken: string): Promise<string> {
  const { deleteSession } = await import('./session');
  return deleteSession(sessionToken);
}

export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean }> {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (user.length === 0) {
    return { success: true };
  }

  await db
    .delete(passwordResets)
    .where(eq(passwordResets.userId, user[0].id));

  const token = generateToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION_MS);

  await db.insert(passwordResets).values({
    userId: user[0].id,
    token,
    expiresAt,
  });

  return { success: true };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<AuthResult> {
  const now = new Date();

  const resetRecord = await db
    .select({
      id: passwordResets.id,
      userId: passwordResets.userId,
    })
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, token),
        gt(passwordResets.expiresAt, now),
      ),
    )
    .limit(1);

  if (resetRecord.length === 0) {
    return { success: false, error: 'Invalid or expired reset token.' };
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetRecord[0].userId));

  await db
    .update(passwordResets)
    .set({ usedAt: now })
    .where(eq(passwordResets.id, resetRecord[0].id));

  await deleteAllUserSessions(resetRecord[0].userId);

  const cookie = await createSession(resetRecord[0].userId);

  const user = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, resetRecord[0].userId))
    .limit(1);

  return {
    success: true,
    cookie,
    user: user[0]
      ? { id: user[0].id, name: user[0].name, email: user[0].email }
      : undefined,
  };
}
