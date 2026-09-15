import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSessionUser, mockResolveTenantContext, mockDb } = vi.hoisted(() => {
  const mockGetSessionUser = vi.fn();
  const mockResolveTenantContext = vi.fn();
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { mockGetSessionUser, mockResolveTenantContext, mockDb };
});

vi.mock('../db', () => ({ db: mockDb }));

vi.mock('../db/schema', () => ({
  communities: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    status: 'status',
    description: 'description',
    logoUrl: 'logo_url',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    contactPhone: 'contact_phone',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  communityMemberships: {
    id: 'id',
    communityId: 'community_id',
    userId: 'user_id',
    role: 'role',
    status: 'status',
    joinedAt: 'joined_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  communityGroups: {
    id: 'id',
    communityId: 'community_id',
    name: 'name',
    description: 'description',
    status: 'status',
    createdBy: 'created_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  communityGroupMembers: {
    id: 'id',
    groupId: 'group_id',
    userId: 'user_id',
    status: 'status',
    joinedAt: 'joined_at',
    createdAt: 'created_at',
  },
  announcements: {
    id: 'id',
    communityId: 'community_id',
    title: 'title',
    content: 'content',
    status: 'status',
    audience: 'audience',
    publishedAt: 'published_at',
    archivedAt: 'archived_at',
    createdBy: 'created_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  communityRoleEnum: {
    enumValues: [
      'SUPER_ADMIN', 'COMMUNITY_OWNER', 'COMMUNITY_ADMIN',
      'COMMUNITY_MODERATOR', 'COMMUNITY_FINANCE_MANAGER',
      'MERCHANT', 'MERCHANT_STAFF', 'CUSTOMER',
    ],
  },
  users: { id: 'id', name: 'name', email: 'email', status: 'status' },
  merchants: { id: 'id', communityId: 'community_id', userId: 'user_id', businessName: 'business_name', verificationStatus: 'verification_status', createdAt: 'created_at', updatedAt: 'updated_at' },
  products: { id: 'id', communityId: 'community_id', merchantId: 'merchant_id', name: 'name', price: 'price', stockQuantity: 'stock_quantity', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at' },
  orders: { id: 'id', communityId: 'community_id', orderNumber: 'order_number', customerId: 'customer_id', merchantId: 'merchant_id', subtotal: 'subtotal', total: 'total', paymentMethod: 'payment_method', paymentStatus: 'payment_status', orderStatus: 'order_status', createdAt: 'created_at', updatedAt: 'updated_at' },
  sessions: { id: 'id', userId: 'user_id', token: 'token', expiresAt: 'expires_at' },
  auditLogs: { id: 'id', communityId: 'community_id', actorId: 'actor_id' },
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

vi.mock('../tenancy/membership', () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

vi.mock('../rbac/middleware', () => ({
  requirePermission: (..._perms: string[]) => {
    return async (c: { get: (k: string) => unknown; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
      const tenant = c.get('tenant') as { role: string } | undefined;
      if (!tenant) {
        return c.json({ error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required.' } }, 400);
      }
      return next();
    };
  },
  requireAllPermissions: (..._perms: string[]) => {
    return async (c: { get: (k: string) => unknown; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
      const tenant = c.get('tenant') as { role: string } | undefined;
      if (!tenant) {
        return c.json({ error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required.' } }, 400);
      }
      return next();
    };
  },
}));

const { default: app } = await import('../index');

function createCookie(sessionToken: string) {
  return `session=${sessionToken}`;
}

const COMMUNITY_A = '00000000-0000-0000-0000-00000000000a';
const COMMUNITY_B = '00000000-0000-0000-0000-00000000000b';
const USER_A = '00000000-0000-0000-0000-000000000001';
const USER_B = '00000000-0000-0000-0000-000000000002';
const MEMBERSHIP_ID = '00000000-0000-0000-0000-000000000099';

function mockSelectChain() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    then: (resolve: (v: unknown) => void) => resolve([]),
  };
  return chain;
}

function mockInsertChain(returnValue: unknown[] = []) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(returnValue),
    }),
  };
}

function mockUpdateChain(returnValue: unknown[] = []) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(returnValue),
      }),
    }),
  };
}

