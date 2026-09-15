import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  serviceCategories,
  serviceListings,
  serviceRequests,
} from '../db/schema/services';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const servicesRoutes = new Hono();

// ──────────────────────────────────────────
// Service Request State Machine
// ──────────────────────────────────────────

type ServiceRequestStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

const VALID_SERVICE_REQUEST_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

function isValidServiceRequestTransition(from: ServiceRequestStatus, to: ServiceRequestStatus): boolean {
  return VALID_SERVICE_REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────
// Create Service Category (Admin)
// ──────────────────────────────────────────

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
});

servicesRoutes.post(
  '/:communityId/services/categories',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createCategorySchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [category] = await db
      .insert(serviceCategories)
      .values({
        communityId,
        name: result.data.name,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'service.category.create',
      entityType: 'service_category',
      entityId: category.id,
      newValues: { name: category.name },
    });

    return c.json({ data: category }, 201);
  },
);

// ──────────────────────────────────────────
// List Service Categories
// ──────────────────────────────────────────

servicesRoutes.get(
  '/:communityId/services/categories',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const categories = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.communityId, communityId))
      .orderBy(serviceCategories.name);

    return c.json({ data: categories });
  },
);

// ──────────────────────────────────────────
// Create Service Listing (Provider)
// ──────────────────────────────────────────

const createListingSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  location: z.string().max(255).optional(),
  availability: z.string().max(500).optional(),
});

servicesRoutes.post(
  '/:communityId/services/listings',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createListingSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate price is positive if provided
    if (result.data.price && parseFloat(result.data.price) < 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Price must be non-negative.' } },
        400,
      );
    }

    // Validate category exists if provided
    if (result.data.categoryId) {
      const [category] = await db
        .select()
        .from(serviceCategories)
        .where(
          and(
            eq(serviceCategories.id, result.data.categoryId),
            eq(serviceCategories.communityId, communityId),
          ),
        )
        .limit(1);

      if (!category) {
        return c.json(
          { error: { code: 'NOT_FOUND', message: 'Category not found.' } },
          404,
        );
      }
    }

    const [listing] = await db
      .insert(serviceListings)
      .values({
        communityId,
        providerId: user.id,
        ...result.data,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'service.listing.create',
      entityType: 'service_listing',
      entityId: listing.id,
      newValues: { title: listing.title },
    });

    return c.json({ data: listing }, 201);
  },
);

// ──────────────────────────────────────────
// List Service Listings
// ──────────────────────────────────────────

servicesRoutes.get(
  '/:communityId/services/listings',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const listings = await db
      .select()
      .from(serviceListings)
      .where(eq(serviceListings.communityId, communityId))
      .orderBy(desc(serviceListings.createdAt));

    return c.json({ data: listings });
  },
);

// ──────────────────────────────────────────
// Get Service Listing Details
// ──────────────────────────────────────────

servicesRoutes.get(
  '/:communityId/services/listings/:listingId',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const listingId = c.req.param('listingId')!;

    const [listing] = await db
      .select()
      .from(serviceListings)
      .where(
        and(
          eq(serviceListings.id, listingId),
          eq(serviceListings.communityId, communityId),
        ),
      )
      .limit(1);

    if (!listing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Service listing not found.' } },
        404,
      );
    }

    return c.json({ data: listing });
  },
);

// ──────────────────────────────────────────
// Update Service Listing (Provider/Admin)
// ──────────────────────────────────────────

const updateListingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  location: z.string().max(255).optional(),
  availability: z.string().max(500).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

