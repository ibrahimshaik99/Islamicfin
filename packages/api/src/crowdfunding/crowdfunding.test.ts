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
  crowdfundingProjects: {
    id: 'id', communityId: 'community_id', creatorId: 'creator_id',
    title: 'title', description: 'description', goalAmount: 'goal_amount',
    raisedAmount: 'raised_amount', projectType: 'project_type', status: 'status',
    startDate: 'start_date', endDate: 'end_date',
    contractType: 'contract_type', riskDisclosure: 'risk_disclosure',
    expectedReturns: 'expected_returns', investmentThesis: 'investment_thesis',
    shariahReviewStatus: 'shariah_review_status', legalStatus: 'legal_status',
    legalGatePassed: 'legal_gate_passed',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  projectTypeEnum: { enumValues: ['DONATION', 'INVESTMENT'] },
  crowdfundingProjectStatusEnum: { enumValues: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED'] },
  crowdfundingContributions: {
    id: 'id', projectId: 'project_id', contributorId: 'contributor_id',
    amount: 'amount', contributionType: 'contribution_type',
    paymentMethod: 'payment_method', referenceNumber: 'reference_number',
    proofUrl: 'proof_url', status: 'status',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  contributionTypeEnum: { enumValues: ['DONATION', 'INVESTMENT'] },
  crowdfundingContributionStatusEnum: { enumValues: ['PENDING', 'REPORTED', 'VERIFIED', 'REJECTED'] },
  investmentInterests: {
    id: 'id', projectId: 'project_id', userId: 'user_id',
    amount: 'amount', status: 'status', notes: 'notes',
    contactEmail: 'contact_email', contactPhone: 'contact_phone',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  investmentInterestStatusEnum: { enumValues: ['INTERESTED', 'CONTACTED', 'FOLLOWED_UP', 'WITHDRAWN', 'NOT_INTERESTED'] },
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
const PROJECT_ID = '00000000-0000-0000-0000-000000000088';
const INVESTMENT_PROJECT_ID = '00000000-0000-0000-0000-000000000099';
const CONTRIBUTION_ID = '00000000-0000-0000-0000-000000000077';
const INTEREST_ID = '00000000-0000-0000-0000-000000000080';

function mockSelectChain(data: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
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

describe('Sadaqah/Donation Crowdfunding Integration Tests', () => {
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
  // Create Donation Project
  // ──────────────────────────────────────────

  describe('Create Donation Project', () => {
    it('POST /api/v1/communities/:id/crowdfunding/projects returns 201', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, title: 'Masjid Fund', goalAmount: '100000', projectType: 'DONATION' };
      mockDb.insert.mockReturnValue(mockInsertChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Masjid Fund',
            description: 'Help build our masjid',
            goalAmount: '100000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/crowdfunding/projects returns 400 for empty title', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '', goalAmount: '100000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/projects returns 400 for zero goal', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', goalAmount: '0' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // List Donation Projects
  // ──────────────────────────────────────────

  describe('List Donation Projects', () => {
    it('GET /api/v1/communities/:id/crowdfunding/projects returns 200', async () => {
      const projects = [{ id: PROJECT_ID, title: 'Masjid Fund', projectType: 'DONATION' }];
      mockDb.select.mockReturnValue(mockSelectChain(projects));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Project Details
  // ──────────────────────────────────────────

  describe('Get Project Details', () => {
    it('GET /api/v1/communities/:id/crowdfunding/projects/:projectId returns 200', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, title: 'Masjid Fund' };
      const contributions = [{ id: CONTRIBUTION_ID, amount: '5000' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([project]);
        return mockSelectChain(contributions);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/crowdfunding/projects/:projectId returns 404 for nonexistent project', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Record Donation Contribution
  // ──────────────────────────────────────────

  describe('Record Donation Contribution', () => {
    it('POST /api/v1/communities/:id/crowdfunding/projects/:projectId/contributions returns 201', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'DONATION', raisedAmount: '10000' };
      const contribution = { id: CONTRIBUTION_ID, projectId: PROJECT_ID, amount: '5000', contributionType: 'DONATION', status: 'REPORTED' };
      mockDb.select
        .mockReturnValueOnce(mockSelectChain([project]))       // project lookup
        .mockReturnValueOnce(mockSelectChain([]))               // no duplicate reference
        .mockReturnValue(mockSelectChain([]));                  // fallback
      mockDb.insert.mockReturnValue(mockInsertChain([contribution]));
      mockDb.update.mockReturnValue(mockUpdateChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: '5000',
            paymentMethod: 'UPI',
            referenceNumber: 'REF123',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/crowdfunding/projects/:projectId/contributions returns 400 for zero amount', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'DONATION' };
      mockDb.select.mockReturnValue(mockSelectChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '0' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/projects/:projectId/contributions returns 400 for inactive project', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'COMPLETED', projectType: 'DONATION' };
      mockDb.select.mockReturnValue(mockSelectChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/projects/:projectId/contributions returns 400 for investment project', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'INVESTMENT' };
      mockDb.select.mockReturnValue(mockSelectChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/projects/:projectId/contributions returns 409 for duplicate reference', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'DONATION', raisedAmount: '0' };
      const existingRef = { id: 'existing', referenceNumber: 'REF123' };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([project]);
        return mockSelectChain([existingRef]);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000', referenceNumber: 'REF123' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });
  });

  // ──────────────────────────────────────────
  // Verify Donation Contribution
  // ──────────────────────────────────────────

  describe('Verify Donation Contribution', () => {
    it('POST /api/v1/communities/:id/crowdfunding/contributions/:contributionId/verify returns 200', async () => {
      const contribution = {
        contribution: { id: CONTRIBUTION_ID, status: 'REPORTED' },
        project: { id: PROJECT_ID, projectType: 'DONATION' },
      };
      const updated = { ...contribution.contribution, status: 'VERIFIED' };
      mockDb.select.mockReturnValue(mockSelectChain([contribution]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/contributions/${CONTRIBUTION_ID}/verify`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/crowdfunding/contributions/:contributionId/verify returns 400 for non-REPORTED status', async () => {
      const contribution = {
        contribution: { id: CONTRIBUTION_ID, status: 'VERIFIED' },
        project: { id: PROJECT_ID, projectType: 'DONATION' },
      };
      mockDb.select.mockReturnValue(mockSelectChain([contribution]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/contributions/${CONTRIBUTION_ID}/verify`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/contributions/:contributionId/verify returns 400 for investment project', async () => {
      const contribution = {
        contribution: { id: CONTRIBUTION_ID, status: 'REPORTED' },
        project: { id: PROJECT_ID, projectType: 'INVESTMENT' },
      };
      mockDb.select.mockReturnValue(mockSelectChain([contribution]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/contributions/${CONTRIBUTION_ID}/verify`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Get Contribution Details
  // ──────────────────────────────────────────

  describe('Get Contribution Details', () => {
    it('GET /api/v1/communities/:id/crowdfunding/contributions/:contributionId returns 200', async () => {
      const contribution = {
        contribution: { id: CONTRIBUTION_ID, amount: '5000' },
        project: { id: PROJECT_ID },
      };
      mockDb.select.mockReturnValue(mockSelectChain([contribution]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/contributions/${CONTRIBUTION_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Project Report
  // ──────────────────────────────────────────

  describe('Get Project Report', () => {
    it('GET /api/v1/communities/:id/crowdfunding/projects/:projectId/report returns 200', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, title: 'Masjid Fund', goalAmount: '100000', raisedAmount: '50000' };
      const contributions = [
        { id: 'c1', amount: '30000', status: 'VERIFIED' },
        { id: 'c2', amount: '20000', status: 'REPORTED' },
      ];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([project]);
        return mockSelectChain(contributions);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/report`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Tenant Isolation
  // ──────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('returns empty list when accessing other community projects', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/crowdfunding/projects`,
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
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────
  // Create Investment Project
  // ──────────────────────────────────────────

  describe('Create Investment Project', () => {
    it('POST /api/v1/communities/:id/crowdfunding/investment-projects returns 201', async () => {
      const project = {
        id: INVESTMENT_PROJECT_ID,
        communityId: COMMUNITY_A,
        title: 'Mudarabah Fund',
        goalAmount: '500000',
        projectType: 'INVESTMENT',
        contractType: 'MUDARABAH',
        riskDisclosure: 'Investment risk: capital loss possible',
        expectedReturns: '10-15% annual',
        investmentThesis: 'Halal investment in sustainable energy',
      };
      mockDb.insert.mockReturnValue(mockInsertChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Mudarabah Fund',
            description: 'Halal investment fund',
            goalAmount: '500000',
            contractType: 'MUDARABAH',
            riskDisclosure: 'Investment risk: capital loss possible',
            expectedReturns: '10-15% annual',
            investmentThesis: 'Halal investment in sustainable energy',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/crowdfunding/investment-projects returns 400 for missing risk disclosure', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            goalAmount: '100000',
            contractType: 'MUDARABAH',
            riskDisclosure: '',
            expectedReturns: '10% annual',
            investmentThesis: 'Test thesis',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/investment-projects returns 400 for missing investment thesis', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            goalAmount: '100000',
            contractType: 'MUDARABAH',
            riskDisclosure: 'Risk disclosure',
            expectedReturns: '10% annual',
            investmentThesis: '',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // List Investment Projects
  // ──────────────────────────────────────────

  describe('List Investment Projects', () => {
    it('GET /api/v1/communities/:id/crowdfunding/investment-projects returns 200', async () => {
      const projects = [{ id: INVESTMENT_PROJECT_ID, title: 'Mudarabah Fund', projectType: 'INVESTMENT' }];
      mockDb.select.mockReturnValue(mockSelectChain(projects));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Investment Project Details
  // ──────────────────────────────────────────

  describe('Get Investment Project Details', () => {
    it('GET /api/v1/communities/:id/crowdfunding/investment-projects/:projectId returns 200', async () => {
      const project = {
        id: INVESTMENT_PROJECT_ID,
        communityId: COMMUNITY_A,
        title: 'Mudarabah Fund',
        projectType: 'INVESTMENT',
      };
      const interests = [{ id: INTEREST_ID, userId: USER_B, status: 'INTERESTED' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([project]);
        return mockSelectChain(interests);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${INVESTMENT_PROJECT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/crowdfunding/investment-projects/:projectId returns 404 for nonexistent project', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${INVESTMENT_PROJECT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Express Interest in Investment Project
  // ──────────────────────────────────────────

  describe('Express Interest in Investment Project', () => {
    it('POST /api/v1/communities/:id/crowdfunding/investment-projects/:projectId/interests returns 201', async () => {
      const project = { id: INVESTMENT_PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'INVESTMENT' };
      const interest = {
        id: INTEREST_ID,
        projectId: INVESTMENT_PROJECT_ID,
        userId: USER_A,
        amount: '50000',
        status: 'INTERESTED',
        contactEmail: 'test@example.com',
      };
      mockDb.select
        .mockReturnValueOnce(mockSelectChain([project]))       // project lookup
        .mockReturnValueOnce(mockSelectChain([]))               // no existing interest
        .mockReturnValue(mockSelectChain([]));                  // fallback
      mockDb.insert.mockReturnValue(mockInsertChain([interest]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${INVESTMENT_PROJECT_ID}/interests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: '50000',
            notes: 'Interested in this investment',
            contactEmail: 'test@example.com',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/crowdfunding/investment-projects/:projectId/interests returns 400 for donation project', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'DONATION' };
      mockDb.select.mockReturnValue(mockSelectChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${PROJECT_ID}/interests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '50000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/crowdfunding/investment-projects/:projectId/interests returns 409 for duplicate interest', async () => {
      const project = { id: INVESTMENT_PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'INVESTMENT' };
      const existingInterest = { id: INTEREST_ID, userId: USER_A, status: 'INTERESTED' };
      mockDb.select
        .mockReturnValueOnce(mockSelectChain([project]))
        .mockReturnValueOnce(mockSelectChain([existingInterest]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${INVESTMENT_PROJECT_ID}/interests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '50000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });
  });

  // ──────────────────────────────────────────
  // Get Investment Interests
  // ──────────────────────────────────────────

  describe('Get Investment Interests', () => {
    it('GET /api/v1/communities/:id/crowdfunding/investment-projects/:projectId/interests returns 200', async () => {
      const project = { id: INVESTMENT_PROJECT_ID, communityId: COMMUNITY_A };
      const interests = [{ id: INTEREST_ID, userId: USER_B, status: 'INTERESTED' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([project]);
        return mockSelectChain(interests);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${INVESTMENT_PROJECT_ID}/interests`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Donation/Investment Separation Tests
  // ──────────────────────────────────────────

  describe('Donation/Investment Separation', () => {
    it('rejects contribution to investment project', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'INVESTMENT' };
      mockDb.select.mockReturnValue(mockSelectChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/projects/${PROJECT_ID}/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('rejects investment interest on donation project', async () => {
      const project = { id: PROJECT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', projectType: 'DONATION' };
      mockDb.select.mockReturnValue(mockSelectChain([project]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/crowdfunding/investment-projects/${PROJECT_ID}/interests`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });
});
