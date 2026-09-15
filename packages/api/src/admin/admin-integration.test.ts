import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, lastQueryResult, mockGetSessionUser, mockSelectChain } = vi.hoisted(() => {
  const lastQueryResult = { value: [] as unknown[] };

  const mockSelectChain = () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      then: (resolve: (v: unknown) => void) => resolve(lastQueryResult.value),
    };
    return chain;
  };

  const mockDb = {
    select: vi.fn(() => mockSelectChain()),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
    update: vi.fn(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })),
    delete: vi.fn(),
  };

  const mockGetSessionUser = vi.fn();

  return { mockDb, lastQueryResult, mockGetSessionUser, mockSelectChain };
});

vi.mock('../db', () => ({
  db: mockDb,
}));

vi.mock('../db/schema', () => ({
  communities: { id: 'id', name: 'name', slug: 'slug', status: 'status', description: 'description', createdAt: 'created_at', updatedAt: 'updated_at' },
  communityMemberships: { id: 'id', communityId: 'community_id', userId: 'user_id', role: 'role', status: 'status', joinedAt: 'joined_at' },
  users: { id: 'id', name: 'name', email: 'email', phone: 'phone', passwordHash: 'password_hash', status: 'status', lastLogin: 'last_login', createdAt: 'created_at', updatedAt: 'updated_at' },
  merchants: { id: 'id', communityId: 'community_id', userId: 'user_id', businessName: 'business_name', description: 'description', phone: 'phone', whatsapp: 'whatsapp', upiId: 'upi_id', verificationStatus: 'verification_status', createdAt: 'created_at', updatedAt: 'updated_at' },
  auditLogs: { id: 'id', communityId: 'community_id', actorId: 'actor_id', action: 'action', entityType: 'entity_type', entityId: 'entity_id', oldValues: 'old_values', newValues: 'new_values', ipHash: 'ip_hash', userAgent: 'user_agent', createdAt: 'created_at' },
  subscriptions: { id: 'id', communityId: 'community_id', plan: 'plan', price: 'price', currency: 'currency', billingPeriod: 'billing_period', status: 'status', startedAt: 'started_at', expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
  orders: { id: 'id' },
  financeContracts: { id: 'id' },
  financeReviews: { id: 'id', contractId: 'contract_id', reviewer: 'reviewer', status: 'status', comments: 'comments', reviewedAt: 'reviewed_at', version: 'version', createdAt: 'created_at' },
  crowdfundingProjects: { id: 'id', status: 'status' },
  kametiGroups: { id: 'id' },
  riskFlags: { id: 'id', communityId: 'community_id', entityType: 'entity_type', entityId: 'entity_id', severity: 'severity', reason: 'reason', status: 'status', reviewerId: 'reviewer_id', notes: 'notes', resolvedAt: 'resolved_at', createdAt: 'created_at', updatedAt: 'updated_at' },
}));

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
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  generateToken: vi.fn(),
  createSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

const { default: app } = await import('../index');

function createCookie(sessionToken: string) {
  return `session=${sessionToken}`;
}

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastQueryResult.value = [];
  });

  describe('Super Admin Dashboard endpoints', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'super-admin-session') {
          return { id: 'super-admin-id', name: 'Super Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });

      lastQueryResult.value = [{ role: 'SUPER_ADMIN' }];
      mockDb.select.mockReturnValue(mockSelectChain());
    });

    it('GET /api/v1/admin/dashboard returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/communities returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/communities', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/users returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/users', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/merchants returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/merchants', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/audit returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/audit', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/subscriptions returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/subscriptions', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/fraud returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/fraud', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/shariah returns 200 for Super Admin', async () => {
      const res = await app.request('http://localhost/api/v1/admin/shariah', {
        headers: { cookie: createCookie('super-admin-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(200);
    });
  });

  describe('Unauthorized access', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'regular-user-session') {
          return { id: 'user-id', name: 'Regular User', email: 'user@test.com', status: 'ACTIVE' };
        }
        return null;
      });

      lastQueryResult.value = [{ role: 'CUSTOMER' }];
      mockDb.select.mockReturnValue(mockSelectChain());
    });

    it('rejects regular user from accessing admin dashboard', async () => {
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {
        headers: { cookie: createCookie('regular-user-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(403);
    });

    it('rejects regular user from accessing admin communities', async () => {
      const res = await app.request('http://localhost/api/v1/admin/communities', {
        headers: { cookie: createCookie('regular-user-session') },
      }, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated request', async () => {
      const res = await app.request('http://localhost/api/v1/admin/dashboard', {}, { ENVIRONMENT: 'test' });
      expect(res.status).toBe(401);
    });
  });
});
