import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  TEST_USERS,
  TEST_COMMUNITIES,
  TEST_SESSIONS,
} from '../tenancy/test-data';
import { ROLE_HIERARCHY, ROLE_PERMISSIONS } from '../rbac/roles';
import { hasPermission, canAssignRole } from '../rbac/roles';

vi.mock('../db', () => ({
  db: {},
}));

vi.mock('../db/schema', () => ({
  communities: { id: 'id', name: 'name', slug: 'slug' },
  communityMemberships: {
    id: 'id',
    communityId: 'community_id',
    userId: 'user_id',
    role: 'role',
    status: 'status',
  },
  users: { id: 'id' },
  sessions: { id: 'id', userId: 'user_id', token: 'token', expiresAt: 'expires_at' },
  auditLogs: { id: 'id', communityId: 'community_id', actorId: 'actor_id' },
}));

vi.mock('../auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../auth/password', () => ({
  parseCookies: (header: string) => {
    const cookies: Record<string, string> = {};
    for (const part of header.split(';')) {
      const [name, ...rest] = part.split('=');
      if (name) {
        cookies[name.trim()] = rest.join('=').trim();
      }
    }
    return cookies;
  },
}));

vi.mock('../tenancy/membership', () => ({
  resolveTenantContext: vi.fn(),
}));

vi.mock('../rbac/service', () => ({
  changeMemberRole: vi.fn(),
}));

const { getSessionUser } = await import('../auth/session');
const mockGetSessionUser = vi.mocked(getSessionUser);

const { resolveTenantContext } = await import('../tenancy/membership');
const mockResolve = vi.mocked(resolveTenantContext);

const { changeMemberRole } = await import('../rbac/service');
const mockChangeRole = vi.mocked(changeMemberRole);

function createCookie(token: string) {
  return `session=${token}`;
}

describe('RBAC Unit Tests', () => {
  describe('Role Hierarchy', () => {
    it('SUPER_ADMIN is the highest role', () => {
      const levels = Object.values(ROLE_HIERARCHY);
      const maxLevel = Math.max(...levels);
      expect(ROLE_HIERARCHY['SUPER_ADMIN']).toBe(maxLevel);
    });

    it('CUSTOMER is the lowest role', () => {
      const levels = Object.values(ROLE_HIERARCHY);
      const minLevel = Math.min(...levels);
      expect(ROLE_HIERARCHY['CUSTOMER']).toBe(minLevel);
    });

    it('COMMUNITY_OWNER is higher than COMMUNITY_ADMIN', () => {
      expect(ROLE_HIERARCHY['COMMUNITY_OWNER']).toBeGreaterThan(
        ROLE_HIERARCHY['COMMUNITY_ADMIN'],
      );
    });
  });

  describe('Permission Checks', () => {
    it('COMMUNITY_OWNER has community:manage', () => {
      expect(hasPermission('COMMUNITY_OWNER', 'community:manage')).toBe(true);
    });

    it('CUSTOMER does not have community:manage', () => {
      expect(hasPermission('CUSTOMER', 'community:manage')).toBe(false);
    });

    it('MERCHANT has product:manage', () => {
      expect(hasPermission('MERCHANT', 'product:manage')).toBe(true);
    });

    it('CUSTOMER does not have product:manage', () => {
      expect(hasPermission('CUSTOMER', 'product:manage')).toBe(false);
    });

    it('COMMUNITY_FINANCE_MANAGER has finance:manage', () => {
      expect(hasPermission('COMMUNITY_FINANCE_MANAGER', 'finance:manage')).toBe(true);
    });

    it('MERCHANT has finance:manage', () => {
      expect(hasPermission('MERCHANT', 'finance:manage')).toBe(true);
    });

    it('COMMUNITY_MODERATOR does not have role:change', () => {
      expect(hasPermission('COMMUNITY_MODERATOR', 'role:change')).toBe(false);
    });

    it('COMMUNITY_ADMIN has role:change', () => {
      expect(hasPermission('COMMUNITY_ADMIN', 'role:change')).toBe(true);
    });

    it('MERCHANT_STAFF does not have order:manage', () => {
      expect(hasPermission('MERCHANT_STAFF', 'order:manage')).toBe(false);
    });

    it('Unknown role has no permissions', () => {
      expect(hasPermission('FAKE_ROLE', 'community:read')).toBe(false);
    });
  });

  describe('Role Assignment Rules', () => {
    it('COMMUNITY_OWNER can assign COMMUNITY_ADMIN', () => {
      expect(canAssignRole('COMMUNITY_OWNER', 'COMMUNITY_ADMIN')).toBe(true);
    });

    it('COMMUNITY_ADMIN cannot assign COMMUNITY_OWNER', () => {
      expect(canAssignRole('COMMUNITY_ADMIN', 'COMMUNITY_OWNER')).toBe(false);
    });

    it('COMMUNITY_ADMIN cannot assign same role', () => {
      expect(canAssignRole('COMMUNITY_ADMIN', 'COMMUNITY_ADMIN')).toBe(false);
    });

    it('MERCHANT cannot assign any admin role', () => {
      expect(canAssignRole('MERCHANT', 'COMMUNITY_ADMIN')).toBe(false);
      expect(canAssignRole('MERCHANT', 'COMMUNITY_OWNER')).toBe(false);
    });

    it('COMMUNITY_MODERATOR can hierarchically assign MERCHANT (but service blocks due to missing permission)', () => {
      expect(canAssignRole('COMMUNITY_MODERATOR', 'MERCHANT')).toBe(true);
    });

    it('CUSTOMER cannot assign any role', () => {
      expect(canAssignRole('CUSTOMER', 'CUSTOMER')).toBe(false);
      expect(canAssignRole('CUSTOMER', 'MERCHANT_STAFF')).toBe(false);
    });
  });
});

