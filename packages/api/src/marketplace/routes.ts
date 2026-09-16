import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc, like, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  productCategories,
  products,
  productImages,
} from '../db/schema/products';
import { merchants } from '../db/schema/merchants';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const marketplaceRoutes = new Hono();

// ──────────────────────────────────────────
// Category Routes
// ──────────────────────────────────────────

// List categories (any authenticated community member)
marketplaceRoutes.get(
  '/:communityId/categories',
  requireAuth,
  tenantMiddleware,
  requirePermission('category:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const categories = await db
      .select()
      .from(productCategories)
      .where(
        and(
          eq(productCategories.communityId, communityId),
          eq(productCategories.status, 'ACTIVE'),
        ),
      )
      .orderBy(desc(productCategories.createdAt));

    return c.json({ data: categories });
  },
);

// Create category (admin only)
marketplaceRoutes.post(
  '/:communityId/categories',
  requireAuth,
  tenantMiddleware,
  requirePermission('category:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = z
      .object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.name?.[0] ?? result.error.flatten().fieldErrors.slug?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const [category] = await db
      .insert(productCategories)
      .values({
        communityId,
        name: result.data.name,
        slug: result.data.slug,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'category.create',
      entityType: 'category',
      entityId: category.id,
      newValues: { name: result.data.name, slug: result.data.slug },
    });

    return c.json({ data: category }, 201);
  },
);

// Update category (admin only)
marketplaceRoutes.patch(
  '/:communityId/categories/:categoryId',
  requireAuth,
  tenantMiddleware,
  requirePermission('category:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { categoryId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
        status: z.enum(['ACTIVE', 'DISABLED']).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(productCategories)
      .where(
        and(
          eq(productCategories.id, categoryId),
          eq(productCategories.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Category not found.' } },
        404,
      );
    }

    const [updated] = await db
      .update(productCategories)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(productCategories.id, categoryId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'category.update',
      entityType: 'category',
      entityId: categoryId,
      oldValues: { name: existing.name, status: existing.status },
      newValues: result.data,
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Product Routes
// ──────────────────────────────────────────

// List products (any authenticated community member - customer browsing)
marketplaceRoutes.get(
  '/:communityId/products',
  requireAuth,
  tenantMiddleware,
  requirePermission('product:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = parseInt(c.req.query('page') ?? '1');
    const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const search = c.req.query('search');
    const categoryId = c.req.query('categoryId');
    const merchantId = c.req.query('merchantId');
    const status = c.req.query('status');
    const minPrice = c.req.query('minPrice');
    const maxPrice = c.req.query('maxPrice');

    const conditions = [eq(products.communityId, communityId)];

    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    if (merchantId) {
      conditions.push(eq(products.merchantId, merchantId));
    }
    if (status) {
      conditions.push(
        eq(products.status, status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK'),
      );
    }
    if (minPrice) {
      conditions.push(sql`${products.price} >= ${minPrice}`);
    }
    if (maxPrice) {
      conditions.push(sql`${products.price} <= ${maxPrice}`);
    }

    // Auto-scope: merchants see only their own products
    if (tenant.role === 'MERCHANT' || tenant.role === 'MERCHANT_STAFF') {
      const [merchantProfile] = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(
          and(
            eq(merchants.userId, tenant.userId),
            eq(merchants.communityId, communityId),
          ),
        )
        .limit(1);

      if (merchantProfile) {
        conditions.push(eq(products.merchantId, merchantProfile.id));
      }
    }

    const where = and(...conditions);

    const data = await db
      .select({
        id: products.id,
        merchantId: products.merchantId,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price: products.price,
        salePrice: products.salePrice,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
        status: products.status,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch images for all products in this page
    const productIds = data.map((p) => p.id);
    const allImages = productIds.length > 0
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];

    const imagesByProduct = new Map<string, typeof allImages>();
    for (const img of allImages) {
      const list = imagesByProduct.get(img.productId) || [];
      list.push(img);
      imagesByProduct.set(img.productId, list);
    }

    const dataWithImages = data.map((p) => ({
      ...p,
      images: imagesByProduct.get(p.id) || [],
    }));

    const total = await db
      .select({ count: count() })
      .from(products)
      .where(where);

    return c.json({
      data: dataWithImages,
      pagination: {
        page,
        limit,
        total: total[0]?.count ?? 0,
        totalPages: Math.ceil((total[0]?.count ?? 0) / limit),
      },
    });
  },
);

// Get product detail
marketplaceRoutes.get(
  '/:communityId/products/:productId',
  requireAuth,
  tenantMiddleware,
  requirePermission('product:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const { productId } = c.req.param();

    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.communityId, communityId),
        ),
      )
      .limit(1);

    if (!product) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Product not found.' } },
        404,
      );
    }

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder);

    return c.json({ data: { ...product, images } });
  },
);