servicesRoutes.patch(
  '/:communityId/services/listings/:listingId',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const listingId = c.req.param('listingId')!;

    const body = await c.req.json();
    const result = updateListingSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate price is positive if provided
    if (result.data.price && parseFloat(result.data.price) < 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Price must be non-negative.' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(serviceListings)
      .where(
        and(
          eq(serviceListings.id, listingId),
          eq(serviceListings.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Service listing not found.' } },
        404,
      );
    }

    // Only provider or admin can update
    if (existing.providerId !== user.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only update your own listings.' } },
        403,
      );
    }

    const [updated] = await db
      .update(serviceListings)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(serviceListings.id, listingId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'service.listing.update',
      entityType: 'service_listing',
      entityId: listingId,
      oldValues: { title: existing.title, status: existing.status },
      newValues: result.data,
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Create Service Request (Requester)
// ──────────────────────────────────────────

const createRequestSchema = z.object({
  listingId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  preferredDate: z.string().max(50).optional(),
}).refine(data => data.listingId || data.serviceId, {
  message: 'Either listingId or serviceId is required',
});

servicesRoutes.post(
  '/:communityId/services/requests',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:request:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createRequestSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate service exists and is active
    const serviceListingId = result.data.listingId || result.data.serviceId;
    const [service] = await db
      .select()
      .from(serviceListings)
      .where(
        and(
          eq(serviceListings.id, serviceListingId),
          eq(serviceListings.communityId, communityId),
        ),
      )
      .limit(1);

    if (!service) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Service listing not found.' } },
        404,
      );
    }

    if (service.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Service listing is not active.' } },
        400,
      );
    }

    // Cannot request own service
    if (service.providerId === user.id) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot request your own service.' } },
        400,
      );
    }

    const [request] = await db
      .insert(serviceRequests)
      .values({
        communityId,
        requesterId: user.id,
        serviceId: serviceListingId,
        description: result.data.description,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'service.request.create',
      entityType: 'service_request',
      entityId: request.id,
      newValues: { serviceId: serviceListingId, providerId: service.providerId },
    });

    return c.json({ data: request }, 201);
  },
);

// ──────────────────────────────────────────
// List Service Requests
// ──────────────────────────────────────────

servicesRoutes.get(
  '/:communityId/services/requests',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:request:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    // Users can see their own requests + requests for their services
    const requests = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.communityId, communityId))
      .orderBy(desc(serviceRequests.createdAt));

    return c.json({ data: requests });
  },
);

// ──────────────────────────────────────────
// Update Service Request Status
// ──────────────────────────────────────────

const updateRequestStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']),
  reason: z.string().max(500).optional(),
});

servicesRoutes.patch(
  '/:communityId/services/requests/:requestId/status',
  requireAuth,
  tenantMiddleware,
  requirePermission('service:request:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const requestId = c.req.param('requestId')!;

    const body = await c.req.json();
    const result = updateRequestStatusSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Service request not found.' } },
        404,
      );
    }

    // Validate state transition
    if (!isValidServiceRequestTransition(existing.status as ServiceRequestStatus, result.data.status)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: `Cannot transition from "${existing.status}" to "${result.data.status}".` } },
        400,
      );
    }

    // Authorization: requester can cancel, provider can accept/reject/complete
    // Admin can do anything
    const [service] = await db
      .select()
      .from(serviceListings)
      .where(eq(serviceListings.id, existing.serviceId))
      .limit(1);

    const isRequester = existing.requesterId === user.id;
    const isProvider = service?.providerId === user.id;

    if (!isRequester && !isProvider) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You are not authorized to update this request.' } },
        403,
      );
    }

    // Requester can only cancel
    if (isRequester && !isProvider && result.data.status !== 'CANCELLED') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Requesters can only cancel requests.' } },
        403,
      );
    }

    const [updated] = await db
      .update(serviceRequests)
      .set({ status: result.data.status, updatedAt: new Date() })
      .where(eq(serviceRequests.id, requestId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'service.request.update_status',
      entityType: 'service_request',
      entityId: requestId,
      oldValues: { status: existing.status },
      newValues: { status: result.data.status, reason: result.data.reason },
    });

    return c.json({ data: updated });
  },
);

export default servicesRoutes;
