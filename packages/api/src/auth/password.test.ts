import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  parseCookies,
  createSessionCookie,
  clearSessionCookie,
} from './password';

describe('Password Hashing', () => {
  it('hashes a password successfully', async () => {
    const hash = await hashPassword('testpassword123');
    expect(hash).toBeDefined();
    expect(hash).toContain(':');
    const [salt, key] = hash.split(':');
    expect(salt).toHaveLength(64);
    expect(key).toHaveLength(128);
  });

  it('produces different hashes for the same password', async () => {
    const hash1 = await hashPassword('testpassword123');
    const hash2 = await hashPassword('testpassword123');
    expect(hash1).not.toBe(hash2);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('mypassword');
    const result = await verifyPassword('mypassword', hash);
    expect(result).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('mypassword');
    const result = await verifyPassword('wrongpassword', hash);
    expect(result).toBe(false);
  });

  it('rejects malformed hash', async () => {
    const result = await verifyPassword('password', 'invalidhash');
    expect(result).toBe(false);
  });

  it('rejects empty hash', async () => {
    const result = await verifyPassword('password', '');
    expect(result).toBe(false);
  });
});

describe('Token Generation', () => {
  it('generates a hex token', () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('generates unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });
});

describe('Cookie Parsing', () => {
  it('parses a single cookie', () => {
    const cookies = parseCookies('session=abc123');
    expect(cookies.session).toBe('abc123');
  });

  it('parses multiple cookies', () => {
    const cookies = parseCookies('session=abc123; theme=dark; lang=en');
    expect(cookies.session).toBe('abc123');
    expect(cookies.theme).toBe('dark');
    expect(cookies.lang).toBe('en');
  });

  it('handles empty cookie header', () => {
    const cookies = parseCookies('');
    expect(cookies).toEqual({});
  });

  it('handles cookies with equals in value', () => {
    const cookies = parseCookies('token=abc=def=ghi');
    expect(cookies.token).toBe('abc=def=ghi');
  });
});

describe('Session Cookie', () => {
  it('creates a session cookie with correct attributes', () => {
    const cookie = createSessionCookie('session123', 3600);
    expect(cookie).toContain('session=session123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=3600');
  });

  it('creates a clear session cookie', () => {
    const cookie = clearSessionCookie();
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('session=');
  });
});
