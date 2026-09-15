import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { otps } from '../db/schema/otps';
import { users } from '../db/schema';
import { hashPassword } from './password';
import { createSession } from './session';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(phone: string, purpose: string = 'login'): Promise<string> {
  await db
    .delete(otps)
    .where(and(eq(otps.phone, phone), eq(otps.purpose, purpose)));

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await db.insert(otps).values({
    phone,
    code,
    purpose,
    expiresAt,
  });

  return code;
}

export async function verifyOTP(phone: string, code: string, purpose: string = 'login'): Promise<boolean> {
  const now = new Date();

  const [otp] = await db
    .select()
    .from(otps)
    .where(
      and(
        eq(otps.phone, phone),
        eq(otps.code, code),
        eq(otps.purpose, purpose),
        gt(otps.expiresAt, now),
      ),
    )
    .limit(1);

  if (!otp) return false;
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return false;
  if (otp.usedAt) return false;

  await db
    .update(otps)
    .set({ usedAt: now, attempts: otp.attempts + 1 })
    .where(eq(otps.id, otp.id));

  return true;
}

export async function phoneLogin(phone: string, code: string): Promise<{ cookie: string; user: { id: string; name: string; email: string } } | null> {
  const valid = await verifyOTP(phone, code, 'login');
  if (!valid) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (!user || user.status !== 'ACTIVE') return null;

  const cookie = await createSession(user.id);
  return { cookie, user: { id: user.id, name: user.name, email: user.email } };
}

export async function phoneRegister(
  phone: string,
  code: string,
  name: string,
  email: string,
  password: string,
): Promise<{ cookie: string; user: { id: string; name: string; email: string } } | null> {
  const valid = await verifyOTP(phone, code, 'register');
  if (!valid) return null;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (existing.length > 0) return null;

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      passwordHash,
      status: 'ACTIVE',
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  const cookie = await createSession(newUser.id);
  return { cookie, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
}
