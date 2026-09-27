import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * BNPL / deferred-payment (Murabahah-style) tests.
 *
 * Covers: integer-paise schedule math, cross-community guards, duplicate
 * submission, Shariah review gating (no contract activates without REVIEWED),
 * payment state machine, and role-scoped visibility.
 */

const {
  mockDb,
  mockGetSessionUser,
  mockResolveTenantContext,
  recordedWheres,
  recordedValues,
  recordedUpdates,
} = vi.hoisted(() => {
  const recordedWheres: unknown[] = [];
  const recordedValues: unknown[] = [];
  const recordedUpdates: unknown[] = [];
  let queue: unknown[] = [];
  let last: unknown = [];

  function shift(): unknown {
    if (queue.length === 0) return last;
    const next = queue.shift()!;
    last = next;
    return next;
  }

  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.from = vi.fn(self);
    chain.where = vi.fn((cond: unknown) => {
      recordedWheres.push(cond);
      return chain;
    });
    chain.limit = vi.fn(self);
    chain.offset = vi.fn(self);
    chain.orderBy = vi.fn(self);
    chain.groupBy = vi.fn(self);
    chain.innerJoin = vi.fn(self);
    chain.leftJoin = vi.fn(self);
    chain.set = vi.fn((vals: unknown) => {
      recordedUpdates.push(vals);
      return chain;
    });
    chain.then = (
      resolve: (v: unknown) => void,
      reject: (e: unknown) => void,
    ) => Promise.resolve(shift()).then(resolve, reject);
    chain.returning = vi.fn(() => Promise.resolve(shift()));

    const makeResult = () => {
      const result: Record<string, unknown> = {};
      result.returning = vi.fn(() => Promise.resolve(shift()));
      result.then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(shift()).then(resolve, reject);
      return result;
    };

    chain.values = vi.fn((vals: unknown) => {
      recordedValues.push(vals);
      return makeResult();
    });
    return chain;
  };

  const makeTx = () => ({
    select: vi.fn(() => makeChain()),
    insert: vi.fn(() => makeChain()),
    update: vi.fn(() => makeChain()),
    delete: vi.fn(() => makeChain()),
  });

  const mockDb = {
    select: vi.fn(() => makeChain()),
    insert: vi.fn(() => makeChain()),
    update: vi.fn(() => makeChain()),
    delete: vi.fn(() => makeChain()),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(makeTx())),
    __setQueue: (rows: unknown[]) => {
      queue = [...rows];
      last = rows.length ? rows[rows.length - 1] : [];
    },
    __reset: () => {
      queue = [];
      last = [];
      recordedWheres.length = 0;
      recordedValues.length = 0;
      recordedUpdates.length = 0;
      mockDb.select.mockClear();
      mockDb.insert.mockClear();
      mockDb.update.mockClear();
      mockDb.delete.mockClear();
      mockDb.transaction.mockClear();
    },
  };

  const mockGetSessionUser = vi.fn();
  const mockResolveTenantContext = vi.fn();

  return {
    mockDb,
    mockGetSessionUser,
    mockResolveTenantContext,
    recordedWheres,
    recordedValues,
    recordedUpdates,
  };
});

vi.mock('../db', () => ({ db: mockDb }));

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
}));

vi.mock('../tenancy/membership', () => ({
  resolveTenantContext: (...args: unknown[]) => mockResolveTenantContext(...args),
}));

const { default: app } = await import('../index');

const COMMUNITY_A = '00000000-0000-0000-0000-00000000000a';
const ORDER_A = '00000000-0000-0000-0000-0000000000a1';
const CONTRACT_ID = '00000000-0000-0000-0000-0000000000c9';
const INSTALLMENT_ID = '00000000-0000-0000-0000-0000000000e1';
const MERCHANT_A = '00000000-0000-0000-0000-0000000000m1';
const USER_CUSTOMER = '00000000-0000-0000-0000-0000000000u1';
const USER_OTHER = '00000000-0000-0000-0000-0000000000u2';

function cookie() {
  return 'session=token';
}

