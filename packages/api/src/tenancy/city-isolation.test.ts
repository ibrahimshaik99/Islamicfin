import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * City-based tenant isolation scenario tests (Community A vs Community B).
 *
 * Community A (Bhopal) and Community B (Indore) are separate tenants.
 * A user authorized for A must never read, modify, or infer B's data.
 * Every request below goes through the real app (real middleware, real routes);
 * only the database and session lookup are mocked.
 */

const { mockDb, mockGetSessionUser, mockResolveTenantContext, recordedWheres } =
  vi.hoisted(() => {
    const recordedWheres: unknown[] = [];
    let queue: unknown[] = [];
    let last: unknown = [];

    function shift(): unknown {
      if (queue.length === 0) return last;
      const next = queue.shift()!;
      last = next;
      return next;
    }

    const makeChain = () => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.from = vi.fn(self);
      chain.where = vi.fn((cond: unknown) => {
        recordedWheres.push(cond);
        return chain;
      });
      chain.limit = vi.fn(self);
      chain.offset = vi.fn(self);
      chain.orderBy = vi.fn(self);
      chain.groupBy = vi.fn(self);
      chain.innerJoin = vi.fn(self);
      chain.leftJoin = vi.fn(self);
      chain.set = vi.fn(self);
      chain.then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(shift()).then(resolve, reject);
      chain.returning = vi.fn(() => Promise.resolve(shift()));

      const makeResult = () => {
        const result: Record<string, unknown> = {};
        result.returning = vi.fn(() => Promise.resolve(shift()));
        result.then = (
          resolve: (v: unknown) => void,
          reject: (e: unknown) => void,
        ) => Promise.resolve(shift()).then(resolve, reject);
        return result;
      };

      chain.values = vi.fn(() => makeResult());
      return chain;
    };

    const mockDb = {
      select: vi.fn(() => makeChain()),
      insert: vi.fn(() => makeChain()),
      update: vi.fn(() => makeChain()),
      delete: vi.fn(() => makeChain()),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(makeChain()),
      ),
      __setQueue: (rows: unknown[]) => {
        queue = [...rows];
        last = rows.length ? rows[rows.length - 1] : [];
      },
      __reset: () => {
        queue = [];
        last = [];
        recordedWheres.length = 0;
        mockDb.select.mockClear();
        mockDb.insert.mockClear();
        mockDb.update.mockClear();
        mockDb.delete.mockClear();
        mockDb.transaction.mockClear();
      },
    };

    const mockGetSessionUser = vi.fn();
    const mockResolveTenantContext = vi.fn();

    return { mockDb, mockGetSessionUser, mockResolveTenantContext, recordedWheres };
  });

vi.mock('../db', () => ({ db: mockDb }));