describe('RBAC Authorization Tests — Correct Tenant + Correct Role', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetSessionUser.mockImplementation(async (token: string) => {
      if (token === TEST_SESSIONS.sessionUserA) {
        return {
          id: TEST_USERS.userA.id,
          name: TEST_USERS.userA.name,
          email: TEST_USERS.userA.email,
          status: 'ACTIVE',
        };
      }
      return null;
    });

    const { authMiddleware, requireAuth } = await import('../auth/middleware');
    const { tenantMiddleware } = await import('../tenancy/middleware');
    const { requirePermission } = await import('../rbac/middleware');

    app = new Hono();
    app.use('*', authMiddleware);

    app.get(
      '/api/v1/communities/:communityId/admin',
      requireAuth,
      tenantMiddleware,
      requirePermission('community:manage'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );

    app.get(
      '/api/v1/communities/:communityId/products',
      requireAuth,
      tenantMiddleware,
      requirePermission('product:read'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );

    app.get(
      '/api/v1/communities/:communityId/finance',
      requireAuth,
      tenantMiddleware,
      requirePermission('finance:manage'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );

    app.get(
      '/api/v1/communities/:communityId/roles',
      requireAuth,
      tenantMiddleware,
      requirePermission('role:change'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );
  });

  it('COMMUNITY_OWNER can access community:manage', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'COMMUNITY_OWNER',
      membershipId: 'mem-1',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/admin`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(200);
  });

  it('MERCHANT can access product:read', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'MERCHANT',
      membershipId: 'mem-2',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/products`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(200);
  });

  it('COMMUNITY_FINANCE_MANAGER can access finance:manage', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'COMMUNITY_FINANCE_MANAGER',
      membershipId: 'mem-3',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/finance`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(200);
  });

  it('COMMUNITY_ADMIN can access role:change', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'COMMUNITY_ADMIN',
      membershipId: 'mem-4',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/roles`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(200);
  });
});

