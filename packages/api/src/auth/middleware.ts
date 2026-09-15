import { Context, Next } from 'hono';
import { parseCookies } from './password';
import { getSessionUser, SessionUser } from './session';

declare module 'hono' {
  interface ContextVariableMap {
    user?: SessionUser;
    sessionToken?: string;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const cookieHeader = c.req.header('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies['session'];

  if (!token) {
    c.set('user', undefined);
    c.set('sessionToken', undefined);
    return next();
  }

  const user = await getSessionUser(token);

  if (user) {
    c.set('user', user);
    c.set('sessionToken', token);
  } else {
    c.set('user', undefined);
    c.set('sessionToken', undefined);
  }

  return next();
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');

  if (!user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      401,
    );
  }

  return next();
}
