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

describe('Zakat Calculator Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSessionUser.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test User',
      email: 'test@example.com',
      status: 'ACTIVE',
    });

    mockResolveTenantContext.mockResolvedValue({
      communityId: '00000000-0000-0000-0000-00000000000a',
      role: 'COMMUNITY_ADMIN',
      userId: '00000000-0000-0000-0000-000000000001',
      membershipStatus: 'ACTIVE',
    });
  });

  // ──────────────────────────────────────────
  // Get Methodology
  // ──────────────────────────────────────────

  describe('Get Methodology', () => {
    it('GET /api/v1/zakat/methodology returns 200', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/methodology',
        { headers: { cookie: createCookie('session-token') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { title: string; zakatRate: string } };
      expect(body.data).toBeDefined();
      expect(body.data.title).toBe('Zakat Calculation Methodology');
      expect(body.data.zakatRate).toBe('2.5% (1/40) of net Zakatable wealth above the Nisab threshold.');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Above Nisab
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Above Nisab', () => {
    it('POST /api/v1/zakat/calculate returns 200 with Zakat due', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '10000',
              bankBalances: '50000',
              goldValue: '30000',
              silverValue: '5000',
              businessInventory: '0',
              receivables: '0',
              investments: '20000',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '5000',
              pendingPayments: '2000',
              mahrObligation: '0',
            },
            currency: 'INR',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { totalAssets: string; totalLiabilities: string; netWealth: string; isAboveNisab: boolean; zakatAmount: string } } };
      expect(body.data.result).toBeDefined();
      expect(body.data.result.totalAssets).toBe('115000.00');
      expect(body.data.result.totalLiabilities).toBe('7000.00');
      expect(body.data.result.netWealth).toBe('108000.00');
      expect(body.data.result.isAboveNisab).toBe(true);
      expect(body.data.result.zakatAmount).toBe('2700.00');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Below Nisab
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Below Nisab', () => {
    it('POST /api/v1/zakat/calculate returns 200 with no Zakat due', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '5000',
              bankBalances: '10000',
              goldValue: '0',
              silverValue: '0',
              businessInventory: '0',
              receivables: '0',
              investments: '0',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '0',
              pendingPayments: '0',
              mahrObligation: '0',
            },
            currency: 'INR',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { totalAssets: string; netWealth: string; isAboveNisab: boolean; zakatAmount: string } } };
      expect(body.data.result.totalAssets).toBe('15000.00');
      expect(body.data.result.netWealth).toBe('15000.00');
      expect(body.data.result.isAboveNisab).toBe(false);
      expect(body.data.result.zakatAmount).toBe('0.00');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Zero Values
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Zero Values', () => {
    it('POST /api/v1/zakat/calculate returns 200 for zero values', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '0',
              bankBalances: '0',
              goldValue: '0',
              silverValue: '0',
              businessInventory: '0',
              receivables: '0',
              investments: '0',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '0',
              pendingPayments: '0',
              mahrObligation: '0',
            },
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { totalAssets: string; zakatAmount: string } } };
      expect(body.data.result.totalAssets).toBe('0.00');
      expect(body.data.result.zakatAmount).toBe('0.00');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Large Values
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Large Values', () => {
    it('POST /api/v1/zakat/calculate returns 200 for large values', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '1000000',
              bankBalances: '5000000',
              goldValue: '2000000',
              silverValue: '500000',
              businessInventory: '3000000',
              receivables: '1000000',
              investments: '4000000',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '2000000',
              pendingPayments: '500000',
              mahrObligation: '0',
            },
            currency: 'INR',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { totalAssets: string; totalLiabilities: string; netWealth: string; zakatAmount: string } } };
      expect(body.data.result.totalAssets).toBe('16500000.00');
      expect(body.data.result.totalLiabilities).toBe('2500000.00');
      expect(body.data.result.netWealth).toBe('14000000.00');
      expect(body.data.result.zakatAmount).toBe('350000.00');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Decimal Values
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Decimal Values', () => {
    it('POST /api/v1/zakat/calculate returns 200 for decimal values', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '1000.50',
              bankBalances: '5000.75',
              goldValue: '3000.25',
              silverValue: '500.00',
              businessInventory: '0',
              receivables: '0',
              investments: '2000.00',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '500.50',
              pendingPayments: '200.25',
              mahrObligation: '0',
            },
            currency: 'INR',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { totalAssets: string; totalLiabilities: string; netWealth: string } } };
      expect(body.data.result.totalAssets).toBe('11501.50');
      expect(body.data.result.totalLiabilities).toBe('700.75');
      expect(body.data.result.netWealth).toBe('10800.75');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Custom Nisab
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Custom Nisab', () => {
    it('POST /api/v1/zakat/calculate returns 200 with custom Nisab threshold', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '50000',
              bankBalances: '0',
              goldValue: '0',
              silverValue: '0',
              businessInventory: '0',
              receivables: '0',
              investments: '0',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '0',
              pendingPayments: '0',
              mahrObligation: '0',
            },
            nisabThreshold: '40000.00',
            currency: 'INR',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { netWealth: string; nisabThreshold: string; isAboveNisab: boolean; zakatAmount: string } } };
      expect(body.data.result.netWealth).toBe('50000.00');
      expect(body.data.result.nisabThreshold).toBe('40000.00');
      expect(body.data.result.isAboveNisab).toBe(true);
      expect(body.data.result.zakatAmount).toBe('1250.00');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Liabilities Exceed Assets
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Liabilities Exceed Assets', () => {
    it('POST /api/v1/zakat/calculate returns 200 with zero Zakat when liabilities exceed assets', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '10000',
              bankBalances: '0',
              goldValue: '0',
              silverValue: '0',
              businessInventory: '0',
              receivables: '0',
              investments: '0',
              agriculturalProduce: '0',
            },
            liabilities: {
              outstandingDebts: '15000',
              pendingPayments: '0',
              mahrObligation: '0',
            },
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { result: { netWealth: string; zakatAmount: string } } };
      expect(body.data.result.netWealth).toBe('0.00');
      expect(body.data.result.zakatAmount).toBe('0.00');
    });
  });

  // ──────────────────────────────────────────
  // Calculate Zakat - Invalid Input
  // ──────────────────────────────────────────

  describe('Calculate Zakat - Invalid Input', () => {
    it('POST /api/v1/zakat/calculate returns 400 for invalid input', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: 'invalid',
            },
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/zakat/calculate returns 400 for negative values', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        {
          method: 'POST',
          headers: { cookie: createCookie('session-token'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: {
              cashOnHand: '-1000',
            },
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Unauthenticated Access
  // ──────────────────────────────────────────

  describe('Unauthenticated Access', () => {
    it('returns 401 for unauthenticated request to calculate', async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await app.request(
        'http://localhost/api/v1/zakat/calculate',
        { method: 'POST' },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated request to methodology', async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await app.request(
        'http://localhost/api/v1/zakat/methodology',
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────
  // Methodology Content
  // ──────────────────────────────────────────

  describe('Methodology Content', () => {
    it('includes all required methodology fields', async () => {
      const res = await app.request(
        'http://localhost/api/v1/zakat/methodology',
        { headers: { cookie: createCookie('session-token') } },
        { ENVIRONMENT: 'test' },
      );
      const body = await res.json() as { data: { eligibleAssets: unknown[]; nonEligibleAssets: unknown[]; deductibleLiabilities: unknown[]; calculationSteps: unknown[]; references: unknown[]; scholarlyNotes: unknown[]; disclaimer: string } };
      expect(body.data.eligibleAssets).toBeDefined();
      expect(body.data.nonEligibleAssets).toBeDefined();
      expect(body.data.deductibleLiabilities).toBeDefined();
      expect(body.data.calculationSteps).toBeDefined();
      expect(body.data.references).toBeDefined();
      expect(body.data.scholarlyNotes).toBeDefined();
      expect(body.data.disclaimer).toBeDefined();
    });
  });
});
