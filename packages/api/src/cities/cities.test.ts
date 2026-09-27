import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * City selection + onboarding (membership request) tests.
 *
 * A tenant ecosystem is identified by city + community slug. Join requests must
 * carry a city that matches the target community; community creation requires a
 * city; super admin manages the normalized cities table.
 */

const { mockDb, mockGetSessionUser, mockResolveTenantContext, recordedValues, recordedSets } =
  vi.hoisted(() => {
    const recordedValues: unknown[] = [];
    const recordedSets: unknown[] = [];
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
      chain.where = vi.fn(() => chain);
      chain.limit = vi.fn(self);
      chain.offset = vi.fn(self);
      chain.orderBy = vi.fn(self);
      chain.groupBy = vi.fn(self);
      chain.innerJoin = vi.fn(self);
      chain.leftJoin = vi.fn(self);
      chain.set = vi.fn((vals: unknown) => {
        recordedSets.push(vals);
        return chain;
      });
      chain.returning = vi.fn(() => Promise.resolve(shift()));
      chain.then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(shift()).then(resolve, reject);

      const makeResult = () => {
        const result: Record<string, unknown> = {};
        result.returning = vi.fn(() => Promise.resolve(shift()));
        result.then = (
          resolve: (v: unknown) => void,
          reject: (e: unknown) => void,
        ) => Promise.resolve(shift()).then(resolve, reject);
        return result;
      };

      chain.values = vi.fn((vals: unknown) => {
        recordedValues.push(vals);
        return makeResult();
      });
      return chain;
    };

    const mockDb = {
      select: vi.fn(() => makeChain()),
      insert: vi.fn(() => makeChain()),
      update: vi.fn(() => makeChain()),
      delete: vi.fn(() => makeChain()),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(makeChain())),
      __setQueue: (rows: unknown[]) => {
        queue = [...rows];
        last = rows.length ? rows[rows.length - 1] : [];
      },
      __reset: () => {
        queue = [];
        last = [];
        recordedValues.length = 0;
        recordedSets.length = 0;
        mockDb.select.mockClear();
        mockDb.insert.mockClear();
        mockDb.update.mockClear();
        mockDb.delete.mockClear();
      },
    };

    const mockGetSessionUser = vi.fn();
    const mockResolveTenantContext = vi.fn();

    return { mockDb, mockGetSessionUser, mockResolveTenantContext, recordedValues, recordedSets };
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

