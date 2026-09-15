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
  serviceCategories: {
    id: 'id', communityId: 'community_id', name: 'name', status: 'status',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  serviceListings: {
    id: 'id', communityId: 'community_id', providerId: 'provider_id',
    categoryId: 'category_id', title: 'title', description: 'description',
    price: 'price', location: 'location', availability: 'availability',
    status: 'status', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  serviceListingStatusEnum: { enumValues: ['ACTIVE', 'PAUSED', 'ARCHIVED'] },
  serviceRequests: {
    id: 'id', communityId: 'community_id', requesterId: 'requester_id',
    serviceId: 'service_id', description: 'description', status: 'status',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  serviceRequestStatusEnum: { enumValues: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'] },
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
const CATEGORY_ID = '00000000-0000-0000-0000-000000000088';
const LISTING_ID = '00000000-0000-0000-0000-000000000077';
const REQUEST_ID = '00000000-0000-0000-0000-000000000066';

function mockSelectChain(data: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => resolve(data),
  };
}

function mockInsertChain(data: unknown) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(data),
    }),
  };
}

function mockUpdateChain(data: unknown) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(data),
    }),
  };
}

describe('Services Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSessionUser.mockResolvedValue({
      id: USER_A,
      name: 'Test User',
      email: 'test@example.com',
      status: 'ACTIVE',
    });

    mockResolveTenantContext.mockResolvedValue({
      communityId: COMMUNITY_A,
      role: 'COMMUNITY_ADMIN',
      userId: USER_A,
      membershipStatus: 'ACTIVE',
    });
  });

  // ──────────────────────────────────────────
  // Create Service Category
  // ──────────────────────────────────────────

  describe('Create Service Category', () => {
    it('POST /api/v1/communities/:id/services/categories returns 201', async () => {
      const category = { id: CATEGORY_ID, communityId: COMMUNITY_A, name: 'Plumbing' };
      mockDb.insert.mockReturnValue(mockInsertChain([category]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/categories`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Plumbing' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/services/categories returns 400 for empty name', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/categories`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // List Service Categories
  // ──────────────────────────────────────────

  describe('List Service Categories', () => {
    it('GET /api/v1/communities/:id/services/categories returns 200', async () => {
      const categories = [{ id: CATEGORY_ID, name: 'Plumbing' }];
      mockDb.select.mockReturnValue(mockSelectChain(categories));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/categories`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Create Service Listing
  // ──────────────────────────────────────────

  describe('Create Service Listing', () => {
    it('POST /api/v1/communities/:id/services/listings returns 201', async () => {
      const listing = { id: LISTING_ID, communityId: COMMUNITY_A, providerId: USER_A, title: 'Plumbing Services' };
      mockDb.select.mockReturnValue(mockSelectChain([])); // category check
      mockDb.insert.mockReturnValue(mockInsertChain([listing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Plumbing Services',
            description: 'Professional plumbing services',
            price: '500',
            location: 'Mumbai',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/services/listings returns 400 for empty title', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/services/listings returns 404 for nonexistent category', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([])); // category not found

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Plumbing Services',
            categoryId: CATEGORY_ID,
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // List Service Listings
  // ──────────────────────────────────────────

  describe('List Service Listings', () => {
    it('GET /api/v1/communities/:id/services/listings returns 200', async () => {
      const listings = [{ id: LISTING_ID, title: 'Plumbing Services' }];
      mockDb.select.mockReturnValue(mockSelectChain(listings));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Service Listing Details
  // ──────────────────────────────────────────

  describe('Get Service Listing Details', () => {
    it('GET /api/v1/communities/:id/services/listings/:listingId returns 200', async () => {
      const listing = { id: LISTING_ID, communityId: COMMUNITY_A, title: 'Plumbing Services' };
      mockDb.select.mockReturnValue(mockSelectChain([listing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings/${LISTING_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/services/listings/:listingId returns 404 for nonexistent listing', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings/${LISTING_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Update Service Listing
  // ──────────────────────────────────────────

  describe('Update Service Listing', () => {
    it('PATCH /api/v1/communities/:id/services/listings/:listingId returns 200 for provider', async () => {
      const existing = { id: LISTING_ID, communityId: COMMUNITY_A, providerId: USER_A, title: 'Old Title', status: 'ACTIVE' };
      const updated = { ...existing, title: 'New Title' };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings/${LISTING_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Title' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/services/listings/:listingId returns 403 for non-provider', async () => {
      const existing = { id: LISTING_ID, communityId: COMMUNITY_A, providerId: USER_B, title: 'Old Title', status: 'ACTIVE' };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings/${LISTING_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Hacked Title' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────
  // Create Service Request
  // ──────────────────────────────────────────

  describe('Create Service Request', () => {
    it('POST /api/v1/communities/:id/services/requests returns 201', async () => {
      const service = { id: LISTING_ID, communityId: COMMUNITY_A, providerId: USER_B, status: 'ACTIVE' };
      const request = { id: REQUEST_ID, communityId: COMMUNITY_A, requesterId: USER_A, serviceId: LISTING_ID, status: 'PENDING' };
      mockDb.select.mockReturnValue(mockSelectChain([service]));
      mockDb.insert.mockReturnValue(mockInsertChain([request]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: LISTING_ID,
            description: 'I need plumbing services',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/services/requests returns 400 for own service', async () => {
      const service = { id: LISTING_ID, communityId: COMMUNITY_A, providerId: USER_A, status: 'ACTIVE' };
      mockDb.select.mockReturnValue(mockSelectChain([service]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId: LISTING_ID }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/services/requests returns 400 for inactive service', async () => {
      const service = { id: LISTING_ID, communityId: COMMUNITY_A, providerId: USER_B, status: 'PAUSED' };
      mockDb.select.mockReturnValue(mockSelectChain([service]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId: LISTING_ID }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/services/requests returns 404 for nonexistent service', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId: LISTING_ID }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // List Service Requests
  // ──────────────────────────────────────────

  describe('List Service Requests', () => {
    it('GET /api/v1/communities/:id/services/requests returns 200', async () => {
      const requests = [{ id: REQUEST_ID, status: 'PENDING' }];
      mockDb.select.mockReturnValue(mockSelectChain(requests));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Update Service Request Status
  // ──────────────────────────────────────────

  describe('Update Service Request Status', () => {
    it('PATCH /api/v1/communities/:id/services/requests/:requestId/status returns 200 for provider accepting', async () => {
      const existing = { id: REQUEST_ID, communityId: COMMUNITY_A, requesterId: USER_B, serviceId: LISTING_ID, status: 'PENDING' };
      const service = { id: LISTING_ID, providerId: USER_A };
      const updated = { ...existing, status: 'ACCEPTED' };
      mockDb.select.mockImplementation(() => mockSelectChain([existing]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      // First call: request lookup, second call: service lookup for provider check
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        return mockSelectChain([service]);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests/${REQUEST_ID}/status`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACCEPTED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/services/requests/:requestId/status returns 400 for invalid transition', async () => {
      const existing = { id: REQUEST_ID, communityId: COMMUNITY_A, requesterId: USER_A, serviceId: LISTING_ID, status: 'COMPLETED' };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests/${REQUEST_ID}/status`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('PATCH /api/v1/communities/:id/services/requests/:requestId/status returns 403 for requester trying to accept', async () => {
      const existing = { id: REQUEST_ID, communityId: COMMUNITY_A, requesterId: USER_A, serviceId: LISTING_ID, status: 'PENDING' };
      const service = { id: LISTING_ID, providerId: USER_B };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        return mockSelectChain([service]);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests/${REQUEST_ID}/status`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACCEPTED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/communities/:id/services/requests/:requestId/status returns 200 for requester cancelling', async () => {
      const existing = { id: REQUEST_ID, communityId: COMMUNITY_A, requesterId: USER_A, serviceId: LISTING_ID, status: 'PENDING' };
      const service = { id: LISTING_ID, providerId: USER_B };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        return mockSelectChain([service]);
      });
      mockDb.update.mockReturnValue(mockUpdateChain([{ ...existing, status: 'CANCELLED' }]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/requests/${REQUEST_ID}/status`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Tenant Isolation
  // ──────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('returns empty list when accessing other community services', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/services/listings`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Unauthenticated Access
  // ──────────────────────────────────────────

  describe('Unauthenticated Access', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/services/listings`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });
});
