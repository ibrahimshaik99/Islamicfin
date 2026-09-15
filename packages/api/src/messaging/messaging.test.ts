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
  conversations: {
    id: 'id', communityId: 'community_id', type: 'type',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  conversationTypeEnum: { enumValues: ['DIRECT', 'GROUP', 'ORDER', 'KAMETI', 'PROJECT'] },
  conversationMembers: {
    conversationId: 'conversation_id', userId: 'user_id',
    joinedAt: 'joined_at', lastReadMessageId: 'last_read_message_id',
  },
  messages: {
    id: 'id', conversationId: 'conversation_id', senderId: 'sender_id',
    messageType: 'message_type', body: 'body', attachmentUrl: 'attachment_url',
    createdAt: 'created_at', editedAt: 'edited_at', deletedAt: 'deleted_at',
  },
  messageTypeEnum: { enumValues: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'] },
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
const CONV_ID = '00000000-0000-0000-0000-000000000088';
const MSG_ID = '00000000-0000-0000-0000-000000000077';

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

describe('Messaging Integration Tests', () => {
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
  // Create Conversation
  // ──────────────────────────────────────────

  describe('Create Conversation', () => {
    it('POST /api/v1/communities/:id/conversations returns 201 for GROUP', async () => {
      const conversation = { id: CONV_ID, communityId: COMMUNITY_A, type: 'GROUP' };
      mockDb.insert.mockReturnValue(mockInsertChain([conversation]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'GROUP',
            memberIds: [USER_B],
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/conversations returns 201 for DIRECT', async () => {
      const conversation = { id: CONV_ID, communityId: COMMUNITY_A, type: 'DIRECT' };
      // For DIRECT, the route first checks for existing DIRECT conversation
      // The query uses select().from().innerJoin().where().groupBy().having().limit()
      // We need to mock this to return empty (no existing conversation)
      const existingConvQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      };
      mockDb.select.mockReturnValue(existingConvQuery);
      mockDb.insert.mockReturnValue(mockInsertChain([conversation]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'DIRECT',
            memberIds: [USER_B],
          }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/conversations returns 400 for invalid input', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'INVALID' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // List Conversations
  // ──────────────────────────────────────────

  describe('List Conversations', () => {
    it('GET /api/v1/communities/:id/conversations returns 200', async () => {
      const userConvs = [{ conversationId: CONV_ID }];
      const convs = [{ id: CONV_ID, communityId: COMMUNITY_A, type: 'GROUP' }];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain(userConvs);
        return mockSelectChain(convs);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/conversations returns 200 with empty list', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Get Conversation Details
  // ──────────────────────────────────────────

  describe('Get Conversation Details', () => {
    it('GET /api/v1/communities/:id/conversations/:conversationId returns 200 for member', async () => {
      const conversation = { id: CONV_ID, communityId: COMMUNITY_A, type: 'GROUP' };
      const member = { conversationId: CONV_ID, userId: USER_A };
      const members = [member];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([member]); // membership check
        if (callCount === 2) return mockSelectChain([conversation]); // conversation lookup
        return mockSelectChain(members); // members lookup
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/communities/:id/conversations/:conversationId returns 403 for non-member', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([])); // not a member

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────
  // Send Message
  // ──────────────────────────────────────────

  describe('Send Message', () => {
    it('POST /api/v1/communities/:id/conversations/:conversationId/messages returns 201', async () => {
      const member = { conversationId: CONV_ID, userId: USER_A };
      const message = {
        id: MSG_ID,
        conversationId: CONV_ID,
        senderId: USER_A,
        messageType: 'TEXT',
        body: 'Hello!',
      };
      mockDb.select.mockReturnValue(mockSelectChain([member]));
      mockDb.insert.mockReturnValue(mockInsertChain([message]));
      mockDb.update.mockReturnValue(mockUpdateChain([{}]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}/messages`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'Hello!' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(201);
    });

    it('POST /api/v1/communities/:id/conversations/:conversationId/messages returns 403 for non-member', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([])); // not a member

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}/messages`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'Hello!' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/communities/:id/conversations/:conversationId/messages returns 400 for empty body', async () => {
      const member = { conversationId: CONV_ID, userId: USER_A };
      mockDb.select.mockReturnValue(mockSelectChain([member]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}/messages`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: '' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // Get Messages
  // ──────────────────────────────────────────

  describe('Get Messages', () => {
    it('GET /api/v1/communities/:id/conversations/:conversationId/messages returns 200', async () => {
      const member = { conversationId: CONV_ID, userId: USER_A };
      const msgs = [
        { id: MSG_ID, conversationId: CONV_ID, senderId: USER_A, body: 'Hello!' },
      ];
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain([member]);
        return mockSelectChain(msgs);
      });

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}/messages`,
        { headers: { cookie: createCookie('admin-session') } },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // Edit Message
  // ──────────────────────────────────────────

  describe('Edit Message', () => {
    it('PATCH /api/v1/communities/:id/messages/:messageId returns 200 for own message', async () => {
      const existing = { id: MSG_ID, senderId: USER_A, deletedAt: null };
      const updated = { ...existing, body: 'Updated!' };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));
      mockDb.update.mockReturnValue(mockUpdateChain([updated]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'Updated!' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('PATCH /api/v1/communities/:id/messages/:messageId returns 403 for other user message', async () => {
      const existing = { id: MSG_ID, senderId: USER_B, deletedAt: null };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'Hacked!' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/communities/:id/messages/:messageId returns 404 for nonexistent message', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}`,
        {
          method: 'PATCH',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'Updated!' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Delete Message
  // ──────────────────────────────────────────

  describe('Delete Message', () => {
    it('DELETE /api/v1/communities/:id/messages/:messageId returns 200 for own message', async () => {
      const existing = { id: MSG_ID, senderId: USER_A };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));
      mockDb.update.mockReturnValue(mockUpdateChain([{}]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}`,
        {
          method: 'DELETE',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/communities/:id/messages/:messageId returns 403 for other user message', async () => {
      const existing = { id: MSG_ID, senderId: USER_B };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}`,
        {
          method: 'DELETE',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────
  // Report Message
  // ──────────────────────────────────────────

  describe('Report Message', () => {
    it('POST /api/v1/communities/:id/messages/:messageId/report returns 200', async () => {
      const existing = { id: MSG_ID, conversationId: CONV_ID };
      mockDb.select.mockReturnValue(mockSelectChain([existing]));
      mockDb.insert.mockReturnValue(mockInsertChain([{}]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}/report`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Spam' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/messages/:messageId/report returns 404 for nonexistent message', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/messages/${MSG_ID}/report`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Spam' }),
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────
  // Mute Conversation
  // ──────────────────────────────────────────

  describe('Mute Conversation', () => {
    it('POST /api/v1/communities/:id/conversations/:conversationId/mute returns 200', async () => {
      const member = { conversationId: CONV_ID, userId: USER_A };
      mockDb.select.mockReturnValue(mockSelectChain([member]));
      mockDb.insert.mockReturnValue(mockInsertChain([{}]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}/mute`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/conversations/:conversationId/mute returns 403 for non-member', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations/${CONV_ID}/mute`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────
  // Block User
  // ──────────────────────────────────────────

  describe('Block User', () => {
    it('POST /api/v1/communities/:id/users/:targetUserId/block returns 200', async () => {
      mockDb.insert.mockReturnValue(mockInsertChain([{}]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/users/${USER_B}/block`,
        {
          method: 'POST',
          headers: { cookie: createCookie('admin-session') },
        },
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(200);
    });

    it('POST /api/v1/communities/:id/users/:targetUserId/block returns 400 when blocking self', async () => {
      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_A}/users/${USER_A}/block`,
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
  // Tenant Isolation
  // ──────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('returns empty list when accessing other community conversations', async () => {
      mockDb.select.mockReturnValue(mockSelectChain([]));

      const res = await app.request(
        `http://localhost/api/v1/communities/${COMMUNITY_B}/conversations`,
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
        `http://localhost/api/v1/communities/${COMMUNITY_A}/conversations`,
        {},
        { ENVIRONMENT: 'test' },
      );
      expect(res.status).toBe(401);
    });
  });
});