vi.mock('../tenancy/membership', () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

const { default: app } = await import('../index');

const CITY_A = '00000000-0000-0000-0000-0000000000c1';
const CITY_B = '00000000-0000-0000-0000-0000000000c2';
const COMMUNITY_A = '00000000-0000-0000-0000-00000000000a';
const USER = '00000000-0000-0000-0000-000000000001';

function cookie() {
  return 'session=token';
}

function cityRow(id = CITY_A, name = 'Bhopal') {
  return { id, name, state: 'Madhya Pradesh', slug: name.toLowerCase(), status: 'ACTIVE' };
}

describe('Cities + onboarding', () => {
  beforeEach(() => {
    mockDb.__reset();
    mockGetSessionUser.mockResolvedValue({
      id: USER,
      name: 'User',
      email: 'u@test.com',
      status: 'ACTIVE',
    });
    mockResolveTenantContext.mockResolvedValue(null);
  });

  describe('City endpoints', () => {
    it('GET /api/v1/cities lists active cities', async () => {
      mockDb.__setQueue([[cityRow(), cityRow(CITY_B, 'Indore')]]);

      const res = await app.request(
        'http://localhost/api/v1/cities',
        { headers: { cookie: cookie() } },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Array<{ name: string }> };
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe('Bhopal');
    });

    it('GET /api/v1/cities/:cityId/communities returns communities of that city', async () => {
      mockDb.__setQueue([
        [cityRow()],
        [{ id: COMMUNITY_A, name: 'Demo Islamic Center', slug: 'demo-islamic-center', status: 'ACTIVE' }],
      ]);

      const res = await app.request(
        `http://localhost/api/v1/cities/${CITY_A}/communities`,
        { headers: { cookie: cookie() } },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { city: { name: string }; communities: unknown[] };
      };
      expect(body.data.city.name).toBe('Bhopal');
      expect(body.data.communities).toHaveLength(1);
    });

    it('GET /api/v1/cities/:cityId/communities returns 404 for unknown city', async () => {
      mockDb.__setQueue([[]]);

      const res = await app.request(
        `http://localhost/api/v1/cities/${CITY_B}/communities`,
        { headers: { cookie: cookie() } },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Join / create community requests', () => {
    it('rejects JOIN without a city', async () => {
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

    it('rejects JOIN when the community belongs to another city', async () => {
      mockDb.__setQueue([
        [cityRow(CITY_A, 'Bhopal')],
        [], // no pending request
        [], // not a member
        [{ id: COMMUNITY_A, cityId: CITY_B, status: 'ACTIVE' }], // community in Indore
      ]);

      const res = await app.request(
        'http://localhost/api/v1/membership-requests',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            requestType: 'JOIN_COMMUNITY',
            communityId: COMMUNITY_A,
            cityId: CITY_A,
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('CITY_MISMATCH');
    });

    it('accepts a JOIN when the city matches the community', async () => {
      mockDb.__setQueue([
        [cityRow(CITY_A, 'Bhopal')],
        [],
        [],
        [{ id: COMMUNITY_A, cityId: CITY_A, status: 'ACTIVE' }],
        [{ id: 'req-1', status: 'PENDING', cityId: CITY_A }],
      ]);

      const res = await app.request(
        'http://localhost/api/v1/membership-requests',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            requestType: 'JOIN_COMMUNITY',
            communityId: COMMUNITY_A,
            cityId: CITY_A,
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(201);
      expect(
        recordedValues.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as Record<string, unknown>).cityId === CITY_A,
        ),
      ).toBe(true);
    });

    it('rejects CREATE_COMMUNITY without a city', async () => {
      const res = await app.request(
        'http://localhost/api/v1/membership-requests',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            requestType: 'CREATE_COMMUNITY',
            communityName: 'New Center',
            communitySlug: 'new-center',
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(400);
    });

    it('rejects CREATE_COMMUNITY with an unknown city', async () => {
      mockDb.__setQueue([[]]); // city lookup fails

      const res = await app.request(
        'http://localhost/api/v1/membership-requests',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            requestType: 'CREATE_COMMUNITY',
            communityName: 'New Center',
            communitySlug: 'new-center',
            cityId: CITY_B,
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('stores the city on a valid CREATE_COMMUNITY request', async () => {
      mockDb.__setQueue([
        [cityRow()],
        [], // no pending request
        [], // slug free
        [{ id: 'req-2', status: 'PENDING', cityId: CITY_A }],
      ]);

      const res = await app.request(
        'http://localhost/api/v1/membership-requests',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            requestType: 'CREATE_COMMUNITY',
            communityName: 'New Center',
            communitySlug: 'new-center',
            cityId: CITY_A,
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(201);
      expect(
        recordedValues.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as Record<string, unknown>).cityId === CITY_A,
        ),
      ).toBe(true);
    });
  });

  describe('Super admin city management', () => {
    it('rejects city creation from non-super-admin', async () => {
      mockDb.__setQueue([[{ role: 'COMMUNITY_OWNER' }]]);

      const res = await app.request(
        'http://localhost/api/v1/admin/cities',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Ujjain', state: 'Madhya Pradesh' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(403);
    });

    it('allows super admin to create a city', async () => {
      // requireSuperAdmin runs twice (admin router wildcard + city router)
      mockDb.__setQueue([
        [{ role: 'SUPER_ADMIN' }],
        [{ role: 'SUPER_ADMIN' }],
        [], // slug free
        [cityRow('00000000-0000-0000-0000-0000000000c3', 'Ujjain')],
        [], // audit
      ]);

      const res = await app.request(
        'http://localhost/api/v1/admin/cities',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Ujjain', state: 'Madhya Pradesh' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(201);
    });
  });

  describe('Admin community creation requires a city', () => {
    it('returns 422 without cityId', async () => {
      mockDb.__setQueue([[{ role: 'SUPER_ADMIN' }]]);

      const res = await app.request(
        'http://localhost/api/v1/admin/communities',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Admin Center', slug: 'admin-center' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(422);
    });

    it('returns 422 when the city is not available', async () => {
      mockDb.__setQueue([[{ role: 'SUPER_ADMIN' }], []]); // city lookup empty

      const res = await app.request(
        'http://localhost/api/v1/admin/communities',
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Admin Center',
            slug: 'admin-center',
            cityId: CITY_B,
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(422);
    });
  });

  describe('Community settings city change', () => {
    it('rejects a cityId that is not available', async () => {
      mockResolveTenantContext.mockResolvedValue({
        userId: USER,
        communityId: COMMUNITY_A,
        role: 'COMMUNITY_OWNER',
        membershipId: 'mem-1',
      });
      mockDb.__setQueue([[]]); // inactive/unknown city

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/settings`,
        {
          method: 'PATCH',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ cityId: CITY_B }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(400);
    });

    it('applies a valid city change', async () => {
      mockResolveTenantContext.mockResolvedValue({
        userId: USER,
        communityId: COMMUNITY_A,
        role: 'COMMUNITY_OWNER',
        membershipId: 'mem-1',
      });
      mockDb.__setQueue([
        [cityRow(CITY_B, 'Indore')],
        [{ id: COMMUNITY_A, cityId: CITY_B, city: 'Indore' }],
      ]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/settings`,
        {
          method: 'PATCH',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ cityId: CITY_B }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      expect(
        recordedSets.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as Record<string, unknown>).cityId === CITY_B,
        ),
      ).toBe(true);
    });
  });
});
