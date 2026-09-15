import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  TEST_USERS,
  TEST_COMMUNITIES,
  TEST_MEMBERSHIPS,
  TEST_SESSIONS,
} from './test-data';
import { tenantMiddleware } from './middleware';
import { resolveTenantContext } from './membership';

vi.mock('../db', () => ({
  db: {},
}));

vi.mock('../db/schema', () => ({
  communities: { id: 'id', name: 'name', slug: 'slug' },
  communityMemberships: {
    id: 'id',
    communityId: 'community_id',
    userId: 'user_id',
    role: 'role',
    status: 'status',
  },
  users: { id: 'id' },
  sessions: { id: 'id', userId: 'user_id', token: 'token', expiresAt: 'expires_at' },
}));

vi.mock('../auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../auth/password', () => ({
  parseCookies: (header: string) => {
    const cookies: Record<string, string> = {};
    for (const part of header.split(';')) {
      const [name, ...rest] = part.split('=');
      if (name) {
        cookies[name.trim()] = rest.join('=').trim();
      }
    }
    return cookies;
  },
}));

vi.mock('./membership', () => ({
  resolveTenantContext: vi.fn(),
}));

const { getSessionUser } = await import('../auth/session');
const mockGetSessionUser = vi.mocked(getSessionUser);
const mockResolve = vi.mocked(resolveTenantContext);

async function createTestApp() {
  const app = new Hono();

  const { authMiddleware, requireAuth } = await import('../auth/middleware');

  app.use('*', authMiddleware);

  app.get(
    '/api/v1/communities/:communityId',
    requireAuth,
    tenantMiddleware,
    async (c) => {
      const tenant = c.get('tenant')!;
      return c.json({
        data: {
          communityId: tenant.communityId,
          role: tenant.role,
          userId: tenant.userId,
        },
      });
    },
  );

  app.get(
    '/api/v1/communities/:communityId/data',
    requireAuth,
    tenantMiddleware,
    async (c) => {
      const tenant = c.get('tenant')!;
      return c.json({
        data: {
          communityId: tenant.communityId,
          resource: 'sensitive-data',
        },
      });
    },
  );

  app.get(
    '/api/v1/communities',
    requireAuth,
    tenantMiddleware,
    async (c) => {
      const tenant = c.get('tenant')!;
      return c.json({
        data: { communityId: tenant.communityId },
      });
    },
  );

  app.post(
    '/api/v1/communities/:communityId/resources',
    requireAuth,
    tenantMiddleware,
    async (c) => {
      const tenant = c.get('tenant')!;
      const body = await c.req.json();
      return c.json({
        data: {
          communityId: tenant.communityId,
          resourceCommunityId: (body as { communityId?: string }).communityId,
        },
      });
    },
  );

  return app;
}

function createCookie(sessionToken: string) {
  return `session=${sessionToken}`;
}

