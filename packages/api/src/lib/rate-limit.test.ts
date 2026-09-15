import { describe, it, expect } from 'vitest';
import { rateLimit } from './rate-limit';
import { Context } from 'hono';

function createTestContext(ip = '127.0.0.1') {
  const headers: Record<string, string> = {};
  let responseStatus = 200;
  let responseBody: unknown = {};

  return {
    req: {
      header: (name: string) => {
        if (name === 'x-forwarded-for') return ip;
        return undefined;
      },
    },
    header: (name: string, value: string) => {
      headers[name] = value;
    },
    json: (body: unknown, status = 200) => {
      responseStatus = status;
      responseBody = body;
      return { status, body, json: async () => body };
    },
    getResponse: () => ({
      status: responseStatus,
      body: responseBody,
      headers: { ...headers },
    }),
  } as unknown as Context;
}

describe('Rate Limiter', () => {
  it('allows requests within limit', async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 3,
      keyPrefix: 'test',
    });

    const c1 = createTestContext('10.0.0.1');
    const result1 = await limiter(c1, async () => {});
    expect(result1).toBeUndefined();

    const c2 = createTestContext('10.0.0.1');
    const result2 = await limiter(c2, async () => {});
    expect(result2).toBeUndefined();
  });

  it('blocks requests over limit', async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 2,
      keyPrefix: 'testblock',
    });

    const c1 = createTestContext('10.0.0.2');
    await limiter(c1, async () => {});

    const c2 = createTestContext('10.0.0.2');
    await limiter(c2, async () => {});

    const c3 = createTestContext('10.0.0.2');
    const response = await limiter(c3, async () => {});

    expect(response).toBeDefined();
    expect(response!.status).toBe(429);
  });

  it('tracks different IPs separately', async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 1,
      keyPrefix: 'testsep',
    });

    const c1 = createTestContext('10.0.0.3');
    await limiter(c1, async () => {});

    const c2 = createTestContext('10.0.0.4');
    const result = await limiter(c2, async () => {});
    expect(result).toBeUndefined();
  });
});