function walkContains(obj: unknown, value: string, depth = 0): boolean {
  if (depth > 14 || obj == null) return false;
  if (obj === value) return true;
  if (typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some((v) => walkContains(v, value, depth + 1));
  return Object.values(obj as Record<string, unknown>).some((v) =>
    walkContains(v, value, depth + 1),
  );
}

function setRole(role: string, userId = USER_CUSTOMER) {
  mockResolveTenantContext.mockImplementation(
    async (uid: string, communityId: string) =>
      uid === userId && communityId === COMMUNITY_A
        ? { userId: uid, communityId: COMMUNITY_A, role, membershipId: 'mem-1' }
        : null,
  );
}

function orderRow(total = '1000.00', customerId = USER_CUSTOMER) {
  return {
    id: ORDER_A,
    communityId: COMMUNITY_A,
    customerId,
    merchantId: MERCHANT_A,
    subtotal: total,
    deliveryFee: '0',
    total,
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    orderStatus: 'CONFIRMED',
    orderNumber: 'ORD-TEST-1',
  };
}

function merchantRow(communityId = COMMUNITY_A) {
  return {
    id: MERCHANT_A,
    communityId,
    userId: '00000000-0000-0000-0000-0000000000o1',
    verificationStatus: 'APPROVED',
  };
}

function baseCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    orderId: ORDER_A,
    downPayment: '100.00',
    installmentCount: 3,
    installmentFrequency: 'MONTHLY',
    firstDueDate: '2026-10-27',
    ...overrides,
  };
}

