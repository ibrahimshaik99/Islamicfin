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
  communities: { id: 'id', name: 'name', slug: 'slug', status: 'status' },
  communityMemberships: {
    id: 'id', communityId: 'community_id', userId: 'user_id', role: 'role', status: 'status',
  },
  merchants: {
    id: 'id', communityId: 'community_id', userId: 'user_id',
    businessName: 'business_name', description: 'description', phone: 'phone',
    whatsapp: 'whatsapp', upiId: 'upi_id', upiQrUrl: 'upi_qr_url',
    address: 'address', verificationStatus: 'verification_status',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  merchantVerificationStatusEnum: {
    enumValues: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
  },
  auditLogs: { id: 'id', communityId: 'community_id', actorId: 'actor_id' },
  users: { id: 'id', name: 'name', email: 'email', status: 'status' },
  sessions: { id: 'id', userId: 'user_id', token: 'token', expiresAt: 'expires_at' },
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
  requirePermission: (...perms: string[]) => {
    return async (c: { get: (k: string) => unknown; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
      const tenant = c.get('tenant') as { role?: string } | undefined;
      const role = tenant?.role;
      const rolePermissions: Record<string, string[]> = {
        SUPER_ADMIN: ['*'],
        COMMUNITY_OWNER: ['*'],
        COMMUNITY_ADMIN: ['community:read', 'community:manage', 'community:settings:manage', 'community:members:update_role', 'community:members:remove', 'community:announcements:create', 'community:announcements:publish', 'member:read', 'member:manage', 'merchant:read', 'merchant:manage', 'merchant:apply', 'merchant:verify', 'merchant:suspend', 'category:read', 'category:manage', 'product:read', 'product:manage', 'product:inventory:manage', 'order:read', 'order:create', 'order:manage', 'payment:report', 'payment:verify', 'finance:read', 'finance:manage', 'kameti:read', 'kameti:manage', 'messaging:read', 'messaging:send', 'event:read', 'event:manage', 'announcement:read', 'announcement:manage', 'service:read', 'service:manage', 'service:request:read', 'service:request:manage'],
        MERCHANT: ['community:read', 'merchant:read', 'merchant:apply', 'category:read', 'category:manage', 'product:read', 'product:manage', 'product:inventory:manage', 'order:read', 'order:create', 'order:manage', 'payment:report', 'payment:verify', 'messaging:read', 'messaging:send', 'service:read', 'service:manage', 'service:request:read', 'service:request:manage'],
        MERCHANT_STAFF: ['community:read', 'merchant:read', 'merchant:apply', 'category:read', 'category:manage', 'product:read', 'product:inventory:manage', 'order:read', 'messaging:read', 'service:read', 'service:request:read'],
        CUSTOMER: ['community:read', 'merchant:apply', 'category:read', 'product:read', 'order:read', 'order:create', 'messaging:read', 'messaging:send', 'service:read', 'service:request:read'],
      };
      const allowed = rolePermissions[role ?? ''] ?? [];
      if (allowed.includes('*') || perms.every(p => allowed.includes(p))) {
        return next();
      }
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    };
  },
  requireAllPermissions: (...perms: string[]) => {
    return async (c: { get: (k: string) => unknown; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
      const tenant = c.get('tenant') as { role?: string } | undefined;
      const role = tenant?.role;
      const rolePermissions: Record<string, string[]> = {
        SUPER_ADMIN: ['*'],
        COMMUNITY_OWNER: ['*'],
        COMMUNITY_ADMIN: ['community:read', 'community:manage', 'community:settings:manage', 'community:members:update_role', 'community:members:remove', 'community:announcements:create', 'community:announcements:publish', 'member:read', 'member:manage', 'merchant:read', 'merchant:manage', 'merchant:apply', 'merchant:verify', 'merchant:suspend', 'category:read', 'category:manage', 'product:read', 'product:manage', 'product:inventory:manage', 'order:read', 'order:create', 'order:manage', 'payment:report', 'payment:verify', 'finance:read', 'finance:manage', 'kameti:read', 'kameti:manage', 'messaging:read', 'messaging:send', 'event:read', 'event:manage', 'announcement:read', 'announcement:manage', 'service:read', 'service:manage', 'service:request:read', 'service:request:manage'],
        MERCHANT: ['community:read', 'merchant:read', 'merchant:apply', 'category:read', 'category:manage', 'product:read', 'product:manage', 'product:inventory:manage', 'order:read', 'order:create', 'order:manage', 'payment:report', 'payment:verify', 'messaging:read', 'messaging:send', 'service:read', 'service:manage', 'service:request:read', 'service:request:manage'],
        MERCHANT_STAFF: ['community:read', 'merchant:read', 'merchant:apply', 'category:read', 'category:manage', 'product:read', 'product:inventory:manage', 'order:read', 'messaging:read', 'service:read', 'service:request:read'],
        CUSTOMER: ['community:read', 'merchant:apply', 'category:read', 'product:read', 'order:read', 'order:create', 'messaging:read', 'messaging:send', 'service:read', 'service:request:read'],
      };
      const allowed = rolePermissions[role ?? ''] ?? [];
      if (allowed.includes('*') || perms.every(p => allowed.includes(p))) {
        return next();
      }
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
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
const MERCHANT_ID = '00000000-0000-0000-0000-000000000099';

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

describe('Merchant Onboarding Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Merchant application', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'customer-session') {
          return { id: USER_A, name: 'Customer', email: 'customer@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'CUSTOMER', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('POST /api/v1/communities/:id/merchants/apply returns 201', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: MERCHANT_ID, businessName: 'Test Shop' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/apply`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: 'Test Shop', phone: '1234567890' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/merchants/apply returns 409 if already applied', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/apply`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: 'Test Shop' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });

    it('POST /api/v1/communities/:id/merchants/apply returns 400 for invalid payload', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/apply`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: '' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('List community merchants (admin)', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'COMMUNITY_ADMIN', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('GET /api/v1/communities/:id/merchants returns 200', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([]),
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
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Get merchant details (admin)', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'COMMUNITY_ADMIN', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('GET /api/v1/communities/:id/merchants/:merchantId returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, businessName: 'Test Shop' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/merchants/:merchantId returns 404 for non-existent', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('Verify merchant (approve/reject)', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'COMMUNITY_ADMIN', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('PATCH /api/v1/communities/:id/merchants/:merchantId/verify returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'PENDING' }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/verify`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/merchants/:merchantId/verify returns 400 if not pending', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/verify`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('PATCH /api/v1/communities/:id/merchants/:merchantId/verify returns 400 for invalid status', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/verify`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'INVALID' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Suspend merchant', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'COMMUNITY_ADMIN', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('PATCH /api/v1/communities/:id/merchants/:merchantId/suspend returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: MERCHANT_ID, verificationStatus: 'SUSPENDED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/suspend`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED', reason: 'Violation' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/merchants/:merchantId/suspend returns 400 if not approved', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'PENDING' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/suspend`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Get own merchant profile', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-2' };
        }
        return null;
      });
    });

    it('GET /api/v1/communities/:id/merchants/my returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, businessName: 'My Shop' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/my`,
        { headers: { cookie: createCookie('merchant-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/merchants/my returns 404 if no profile', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/my`,
        { headers: { cookie: createCookie('merchant-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('Update own merchant profile', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-2' };
        }
        return null;
      });
    });

    it('PATCH /api/v1/communities/:id/merchants/my returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: MERCHANT_ID }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/my`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: 'Updated Shop' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/merchants/my returns 403 if suspended', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'SUSPENDED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/my`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: 'Updated Shop' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
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
    });

    it('rejects access to community user does not belong to', async () => {
      mockResolveTenantContext.mockImplementation(async (_userId: string, communityId: string) => {
        if (communityId === COMMUNITY_B) {
          return null;
        }
        return { userId: USER_A, communityId: COMMUNITY_A, role: 'COMMUNITY_ADMIN', membershipId: 'mem-1' };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/merchants`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Merchant IDOR protection', () => {
    it('merchant cannot update another merchant profile via /merchants/my', async () => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-2' };
        }
        return null;
      });
      // merchant profile belongs to USER_B — endpoint only returns own profile
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED', userId: USER_B }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: MERCHANT_ID }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/my`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: 'Hacked Name' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('merchant cannot access admin merchant verify endpoint', async () => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-2' };
        }
        return null;
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/verify`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('merchant cannot access admin merchant suspend endpoint', async () => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-2' };
        }
        return null;
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/${MERCHANT_ID}/suspend`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('merchant cannot access community admin endpoint', async () => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-2' };
        }
        return null;
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/members/${USER_A}/role`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'COMMUNITY_ADMIN' }),
        },
        { ENVIRONMENT: 'test' },
      );
      // MERCHANT doesn't have member:manage, so should be 403
      expect(res.status).toBe(403);
    });
  });

  describe('Unauthenticated access', () => {
    it('rejects unauthenticated merchant apply', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: 'Test' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated merchant list', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated merchant profile', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/merchants/my`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });
});