// Create product (merchant only - must own the merchant profile)
marketplaceRoutes.post(
  '/:communityId/products',
  requireAuth,
  tenantMiddleware,
  requirePermission('product:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = z
      .object({
        merchantId: z.string().uuid(),
        categoryId: z.string().uuid().optional(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid amount'),
        salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Sale price must be a valid amount').optional(),
        sku: z.string().max(100).optional(),
        stockQuantity: z.number().int().min(0).default(0),
        status: z.enum(['ACTIVE', 'DRAFT']).default('DRAFT'),
        images: z.array(z.string().max(1000000).refine((s) => s.startsWith('http') || s.startsWith('data:image/'), { message: 'Must be a URL or data URL' })).max(10).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.price?.[0] ?? result.error.flatten().fieldErrors.name?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    // Validate price is not zero or negative
    const priceNum = parseFloat(result.data.price);
    if (priceNum <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Price must be greater than zero.' } },
        400,
      );
    }

    // Validate sale price if provided
    if (result.data.salePrice) {
      const salePriceNum = parseFloat(result.data.salePrice);
      if (salePriceNum <= 0) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Sale price must be greater than zero.' } },
          400,
        );
      }
      if (salePriceNum >= priceNum) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Sale price must be less than regular price.' } },
          400,
        );
      }
    }

    // Verify merchant exists and belongs to this community (allow PENDING and APPROVED)
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, result.data.merchantId),
          eq(merchants.communityId, communityId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have a merchant profile in this community.' } },
        403,
      );
    }

    if (merchant.verificationStatus === 'SUSPENDED') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Your merchant profile has been suspended.' } },
        403,
      );
    }

    if (merchant.verificationStatus === 'REJECTED') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Your merchant profile was not approved.' } },
        403,
      );
    }

    // Verify category belongs to this community if provided
    if (result.data.categoryId) {
      const [category] = await db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, result.data.categoryId),
            eq(productCategories.communityId, communityId),
          ),
        )
        .limit(1);

      if (!category) {
        return c.json(
          { error: { code: 'NOT_FOUND', message: 'Category not found in this community.' } },
          404,
        );
      }
    }

    const [product] = await db
      .insert(products)
      .values({
        communityId,
        merchantId: result.data.merchantId,
        categoryId: result.data.categoryId,
        name: result.data.name,
        description: result.data.description,
        price: result.data.price,
        salePrice: result.data.salePrice,
        sku: result.data.sku,
        stockQuantity: result.data.stockQuantity,
        status: result.data.status,
      })
      .returning();

    // Insert product images if provided
    if (result.data.images && result.data.images.length > 0) {
      const imageValues = result.data.images.map((url, index) => ({
        productId: product.id,
        url,
        sortOrder: index,
      }));
      await db.insert(productImages).values(imageValues);
    }

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'product.create',
      entityType: 'product',
      entityId: product.id,
      newValues: { name: result.data.name, price: result.data.price },
    });

    return c.json({ data: product }, 201);
  },
);

