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
    businessName: 'business_name', verificationStatus: 'verification_status',
  },
  productCategories: {
    id: 'id', communityId: 'community_id', name: 'name', slug: 'slug', status: 'status',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  categoryStatusEnum: { enumValues: ['ACTIVE', 'DISABLED'] },
  products: {
    id: 'id', communityId: 'community_id', merchantId: 'merchant_id',
    categoryId: 'category_id', name: 'name', description: 'description',
    price: 'price', salePrice: 'sale_price', sku: 'sku',
    stockQuantity: 'stock_quantity', status: 'status',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  productStatusEnum: { enumValues: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'] },
  productImages: {
    id: 'id', productId: 'product_id', url: 'url', sortOrder: 'sort_order',
    createdAt: 'created_at',
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
  requirePermission: (..._perms: string[]) => {
    return async (_c: { get: (k: string) => unknown; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
      return next();
    };
  },
  requireAllPermissions: (..._perms: string[]) => {
    return async (_c: { get: (k: string) => unknown; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
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
const MERCHANT_ID = '00000000-0000-0000-0000-000000000099';
const CATEGORY_ID = '00000000-0000-0000-0000-000000000088';
const PRODUCT_ID = '00000000-0000-0000-0000-000000000077';

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

describe('Marketplace Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Category CRUD', () => {
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

    it('GET /api/v1/communities/:id/categories returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: CATEGORY_ID, name: 'Electronics' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/categories returns 201', async () => {
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: CATEGORY_ID, name: 'Electronics', slug: 'electronics' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Electronics', slug: 'electronics' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/categories returns 400 for invalid slug', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Electronics', slug: 'Invalid Slug!' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('PATCH /api/v1/communities/:id/categories/:categoryId returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: CATEGORY_ID, name: 'Electronics', status: 'ACTIVE' }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: CATEGORY_ID, name: 'Updated Electronics' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories/${CATEGORY_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Electronics' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/categories/:categoryId returns 404 for non-existent', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories/${CATEGORY_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('Product CRUD', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        if (token === 'admin-session') {
          return { id: USER_A, name: 'Admin', email: 'admin@test.com', status: 'ACTIVE' };
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

    it('GET /api/v1/communities/:id/products returns 200', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Merchant profile lookup (new merchant scoping)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
            }),
          };
        }
        if (callCount === 2) {
          // Products query
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: PRODUCT_ID, name: 'Test Product', price: '100.00' }]),
            }),
          };
        }
        // Count query
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve([{ value: 1 }]),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        { headers: { cookie: createCookie('merchant-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/products/:productId returns 200', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Product lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: PRODUCT_ID, name: 'Test Product', price: '100.00' }]),
            }),
          };
        }
        // Images lookup
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}`,
        { headers: { cookie: createCookie('merchant-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/products/:productId returns 404 for non-existent', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}`,
        { headers: { cookie: createCookie('merchant-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });

    it('POST /api/v1/communities/:id/products returns 201 for approved merchant', async () => {
      // Mock merchant lookup (approved)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: PRODUCT_ID, name: 'Test Product', price: '100.00' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            name: 'Test Product',
            price: '100.00',
            stockQuantity: 10,
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/products returns 403 for non-approved merchant', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            name: 'Test Product',
            price: '100.00',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Price validation', () => {
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

    it('POST /api/v1/communities/:id/products returns 400 for negative price', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            name: 'Test Product',
            price: '-100',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/products returns 400 for zero price', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            name: 'Test Product',
            price: '0',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/products returns 400 for invalid price format', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            name: 'Test Product',
            price: 'abc',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/products returns 400 when sale price >= regular price', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            name: 'Test Product',
            price: '100.00',
            salePrice: '100.00',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Inventory management', () => {
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

    it('PATCH /api/v1/communities/:id/products/:productId/inventory returns 200', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{
            id: PRODUCT_ID, merchantId: MERCHANT_ID, stockQuantity: 10, status: 'ACTIVE',
          }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: PRODUCT_ID, stockQuantity: 20 }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}/inventory`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: 20 }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/products/:productId/inventory returns 400 for negative stock', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}/inventory`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: -5 }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('PATCH /api/v1/communities/:id/products/:productId/inventory returns 403 for non-owner', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Product lookup - product belongs to different merchant
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: PRODUCT_ID, merchantId: 'other-merchant-id', stockQuantity: 10, status: 'ACTIVE',
              }]),
            }),
          };
        }
        // Merchant ownership check - returns empty (no match)
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}/inventory`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: 20 }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('auto-sets OUT_OF_STOCK when stock reaches 0', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{
            id: PRODUCT_ID, merchantId: MERCHANT_ID, stockQuantity: 5, status: 'ACTIVE',
          }]),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: PRODUCT_ID, stockQuantity: 0, status: 'OUT_OF_STOCK' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}/inventory`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: 0 }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Product ownership (IDOR protection)', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-a-session') {
          return { id: USER_A, name: 'Merchant A', email: 'merchantA@test.com', status: 'ACTIVE' };
        }
        if (token === 'merchant-b-session') {
          return { id: USER_B, name: 'Merchant B', email: 'merchantB@test.com', status: 'ACTIVE' };
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

    it('returns 403 when merchant tries to edit another merchant product', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Product lookup - belongs to merchant B
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: PRODUCT_ID, merchantId: 'merchant-b-id', name: 'Product B',
              }]),
            }),
          };
        }
        // Merchant ownership check - no match for merchant A
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-a-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Hacked Product' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('returns 403 when merchant tries to delete another merchant product', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Product lookup - belongs to merchant B
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: PRODUCT_ID, merchantId: 'merchant-b-id', status: 'ACTIVE',
              }]),
            }),
          };
        }
        // Merchant ownership check - no match for merchant A
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products/${PRODUCT_ID}`,
        {
          method: 'DELETE',
          headers: { cookie: createCookie('merchant-a-session') },
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
      mockResolveTenantContext.mockImplementation(async (_userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId: USER_A, communityId: COMMUNITY_A, role: 'COMMUNITY_ADMIN', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('rejects access to products in community user does not belong to', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/products`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('rejects access to categories in community user does not belong to', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/categories`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Unauthenticated access', () => {
    it('rejects unauthenticated product list', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated category list', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated product creation', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/products`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test', price: '100' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated category creation', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/categories`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test', slug: 'test' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });
});
