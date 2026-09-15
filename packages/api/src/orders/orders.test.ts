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
  orders: {
    id: 'id', communityId: 'community_id', orderNumber: 'order_number',
    customerId: 'customer_id', merchantId: 'merchant_id',
    subtotal: 'subtotal', deliveryFee: 'delivery_fee', total: 'total',
    paymentMethod: 'payment_method', paymentStatus: 'payment_status',
    orderStatus: 'order_status', shippingAddress: 'shipping_address',
    notes: 'notes', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  orderStatusEnum: { enumValues: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'] },
  paymentStatusEnum: { enumValues: ['UNPAID', 'PAYMENT_REPORTED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'REFUNDED', 'NOT_REQUIRED'] },
  paymentMethodEnum: { enumValues: ['COD', 'DIRECT_UPI'] },
  orderItems: {
    id: 'id', orderId: 'order_id', productId: 'product_id',
    productNameSnapshot: 'product_name_snapshot', quantity: 'quantity',
    unitPrice: 'unit_price', total: 'total', createdAt: 'created_at',
  },
  paymentRecords: {
    id: 'id', communityId: 'community_id', orderId: 'order_id',
    paymentMethod: 'payment_method', amount: 'amount',
    referenceNumber: 'reference_number', proofUrl: 'proof_url',
    status: 'status', reportedBy: 'reported_by', verifiedBy: 'verified_by',
    verifiedAt: 'verified_at', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  paymentRecordStatusEnum: { enumValues: ['REPORTED', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED'] },
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
const PRODUCT_ID = '00000000-0000-0000-0000-000000000077';
const ORDER_ID = '00000000-0000-0000-0000-000000000066';
const PAYMENT_ID = '00000000-0000-0000-0000-000000000055';

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

describe('Orders Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Order', () => {
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

    it('POST /api/v1/communities/:id/orders returns 201', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Merchant lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID, verificationStatus: 'APPROVED' }]),
            }),
          };
        }
        if (callCount === 2) {
          // Product lookup (returns active product with stock)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) => resolve([{
              id: PRODUCT_ID, name: 'Test Product', price: '100.00', salePrice: null,
              stockQuantity: 10, status: 'ACTIVE',
            }]),
          };
        }
        if (callCount === 3) {
          // Community slug lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ slug: 'test-community' }]),
            }),
          };
        }
        if (callCount === 4) {
          // Order count for sequence
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) => resolve([{ value: 0 }]),
          };
        }
        // Default
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve([]),
        };
      });
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: ORDER_ID, orderNumber: 'ORD-TEST-C-00001', total: '100.00' }]));
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: PRODUCT_ID }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            items: [{ productId: PRODUCT_ID, quantity: 1 }],
            shippingAddress: {
              name: 'Test User',
              phone: '9876543210',
              addressLine1: '123 Test Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            },
            paymentMethod: 'COD',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/orders returns 400 for empty items', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            items: [],
            shippingAddress: {
              name: 'Test User',
              phone: '9876543210',
              addressLine1: '123 Test Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            },
            paymentMethod: 'COD',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/orders returns 400 for invalid payment method', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            items: [{ productId: PRODUCT_ID, quantity: 1 }],
            shippingAddress: {
              name: 'Test User',
              phone: '9876543210',
              addressLine1: '123 Test Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            },
            paymentMethod: 'BITCOIN',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/orders returns 404 for non-existent merchant', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: MERCHANT_ID,
            items: [{ productId: PRODUCT_ID, quantity: 1 }],
            shippingAddress: {
              name: 'Test User',
              phone: '9876543210',
              addressLine1: '123 Test Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            },
            paymentMethod: 'COD',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('List Orders', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'customer-session') {
          return { id: USER_A, name: 'Customer', email: 'customer@test.com', status: 'ACTIVE' };
        }
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          const role = userId === USER_B ? 'MERCHANT' : 'CUSTOMER';
          return { userId, communityId: COMMUNITY_A, role, membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('GET /api/v1/communities/:id/orders returns 200 for customer', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: ORDER_ID, orderNumber: 'ORD-001', total: '100.00' }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve([{ value: 1 }]),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        { headers: { cookie: createCookie('customer-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/orders returns 200 for merchant', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Merchant profile lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
            }),
          };
        }
        if (callCount === 2) {
          // Orders list
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: ORDER_ID, orderNumber: 'ORD-001', total: '100.00' }]),
            }),
          };
        }
        // Count
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve([{ value: 1 }]),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        { headers: { cookie: createCookie('merchant-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Get Order Detail', () => {
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

    it('GET /api/v1/communities/:id/orders/:orderId returns 200', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, customerId: USER_A, merchantId: MERCHANT_ID,
                orderNumber: 'ORD-001', total: '100.00', orderStatus: 'PENDING',
              }]),
            }),
          };
        }
        if (callCount === 2) {
          // Order items
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([]),
            }),
          };
        }
        // Payment records
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}`,
        { headers: { cookie: createCookie('customer-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/orders/:orderId returns 404 for non-existent', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}`,
        { headers: { cookie: createCookie('customer-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });

    it('GET /api/v1/communities/:id/orders/:orderId returns 403 for other customer order', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{
            id: ORDER_ID, customerId: USER_B, merchantId: MERCHANT_ID,
            orderNumber: 'ORD-001', total: '100.00',
          }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}`,
        { headers: { cookie: createCookie('customer-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Order State Machine', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        if (token === 'customer-session') {
          return { id: USER_A, name: 'Customer', email: 'customer@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          const role = userId === USER_B ? 'MERCHANT' : 'CUSTOMER';
          return { userId, communityId: COMMUNITY_A, role, membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('PATCH /api/v1/communities/:id/orders/:orderId/status returns 200 for valid transition', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, merchantId: MERCHANT_ID, orderStatus: 'CONFIRMED',
              }]),
            }),
          };
        }
        // Merchant profile lookup
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
          }),
        };
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: ORDER_ID, orderStatus: 'PROCESSING' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/status`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PROCESSING' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/orders/:orderId/status returns 400 for invalid transition', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, merchantId: MERCHANT_ID, orderStatus: 'DELIVERED',
              }]),
            }),
          };
        }
        // Merchant profile lookup
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/status`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CONFIRMED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/cancel returns 200 for PENDING order', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, customerId: USER_A, orderStatus: 'PENDING',
              }]),
            }),
          };
        }
        if (callCount === 2) {
          // Order items for stock restore (no orderBy in cancel route)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                productId: PRODUCT_ID, quantity: 2,
              }]),
            }),
          };
        }
        // Product lookup for stock restore
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([{
              id: PRODUCT_ID, stockQuantity: 5, status: 'ACTIVE',
            }]),
          }),
        };
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: ORDER_ID }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/cancel`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/cancel returns 400 for CONFIRMED order', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{
            id: ORDER_ID, customerId: USER_A, orderStatus: 'CONFIRMED',
          }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/cancel`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/cancel returns 403 for other customer order', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{
            id: ORDER_ID, customerId: USER_B, orderStatus: 'PENDING',
          }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/cancel`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Payment Reporting', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'customer-session') {
          return { id: USER_A, name: 'Customer', email: 'customer@test.com', status: 'ACTIVE' };
        }
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          const role = userId === USER_B ? 'MERCHANT' : 'CUSTOMER';
          return { userId, communityId: COMMUNITY_A, role, membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('POST /api/v1/communities/:id/orders/:orderId/payment/report returns 201', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, customerId: USER_A, total: '100.00', paymentMethod: 'DIRECT_UPI',
              }]),
            }),
          };
        }
        // Duplicate reference check
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });
      mockDb.insert.mockReturnValue(mockInsertChain([{ id: PAYMENT_ID, referenceNumber: 'UPI-REF-123' }]));
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: ORDER_ID }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/report`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceNumber: 'UPI-REF-123',
            amount: '100.00',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/payment/report returns 409 for duplicate reference', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([{
            id: ORDER_ID, customerId: USER_A, total: '100.00',
          }]),
        }),
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/report`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceNumber: 'UPI-REF-123',
            amount: '100.00',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      // Returns 409 if duplicate reference found
      expect([201, 409]).toContain(res.status);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/payment/report returns 400 for amount mismatch', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, customerId: USER_A, total: '100.00',
              }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/report`,
        {
          method: 'POST',
          headers: { cookie: createCookie('customer-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceNumber: 'UPI-REF-456',
            amount: '50.00',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Payment Verification', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'merchant-session') {
          return { id: USER_B, name: 'Merchant', email: 'merchant@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId, communityId: COMMUNITY_A, role: 'MERCHANT', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('POST /api/v1/communities/:id/orders/:orderId/payment/verify returns 200', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, merchantId: MERCHANT_ID,
              }]),
            }),
          };
        }
        if (callCount === 2) {
          // Merchant profile
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
            }),
          };
        }
        // Payment record lookup
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([{
              id: PAYMENT_ID, status: 'REPORTED',
            }]),
          }),
        };
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: PAYMENT_ID, status: 'VERIFIED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/verify`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/payment/verify returns 403 for non-owner merchant', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Order lookup - belongs to different merchant
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, merchantId: 'other-merchant-id',
              }]),
            }),
          };
        }
        // Merchant profile
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
          }),
        };
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/verify`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/communities/:id/orders/:orderId/payment/reject returns 200', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{
                id: ORDER_ID, merchantId: MERCHANT_ID,
              }]),
            }),
          };
        }
        if (callCount === 2) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve([{ id: MERCHANT_ID }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve([{
              id: PAYMENT_ID, status: 'REPORTED',
            }]),
          }),
        };
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ id: PAYMENT_ID, status: 'REJECTED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/reject`,
        {
          method: 'POST',
          headers: { cookie: createCookie('merchant-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Invalid payment reference' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Tenant Isolation', () => {
    beforeEach(() => {
      mockGetSessionUser.mockImplementation(async (token: string) => {
        if (token === 'customer-session') {
          return { id: USER_A, name: 'Customer', email: 'customer@test.com', status: 'ACTIVE' };
        }
        return null;
      });
      mockResolveTenantContext.mockImplementation(async (_userId: string, communityId: string) => {
        if (communityId === COMMUNITY_A) {
          return { userId: USER_A, communityId: COMMUNITY_A, role: 'CUSTOMER', membershipId: 'mem-1' };
        }
        return null;
      });
    });

    it('rejects access to orders in community user does not belong to', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/orders`,
        { headers: { cookie: createCookie('customer-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Unauthenticated Access', () => {
    it('rejects unauthenticated order list', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated order creation', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId: MERCHANT_ID, items: [] }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated payment report', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/orders/${ORDER_ID}/payment/report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referenceNumber: 'REF-123', amount: '100' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });
});
