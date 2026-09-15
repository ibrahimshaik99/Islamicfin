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
  financeContracts: {
    id: 'id', communityId: 'community_id', contractType: 'contract_type',
    title: 'title', description: 'description', initiatorId: 'initiator_id',
    status: 'status', currency: 'currency', principalAmount: 'principal_amount',
    startDate: 'start_date', endDate: 'end_date',
    termsVersion: 'terms_version', shariahReviewStatus: 'shariah_review_status',
    legalStatus: 'legal_status', executionApproved: 'execution_approved',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  contractTypeEnum: { enumValues: ['MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH', 'QARD_HASAN', 'SADAQAH'] },
  financeContractStatusEnum: { enumValues: ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED'] },
  shariahReviewStatusEnum: { enumValues: ['PENDING_REVIEW', 'REVIEWED', 'NEEDS_REVISION', 'ARCHIVED'] },
  legalStatusEnum: { enumValues: ['DRAFT', 'UNDER_REVIEW', 'APPROVED_FOR_DISPLAY', 'APPROVED_FOR_EXECUTION', 'BLOCKED', 'ARCHIVED'] },
  financeParticipants: {
    id: 'id', contractId: 'contract_id', userId: 'user_id',
    participantRole: 'participant_role', contributionAmount: 'contribution_amount',
    profitShare: 'profit_share', ownershipShare: 'ownership_share',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  financeTerms: {
    id: 'id', contractId: 'contract_id', version: 'version',
    termsJson: 'terms_json', effectiveAt: 'effective_at', createdAt: 'created_at',
  },
  financeAssets: {
    id: 'id', contractId: 'contract_id', description: 'description',
    seller: 'seller', purchasePrice: 'purchase_price', purchaseDate: 'purchase_date',
    ownershipStatus: 'ownership_status', possessionStatus: 'possession_status',
    salePrice: 'sale_price', saleDate: 'sale_date',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  financeTransactions: {
    id: 'id', contractId: 'contract_id', type: 'type', amount: 'amount',
    reference: 'reference', paymentMethod: 'payment_method',
    status: 'status', recordedBy: 'recorded_by', createdAt: 'created_at',
  },
  financeTransactionStatusEnum: { enumValues: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
  financeDocuments: {
    id: 'id', contractId: 'contract_id', documentType: 'document_type',
    fileUrl: 'file_url', version: 'version', createdAt: 'created_at',
  },
  financeReviews: {
    id: 'id', contractId: 'contract_id', reviewer: 'reviewer',
    status: 'status', comments: 'comments', reviewedAt: 'reviewed_at',
    version: 'version', createdAt: 'created_at',
  },
  financeReviewStatusEnum: { enumValues: ['PENDING_REVIEW', 'REVIEWED', 'NEEDS_REVISION', 'ARCHIVED'] },
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
const CONTRACT_ID = '00000000-0000-0000-0000-000000000088';
const TX_ID = '00000000-0000-0000-0000-000000000077';

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

describe('Qard Hasan Integration Tests', () => {
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
  // Create Contract
  // ──────────────────────────────────────────

  describe('Create Contract', () => {
    it('POST /api/v1/communities/:id/finance/contracts returns 201', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', title: 'Qard Hasan', principalAmount: '50000' };
      mockDb.insert.mockReturnValue(mockInsertChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Qard Hasan',
            principalAmount: '50000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/contracts returns 400 for empty title', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '', principalAmount: '50000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts returns 400 for zero principal', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', principalAmount: '0' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts returns 400 for negative principal', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', principalAmount: '-100' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // List Contracts
  // ──────────────────────────────────────────

  describe('List Contracts', () => {
    it('GET /api/v1/communities/:id/finance/contracts returns 200', async () => {
      const contracts = [{ id: CONTRACT_ID, title: 'Qard Hasan', contractType: 'QARD_HASAN' }];
      mockDb.select.mockReturnValue(mockSelectChain(contracts));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Contract Details
  // ──────────────────────────────────────────

  describe('Get Contract Details', () => {
    it('GET /api/v1/communities/:id/finance/contracts/:contractId returns 200', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', principalAmount: '50000', status: 'ACTIVE' };
      const participants: unknown[] = [];
      const transactions = [{ type: 'REPAYMENT', amount: '10000', status: 'COMPLETED' }];
      const documents: unknown[] = [];
      const reviews: unknown[] = [];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([contract]);
        if (callCount === 2) return mockSelectChain(participants);
        if (callCount === 3) return mockSelectChain(transactions);
        if (callCount === 4) return mockSelectChain(documents);
        return mockSelectChain(reviews);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/finance/contracts/:contractId returns 404', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Add Participant
  // ──────────────────────────────────────────

  describe('Add Participant', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/participants returns 201', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'DRAFT', principalAmount: '50000' };
      const participant = { id: TX_ID, contractId: CONTRACT_ID, userId: USER_B, participantRole: 'BORROWER' };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([contract]);
        return mockSelectChain([]); // no duplicate
      });
      mockDb.insert.mockReturnValue(mockInsertChain([participant]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/participants`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_B, participantRole: 'BORROWER' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/participants returns 400 for invalid role', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'DRAFT' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/participants`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_B, participantRole: 'INVALID_ROLE' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/participants returns 400 for ACTIVE contract', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'ACTIVE' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/participants`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_B, participantRole: 'BORROWER' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/participants returns 409 for duplicate', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'DRAFT' };
      const existing = { id: 'existing', userId: USER_B };
      mockDb.select
        .mockReturnValueOnce(mockSelectChain([contract]))
        .mockReturnValueOnce(mockSelectChain([existing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/participants`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_B, participantRole: 'BORROWER' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });
  });

  // ──────────────────────────────────────────
  // Record Repayment
  // ──────────────────────────────────────────

  describe('Record Repayment', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 201', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'ACTIVE', principalAmount: '50000' };
      const transaction = { id: TX_ID, contractId: CONTRACT_ID, type: 'REPAYMENT', amount: '10000', status: 'COMPLETED' };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([contract]); // contract lookup
        if (callCount === 2) return mockSelectChain([]);         // no duplicate ref
        return mockSelectChain([]);                              // existing repayments
      });
      mockDb.insert.mockReturnValue(mockInsertChain([transaction]));
      mockDb.update.mockReturnValue(mockUpdateChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '10000', reference: 'REF001', paymentMethod: 'UPI' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 400 for zero amount', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'ACTIVE', principalAmount: '50000' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '0' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 400 for non-QARD_HASAN', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'MUDARABAH', status: 'ACTIVE', principalAmount: '50000' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '10000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 400 for DRAFT contract', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'DRAFT', principalAmount: '50000' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '10000' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 400 for overpayment', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'ACTIVE', principalAmount: '50000' };
      const existingRepayment = { amount: '45000', type: 'REPAYMENT', status: 'COMPLETED' };
      mockDb.select
        .mockReturnValueOnce(mockSelectChain([contract]))        // contract lookup
        .mockReturnValueOnce(mockSelectChain([]))                 // no duplicate ref
        .mockReturnValueOnce(mockSelectChain([existingRepayment])); // existing repayments

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '10000', reference: 'REF-OVERPAY' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 409 for duplicate ref', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, contractType: 'QARD_HASAN', status: 'ACTIVE', principalAmount: '50000' };
      const existingRef = { id: 'existing', reference: 'REF001' };
      mockDb.select
        .mockReturnValueOnce(mockSelectChain([contract]))   // contract lookup
        .mockReturnValueOnce(mockSelectChain([existingRef])); // duplicate ref found

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '10000', reference: 'REF001' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(409);
    });
  });

  // ──────────────────────────────────────────
  // Get Repayments
  // ──────────────────────────────────────────

  describe('Get Repayments', () => {
    it('GET /api/v1/communities/:id/finance/contracts/:contractId/repayments returns 200', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A };
      const repayments = [{ id: TX_ID, amount: '10000', type: 'REPAYMENT' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([contract]);
        return mockSelectChain(repayments);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/repayments`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Add Document
  // ──────────────────────────────────────────

  describe('Add Document', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/documents returns 201', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A };
      const document = { id: TX_ID, contractId: CONTRACT_ID, documentType: 'AGREEMENT', fileUrl: 'https://example.com/doc.pdf' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.insert.mockReturnValue(mockInsertChain([document]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/documents`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentType: 'AGREEMENT', fileUrl: 'https://example.com/doc.pdf' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });
  });

  // ──────────────────────────────────────────
  // Submit for Review
  // ──────────────────────────────────────────

  describe('Submit for Review', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/submit-review returns 200', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, shariahReviewStatus: 'DRAFT' };
      const updated = { ...contract, shariahReviewStatus: 'PENDING_REVIEW' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/submit-review`,
        { method: 'POST', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/submit-review returns 400 for REVIEWED status', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, shariahReviewStatus: 'REVIEWED' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/submit-review`,
        { method: 'POST', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Record Review
  // ──────────────────────────────────────────

  describe('Record Review', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/reviews returns 201', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, shariahReviewStatus: 'PENDING_REVIEW', status: 'DRAFT' };
      const review = { id: TX_ID, contractId: CONTRACT_ID, reviewer: 'Scholar', status: 'REVIEWED' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.insert.mockReturnValue(mockInsertChain([review]));
      mockDb.update.mockReturnValue(mockUpdateChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/reviews`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer: 'Scholar', status: 'REVIEWED', comments: 'Approved' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/reviews returns 400 for invalid status', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, shariahReviewStatus: 'PENDING_REVIEW' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/reviews`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer: 'Scholar', status: 'INVALID_STATUS' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/reviews returns 400 for non-PENDING status', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, shariahReviewStatus: 'REVIEWED' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/reviews`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer: 'Scholar', status: 'REVIEWED' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Cancel Contract
  // ──────────────────────────────────────────

  describe('Cancel Contract', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/cancel returns 200', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, status: 'DRAFT' };
      const updated = { ...contract, status: 'CANCELLED' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/cancel`,
        { method: 'POST', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/cancel returns 400 for ACTIVE contract', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, status: 'ACTIVE' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/cancel`,
        { method: 'POST', headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Tenant Isolation
  // ──────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('returns empty list when accessing other community contracts', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/finance/contracts`,
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
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────
  // Mudarabah Contract Tests
  // ──────────────────────────────────────────

  describe('Mudarabah Contract', () => {
    it('POST /api/v1/communities/:id/finance/mudarabah returns 201', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'MUDARABAH',
        title: 'Mudarabah Fund',
        principalAmount: '500000',
        status: 'DRAFT',
      };
      mockDb.insert.mockReturnValue(mockInsertChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/mudarabah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Mudarabah Fund',
            description: 'Halal profit-sharing investment',
            principalAmount: '500000',
            profitSharingRatio: '0.60',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/mudarabah returns 400 for zero principal', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/mudarabah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', principalAmount: '0' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Musharakah Contract Tests
  // ──────────────────────────────────────────

  describe('Musharakah Contract', () => {
    it('POST /api/v1/communities/:id/finance/musharakah returns 201', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'MUSHARAKAH',
        title: 'Musharakah Partnership',
        principalAmount: '1000000',
        status: 'DRAFT',
      };
      mockDb.insert.mockReturnValue(mockInsertChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/musharakah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Musharakah Partnership',
            description: 'Joint venture partnership',
            principalAmount: '1000000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/musharakah returns 400 for zero principal', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/musharakah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', principalAmount: '0' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Murabahah Contract Tests
  // ──────────────────────────────────────────

  describe('Murabahah Contract', () => {
    it('POST /api/v1/communities/:id/finance/murabahah returns 201', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'MURABAHAH',
        title: 'Murabahah Sale',
        principalAmount: '200000',
        status: 'DRAFT',
      };
      const asset = {
        id: 'asset-1',
        contractId: CONTRACT_ID,
        description: 'Commercial property',
        seller: 'ABC Builders',
        purchasePrice: '180000',
        salePrice: '200000',
      };
      mockDb.insert
        .mockReturnValueOnce(mockInsertChain([contract]))
        .mockReturnValueOnce(mockInsertChain([asset]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/murabahah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Murabahah Sale',
            description: 'Cost-plus sale',
            principalAmount: '200000',
            assetDescription: 'Commercial property',
            seller: 'ABC Builders',
            purchasePrice: '180000',
            salePrice: '200000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/murabahah returns 400 for sale price <= purchase price', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/murabahah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            principalAmount: '200000',
            assetDescription: 'Test asset',
            seller: 'Seller',
            purchasePrice: '200000',
            salePrice: '180000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/murabahah returns 400 for zero purchase price', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/murabahah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            principalAmount: '200000',
            assetDescription: 'Test asset',
            seller: 'Seller',
            purchasePrice: '0',
            salePrice: '200000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Ijarah Contract Tests
  // ──────────────────────────────────────────

  describe('Ijarah Contract', () => {
    it('POST /api/v1/communities/:id/finance/ijarah returns 201', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'IJARAH',
        title: 'Ijarah Lease',
        principalAmount: '50000',
        status: 'DRAFT',
      };
      const asset = {
        id: 'asset-1',
        contractId: CONTRACT_ID,
        description: 'Office space',
        ownershipStatus: 'LESSOR',
        possessionStatus: 'PENDING',
      };
      mockDb.insert
        .mockReturnValueOnce(mockInsertChain([contract]))
        .mockReturnValueOnce(mockInsertChain([asset]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/ijarah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Ijarah Lease',
            description: 'Office space lease',
            principalAmount: '50000',
            assetDescription: 'Office space',
            leasePeriod: '12 months',
            leasePayments: '5000',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/ijarah returns 400 for zero lease payments', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/ijarah`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            principalAmount: '50000',
            assetDescription: 'Test asset',
            leasePeriod: '12 months',
            leasePayments: '0',
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Profit Distribution Tests
  // ──────────────────────────────────────────

  describe('Record Profit Distribution', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/profit-distributions returns 201', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'MUDARABAH',
        status: 'ACTIVE',
      };
      const transaction = {
        id: TX_ID,
        contractId: CONTRACT_ID,
        type: 'PROFIT_DISTRIBUTION',
        amount: '50000',
        status: 'COMPLETED',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.insert.mockReturnValue(mockInsertChain([transaction]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/profit-distributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '50000', period: 'Q1 2024' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/profit-distributions returns 400 for Qard Hasan', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'QARD_HASAN',
        status: 'ACTIVE',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/profit-distributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '50000', period: 'Q1 2024' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/profit-distributions returns 400 for DRAFT contract', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'MUDARABAH',
        status: 'DRAFT',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/profit-distributions`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '50000', period: 'Q1 2024' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Lease Payment Tests
  // ──────────────────────────────────────────

  describe('Record Lease Payment', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/lease-payments returns 201', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'IJARAH',
        status: 'ACTIVE',
      };
      const transaction = {
        id: TX_ID,
        contractId: CONTRACT_ID,
        type: 'LEASE_PAYMENT',
        amount: '5000',
        status: 'COMPLETED',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.insert.mockReturnValue(mockInsertChain([transaction]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/lease-payments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000', period: 'Month 1' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/lease-payments returns 400 for non-Ijarah', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        contractType: 'QARD_HASAN',
        status: 'ACTIVE',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/lease-payments`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '5000', period: 'Month 1' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // List Contracts by Type Tests
  // ──────────────────────────────────────────

  describe('List Contracts by Type', () => {
    it('GET /api/v1/communities/:id/finance/contracts/type/:contractType returns 200', async () => {
      const contracts = [{ id: CONTRACT_ID, contractType: 'MUDARABAH' }];
      mockDb.select.mockReturnValue(mockSelectChain(contracts));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/type/MUDARABAH`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/finance/contracts/type/:contractType returns 400 for invalid type', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/type/INVALID`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Governance Tests
  // ──────────────────────────────────────────

  describe('Shariah Governance', () => {
    it('GET /api/v1/communities/:id/finance/review-queue returns 200', async () => {
      const contracts = [{ id: CONTRACT_ID, shariahReviewStatus: 'PENDING_REVIEW' }];
      mockDb.select.mockReturnValue(mockSelectChain(contracts));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/review-queue`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/finance/contracts/:contractId/reviews returns 200', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A };
      const reviews = [{ id: 'review-1', status: 'REVIEWED' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([contract]);
        return mockSelectChain(reviews);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/reviews`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Legal Status Updates', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/legal-status returns 200', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, legalStatus: 'DRAFT', executionApproved: 'NO' };
      const updated = { ...contract, legalStatus: 'UNDER_REVIEW' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/legal-status`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ legalStatus: 'UNDER_REVIEW' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/finance/contracts/:contractId/legal-status returns 400 for invalid transition', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, legalStatus: 'DRAFT', executionApproved: 'NO' };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/legal-status`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ legalStatus: 'APPROVED_FOR_EXECUTION' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Terms Versioning', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/terms returns 400 for ACTIVE contract', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A, status: 'ACTIVE', termsVersion: 1 };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/terms`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ termsJson: { key: 'value' } }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Document Versioning', () => {
    it('POST /api/v1/communities/:id/finance/contracts/:contractId/documents returns 201', async () => {
      const contract = { id: CONTRACT_ID, communityId: COMMUNITY_A };
      const existingDocs = [{ id: 'doc-1' }];
      const document = { id: 'doc-2', contractId: CONTRACT_ID, documentType: 'AGREEMENT', version: 2 };
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([contract]);
        return mockSelectChain(existingDocs);
      });
      mockDb.insert.mockReturnValue(mockInsertChain([document]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/documents`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentType: 'AGREEMENT', fileUrl: 'https://example.com/doc.pdf' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });
  });

  describe('Execution Gate', () => {
    it('GET /api/v1/communities/:id/finance/contracts/:contractId/execution-gate returns canExecute=true when all conditions met', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        shariahReviewStatus: 'REVIEWED',
        legalStatus: 'APPROVED_FOR_EXECUTION',
        executionApproved: 'YES',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/execution-gate`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { canExecute: boolean; reasons: string[] } };
      expect(body.data.canExecute).toBe(true);
      expect(body.data.reasons).toHaveLength(0);
    });

    it('GET /api/v1/communities/:id/finance/contracts/:contractId/execution-gate returns canExecute=false when conditions not met', async () => {
      const contract = {
        id: CONTRACT_ID,
        communityId: COMMUNITY_A,
        shariahReviewStatus: 'PENDING_REVIEW',
        legalStatus: 'DRAFT',
        executionApproved: 'NO',
      };
      mockDb.select.mockReturnValue(mockSelectChain([contract]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/finance/contracts/${CONTRACT_ID}/execution-gate`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { canExecute: boolean; reasons: string[] } };
      expect(body.data.canExecute).toBe(false);
      expect(body.data.reasons.length).toBeGreaterThan(0);
    });
  });
});