describe('Community Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Community Dashboard endpoints (with mocked tenant)', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        if (token === 'mod-session') {
          return { id: USER_B, name: 'Moderator', email: 'mod@test.com', status: 'ACTIVE' };
        }
        return null;
      });

      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return {
            userId,
            communityId: COMMUNITY_A,
            role: 'COMMUNITY_ADMIN',
            membershipId: MEMBERSHIP_ID,
          };
        }
        if (communityId === COMMUNITY_B) {
          return {
            userId,
            communityId: COMMUNITY_B,
            role: 'COMMUNITY_MODERATOR',
            membershipId: MEMBERSHIP_ID,
          };
        }
        return null;
      });
    });

    it('GET /api/v1/communities/:id/dashboard returns 200 for admin', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // communities lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: COMMUNITY_A, name: 'Test Community' }]),
            }),
          };
        }
        // count queries return 0
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve([{ value: 0 }]),
        };
      });
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/dashboard`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/members returns 200 for admin', async () => {
      mockDb.select.mockReturnValue(mockSelectChain());
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/members`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/groups returns 200 for admin', async () => {
      mockDb.select.mockReturnValue(mockSelectChain());
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/groups`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/groups returns 201 for admin', async () => {
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: 'group-id', name: 'Test Group' }]));
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/groups`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test Group' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('GET /api/v1/communities/:id/announcements returns 200 for admin', async () => {
      mockDb.select.mockReturnValue(mockSelectChain());
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/announcements returns 201 for admin', async () => {
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: 'ann-id', title: 'Test' }]));
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', content: 'Test content' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('PATCH /api/v1/communities/:id/settings returns 200 for admin', async () => {
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: COMMUNITY_A }]));
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/settings`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Community' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Unauthenticated access', () => {
    it('rejects unauthenticated request to dashboard', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/dashboard`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated request to members', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/members`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated request to groups', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/groups`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated request to announcements', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });

  describe('Tenant isolation', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });

      mockResolveTenantContext.mockImplementation(async (_userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return {
            userId: USER_A,
            communityId: COMMUNITY_A,
            role: 'COMMUNITY_ADMIN',
            membershipId: MEMBERSHIP_ID,
          };
        }
        return null;
      });
    });

    it('allows access to community user belongs to', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: COMMUNITY_A, name: 'Test Community' }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve([{ value: 0 }]),
        };
      });
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/dashboard`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('rejects access to community user does not belong to (403)', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/dashboard`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });

      mockResolveTenantContext.mockResolvedValue({
        userId: USER_A,
        communityId: COMMUNITY_A,
        role: 'COMMUNITY_ADMIN',
        membershipId: MEMBERSHIP_ID,
      });
    });

    it('returns 400 for invalid group creation (empty name)', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/groups`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid announcement creation (empty title)', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '', content: '' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Announcement state transitions', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });

      mockResolveTenantContext.mockResolvedValue({
        userId: USER_A,
        communityId: COMMUNITY_A,
        role: 'COMMUNITY_ADMIN',
        membershipId: MEMBERSHIP_ID,
      });
    });

    it('publishes a draft announcement', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: 'ann-id', status: 'DRAFT' }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: 'ann-id', status: 'PUBLISHED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements/ann-id/publish`,
        { method: 'PATCH', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('rejects publishing a non-draft announcement', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: 'ann-id', status: 'PUBLISHED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements/ann-id/publish`,
        { method: 'PATCH', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('archives a published announcement', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: 'ann-id', status: 'PUBLISHED' }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: 'ann-id', status: 'ARCHIVED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements/ann-id/archive`,
        { method: 'PATCH', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('rejects archiving a non-published announcement', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: 'ann-id', status: 'DRAFT' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/announcements/ann-id/archive`,
        { method: 'PATCH', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });
});