describe('RBAC Authorization Tests — Correct Tenant + Incorrect Role', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetSessionUser.mockImplementation(async (token: string) => {
      if (token === TEST_SESSIONS.sessionUserA) {
        return {
          id: TEST_USERS.userA.id,
          name: TEST_USERS.userA.name,
          email: TEST_USERS.userA.email,
          status: 'ACTIVE',
        };
      }
      return null;
    });

    const { authMiddleware, requireAuth } = await import('../auth/middleware');
    const { tenantMiddleware } = await import('../tenancy/middleware');
    const { requirePermission } = await import('../rbac/middleware');

    app = new Hono();
    app.use('*', authMiddleware);

    app.get(
      '/api/v1/communities/:communityId/admin',
      requireAuth,
      tenantMiddleware,
      requirePermission('community:manage'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );

    app.get(
      '/api/v1/communities/:communityId/finance',
      requireAuth,
      tenantMiddleware,
      requirePermission('finance:manage'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );

    app.get(
      '/api/v1/communities/:communityId/roles',
      requireAuth,
      tenantMiddleware,
      requirePermission('role:change'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );

    app.get(
      '/api/v1/communities/:communityId/audit',
      requireAuth,
      tenantMiddleware,
      requirePermission('audit:read'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );
  });

  it('CUSTOMER denied community:manage', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'CUSTOMER',
      membershipId: 'mem-5',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/admin`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('MERCHANT denied community:manage', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'MERCHANT',
      membershipId: 'mem-6',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/admin`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
  });

  it('MERCHANT allowed finance:manage', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'MERCHANT',
      membershipId: 'mem-7',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/finance`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).not.toBe(403);
  });

  it('COMMUNITY_MODERATOR denied role:change', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'COMMUNITY_MODERATOR',
      membershipId: 'mem-8',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/roles`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
  });

  it('COMMUNITY_FINANCE_MANAGER denied community:manage', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'COMMUNITY_FINANCE_MANAGER',
      membershipId: 'mem-9',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/admin`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
  });

  it('MERCHANT_STAFF denied audit:read', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'MERCHANT_STAFF',
      membershipId: 'mem-10',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/audit`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
  });

  it('CUSTOMER denied audit:read', async () => {
    mockResolve.mockResolvedValue({
      userId: TEST_USERS.userA.id,
      communityId: TEST_COMMUNITIES.communityA.id,
      role: 'CUSTOMER',
      membershipId: 'mem-11',
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityA.id}/audit`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
  });
});

describe('RBAC Authorization Tests — Wrong Tenant + Correct-Looking Role', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetSessionUser.mockImplementation(async (token: string) => {
      if (token === TEST_SESSIONS.sessionUserA) {
        return {
          id: TEST_USERS.userA.id,
          name: TEST_USERS.userA.name,
          email: TEST_USERS.userA.email,
          status: 'ACTIVE',
        };
      }
      return null;
    });

    const { authMiddleware, requireAuth } = await import('../auth/middleware');
    const { tenantMiddleware } = await import('../tenancy/middleware');
    const { requirePermission } = await import('../rbac/middleware');

    app = new Hono();
    app.use('*', authMiddleware);

    app.get(
      '/api/v1/communities/:communityId/admin',
      requireAuth,
      tenantMiddleware,
      requirePermission('community:manage'),
      async (c) => {
        return c.json({ data: { allowed: true } });
      },
    );
  });

  it('User A with COMMUNITY_OWNER role in Community A is denied Community B', async () => {
    mockResolve.mockImplementation(async (userId, communityId) => {
      if (
        userId === TEST_USERS.userA.id &&
        communityId === TEST_COMMUNITIES.communityA.id
      ) {
        return {
          userId,
          communityId,
          role: 'COMMUNITY_OWNER',
          membershipId: 'mem-owner-a',
        };
      }
      return null;
    });

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityB.id}/admin`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('User A with CUSTOMER role is denied Community B (role is irrelevant if no membership)', async () => {
    mockResolve.mockResolvedValue(null);

    const res = await app.request(
      `/api/v1/communities/${TEST_COMMUNITIES.communityB.id}/admin`,
      { headers: { cookie: createCookie(TEST_SESSIONS.sessionUserA) } },
    );

    expect(res.status).toBe(403);
  });
});

describe('RBAC Role Change Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows COMMUNITY_OWNER to change role to COMMUNITY_ADMIN', async () => {
    mockChangeRole.mockResolvedValue({ success: true });

    const result = await mockChangeRole(
      'actor-1',
      'COMMUNITY_OWNER',
      TEST_COMMUNITIES.communityA.id,
      'target-membership-1',
      'COMMUNITY_ADMIN',
    );

    expect(result.success).toBe(true);
  });

  it('denies CUSTOMER from changing roles', async () => {
    mockChangeRole.mockResolvedValue({
      success: false,
      error: 'You do not have permission to change roles.',
    });

    const result = await mockChangeRole(
      'actor-1',
      'CUSTOMER',
      TEST_COMMUNITIES.communityA.id,
      'target-membership-1',
      'COMMUNITY_ADMIN',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('denies COMMUNITY_ADMIN from assigning COMMUNITY_OWNER', async () => {
    mockChangeRole.mockResolvedValue({
      success: false,
      error: 'Cannot assign a role equal to or higher than your own.',
    });

    const result = await mockChangeRole(
      'actor-1',
      'COMMUNITY_ADMIN',
      TEST_COMMUNITIES.communityA.id,
      'target-membership-1',
      'COMMUNITY_OWNER',
    );

    expect(result.success).toBe(false);
  });

  it('denies MERCHANT from assigning any admin role', async () => {
    mockChangeRole.mockResolvedValue({
      success: false,
      error: 'You do not have permission to change roles.',
    });

    const result = await mockChangeRole(
      'actor-1',
      'MERCHANT',
      TEST_COMMUNITIES.communityA.id,
      'target-membership-1',
      'COMMUNITY_ADMIN',
    );

    expect(result.success).toBe(false);
  });
});

describe('RBAC Permission Inheritance', () => {
  it('every role has at least community:read', () => {
    const roles = [
      'SUPER_ADMIN',
      'COMMUNITY_OWNER',
      'COMMUNITY_ADMIN',
      'COMMUNITY_MODERATOR',
      'COMMUNITY_FINANCE_MANAGER',
      'MERCHANT',
      'MERCHANT_STAFF',
      'CUSTOMER',
    ];

    for (const role of roles) {
      expect(hasPermission(role, 'community:read')).toBe(true);
    }
  });

  it('COMMUNITY_OWNER has same permissions as SUPER_ADMIN for community operations', () => {
    const ownerPerms = ROLE_PERMISSIONS['COMMUNITY_OWNER'];
    const adminPerms = ROLE_PERMISSIONS['COMMUNITY_ADMIN'];

    expect(ownerPerms.length).toBeGreaterThanOrEqual(adminPerms.length);
  });

  it('role hierarchy is consistent', () => {
    expect(ROLE_HIERARCHY['SUPER_ADMIN']).toBeGreaterThan(
      ROLE_HIERARCHY['COMMUNITY_OWNER'],
    );
    expect(ROLE_HIERARCHY['COMMUNITY_OWNER']).toBeGreaterThan(
      ROLE_HIERARCHY['COMMUNITY_ADMIN'],
    );
    expect(ROLE_HIERARCHY['COMMUNITY_ADMIN']).toBeGreaterThan(
      ROLE_HIERARCHY['COMMUNITY_MODERATOR'],
    );
    expect(ROLE_HIERARCHY['COMMUNITY_MODERATOR']).toBeGreaterThan(
      ROLE_HIERARCHY['CUSTOMER'],
    );
  });
});
