import { Hono } from 'hono';
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { communityDirectory, contractTemplates } from '../db/schema/community-directory';
import { communities, communityMemberships, users } from '../db/schema';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const directoryRoutes = new Hono();

const createEntrySchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  documentUrl: z.string().url().optional(),
  documentType: z.string().max(100).optional(),
  financeType: z.enum(['QARD_HASAN', 'MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH', 'NONE']).optional(),
  kametiPreference: z.enum(['YES', 'NO', 'MAYBE']).optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT', 'COMMUNITY_ADMIN', 'COMMUNITY_MODERATOR']).optional(),
  notes: z.string().optional(),
});

const updateEntrySchema = createEntrySchema.partial();

// List directory entries for community
directoryRoutes.get(
  '/:communityId/directory',
  requireAuth,
  tenantMiddleware,
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const search = c.req.query('search');
    const offset = (page - 1) * limit;

    const conditions = [eq(communityDirectory.communityId, communityId)];
    if (search) {
      conditions.push(ilike(communityDirectory.name, `%${search}%`));
    }

    const where = and(...conditions);

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(communityDirectory)
      .where(where);

    const data = await db
      .select()
      .from(communityDirectory)
      .where(where)
      .orderBy(desc(communityDirectory.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
);

// Create directory entry
directoryRoutes.post(
  '/:communityId/directory',
  requireAuth,
  tenantMiddleware,
  requirePermission('member:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const body = await c.req.json();
    const result = createEntrySchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } }, 400);
    }

    const [entry] = await db
      .insert(communityDirectory)
      .values({
        communityId: tenant.communityId,
        addedByUserId: user.id,
        ...result.data,
        email: result.data.email || undefined,
      })
      .returning();

    return c.json({ data: entry }, 201);
  },
);

// Update directory entry
directoryRoutes.patch(
  '/:communityId/directory/:entryId',
  requireAuth,
  tenantMiddleware,
  requirePermission('member:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { entryId } = c.req.param();
    const body = await c.req.json();
    const result = updateEntrySchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } }, 400);
    }

    const [updated] = await db
      .update(communityDirectory)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(communityDirectory.id, entryId), eq(communityDirectory.communityId, tenant.communityId)))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Entry not found.' } }, 404);
    }

    return c.json({ data: updated });
  },
);

// Delete directory entry
directoryRoutes.delete(
  '/:communityId/directory/:entryId',
  requireAuth,
  tenantMiddleware,
  requirePermission('member:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { entryId } = c.req.param();

    const [deleted] = await db
      .delete(communityDirectory)
      .where(and(eq(communityDirectory.id, entryId), eq(communityDirectory.communityId, tenant.communityId)))
      .returning();

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Entry not found.' } }, 404);
    }

    return c.json({ data: { success: true } });
  },
);

// Bulk create directory entries
directoryRoutes.post(
  '/:communityId/directory/bulk',
  requireAuth,
  tenantMiddleware,
  requirePermission('member:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const body = await c.req.json();
    const entries = body.entries;

    if (!Array.isArray(entries) || entries.length === 0) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'entries array is required.' } }, 400);
    }

    if (entries.length > 500) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Maximum 500 entries per bulk import.' } }, 400);
    }

    const validEntries = entries.map((e: Record<string, unknown>) => ({
      communityId: tenant.communityId,
      addedByUserId: user.id,
      name: String(e.Name || e.name || '').trim(),
      phone: String(e.Phone || e.phone || '').trim() || undefined,
      address: String(e.Address || e.address || '').trim() || undefined,
      email: String(e.Email || e.email || '').trim() || undefined,
      documentType: String(e['Document Type'] || e.documentType || '').trim() || undefined,
      financeType: (String(e['Finance Type'] || e.financeType || 'NONE').trim() || 'NONE') as 'QARD_HASAN' | 'MUDARABAH' | 'MUSHARAKAH' | 'MURABAHAH' | 'IJARAH' | 'NONE',
      kametiPreference: (String(e.Kameti || e.kametiPreference || 'NO').trim() || 'NO') as 'YES' | 'NO' | 'MAYBE',
      role: (String(e['User Type'] || e.role || 'CUSTOMER').trim() || 'CUSTOMER') as 'CUSTOMER' | 'MERCHANT' | 'COMMUNITY_ADMIN' | 'COMMUNITY_MODERATOR',
      notes: String(e.Notes || e.notes || '').trim() || undefined,
    })).filter((e: { name: string }) => e.name.length > 0);

    if (validEntries.length === 0) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'No valid entries found. Each entry must have a Name.' } }, 400);
    }

    const inserted = await db
      .insert(communityDirectory)
      .values(validEntries)
      .returning();

    return c.json({ data: { count: inserted.length, entries: inserted } }, 201);
  },
);

// ── Contract Templates ──

const createContractTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  contractType: z.string().min(1).max(50),
  content: z.string().min(1),
  principalAmount: z.string().optional(),
  partnerName: z.string().optional(),
  durationMonths: z.string().optional(),
  profitSharePercent: z.string().optional(),
  assetDescription: z.string().optional(),
  additionalTerms: z.string().optional(),
});

