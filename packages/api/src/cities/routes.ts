import { Hono } from 'hono';
import { z } from 'zod';
import { eq, asc, count, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { cities } from '../db/schema/cities';
import { communities } from '../db/schema/communities';
import { requireAuth } from '../auth/middleware';
import { requireSuperAdmin } from '../admin/middleware';
import { auditLogs } from '../db/schema/audit';

// Public (authenticated) city endpoints — used by onboarding
export const cityRoutes = new Hono();

// Super Admin city management endpoints
export const superAdminCityRoutes = new Hono();

cityRoutes.get('/cities', requireAuth, async (c) => {
  const rows = await db
    .select({
      id: cities.id,
      name: cities.name,
      state: cities.state,
      slug: cities.slug,
      status: cities.status,
      activeCommunityCount: sql<number>`(
        select count(*) from communities c
        where c.city_id = "cities"."id" and c.status = 'ACTIVE'
      )`,
    })
    .from(cities)
    .where(eq(cities.status, 'ACTIVE'))
    .orderBy(asc(cities.name));

  return c.json({ data: rows });
});

cityRoutes.get('/cities/:cityId/communities', requireAuth, async (c) => {
  const { cityId } = c.req.param();

  const [city] = await db
    .select()
    .from(cities)
    .where(eq(cities.id, cityId))
    .limit(1);

  if (!city || city.status !== 'ACTIVE') {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'City not found' } },
      404,
    );
  }

  const rows = await db
    .select({
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      description: communities.description,
      logoUrl: communities.logoUrl,
      address: communities.address,
      status: communities.status,
    })
    .from(communities)
    .where(and(eq(communities.cityId, cityId), eq(communities.status, 'ACTIVE')))
    .orderBy(asc(communities.name));

  return c.json({ data: { city: { id: city.id, name: city.name, state: city.state }, communities: rows } });
});

superAdminCityRoutes.use('*', requireSuperAdmin);

const cityCreateSchema = z.object({
  name: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
});

superAdminCityRoutes.post('/cities', async (c) => {
  const body = await c.req.json();
  const result = cityCreateSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message } },
      422,
    );
  }

  const slug =
    result.data.slug ||
    `${result.data.name}-${result.data.state}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const existing = await db
    .select({ id: cities.id })
    .from(cities)
    .where(eq(cities.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return c.json(
      { error: { code: 'CONFLICT', message: 'A city with this slug already exists.' } },
      409,
    );
  }

  const [created] = await db
    .insert(cities)
    .values({ name: result.data.name, state: result.data.state, slug, status: 'ACTIVE' })
    .returning();

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'city.create',
    entityType: 'city',
    entityId: created.id,
    newValues: { name: created.name, state: created.state, slug: created.slug },
  });

  return c.json({ data: created }, 201);
});

superAdminCityRoutes.get('/cities', async (c) => {
  const rows = await db
    .select({
      id: cities.id,
      name: cities.name,
      state: cities.state,
      slug: cities.slug,
      status: cities.status,
      createdAt: cities.createdAt,
      communityCount: sql<number>`(select count(*) from communities c where c.city_id = "cities"."id")`,
    })
    .from(cities)
    .orderBy(asc(cities.name));

  return c.json({ data: rows });
});

const cityUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  state: z.string().min(1).max(120).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

superAdminCityRoutes.patch('/cities/:cityId', async (c) => {
  const { cityId } = c.req.param();
  const body = await c.req.json();
  const result = cityUpdateSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
      400,
    );
  }

  const [existing] = await db.select().from(cities).where(eq(cities.id, cityId)).limit(1);
  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'City not found' } }, 404);
  }

  const [updated] = await db
    .update(cities)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(cities.id, cityId))
    .returning();

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'city.update',
    entityType: 'city',
    entityId: cityId,
    oldValues: { name: existing.name, status: existing.status },
    newValues: result.data as Record<string, unknown>,
  });

  return c.json({ data: updated });
});

superAdminCityRoutes.delete('/cities/:cityId', async (c) => {
  const { cityId } = c.req.param();

  const [existing] = await db.select().from(cities).where(eq(cities.id, cityId)).limit(1);
  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'City not found' } }, 404);
  }

  const linked = await db
    .select({ count: count() })
    .from(communities)
    .where(eq(communities.cityId, cityId));

  if (linked[0].count > 0) {
    return c.json(
      {
        error: {
          code: 'CITY_IN_USE',
          message: 'City has communities attached. Disable it instead of deleting.',
        },
      },
      409,
    );
  }

  await db.delete(cities).where(eq(cities.id, cityId));

  await db.insert(auditLogs).values({
    actorId: c.get('user')!.id,
    action: 'city.delete',
    entityType: 'city',
    entityId: cityId,
    oldValues: { name: existing.name, state: existing.state },
  });

  return c.json({ data: { id: cityId, deleted: true } });
});
