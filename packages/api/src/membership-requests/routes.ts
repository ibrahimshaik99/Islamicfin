import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
import { db } from '../db';
import { membershipRequests } from '../db/schema/membership-requests';
import { communityMemberships, communities } from '../db/schema/communities';
import { requireAuth } from '../auth/middleware';

const membershipRequestRoutes = new Hono();

// List active communities (for join dropdown)
membershipRequestRoutes.get(
  '/communities',
  requireAuth,
  async (c) => {
    const activeCommunities = await db
      .select()
      .from(communities)
      .where(eq(communities.status, 'ACTIVE'))
      .orderBy(communities.name);

    return c.json({ data: activeCommunities });
  },
);

// Create a membership request (any authenticated user)
const createRequestSchema = z.object({
  requestType: z.enum(['JOIN_COMMUNITY', 'CREATE_COMMUNITY']),
  communityId: z.string().uuid().optional(),
  communityName: z.string().max(255).optional(),
  communitySlug: z.string().max(255).optional(),
  message: z.string().max(1000).optional(),
});

membershipRequestRoutes.post(
  '/',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const body = await c.req.json();
    const result = createRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const { requestType, communityId, communityName, communitySlug, message } = result.data;

    // For JOIN_COMMUNITY, communityId is required
    if (requestType === 'JOIN_COMMUNITY' && !communityId) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Community ID is required for join requests' } },
        400,
      );
    }

    // For CREATE_COMMUNITY, communityName and communitySlug are required
    if (requestType === 'CREATE_COMMUNITY' && (!communityName || !communitySlug)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Community name and slug are required for create requests' } },
        400,
      );
    }

    // Check if user already has a pending request of this type
    const existingRequest = await db
      .select()
      .from(membershipRequests)
      .where(
        and(
          eq(membershipRequests.userId, user.id),
          eq(membershipRequests.status, 'PENDING'),
          requestType === 'JOIN_COMMUNITY'
            ? eq(membershipRequests.communityId, communityId!)
            : eq(membershipRequests.requestType, 'CREATE_COMMUNITY'),
        ),
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return c.json(
        { error: { code: 'ALREADY_EXISTS', message: 'You already have a pending request of this type' } },
        409,
      );
    }

    // For JOIN_COMMUNITY, check if user is already a member
    if (requestType === 'JOIN_COMMUNITY' && communityId) {
      const existingMembership = await db
        .select()
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, user.id),
            eq(communityMemberships.communityId, communityId),
          ),
        )
        .limit(1);

      if (existingMembership.length > 0) {
        return c.json(
          { error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this community' } },
          409,
        );
      }

      // Check if community exists and is active
      const community = await db
        .select()
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (community.length === 0) {
        return c.json(
          { error: { code: 'NOT_FOUND', message: 'Community not found' } },
          404,
        );
      }
    }

    // For CREATE_COMMUNITY, check if slug is available
    if (requestType === 'CREATE_COMMUNITY' && communitySlug) {
      const existingCommunity = await db
        .select()
        .from(communities)
        .where(eq(communities.slug, communitySlug))
        .limit(1);

      if (existingCommunity.length > 0) {
        return c.json(
          { error: { code: 'SLUG_TAKEN', message: 'This community slug is already taken' } },
          409,
        );
      }
    }

    const [request] = await db
      .insert(membershipRequests)
      .values({
        userId: user.id,
        communityId: communityId || null,
        requestType,
        communityName: communityName || null,
        communitySlug: communitySlug || null,
        message: message || null,
      })
      .returning();

    return c.json({ data: request }, 201);
  },
);