async function createContract(body = baseCreateBody()) {
  return app.request(
    `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts`,
    {
      method: 'POST',
      headers: { cookie: cookie(), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    { ENVIRONMENT: 'test' },
  );
}

function contractInsert() {
  return recordedValues.find(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      'totalSalePrice' in (v as Record<string, unknown>),
  ) as Record<string, unknown> | undefined;
}

function installmentInsert() {
  return recordedValues.find(
    (v) => Array.isArray(v) && v.length > 0 && 'installmentNumber' in (v[0] as object),
  ) as Array<Record<string, unknown>> | undefined;
}

describe('BNPL / deferred payment', () => {
  beforeEach(() => {
    mockDb.__reset();
    mockGetSessionUser.mockResolvedValue({
      id: USER_CUSTOMER,
      name: 'Customer',
      email: 'c@test.com',
      status: 'ACTIVE',
    });
    setRole('CUSTOMER');
  });

  describe('Schedule math (integer paise, no interest)', () => {
    it('creates a contract with exact schedule: 1000.00, 100 down, 3 x 300.00', async () => {
      mockDb.__setQueue([
        [orderRow('1000.00')],
        [merchantRow()],
        [], // no existing contract
        [], // order items
        [{ id: CONTRACT_ID, status: 'PENDING_REVIEW' }], // insert returning
        [], // installment insert
        [], // audit insert
      ]);

      const res = await createContract();
      expect(res.status).toBe(201);

      const contract = contractInsert();
      expect(contract).toBeDefined();
      expect(contract!.totalSalePrice).toBe('1000.00');
      expect(contract!.downPayment).toBe('100.00');
      expect(contract!.installmentAmount).toBe('300.00');
      expect(contract!.installmentCount).toBe(3);
      expect(contract!.totalAmountPayable).toBe('1000.00');
      expect(contract!.status).toBe('PENDING_REVIEW');
      expect(contract!.shariahReviewStatus).toBe('PENDING_REVIEW');

      const installments = installmentInsert()!;
      expect(installments).toHaveLength(3);
      expect(installments.map((i) => i.amount)).toEqual([
        '300.00',
        '300.00',
        '300.00',
      ]);
      // No paise created or lost
      const sum = installments
        .map((i) => Math.round(parseFloat(String(i.amount)) * 100))
        .reduce((a, b) => a + b, 0);
      expect(sum).toBe(100000 - 10000);
    });

    it('absorbs rounding remainder in the last installment (100.00 / 3)', async () => {
      mockDb.__setQueue([
        [orderRow('100.00')],
        [merchantRow()],
        [],
        [],
        [{ id: CONTRACT_ID }],
        [],
        [],
      ]);

      const res = await createContract(baseCreateBody({ downPayment: '0' }));
      expect(res.status).toBe(201);

      const contract = contractInsert()!;
      expect(contract.installmentAmount).toBe('33.33');
      expect(contract.totalAmountPayable).toBe('100.00');

      const installments = installmentInsert()!;
      expect(installments.map((i) => i.amount)).toEqual([
        '33.33',
        '33.33',
        '33.34',
      ]);
      const sum = installments
        .map((i) => Math.round(parseFloat(String(i.amount)) * 100))
        .reduce((a, b) => a + b, 0);
      expect(sum).toBe(10000);
    });

    it('rejects a down payment >= order total', async () => {
      mockDb.__setQueue([[orderRow('500.00')], [merchantRow()], []]);

      const res = await createContract(baseCreateBody({ downPayment: '500.00' }));
      expect(res.status).toBe(400);
    });

    it('rejects a first due date in the past', async () => {
      const res = await createContract(baseCreateBody({ firstDueDate: '2020-01-01' }));
      expect(res.status).toBe(400);
    });

    it('rejects invalid money amounts', async () => {
      const res = await createContract(
        baseCreateBody({ downPayment: '12.345' }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Tenant and ownership guards', () => {
    it('returns 404 when the order is not in this community (cross-tenant)', async () => {
      mockDb.__setQueue([[]]); // order lookup scoped by communityId finds nothing

      const res = await createContract();
      expect(res.status).toBe(404);
      expect(recordedWheres.some((w) => walkContains(w, COMMUNITY_A))).toBe(true);
    });

    it('blocks a merchant from a different community', async () => {
      mockDb.__setQueue([
        [orderRow()],
        [merchantRow('00000000-0000-0000-0000-00000000000b')], // merchant in community B
        [],
      ]);

      const res = await createContract();
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('CROSS_COMMUNITY_BLOCKED');
    });

    it('blocks a customer from requesting deferred payment for another user’s order', async () => {
      mockDb.__setQueue([
        [orderRow('1000.00', USER_OTHER)],
        [merchantRow()],
        [],
      ]);

      const res = await createContract();
      expect(res.status).toBe(403);
    });

    it('returns 409 on duplicate contract for the same order', async () => {
      mockDb.__setQueue([
        [orderRow()],
        [merchantRow()],
        [{ id: CONTRACT_ID }], // contract already exists
      ]);

      const res = await createContract();
      expect(res.status).toBe(409);
    });
  });

  describe('Shariah review gating', () => {
    it('review by a customer (no bnpl:review) is forbidden', async () => {
      setRole('CUSTOMER');
      mockDb.__setQueue([[pendingContract()]]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/review`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ decision: 'APPROVE' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(403);
    });

    it('APPROVE without REVIEWED keeps the contract PENDING_REVIEW', async () => {
      setRole('COMMUNITY_FINANCE_MANAGER');
      mockDb.__setQueue([
        [pendingContract()],
        [{ id: CONTRACT_ID, status: 'PENDING_REVIEW' }],
        [], // audit
      ]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/review`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ decision: 'APPROVE' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      expect(recordedUpdates[0]).toMatchObject({ status: 'PENDING_REVIEW' });
    });

    it('APPROVE with shariahReviewStatus REVIEWED activates the contract', async () => {
      setRole('COMMUNITY_FINANCE_MANAGER');
      mockDb.__setQueue([
        [pendingContract()],
        [{ id: CONTRACT_ID, status: 'ACTIVE', shariahReviewStatus: 'REVIEWED' }],
        [],
      ]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/review`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({
            decision: 'APPROVE',
            shariahReviewStatus: 'REVIEWED',
            comments: 'Reviewed by board',
          }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      expect(recordedUpdates[0]).toMatchObject({
        status: 'ACTIVE',
        shariahReviewStatus: 'REVIEWED',
      });
    });

    it('REJECT cancels the contract', async () => {
      setRole('COMMUNITY_FINANCE_MANAGER');
      mockDb.__setQueue([
        [pendingContract()],
        [{ id: CONTRACT_ID, status: 'CANCELLED' }],
        [],
      ]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/review`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ decision: 'REJECT', comments: 'Needs revision' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      expect(recordedUpdates[0]).toMatchObject({ status: 'CANCELLED' });
    });
  });

  describe('Payment state machine', () => {
    it('rejects installment payment while contract is not ACTIVE', async () => {
      mockDb.__setQueue([[pendingContract()], [pendingInstallment()]]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/installments/${INSTALLMENT_ID}/pay`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ paymentMethod: 'UPI', referenceNumber: 'REF1' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_STATE');
    });

    it('records a payment on an ACTIVE contract', async () => {
      mockDb.__setQueue([
        [activeContract()],
        [pendingInstallment()],
        [{ id: INSTALLMENT_ID, status: 'PAID' }],
        [], // audit
      ]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/installments/${INSTALLMENT_ID}/pay`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ paymentMethod: 'UPI', referenceNumber: 'REF1' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      expect(recordedUpdates[0]).toMatchObject({ status: 'PAID' });
    });

    it('verification by a customer is forbidden (needs bnpl:manage)', async () => {
      setRole('CUSTOMER');
      mockDb.__setQueue([[activeContract()]]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}/installments/${INSTALLMENT_ID}/verify`,
        {
          method: 'POST',
          headers: { cookie: cookie(), 'content-type': 'application/json' },
          body: JSON.stringify({ decision: 'VERIFY' }),
        },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(403);
    });
  });

  describe('Visibility scoping', () => {
    it('scopes the contract list to the requesting customer', async () => {
      setRole('CUSTOMER');
      mockDb.__setQueue([[{ value: 0 }], []]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts`,
        { headers: { cookie: cookie() } },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(200);
      // The WHERE must carry both the tenant community and the customer identity
      const scoped = recordedWheres.some((w) => {
        const seen = new Set<unknown>();
        const walk = (o: unknown, d: number): boolean => {
          if (d > 14 || o == null) return false;
          if (o === COMMUNITY_A || o === USER_CUSTOMER) return true;
          if (typeof o !== 'object') return false;
          if (seen.has(o)) return false;
          seen.add(o);
          if (Array.isArray(o)) return o.some((v) => walk(v, d + 1));
          return Object.values(o as Record<string, unknown>).some((v) =>
            walk(v, d + 1),
          );
        };
        return walk(w, 0);
      });
      expect(scoped).toBe(true);
    });

    it('returns 404 for another customer’s contract detail', async () => {
      setRole('CUSTOMER');
      mockDb.__setQueue([[{ ...pendingContract(), customerId: USER_OTHER }]]);

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/bnpl/contracts/${CONTRACT_ID}`,
        { headers: { cookie: cookie() } },
        { ENVIRONMENT: 'test' },
      );

      expect(res.status).toBe(404);
    });
  });
});

function pendingContract(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTRACT_ID,
    communityId: COMMUNITY_A,
    orderId: ORDER_A,
    customerId: USER_CUSTOMER,
    merchantId: MERCHANT_A,
    purchasePrice: '1000.00',
    totalSalePrice: '1000.00',
    downPayment: '100.00',
    installmentAmount: '300.00',
    installmentCount: 3,
    installmentFrequency: 'MONTHLY',
    startDate: '2026-09-27',
    firstDueDate: '2026-10-27',
    totalAmountPayable: '1000.00',
    status: 'PENDING_REVIEW',
    shariahReviewStatus: 'PENDING_REVIEW',
    ...overrides,
  };
}

function activeContract() {
  return pendingContract({ status: 'ACTIVE', shariahReviewStatus: 'REVIEWED' });
}

function pendingInstallment() {
  return {
    id: INSTALLMENT_ID,
    contractId: CONTRACT_ID,
    installmentNumber: 1,
    dueDate: '2026-10-27',
    amount: '300.00',
    status: 'PENDING',
  };
}
