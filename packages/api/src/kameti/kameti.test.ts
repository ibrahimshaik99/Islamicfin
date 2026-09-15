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
  kametiGroups: {
    id: 'id', communityId: 'community_id', name: 'name', description: 'description',
    contributionAmount: 'contribution_amount', frequency: 'frequency',
    totalMembers: 'total_members', startDate: 'start_date', endDate: 'end_date',
    status: 'status', createdBy: 'created_by', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  kametiGroupStatusEnum: { enumValues: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED'] },
  kametiFrequencyEnum: { enumValues: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] },
  kametiMembers: {
    id: 'id', kametiGroupId: 'kameti_group_id', userId: 'user_id',
    position: 'position', status: 'status', joinedAt: 'joined_at',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  kametiMemberStatusEnum: { enumValues: ['ACTIVE', 'LEFT', 'REMOVED', 'COMPLETED'] },
  kametiPeriods: {
    id: 'id', kametiGroupId: 'kameti_group_id', periodNumber: 'period_number',
    dueDate: 'due_date', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  kametiPeriodStatusEnum: { enumValues: ['PENDING', 'ACTIVE', 'COMPLETED', 'DEFAULTED'] },
  kametiContributions: {
    id: 'id', kametiGroupId: 'kameti_group_id', memberId: 'member_id',
    periodId: 'period_id', amount: 'amount', paymentMethod: 'payment_method',
    referenceNumber: 'reference_number', proofUrl: 'proof_url', status: 'status',
    verifiedBy: 'verified_by', verifiedAt: 'verified_at',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  kametiContributionStatusEnum: { enumValues: ['PENDING', 'PAID', 'VERIFIED', 'REJECTED', 'LATE'] },
  kametiPayouts: {
    id: 'id', kametiGroupId: 'kameti_group_id', memberId: 'member_id',
    periodId: 'period_id', amount: 'amount', status: 'status',
    paidAt: 'paid_at', referenceNumber: 'reference_number',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  kametiPayoutStatusEnum: { enumValues: ['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'] },
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
const GROUP_ID = '00000000-0000-0000-0000-000000000088';
const MEMBER_ID = '00000000-0000-0000-0000-000000000077';
const PERIOD_ID = '00000000-0000-0000-0000-000000000066';

function mockSelectChain(data: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(data),
    }),
    limit: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(data),
    }),
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

describe('Kameti Integration Tests', () => {
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
  // Create Kameti Group
  // ──────────────────────────────────────────

  describe('Create Kameti Group', () => {
    it('POST /api/v1/communities/:id/kameti/groups returns 201', async () => {
      const newGroup = {
        id: GROUP_ID,
        communityId: COMMUNITY_A,
        name: 'Test Kameti',
        contributionAmount: '1000',
        frequency: 'MONTHLY',
        totalMembers: 10,
        startDate: '2026-01-01',
        status: 'ACTIVE',
        createdBy: USER_A,
      };
      mockDb.insert.mockReturnValue(mockInsertChain([newGroup]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Kameti',
            contributionAmount: '1000',
            frequency: 'MONTHLY',
            totalMembers: 10,
            startDate: '2026-01-01',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/kameti/groups returns 400 for invalid input', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups`,
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
  // List Kameti Groups
  // ──────────────────────────────────────────

  describe('List Kameti Groups', () => {
    it('GET /api/v1/communities/:id/kameti/groups returns 200', async () => {
      const groups = [
        { id: GROUP_ID, communityId: COMMUNITY_A, name: 'Kameti 1' },
      ];
      mockDb.select.mockReturnValue(mockSelectChain(groups));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Kameti Group Details
  // ──────────────────────────────────────────

  describe('Get Kameti Group Details', () => {
    it('GET /api/v1/communities/:id/kameti/groups/:groupId returns 200', async () => {
      const group = { id: GROUP_ID, communityId: COMMUNITY_A, name: 'Test Kameti' };
      mockDb.select.mockReturnValue(mockSelectChain([group]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/kameti/groups/:groupId returns 404 for nonexistent group', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Update Kameti Group
  // ──────────────────────────────────────────

  describe('Update Kameti Group', () => {
    it('PATCH /api/v1/communities/:id/kameti/groups/:groupId returns 200', async () => {
      const existing = { id: GROUP_ID, communityId: COMMUNITY_A, name: 'Old Name', status: 'ACTIVE' };
      const updated = { ...existing, name: 'New Name' };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        return mockSelectChain([existing]);
      });
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Name' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Add Members
  // ──────────────────────────────────────────

  describe('Add Members', () => {
    it('POST /api/v1/communities/:id/kameti/groups/:groupId/members returns 201', async () => {
      const existing = { id: GROUP_ID, communityId: COMMUNITY_A, totalMembers: 10 };
      const memberCount = [{ memberCount: 2 }];
      const addedMembers = [{ id: MEMBER_ID, kametiGroupId: GROUP_ID, userId: USER_A, position: 3 }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        if (callCount === 2) return mockSelectChain(memberCount);
        if (callCount === 3) return mockSelectChain([]); // existing members
        return mockSelectChain([]);
      });
      mockDb.insert.mockReturnValue(mockInsertChain(addedMembers));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}/members`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [USER_A] }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/kameti/groups/:groupId/members returns 400 when exceeding limit', async () => {
      const existing = { id: GROUP_ID, communityId: COMMUNITY_A, totalMembers: 2 };
      const memberCount = [{ memberCount: 2 }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        return mockSelectChain(memberCount);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}/members`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [USER_A, '00000000-0000-0000-0000-000000000002'] }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Remove Member
  // ──────────────────────────────────────────

  describe('Remove Member', () => {
    it('DELETE /api/v1/communities/:id/kameti/groups/:groupId/members/:memberId returns 200', async () => {
      const existing = { id: GROUP_ID, communityId: COMMUNITY_A };
      const member = { id: MEMBER_ID, kametiGroupId: GROUP_ID, userId: USER_A };
      const contributionCount = [{ contributionCount: 0 }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        if (callCount === 2) return mockSelectChain([member]);
        return mockSelectChain(contributionCount);
      });
      mockDb.update.mockReturnValue(mockUpdateChain([member]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}/members/${MEMBER_ID}`,
        {
          method: 'DELETE',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/communities/:id/kameti/groups/:groupId/members/:memberId returns 400 when member has contributions', async () => {
      const existing = { id: GROUP_ID, communityId: COMMUNITY_A };
      const member = { id: MEMBER_ID, kametiGroupId: GROUP_ID, userId: USER_A };
      const contributionCount = [{ contributionCount: 3 }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        if (callCount === 2) return mockSelectChain([member]);
        return mockSelectChain(contributionCount);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}/members/${MEMBER_ID}`,
        {
          method: 'DELETE',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Get Periods
  // ──────────────────────────────────────────

  describe('Get Periods', () => {
    it('GET /api/v1/communities/:id/kameti/groups/:groupId/periods returns 200', async () => {
      const existing = { id: GROUP_ID, communityId: COMMUNITY_A };
      const periods = [{ id: PERIOD_ID, periodNumber: 1 }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([existing]);
        return mockSelectChain(periods);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}/periods`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Record Contribution
  // ──────────────────────────────────────────

  describe('Record Contribution', () => {
    it('POST /api/v1/communities/:id/kameti/contributions returns 201', async () => {
      const member = { member: { id: MEMBER_ID, kametiGroupId: GROUP_ID }, group: { id: GROUP_ID, communityId: COMMUNITY_A } };
      const period = { id: PERIOD_ID, kametiGroupId: GROUP_ID };
      const contribution = { id: '00000000-0000-0000-0000-000000000055', memberId: MEMBER_ID, periodId: PERIOD_ID, amount: '1000', status: 'PENDING' };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([member]);
        if (callCount === 2) return mockSelectChain([period]);
        if (callCount === 3) return mockSelectChain([]); // no duplicate
        return mockSelectChain([]); // no duplicate ref
      });
      mockDb.insert.mockReturnValue(mockInsertChain([contribution]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: MEMBER_ID,
            periodId: PERIOD_ID,
            amount: '1000',
            paymentMethod: 'UPI',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/kameti/contributions returns 409 for duplicate contribution', async () => {
      const member = { member: { id: MEMBER_ID, kametiGroupId: GROUP_ID }, group: { id: GROUP_ID, communityId: COMMUNITY_A } };
      const period = { id: PERIOD_ID, kametiGroupId: GROUP_ID };
      const existingContribution = { id: 'existing', memberId: MEMBER_ID, periodId: PERIOD_ID };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([member]);
        if (callCount === 2) return mockSelectChain([period]);
        return mockSelectChain([existingContribution]);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: MEMBER_ID,
            periodId: PERIOD_ID,
            amount: '1000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });

    it('POST /api/v1/communities/:id/kameti/contributions returns 400 for negative amount', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/contributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: MEMBER_ID,
            periodId: PERIOD_ID,
            amount: '-100',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Verify Contribution
  // ──────────────────────────────────────────

  describe('Verify Contribution', () => {
    it('POST /api/v1/communities/:id/kameti/contributions/:contributionId/verify returns 200', async () => {
      const contribution = {
        contribution: { id: '00000000-0000-0000-0000-000000000055', status: 'PAID' },
        group: { id: GROUP_ID, communityId: COMMUNITY_A },
      };
      const updated = { ...contribution.contribution, status: 'VERIFIED' };
      mockDb.select.mockReturnValue(mockSelectChain([contribution]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/contributions/00000000-0000-0000-0000-000000000055/verify`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/kameti/contributions/:contributionId/verify returns 400 for non-PAID contribution', async () => {
      const contribution = {
        contribution: { id: '00000000-0000-0000-0000-000000000055', status: 'PENDING' },
        group: { id: GROUP_ID, communityId: COMMUNITY_A },
      };
      mockDb.select.mockReturnValue(mockSelectChain([contribution]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/contributions/00000000-0000-0000-0000-000000000055/verify`,
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
  // Record Payout
  // ──────────────────────────────────────────

  describe('Record Payout', () => {
    it('POST /api/v1/communities/:id/kameti/payouts returns 201', async () => {
      const member = { member: { id: MEMBER_ID, kametiGroupId: GROUP_ID }, group: { id: GROUP_ID, communityId: COMMUNITY_A } };
      const period = { id: PERIOD_ID, kametiGroupId: GROUP_ID };
      const payout = { id: '00000000-0000-0000-0000-000000000044', memberId: MEMBER_ID, periodId: PERIOD_ID, amount: '9000', status: 'COMPLETED' };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([member]);
        if (callCount === 2) return mockSelectChain([period]);
        if (callCount === 3) return mockSelectChain([]); // no duplicate
        return mockSelectChain([]); // no duplicate ref
      });
      mockDb.insert.mockReturnValue(mockInsertChain([payout]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/payouts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: MEMBER_ID,
            periodId: PERIOD_ID,
            amount: '9000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/kameti/payouts returns 409 for duplicate payout', async () => {
      const member = { member: { id: MEMBER_ID, kametiGroupId: GROUP_ID }, group: { id: GROUP_ID, communityId: COMMUNITY_A } };
      const period = { id: PERIOD_ID, kametiGroupId: GROUP_ID };
      const existingPayout = { id: 'existing', memberId: MEMBER_ID, periodId: PERIOD_ID };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([member]);
        if (callCount === 2) return mockSelectChain([period]);
        return mockSelectChain([existingPayout]);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/payouts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: MEMBER_ID,
            periodId: PERIOD_ID,
            amount: '9000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });

    it('POST /api/v1/communities/:id/kameti/payouts returns 400 for negative amount', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/payouts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: MEMBER_ID,
            periodId: PERIOD_ID,
            amount: '-500',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Get Payout Details
  // ──────────────────────────────────────────

  describe('Get Payout Details', () => {
    it('GET /api/v1/communities/:id/kameti/payouts/:payoutId returns 200', async () => {
      const payout = {
        payout: { id: '00000000-0000-0000-0000-000000000044', amount: '9000' },
        group: { id: GROUP_ID, communityId: COMMUNITY_A },
      };
      mockDb.select.mockReturnValue(mockSelectChain([payout]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/payouts/00000000-0000-0000-0000-000000000044`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Kameti Report
  // ──────────────────────────────────────────

  describe('Get Kameti Report', () => {
    it('GET /api/v1/communities/:id/kameti/groups/:groupId/report returns 200', async () => {
      const group = { id: GROUP_ID, communityId: COMMUNITY_A, name: 'Test Kameti' };
      const members = [{ id: MEMBER_ID, status: 'ACTIVE' }];
      const periods = [{ id: PERIOD_ID, status: 'COMPLETED' }];
      const contributions = [{ id: 'c1', amount: '1000', status: 'VERIFIED' }];
      const payouts = [{ id: 'p1', amount: '9000', status: 'COMPLETED' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([group]);
        if (callCount === 2) return mockSelectChain(members);
        if (callCount === 3) return mockSelectChain(periods);
        if (callCount === 4) return mockSelectChain(contributions);
        return mockSelectChain(payouts);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups/${GROUP_ID}/report`,
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
    it('returns 404 when accessing other community kameti group', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/kameti/groups/${GROUP_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Unauthenticated Access
  // ──────────────────────────────────────────

  describe('Unauthenticated Access', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/kameti/groups`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });
});
