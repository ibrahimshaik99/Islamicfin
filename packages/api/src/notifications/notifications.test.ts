import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Notifications (user-scoped) tests.
 *
 * Notifications are strictly per-user: a user lists/reads only their own rows.
 * The communityId is informational. There is no cross-user access.
 */

const { mockDb, mockGetSessionUser, recordedSets } = vi.hoisted(() => {
  const recordedSets: unknown[] = [];
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
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(self);
    chain.offset = vi.fn(self);
    chain.orderBy = vi.fn(self);
    chain.set = vi.fn((vals: unknown) => {
      recordedSets.push(vals);
      return chain;
    });
    chain.returning = vi.fn(() => Promise.resolve(shift()));
    chain.then = (
      resolve: (v: unknown) => void,
      reject: (e: unknown) => void,
    ) => Promise.resolve(shift()).then(resolve, reject);

    const makeResult = () => {
      const result: Record<string, unknown> = {};
      result.returning = vi.fn(() => Promise.resolve(shift()));
      result.then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(shift()).then(resolve, reject);
      return result;
    };

    chain.values = vi.fn(() => makeResult());
    return chain;
  };

  const mockDb = {
    select: vi.fn(() => makeChain()),
    insert: vi.fn(() => makeChain()),
    update: vi.fn(() => makeChain()),
    delete: vi.fn(() => makeChain()),
    __setQueue: (rows: unknown[]) => {
      queue = [...rows];
      last = rows.length ? rows[rows.length - 1] : [];
    },
    __reset: () => {
      queue = [];
      last = [];
      recordedSets.length = 0;
      mockDb.select.mockClear();
      mockDb.insert.mockClear();
      mockDb.update.mockClear();
      mockDb.delete.mockClear();
    },
  };

  const mockGetSessionUser = vi.fn();

  return { mockDb, mockGetSessionUser, recordedSets };
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

const { default: app } = await import('../index');

const USER = '00000000-0000-0000-0000-000000000001';
const NOTIF = '00000000-0000-0000-0000-0000000000n1';

function cookie() {
  return 'session=token';
}

function notifRow(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIF,
    userId: USER,
    communityId: null,
    type: 'MEMBERSHIP_REQUEST_DECISION',
    title: 'Join request approved',
    body: 'Your request to join was approved.',
    data: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Notifications (user-scoped)', () => {
  beforeEach(() => {
    mockDb.__reset();
    mockGetSessionUser.mockResolvedValue({
      id: USER,
      name: 'User',
      email: 'u@test.com',
      status: 'ACTIVE',
    });
  });

  it('lists notifications with an unread count', async () => {
    mockDb.__setQueue([[notifRow()], [{ value: 1 }]]);

    const res = await app.request(
      'http://localhost/api/v1/notifications',
      { headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; unreadCount: number };
    expect(body.data).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await app.request(
      'http://localhost/api/v1/notifications',
      {},
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(401);
  });

  it('marks a notification read (scoped to the current user)', async () => {
    mockDb.__setQueue([[notifRow()]]);

    const res = await app.request(
      `http://localhost/api/v1/notifications/${NOTIF}/read`,
      { method: 'POST', headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
    expect(recordedSets[0]).toHaveProperty('readAt');
  });

  it('404s when reading a notification that is not the current user', async () => {
    mockDb.__setQueue([[], []]); // update returns none, existence check returns none

    const res = await app.request(
      `http://localhost/api/v1/notifications/${NOTIF}/read`,
      { method: 'POST', headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(404);
  });

  it('marks all notifications read', async () => {
    mockDb.__setQueue([[]]);

    const res = await app.request(
      'http://localhost/api/v1/notifications/read-all',
      { method: 'POST', headers: { cookie: cookie() } },
      { ENVIRONMENT: 'test' },
    );

    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
    expect(recordedSets[0]).toHaveProperty('readAt');
  });
});
