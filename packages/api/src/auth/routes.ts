import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, requireAuth } from './middleware';
import { register, login, logout, requestPasswordReset, resetPassword } from './service';
import { authRateLimit, passwordResetRateLimit } from '../lib/rate-limit';
import { refreshSession } from './session';
import { createOTP, phoneLogin, phoneRegister } from './otp';

const auth = new Hono();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(255),
  email: z.string().email('Valid email is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required.'),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128),
  });

auth.post('/register', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = registerSchema.safeParse(body);

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

  const { name, email, password } = result.data;
  const authResult = await register(name, email, password);

  if (!authResult.success) {
    return c.json(
      { error: { code: 'REGISTRATION_FAILED', message: authResult.error! } },
      409,
    );
  }

  if (authResult.cookie) {
    c.header('Set-Cookie', authResult.cookie);
  }

  return c.json({ data: authResult.user }, 201);
});

auth.post('/login', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

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

  const { email, password } = result.data;
  const authResult = await login(email, password);

  if (!authResult.success) {
    return c.json(
      { error: { code: 'LOGIN_FAILED', message: authResult.error! } },
      401,
    );
  }

  if (authResult.cookie) {
    c.header('Set-Cookie', authResult.cookie);
  }

  return c.json({ data: authResult.user });
});

auth.post('/logout', authMiddleware, async (c) => {
  const sessionToken = c.get('sessionToken');

  if (sessionToken) {
    const cookie = await logout(sessionToken);
    c.header('Set-Cookie', cookie);
  }

  return c.json({ data: { message: 'Logged out successfully.' } });
});

auth.post('/forgot-password', passwordResetRateLimit, async (c) => {
  const body = await c.req.json();
  const result = forgotPasswordSchema.safeParse(body);

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

  await requestPasswordReset(result.data.email);

  return c.json({
    data: { message: 'If an account exists, a reset link has been sent.' },
  });
});

auth.post('/reset-password', passwordResetRateLimit, async (c) => {
  const body = await c.req.json();
  const result = resetPasswordSchema.safeParse(body);

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

  const authResult = await resetPassword(result.data.token, result.data.password);

  if (!authResult.success) {
    return c.json(
      { error: { code: 'RESET_FAILED', message: authResult.error! } },
      422,
    );
  }

  if (authResult.cookie) {
    c.header('Set-Cookie', authResult.cookie);
  }

  return c.json({ data: authResult.user });
});

auth.get('/me', authMiddleware, requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ data: user });
});

auth.post('/refresh', authMiddleware, async (c) => {
  const sessionToken = c.get('sessionToken');
  if (!sessionToken) {
    return c.json({ error: { code: 'NO_SESSION', message: 'No active session.' } }, 401);
  }
  const cookie = await refreshSession(sessionToken);
  if (!cookie) {
    return c.json({ error: { code: 'SESSION_EXPIRED', message: 'Session has expired.' } }, 401);
  }
  c.header('Set-Cookie', cookie);
  return c.json({ data: { refreshed: true } });
});

const phoneSchema = z.object({
  phone: z.string().min(10).max(20),
});

auth.post('/otp/send', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = phoneSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Valid phone number is required.' } }, 422);
  }
  const code = await createOTP(result.data.phone, 'login');
  console.log(`[OTP] Login OTP for ${result.data.phone}: ${code}`);
  return c.json({ data: { message: 'OTP sent successfully.', ...(process.env.NODE_ENV !== 'production' ? { code } : {}) } });
});

auth.post('/otp/verify-login', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = z.object({ phone: z.string(), code: z.string().length(6) }).safeParse(body);
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Phone and 6-digit code required.' } }, 422);
  }
  const authResult = await phoneLogin(result.data.phone, result.data.code);
  if (!authResult) {
    return c.json({ error: { code: 'LOGIN_FAILED', message: 'Invalid or expired OTP.' } }, 401);
  }
  c.header('Set-Cookie', authResult.cookie);
  return c.json({ data: authResult.user });
});

auth.post('/otp/send-register', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = phoneSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Valid phone number is required.' } }, 422);
  }
  const code = await createOTP(result.data.phone, 'register');
  console.log(`[OTP] Register OTP for ${result.data.phone}: ${code}`);
  return c.json({ data: { message: 'OTP sent successfully.', ...(process.env.NODE_ENV !== 'production' ? { code } : {}) } });
});

auth.post('/otp/verify-register', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = z.object({
    phone: z.string(),
    code: z.string().length(6),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }).safeParse(body);
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'All fields are required.' } }, 422);
  }
  const authResult = await phoneRegister(
    result.data.phone, result.data.code,
    result.data.name, result.data.email, result.data.password,
  );
  if (!authResult) {
    return c.json({ error: { code: 'REGISTRATION_FAILED', message: 'Invalid OTP or phone already registered.' } }, 409);
  }
  c.header('Set-Cookie', authResult.cookie);
  return c.json({ data: authResult.user }, 201);
});

auth.post('/forgot-password-phone', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = phoneSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Valid phone number is required.' } }, 422);
  }
  const code = await createOTP(result.data.phone, 'reset');
  console.log(`[OTP] Reset OTP for ${result.data.phone}: ${code}`);
  return c.json({ data: { message: 'OTP sent for password reset.', ...(process.env.NODE_ENV !== 'production' ? { code } : {}) } });
});

auth.post('/reset-password-phone', authRateLimit, async (c) => {
  const body = await c.req.json();
  const result = z.object({ phone: z.string(), code: z.string().length(6), password: z.string().min(8) }).safeParse(body);
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Phone, code, and new password required.' } }, 422);
  }
  const { verifyOTP } = await import('./otp');
  const { eq } = await import('drizzle-orm');
  const { db } = await import('../db');
  const { users } = await import('../db/schema');
  const { hashPassword: hp } = await import('./password');

  const valid = await verifyOTP(result.data.phone, result.data.code, 'reset');
  if (!valid) {
    return c.json({ error: { code: 'RESET_FAILED', message: 'Invalid or expired OTP.' } }, 422);
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phone, result.data.phone)).limit(1);
  if (!user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No account found with this phone number.' } }, 404);
  }

  const passwordHash = await hp(result.data.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return c.json({ data: { message: 'Password reset successfully. You can now sign in.' } });
});

auth.get('/my-memberships', authMiddleware, requireAuth, async (c) => {
  const user = c.get('user')!;
  const { db } = await import('../db');
  const { communityMemberships, communities } = await import('../db/schema/communities');
  const { eq } = await import('drizzle-orm');

  const memberships = await db
    .select({
      communityId: communityMemberships.communityId,
      communityName: communities.name,
      communitySlug: communities.slug,
      role: communityMemberships.role,
      status: communityMemberships.status,
      joinedAt: communityMemberships.joinedAt,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(eq(communityMemberships.userId, user.id));

  return c.json({ data: memberships });
});

export default auth;