vi.mock('../auth/session', () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock('../auth/password', () => ({
  parseCookies: (header: string) => {
    const cookies: Record<string, string> = {};
    for (const part of header.split(';')) {
      const [name, ...rest] = part.split('=');
      if (name) cookies[name.trim()] = rest.join('=').trim();
    }
    return cookies;
  },
}));

vi.mock('./membership', () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

const { default: app } = await import('../index');

const COMMUNITY_A = '00000000-0000-0000-0000-00000000000a';
const COMMUNITY_B = '00000000-0000-0000-0000-00000000000b';
const CITY_A = '00000000-0000-0000-0000-0000000000c1';
const CITY_B = '00000000-0000-0000-0000-0000000000c2';
const USER_A = '00000000-0000-0000-0000-000000000001';
const ORDER_IN_B = '00000000-0000-0000-0000-0000000000b1';

function cookie(token = 'session-a') {
  return `session=${token}`;
}

function containsValue(obj: unknown, value: string, depth = 0): boolean {
  if (depth > 14 || obj == null) return false;
  if (obj === value) return true;
  if (typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some((v) => containsValue(v, value, depth + 1));
  return Object.values(obj as Record<string, unknown>).some((v) =>
    containsValue(v, value, depth + 1),
  );
}

describe('City-based tenant isolation (Community A / Bhopal vs Community B / Indore)', () => {
  beforeEach(() => {
    mockDb.__reset();

    mockGetSessionUser.mockResolvedValue({
      id: USER_A,
      name: 'User A',
      email: 'user-a@test.com',
      status: 'ACTIVE',
    });

    // User A is a member of Community A only (mirrors server-side membership rules)
    mockResolveTenantContext.mockImplementation(
      async (userId: string, communityId: string) => {
        if (userId === USER_A && communityId === COMMUNITY_A) {
          return {
            userId,
            communityId: COMMUNITY_A,
            role: 'COMMUNITY_OWNER',
            membershipId: 'mem-a',
          };
        }
        return null;
      },
    );
  });

  it('Scenario 1: member can read their own community dashboard (positive control)', async () => {
    mockDb.__setQueue([[{ id: COMMUNITY_A }], [{ value: 0 }]]);

    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_A}/dashboard`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(200);
    expect(containsValue(recordedWheres, COMMUNITY_A)).toBe(true);
  });

  it('Scenario 2: member of A cannot read Community B dashboard', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/dashboard`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('Scenario 3: member of A cannot list Community B members', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/members`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 4: member of A cannot update Community B settings', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/settings`,
      {
        method: 'PATCH',
        headers: {
          cookie: cookie(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Hijacked' }),
      },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 5: member of A cannot list Community B marketplace products', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/products`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 6: member of A cannot create an order in Community B', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/orders`,
      {
        method: 'POST',
        headers: { cookie: cookie(), 'content-type': 'application/json' },
        body: JSON.stringify({
          merchantId: '00000000-0000-0000-0000-000000000099',
          items: [{ productId: '00000000-0000-0000-0000-000000000098', quantity: 1 }],
          shippingAddress: {
            name: 'X',
            phone: '1',
            addressLine1: 'y',
            city: 'Bhopal',
            state: 'MP',
            pincode: '462001',
          },
          paymentMethod: 'COD',
        }),
      },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 7: member of A cannot list Community B orders', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/orders`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 8: member of A cannot list Community B merchants', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/merchants`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 9: member of A cannot create Kameti groups in Community B', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/kameti/groups`,
      {
        method: 'POST',
        headers: { cookie: cookie(), 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Hijack',
          totalMembers: 10,
          contributionAmount: '1000',
          frequency: 'MONTHLY',
        }),
      },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 10: member of A cannot read Community B conversations', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/conversations`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 11: member of A cannot read Community B finance contracts', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/finance/contracts`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 12: member of A cannot read Community B directory entries', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_B}/directory`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(403);
  });

  it('Scenario 13: join request for a community in a different city is rejected', async () => {
    // City B is selected but Community B belongs to City B while the flow must
    // never silently attach a user to another city's tenant. Simulate the
    // client sending City A with a Community B id (mismatch).
    mockDb.__setQueue([
      // 1. city lookup (City A)
      [{ id: CITY_A, name: 'Bhopal', state: 'Madhya Pradesh', status: 'ACTIVE' }],
      // 2. existing pending requests
      [],
      // 3. existing membership
      [],
      // 4. community lookup -> Community B belongs to City B
      [
        {
          id: COMMUNITY_B,
          cityId: CITY_B,
          status: 'ACTIVE',
        },
      ],
    ]);

    const res = await app.request(
      'http://localhost/api/v1/membership-requests',
      {
        method: 'POST',
        headers: { cookie: cookie(), 'content-type': 'application/json' },
        body: JSON.stringify({
          requestType: 'JOIN_COMMUNITY',
          communityId: COMMUNITY_B,
          cityId: CITY_A,
        }),
      },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('CITY_MISMATCH');
  });

  it('Bonus: an order belonging to B cannot be fetched through A tenant scope', async () => {
    mockDb.__setQueue([[]]); // order lookup scoped to A returns nothing

    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_IN_B}`,
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(404);
    expect(containsValue(recordedWheres, COMMUNITY_A)).toBe(true);
  });

  it('Bonus: cross-community BNPL contract creation is blocked (order not in tenant)', async () => {
    mockDb.__setQueue([[]]); // order lookup scoped to A finds nothing

    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts`,
      {
        method: 'POST',
        headers: { cookie: cookie(), 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId: ORDER_IN_B,
          downPayment: '0',
          installmentCount: 3,
          installmentFrequency: 'MONTHLY',
          firstDueDate: '2026-10-27',
        }),
      },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(404);
    expect(containsValue(recordedWheres, COMMUNITY_A)).toBe(true);
  });

  it('Bonus: membership request without a city is rejected', async () => {
    const res = await app.request(
      'http://localhost/api/v1/membership-requests',
      {
        method: 'POST',
        headers: { cookie: cookie(), 'content-type': 'application/json' },
        body: JSON.stringify({
          requestType: 'JOIN_COMMUNITY',
          communityId: COMMUNITY_A,
        }),
      },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Bonus: unauthenticated requests are rejected with 401', async () => {
    const res = await app.request(
      `http://localhost/api/v1/communities/${COMMUNITY_A}/dashboard`,
      {},
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(401);
  });
});
