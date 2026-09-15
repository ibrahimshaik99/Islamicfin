import { describe, it, expect } from 'vitest';
import app from './index';

describe('Health Check', () => {
  it('GET /api/v1/health returns 200 with status ok', async () => {
    const req = new Request('http://localhost/api/v1/health');
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.environment).toBe('test');
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const req = new Request('http://localhost/api/v1/unknown');
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('Auth - Unauthenticated Access', () => {
  it('GET /api/v1/auth/me returns 401 without session', async () => {
    const req = new Request('http://localhost/api/v1/auth/me');
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(401);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/auth/logout works without session', async () => {
    const req = new Request('http://localhost/api/v1/auth/logout', {
      method: 'POST',
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(200);
  });
});

describe('Auth - Registration Validation', () => {
  it('rejects registration without name', async () => {
    const req = new Request('http://localhost/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects registration without email', async () => {
    const req = new Request('http://localhost/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', password: 'password123' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });

  it('rejects registration with short password', async () => {
    const req = new Request('http://localhost/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'short' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);

    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain('8 characters');
  });

  it('rejects registration with invalid email', async () => {
    const req = new Request('http://localhost/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'not-an-email', password: 'password123' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });
});

describe('Auth - Login Validation', () => {
  it('rejects login without email', async () => {
    const req = new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });

  it('rejects login without password', async () => {
    const req = new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });
});

describe('Auth - Forgot Password Validation', () => {
  it('rejects forgot password without email', async () => {
    const req = new Request('http://localhost/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });
});

describe('Auth - Reset Password Validation', () => {
  it('rejects reset without token', async () => {
    const req = new Request('http://localhost/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'newpassword123' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });

  it('rejects reset without password', async () => {
    const req = new Request('http://localhost/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-token' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });

  it('rejects reset with short password', async () => {
    const req = new Request('http://localhost/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-token', password: 'short' }),
    });
    const res = await app.request(req, {}, { ENVIRONMENT: 'test' });

    expect(res.status).toBe(422);
  });
});
