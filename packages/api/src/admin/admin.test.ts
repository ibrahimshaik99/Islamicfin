import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

let lastQueryResult: unknown[] = [];

const mockSelectChain = () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      try { resolve(lastQueryResult); } catch (e) { reject?.(e); }
    },
  };
  return chain;
};

const mockDb = {
  select: vi.fn(() => mockSelectChain()),
  insert: vi.fn(() => ({
    values: vi.fn().mockResolvedValue([]),
  })),
  update: vi.fn(() => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  })),
  delete: vi.fn(),
};

vi.mock('../db', () => ({
  db: mockDb,
}));

vi.mock('../db/schema', () => ({
  communities: { id: 'id', name: 'name', slug: 'slug', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at' },
  communityMemberships: {
    id: 'id', communityId: 'community_id', userId: 'user_id', role: 'role', status: 'status', joinedAt: 'joined_at',
  },
  users: { id: 'id', name: 'name', email: 'email', phone: 'phone', status: 'status', lastLogin: 'last_login', createdAt: 'created_at', updatedAt: 'updated_at' },
  merchants: { id: 'id', communityId: 'community_id', userId: 'user_id', businessName: 'business_name', verificationStatus: 'verification_status', createdAt: 'created_at', updatedAt: 'updated_at' },
  auditLogs: { id: 'id', communityId: 'community_id', actorId: 'actor_id', action: 'action', entityType: 'entity_type', entityId: 'entity_id', oldValues: 'old_values', newValues: 'new_values', createdAt: 'created_at' },
  subscriptions: { id: 'id', communityId: 'community_id', plan: 'plan', price: 'price', currency: 'currency', status: 'status', startedAt: 'started_at', expiresAt: 'expires_at', createdAt: 'created_at' },
  orders: { id: 'id' },
  financeContracts: { id: 'id' },
  financeReviews: { id: 'id', contractId: 'contract_id', reviewer: 'reviewer', status: 'status', reviewedAt: 'reviewed_at', version: 'version', createdAt: 'created_at' },
  crowdfundingProjects: { id: 'id', status: 'status' },
  kametiGroups: { id: 'id' },
  riskFlags: { id: 'id', communityId: 'community_id', entityType: 'entity_type', entityId: 'entity_id', severity: 'severity', reason: 'reason', status: 'status', reviewerId: 'reviewer_id', notes: 'notes', resolvedAt: 'resolved_at', createdAt: 'created_at', updatedAt: 'updated_at' },
}));

vi.mock('../auth/session', () => ({
  getSessionUser: vi.fn(),
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

const { getSessionUser } = await import('../auth/session');
const mockGetSessionUser = vi.mocked(getSessionUser);

function createCookie(sessionToken: string) {
  return `session=${sessionToken}`;
}

async function createTestApp() {
  const app = new Hono();
  const { authMiddleware, requireAuth } = await import('../auth/middleware');
  const { requireSuperAdmin } = await import('../admin/middleware');

  app.use('*', authMiddleware);

  app.get('/api/v1/admin/dashboard', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: { stats: true } });
  });

  app.get('/api/v1/admin/communities', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: [] });
  });

  app.get('/api/v1/admin/users', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: [] });
  });

  app.get('/api/v1/admin/merchants', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: [] });
  });

  app.get('/api/v1/admin/audit', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: [] });
  });

  app.get('/api/v1/admin/subscriptions', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: [] });
  });

  app.get('/api/v1/admin/fraud', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: {} });
  });

  app.get('/api/v1/admin/shariah', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: {} });
  });

  app.post('/api/v1/admin/communities/:communityId/status', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: { id: c.req.param('communityId') } });
  });

  app.post('/api/v1/admin/users/:userId/status', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: { id: c.req.param('userId') } });
  });

  app.post('/api/v1/admin/merchants/:merchantId/status', requireAuth, requireSuperAdmin, async (c) => {
    return c.json({ data: { id: c.req.param('merchantId') } });
  });

  return app;
}

function setupMockDbForSuperAdmin() {
  lastQueryResult = [{ role: 'SUPER_ADMIN' }];
  mockDb.select.mockReturnValue(mockSelectChain());
}

function setupMockDbForNonAdmin(role: string) {
  lastQueryResult = [{ role }];
  mockDb.select.mockReturnValue(mockSelectChain());
}

function setupMockDbForEmptyMemberships() {
  lastQueryResult = [];
  mockDb.select.mockReturnValue(mockSelectChain());
}