// List pending requests (super admin sees all, community owner sees their community's requests)
membershipRequestRoutes.get(
  '/',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const status = c.req.query('status') || 'PENDING';
    const requestType = c.req.query('type');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    // Check if user is super admin
    const isSuperAdmin = (await db
      .select()
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.userId, user.id),
          eq(communityMemberships.role, 'SUPER_ADMIN'),
        ),
      )
      .limit(1)).length > 0;

    let whereConditions = [eq(membershipRequests.status, status)];

    if (requestType) {
      whereConditions.push(eq(membershipRequests.requestType, requestType));
    }

    // If not super admin, only show requests for communities they own
    if (!isSuperAdmin) {
      // Get communities where user is owner/admin
      const userCommunities = await db
        .select({ communityId: communityMemberships.communityId })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, user.id),
            eq(communityMemberships.role, 'COMMUNITY_OWNER'),
          ),
        );

      const communityIds = userCommunities.map((uc) => uc.communityId);
      if (communityIds.length === 0) {
        return c.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }

      // For JOIN_COMMUNITY requests, filter by community IDs
      // For CREATE_COMMUNITY requests, show all (super admin only)
      whereConditions.push(eq(membershipRequests.requestType, 'JOIN_COMMUNITY'));
      whereConditions.push(
        inArray(membershipRequests.communityId, communityIds),
      );
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(membershipRequests)
      .where(and(...whereConditions));

    const requests = await db
      .select()
      .from(membershipRequests)
      .where(and(...whereConditions))
      .orderBy(desc(membershipRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: requests,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  },
);

// Approve a request
membershipRequestRoutes.post(
  '/:requestId/approve',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const { requestId } = c.req.param();

    const [request] = await db
      .select()
      .from(membershipRequests)
      .where(eq(membershipRequests.id, requestId))
      .limit(1);

    if (!request) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Request not found' } },
        404,
      );
    }

    if (request.status !== 'PENDING') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Request is not pending' } },
        400,
      );
    }

    if (request.requestType === 'CREATE_COMMUNITY') {
      // Only super admin can approve community creation
      const isSuperAdmin = (await db
        .select()
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, user.id),
            eq(communityMemberships.role, 'SUPER_ADMIN'),
          ),
        )
        .limit(1)).length > 0;

      if (!isSuperAdmin) {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'Only super admin can approve community creation' } },
          403,
        );
      }

      // Create the community
      const [community] = await db
        .insert(communities)
        .values({
          name: request.communityName!,
          slug: request.communitySlug!,
          status: 'ACTIVE',
        })
        .returning();

      // Create COMMUNITY_OWNER membership for the requester
      await db.insert(communityMemberships).values({
        communityId: community.id,
        userId: request.userId,
        role: 'COMMUNITY_OWNER',
        status: 'ACTIVE',
      });
    } else if (request.requestType === 'JOIN_COMMUNITY') {
      // Community owner/admin can approve join requests
      if (!request.communityId) {
        return c.json(
          { error: { code: 'INVALID_STATE', message: 'Request has no community' } },
          400,
        );
      }

      // Check if user has permission to approve
      const hasPermission = (await db
        .select()
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, user.id),
            eq(communityMemberships.communityId, request.communityId),
            eq(communityMemberships.role, 'COMMUNITY_OWNER'),
          ),
        )
        .limit(1)).length > 0;

      const isSuperAdmin = (await db
        .select()
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, user.id),
            eq(communityMemberships.role, 'SUPER_ADMIN'),
          ),
        )
        .limit(1)).length > 0;

      if (!hasPermission && !isSuperAdmin) {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'You do not have permission to approve this request' } },
          403,
        );
      }

      // Create the membership
      await db.insert(communityMemberships).values({
        communityId: request.communityId,
        userId: request.userId,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });
    }

    // Update request status
    const [updated] = await db
      .update(membershipRequests)
      .set({
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(membershipRequests.id, requestId))
      .returning();

    return c.json({ data: updated });
  },
);

// Reject a request
const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