describe('Tenant Isolation Security Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetSessionUser.mockImplementation(async (token: string) => {
      if (token === TEST_SESSIONS.sessionUserA) {
        return {
          id: TEST_USERS.userA.id,
          name: TEST_USERS.userA.name,
          email: TEST_USERS.userA.email,
          status: 'ACTIVE',
        };
      }
      if (token === TEST_SESSIONS.sessionUserB) {
        return {
          id: TEST_USERS.userB.id,
          name: TEST_USERS.userB.name,
          email: TEST_USERS.userB.email,
          status: 'ACTIVE',
        };
      }
      if (token === TEST_SESSIONS.sessionUserC) {
        return {
          id: TEST_USERS.userC.id,
          name: TEST_USERS.userC.name,
          email: TEST_USERS.userC.email,
          status: 'ACTIVE',
        };
      }
      return null;
    });

    app = await createTestApp();
  });

  describe('Test 1: User A can access Community A resources', () => {
    it('allows access when user is a member of the community', async () => {
      mockResolve.mockResolvedValue({
        userId: TEST_USERS.userA.id,
        communityId: TEST_COMMUNITIES.communityA.id,
        role: TEST_MEMBERSHIPS.userAinA.role,
        membershipId: TEST_MEMBERSHIPS.userAinA.id,
      });

      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { communityId: string; userId: string } };
      expect(body.data.communityId).toBe(TEST_COMMUNITIES.communityA.id);
      expect(body.data.userId).toBe(TEST_USERS.userA.id);
    });
  });

  describe('Test 2: User A cannot access Community B resources', () => {
    it('denies access when user is not a member of the community', async () => {
      mockResolve.mockResolvedValue(null);

      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityB.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
        },
      );

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Test 3: User B can access Community B resources', () => {
    it('allows access when user is a member of the community', async () => {
      mockResolve.mockResolvedValue({
        userId: TEST_USERS.userB.id,
        communityId: TEST_COMMUNITIES.communityB.id,
        role: TEST_MEMBERSHIPS.userBinB.role,
        membershipId: TEST_MEMBERSHIPS.userBinB.id,
      });

      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityB.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserB) },
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { communityId: string; userId: string } };
      expect(body.data.communityId).toBe(TEST_COMMUNITIES.communityB.id);
      expect(body.data.userId).toBe(TEST_USERS.userB.id);
    });
  });

  describe('Test 4: User B cannot access Community A resources', () => {
    it('denies access when user is not a member of the community', async () => {
      mockResolve.mockResolvedValue(null);

      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserB) },
        },
      );

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Test 5: Changing IDs in URLs cannot bypass authorization', () => {
    it('rejects when user tries to access a community they are not a member of via URL manipulation', async () => {
      mockResolve.mockImplementation(async (userId, communityId) => {
        if (
          userId === TEST_USERS.userA.id &&
          communityId === TEST_COMMUNITIES.communityA.id
        ) {
          return {
            userId,
            communityId,
            role: 'COMMUNITY_OWNER',
            membershipId: 'mem-1',
          };
        }
        return null;
      });

      const resLegit = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
        },
      );
      expect(resLegit.status).toBe(200);

      const resAttack = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityB.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
        },
      );
      expect(resAttack.status).toBe(403);
    });

    it('rejects when user tries to access another community via modified URL ID', async () => {
      mockResolve.mockResolvedValue(null);

      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityB.id}/data`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
        },
      );

      expect(res.status).toBe(403);
    });
  });

  describe('Test 6: Changing IDs in request bodies cannot bypass authorization', () => {
    it('ignores communityId in request body and uses URL-derived tenant context', async () => {
      mockResolve.mockImplementation(async (userId, communityId) => {
        if (
          userId === TEST_USERS.userA.id &&
          communityId === TEST_COMMUNITIES.communityA.id
        ) {
          return {
            userId,
            communityId,
            role: 'COMMUNITY_OWNER',
            membershipId: 'mem-1',
          };
        }
        return null;
      });

      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/resources`,
        {
          method: 'POST',
          headers: {
            cookie: createCookie(TEST_SESSIONS.sessionUserA),
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            communityId: TEST_COMMUNITIES.communityB.id,
            data: 'malicious',
          }),
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { communityId: string; resourceCommunityId: string } };
      expect(body.data.communityId).toBe(TEST_COMMUNITIES.communityA.id);
      expect(body.data.resourceCommunityId).toBe(TEST_COMMUNITIES.communityB.id);
    });
  });

  describe('Test 7: Query parameters cannot bypass tenant isolation', () => {
    it('rejects when communityId in query does not match authorized tenant', async () => {
      mockResolve.mockImplementation(async (userId, communityId) => {
        if (
          userId === TEST_USERS.userA.id &&
          communityId === TEST_COMMUNITIES.communityA.id
        ) {
          return {
            userId,
            communityId,
            role: 'COMMUNITY_OWNER',
            membershipId: 'mem-1',
          };
        }
        return null;
      });

      const res = await app.request(
        `/api/v1/communities?communityId=${TEST_COMMUNITIES.communityB.id}`,
        {
          headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
        },
      );

      expect(res.status).toBe(403);
    });
  });

  describe('Authentication enforcement', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}`,
      );

      expect(res.status).toBe(401);
    });

    it('rejects invalid session tokens', async () => {
      const res = await app.request(
        `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}`,
        {
          headers: { cookie: 'session=invalid-token' },
        },
      );

      expect(res.status).toBe(401);
    });
  });
});