// Update product (merchant only - must own the product)
marketplaceRoutes.patch(
  '/:communityId/products/:productId',
  requireAuth,
  tenantMiddleware,
  requirePermission('product:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { productId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({
        categoryId: z.string().uuid().optional(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid amount').optional(),
        salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Sale price must be a valid amount').nullable().optional(),
        sku: z.string().max(100).optional(),
        status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
        images: z.array(z.string().max(1000000).refine((s) => s.startsWith('http') || s.startsWith('data:image/'), { message: 'Must be a URL or data URL' })).max(10).optional(),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Find the product and verify ownership
    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Product not found.' } },
        404,
      );
    }

    // Verify the merchant owns this product
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, existing.merchantId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only edit your own products.' } },
        403,
      );
    }

    // Validate price if provided
    if (result.data.price) {
      const priceNum = parseFloat(result.data.price);
      if (priceNum <= 0) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Price must be greater than zero.' } },
          400,
        );
      }
    }

    // Validate sale price if provided
    if (result.data.salePrice !== undefined && result.data.salePrice !== null) {
      const salePriceNum = parseFloat(result.data.salePrice);
      if (salePriceNum <= 0) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Sale price must be greater than zero.' } },
          400,
        );
      }
      const regularPrice = result.data.price ? parseFloat(result.data.price) : parseFloat(existing.price);
      if (salePriceNum >= regularPrice) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Sale price must be less than regular price.' } },
          400,
        );
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (result.data.categoryId !== undefined) updateData.categoryId = result.data.categoryId;
    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.description !== undefined) updateData.description = result.data.description;
    if (result.data.price !== undefined) updateData.price = result.data.price;
    if (result.data.salePrice !== undefined) updateData.salePrice = result.data.salePrice;
    if (result.data.sku !== undefined) updateData.sku = result.data.sku;
    if (result.data.status !== undefined) updateData.status = result.data.status;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    // Update images if provided
    if (result.data.images !== undefined) {
      // Delete existing images
      await db.delete(productImages).where(eq(productImages.productId, productId));

      // Insert new images
      if (result.data.images.length > 0) {
        const imageValues = result.data.images.map((url, index) => ({
          productId,
          url,
          sortOrder: index,
        }));
        await db.insert(productImages).values(imageValues);
      }
    }

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'product.update',
      entityType: 'product',
      entityId: productId,
      oldValues: { name: existing.name, price: existing.price, status: existing.status },
      newValues: updateData,
    });

    return c.json({ data: updated });
  },
);

// Update product inventory (merchant only - must own the product)
marketplaceRoutes.patch(
  '/:communityId/products/:productId/inventory',
  requireAuth,
  tenantMiddleware,
  requirePermission('product:inventory:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { productId } = c.req.param();

    const body = await c.req.json();
    const result = z
      .object({
        stockQuantity: z.number().int().min(0),
      })
      .safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Stock quantity must be a non-negative integer.' } },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Product not found.' } },
        404,
      );
    }

    // Verify the merchant owns this product
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, existing.merchantId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only update inventory for your own products.' } },
        403,
      );
    }

    // Auto-update status based on stock
    const newStatus = result.data.stockQuantity === 0 ? 'OUT_OF_STOCK' : existing.status === 'OUT_OF_STOCK' ? 'ACTIVE' : existing.status;

    const [updated] = await db
      .update(products)
      .set({
        stockQuantity: result.data.stockQuantity,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'product.inventory_update',
      entityType: 'product',
      entityId: productId,
      oldValues: { stockQuantity: existing.stockQuantity, status: existing.status },
      newValues: { stockQuantity: result.data.stockQuantity, status: newStatus },
    });

    return c.json({ data: updated });
  },
);

// Delete product (merchant only - must own the product, soft delete via status)
marketplaceRoutes.delete(
  '/:communityId/products/:productId',
  requireAuth,
  tenantMiddleware,
  requirePermission('product:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { productId } = c.req.param();

    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.communityId, communityId),
        ),
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Product not found.' } },
        404,
      );
    }

    // Verify the merchant owns this product
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, existing.merchantId),
          eq(merchants.userId, user.id),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own products.' } },
        403,
      );
    }

    // Soft delete via status change
    await db
      .update(products)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(products.id, productId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'product.delete',
      entityType: 'product',
      entityId: productId,
      oldValues: { status: existing.status },
      newValues: { status: 'ARCHIVED' },
    });

    return c.json({ data: { success: true } });
  },
);

export default marketplaceRoutes;