const updateContractTemplateSchema = createContractTemplateSchema.partial();

// List contract templates
directoryRoutes.get(
  '/:communityId/contracts',
  requireAuth,
  tenantMiddleware,
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(contractTemplates)
      .where(eq(contractTemplates.communityId, communityId));

    const data = await db
      .select()
      .from(contractTemplates)
      .where(eq(contractTemplates.communityId, communityId))
      .orderBy(desc(contractTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
);

// Get single contract template
directoryRoutes.get(
  '/:communityId/contracts/:contractId',
  requireAuth,
  tenantMiddleware,
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId } = c.req.param();

    const [template] = await db
      .select()
      .from(contractTemplates)
      .where(and(eq(contractTemplates.id, contractId), eq(contractTemplates.communityId, tenant.communityId)))
      .limit(1);

    if (!template) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found.' } }, 404);
    }

    return c.json({ data: template });
  },
);

// Create contract template
directoryRoutes.post(
  '/:communityId/contracts',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const body = await c.req.json();
    const result = createContractTemplateSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } }, 400);
    }

    const [template] = await db
      .insert(contractTemplates)
      .values({
        communityId: tenant.communityId,
        createdByUserId: user.id,
        ...result.data,
      })
      .returning();

    return c.json({ data: template }, 201);
  },
);

// Update contract template
directoryRoutes.patch(
  '/:communityId/contracts/:contractId',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId } = c.req.param();
    const body = await c.req.json();
    const result = updateContractTemplateSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } }, 400);
    }

    const [updated] = await db
      .update(contractTemplates)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(contractTemplates.id, contractId), eq(contractTemplates.communityId, tenant.communityId)))
      .returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found.' } }, 404);
    }

    return c.json({ data: updated });
  },
);

// Delete contract template
directoryRoutes.delete(
  '/:communityId/contracts/:contractId',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId } = c.req.param();

    const [deleted] = await db
      .delete(contractTemplates)
      .where(and(eq(contractTemplates.id, contractId), eq(contractTemplates.communityId, tenant.communityId)))
      .returning();

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found.' } }, 404);
    }

    return c.json({ data: { success: true } });
  },
);

// ── Super Admin access: list all directories ──
const superAdminDirectoryRoutes = new Hono();

superAdminDirectoryRoutes.get(
  '/directory',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const search = c.req.query('search');
    const communityFilter = c.req.query('communityId');
    const offset = (page - 1) * limit;

    // Check super admin
    const [membership] = await db
      .select()
      .from(communityMemberships)
      .where(and(eq(communityMemberships.userId, user.id), eq(communityMemberships.role, 'SUPER_ADMIN')))
      .limit(1);

    if (!membership) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Super admin access required.' } }, 403);
    }

    const conditions = [];
    if (search) {
      conditions.push(ilike(communityDirectory.name, `%${search}%`));
    }
    if (communityFilter) {
      conditions.push(eq(communityDirectory.communityId, communityFilter));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(communityDirectory)
      .where(where);

    const data = await db
      .select({
        id: communityDirectory.id,
        communityId: communityDirectory.communityId,
        name: communityDirectory.name,
        phone: communityDirectory.phone,
        address: communityDirectory.address,
        email: communityDirectory.email,
        financeType: communityDirectory.financeType,
        kametiPreference: communityDirectory.kametiPreference,
        role: communityDirectory.role,
        documentType: communityDirectory.documentType,
        createdAt: communityDirectory.createdAt,
        communityName: communities.name,
      })
      .from(communityDirectory)
      .leftJoin(communities, eq(communityDirectory.communityId, communities.id))
      .where(where)
      .orderBy(desc(communityDirectory.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
);

// ── Super Admin access: list all contracts ──
superAdminDirectoryRoutes.get(
  '/contracts',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const communityFilter = c.req.query('communityId');
    const offset = (page - 1) * limit;

    const [membership] = await db
      .select()
      .from(communityMemberships)
      .where(and(eq(communityMemberships.userId, user.id), eq(communityMemberships.role, 'SUPER_ADMIN')))
      .limit(1);

    if (!membership) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Super admin access required.' } }, 403);
    }

    const conditions = [];
    if (communityFilter) {
      conditions.push(eq(contractTemplates.communityId, communityFilter));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(contractTemplates)
      .where(where);

    const data = await db
      .select({
        id: contractTemplates.id,
        communityId: contractTemplates.communityId,
        title: contractTemplates.title,
        contractType: contractTemplates.contractType,
        principalAmount: contractTemplates.principalAmount,
        partnerName: contractTemplates.partnerName,
        status: contractTemplates.status,
        createdAt: contractTemplates.createdAt,
        communityName: communities.name,
      })
      .from(contractTemplates)
      .leftJoin(communities, eq(contractTemplates.communityId, communities.id))
      .where(where)
      .orderBy(desc(contractTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
);

export { superAdminDirectoryRoutes };
export default directoryRoutes;