describe('Super Admin Authorization Tests', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();
    lastQueryResult = [];
    app = await createTestApp();
  });

  describe('Unauthenticated access', () => {
    it('rejects unauthenticated request to dashboard', async () => {
      const res = await app.request('http://localhost/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated request to communities', async () => {
      const res = await app.request('http://localhost/api/v1/admin/communities');
      expect(res.status).toBe(401);
    });
  });

  describe('Non-Super Admin access', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === TEST_SESSIONS.sessionUserA) {
          return { id: TEST_USERS.userA.id, name: TEST_USERS.userA.name, email: TEST_USERS.userA.email, status: 'ACTIVE' };
        }
        return null;
      });
    });

    it('rejects COMMUNITY_OWNER from admin dashboard', async () => {
      setupMockDbForNonAdmin('COMMUNITY_OWNER');
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
      });
      expect(res.status).toBe(403);
    });

    it('rejects COMMUNITY_ADMIN from admin dashboard', async () => {
      setupMockDbForNonAdmin('COMMUNITY_ADMIN');
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
      });
      expect(res.status).toBe(403);
    });

    it('rejects CUSTOMER from admin dashboard', async () => {
      setupMockDbForNonAdmin('CUSTOMER');
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
      });
      expect(res.status).toBe(403);
    });

    it('rejects MERCHANT from admin dashboard', async () => {
      setupMockDbForNonAdmin('MERCHANT');
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) },
      });
      expect(res.status).toBe(403);
    });

    it('rejects user with no memberships', async () => {
      setupMockDbForEmptyMemberships();
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === TEST_SESSIONS.sessionUserC) {
          return { id: TEST_USERS.userC.id, name: TEST_USERS.userC.name, email: TEST_USERS.userC.email, status: 'ACTIVE' };
        }
        return null;
      });
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie(TEST_SESSIONS.sessionUserC) },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Super Admin access', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'super-admin-session') {
          return { id: 'super-admin-id', name: 'Super Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      setupMockDbForSuperAdmin();
    });

    it('allows SUPER_ADMIN to access dashboard', async () => {
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access communities', async () => {
      const res = await app.request('http://localhost/api/v1/admin/communities', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access users', async () => {
      const res = await app.request('http://localhost/api/v1/admin/users', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access merchants', async () => {
      const res = await app.request('http://localhost/api/v1/admin/merchants', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access audit logs', async () => {
      const res = await app.request('http://localhost/api/v1/admin/audit', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access subscriptions', async () => {
      const res = await app.request('http://localhost/api/v1/admin/subscriptions', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access fraud overview', async () => {
      const res = await app.request('http://localhost/api/v1/admin/fraud', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });

    it('allows SUPER_ADMIN to access shariah governance', async () => {
      const res = await app.request('http://localhost/api/v1/admin/shariah', {
        headers: { cookie: createCookie('super-admin-session') },
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Community suspension', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'super-admin-session') {
          return { id: 'super-admin-id', name: 'Super Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      setupMockDbForSuperAdmin();
    });

    it('allows SUPER_ADMIN to suspend a community', async () => {
      const updateChain = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'community-1', status: 'SUSPENDED' }]),
          }),
        }),
      };
      mockDb.update.mockReturnValue(updateChain);
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const res = await app.request(
        'http://localhost/api/v1/admin/communities/community-1/status',
        {
          method: 'POST',
          headers: { cookie: createCookie('super-admin-session'), 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED' }),
        },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('User status changes', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'super-admin-session') {
          return { id: 'super-admin-id', name: 'Super Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      setupMockDbForSuperAdmin();
    });

    it('allows SUPER_ADMIN to suspend a user', async () => {
      const updateChain = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'user-1', status: 'SUSPENDED' }]),
          }),
        }),
      };
      mockDb.update.mockReturnValue(updateChain);
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const res = await app.request(
        'http://localhost/api/v1/admin/users/user-1/status',
        {
          method: 'POST',
          headers: { cookie: createCookie('super-admin-session'), 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED' }),
        },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Merchant verification', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'super-admin-session') {
          return { id: 'super-admin-id', name: 'Super Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      setupMockDbForSuperAdmin();
    });

    it('allows SUPER_ADMIN to approve a merchant', async () => {
      const updateChain = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'merchant-id', verificationStatus: 'APPROVED' }]),
          }),
        }),
      };
      mockDb.update.mockReturnValue(updateChain);
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const res = await app.request(
        'http://localhost/api/v1/admin/merchants/merchant-id/status',
        {
          method: 'POST',
          headers: { cookie: createCookie('super-admin-session'), 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('IDOR attempts', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'user-a-session') {
          return { id: TEST_USERS.userA.id, name: TEST_USERS.userA.name, email: TEST_USERS.userA.email, status: 'ACTIVE' };
        }
        return null;
      });
    });

    it('prevents non-admin user from accessing admin endpoints', async () => {
      setupMockDbForNonAdmin('COMMUNITY_OWNER');
      const endpoints = [
        'http://localhost/api/v1/admin/dashboard',
        'http://localhost/api/v1/admin/communities',
        'http://localhost/api/v1/admin/users',
        'http://localhost/api/v1/admin/merchants',
        'http://localhost/api/v1/admin/audit',
      ];
      for (const endpoint of endpoints) {
        const res = await app.request(endpoint, {
          headers: { cookie: createCookie('user-a-session') },
        });
        expect(res.status).toBe(403);
      }
    });

    it('prevents unauthenticated user from accessing admin endpoints', async () => {
      const endpoints = [
        'http://localhost/api/v1/admin/dashboard',
        'http://localhost/api/v1/admin/communities',
        'http://localhost/api/v1/admin/users',
        'http://localhost/api/v1/admin/merchants',
        'http://localhost/api/v1/admin/audit',
      ];
      for (const endpoint of endpoints) {
        const res = await app.request(endpoint);
        expect(res.status).toBe(401);
      }
    });
  });
});

import {
  TEST_USERS,
  TEST_SESSIONS,
} from '../tenancy/test-data';