membershipRequestRoutes.post(
  '/:requestId/reject',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const { requestId } = c.req.param();
    const body = await c.req.json();
    const result = rejectSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [request] = await db
      .select()
      .from(membershipRequests)
      .where(eq(membershipRequests.id, requestId))
      .limit(1);

    if (!request) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Request not found' } },
        404,
      );
    }

    if (request.status !== 'PENDING') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Request is not pending' } },
        400,
      );
    }

    // Check permission (same as approve)
    const isSuperAdmin = (await db
      .select()
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.userId, user.id),
          eq(communityMemberships.role, 'SUPER_ADMIN'),
        ),
      )
      .limit(1)).length > 0;

    if (!isSuperAdmin) {
      if (request.requestType === 'CREATE_COMMUNITY') {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'Only super admin can reject community creation' } },
          403,
        );
      }

      if (request.communityId) {
        const hasPermission = (await db
          .select()
          .from(communityMemberships)
          .where(
            and(
              eq(communityMemberships.userId, user.id),
              eq(communityMemberships.communityId, request.communityId),
              eq(communityMemberships.role, 'COMMUNITY_OWNER'),
            ),
          )
          .limit(1)).length > 0;

        if (!hasPermission) {
          return c.json(
            { error: { code: 'FORBIDDEN', message: 'You do not have permission to reject this request' } },
            403,
          );
        }
      }
    }

    const [updated] = await db
      .update(membershipRequests)
      .set({
        status: 'REJECTED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        rejectionReason: result.data.reason || null,
        updatedAt: new Date(),
      })
      .where(eq(membershipRequests.id, requestId))
      .returning();

    return c.json({ data: updated });
  },
);

// Get user's own requests
membershipRequestRoutes.get(
  '/my',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;

    const requests = await db
      .select()
      .from(membershipRequests)
      .where(eq(membershipRequests.userId, user.id))
      .orderBy(desc(membershipRequests.createdAt));

    return c.json({ data: requests });
  },
);

// Get pending request counts (for dashboards)
membershipRequestRoutes.get(
  '/counts',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;

    // Check if super admin
    const isSuperAdmin = (await db
      .select()
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.userId, user.id),
          eq(communityMemberships.role, 'SUPER_ADMIN'),
        ),
      )
      .limit(1)).length > 0;

    let pendingCreateCount = 0;
    let pendingJoinCount = 0;

    if (isSuperAdmin) {
      // Count pending CREATE_COMMUNITY requests
      const [createResult] = await db
        .select({ count: count() })
        .from(membershipRequests)
        .where(
          and(
            eq(membershipRequests.status, 'PENDING'),
            eq(membershipRequests.requestType, 'CREATE_COMMUNITY'),
          ),
        );
      pendingCreateCount = createResult.count;

      // Count all pending JOIN_COMMUNITY requests
      const [joinResult] = await db
        .select({ count: count() })
        .from(membershipRequests)
        .where(
          and(
            eq(membershipRequests.status, 'PENDING'),
            eq(membershipRequests.requestType, 'JOIN_COMMUNITY'),
          ),
        );
      pendingJoinCount = joinResult.count;
    } else {
      // Count pending JOIN_COMMUNITY requests for user's communities
      const userCommunities = await db
        .select({ communityId: communityMemberships.communityId })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, user.id),
            eq(communityMemberships.role, 'COMMUNITY_OWNER'),
          ),
        );

      const communityIds = userCommunities.map((uc) => uc.communityId);
      if (communityIds.length > 0) {
        const [joinResult] = await db
          .select({ count: count() })
          .from(membershipRequests)
          .where(
            and(
              eq(membershipRequests.status, 'PENDING'),
              eq(membershipRequests.requestType, 'JOIN_COMMUNITY'),
              inArray(membershipRequests.communityId, communityIds),
            ),
          );
        pendingJoinCount = joinResult.count;
      }
    }

    return c.json({
      data: {
        pendingCreateCommunities: pendingCreateCount,
        pendingJoinCommunities: pendingJoinCount,
        totalPending: pendingCreateCount + pendingJoinCount,
      },
    });
  },
);

export default membershipRequestRoutes;
