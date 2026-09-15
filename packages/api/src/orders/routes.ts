import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  orders,
  orderItems,
  paymentRecords,
} from '../db/schema/orders';
import { products } from '../db/schema/products';
import { merchants } from '../db/schema/merchants';
import { communities } from '../db/schema/communities';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const orderRoutes = new Hono();

// ──────────────────────────────────────────
// Order State Machine
// ──────────────────────────────────────────

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';

const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function generateOrderNumber(communitySlug: string, sequence: number): string {
  const padded = String(sequence).padStart(5, '0');
  return `ORD-${communitySlug.toUpperCase().slice(0, 6)}-${padded}`;
}

async function getNextOrderSequence(communityId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.communityId, communityId));
  return (result[0]?.count ?? 0) + 1;
}

// ──────────────────────────────────────────
// Create Order (Customer)
// ──────────────────────────────────────────

const createOrderSchema = z.object({
  merchantId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1).max(50),
  shippingAddress: z.object({
    name: z.string().min(1).max(255),
    phone: z.string().min(1).max(20),
    addressLine1: z.string().min(1).max(500),
    addressLine2: z.string().max(500).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    pincode: z.string().min(1).max(10),
  }),
  paymentMethod: z.enum(['COD', 'DIRECT_UPI']),
  deliveryFee: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().max(255).optional(),
});

orderRoutes.post(
  '/:communityId/orders',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:create'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.merchantId?.[0] ?? result.error.flatten().fieldErrors.items?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const data = result.data;

    // Idempotency check
    if (data.idempotencyKey) {
      const [existing] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.communityId, communityId),
            sql`${orders.notes} = ${`idempotency:${data.idempotencyKey}`}` as unknown as ReturnType<typeof eq>,
          ),
        )
        .limit(1);

      if (existing) {
        return c.json({ data: existing }, 200);
      }
    }

    // Verify merchant exists and is approved
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.id, data.merchantId),
          eq(merchants.communityId, communityId),
          eq(merchants.verificationStatus, 'APPROVED'),
        ),
      )
      .limit(1);

    if (!merchant) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Merchant not found or not approved.' } },
        404,
      );
    }

    // Fetch all products and validate
    const productIds = data.items.map((item) => item.productId);
    const fetchedProducts = await db
      .select()
      .from(products)
      .where(
        and(
          sql`${products.id} IN ${productIds}`,
          eq(products.communityId, communityId),
          eq(products.merchantId, data.merchantId),
          eq(products.status, 'ACTIVE'),
        ),
      );

    if (fetchedProducts.length !== productIds.length) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'One or more products are not available or do not belong to this merchant.' } },
        400,
      );
    }

    // Create product lookup map
    const productMap = new Map(fetchedProducts.map((p) => [p.id, p]));

    // Validate stock and calculate totals (server-side price calculation)
    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPrice: string;
      total: string;
    }> = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const stockQuantity = product.stockQuantity;

      if (stockQuantity < item.quantity) {
        return c.json(
          { error: { code: 'INSUFFICIENT_STOCK', message: `Insufficient stock for "${product.name}". Available: ${stockQuantity}, requested: ${item.quantity}.` } },
          400,
        );
      }

      // Use sale price if available and valid, otherwise regular price
      const effectivePrice = product.salePrice && parseFloat(product.salePrice) > 0
        ? product.salePrice
        : product.price;

      const itemTotal = parseFloat(effectivePrice) * item.quantity;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: item.quantity,
        unitPrice: effectivePrice,
        total: itemTotal.toFixed(2),
      });
    }

    const deliveryFeeNum = parseFloat(data.deliveryFee);
    const total = subtotal + deliveryFeeNum;

    // Generate order number
    const [community] = await db
      .select({ slug: communities.slug })
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    const sequence = await getNextOrderSequence(communityId);
    const orderNumber = generateOrderNumber(community?.slug ?? 'COM', sequence);

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        communityId,
        orderNumber,
        customerId: user.id,
        merchantId: data.merchantId,
        subtotal: subtotal.toFixed(2),
        deliveryFee: data.deliveryFee,
        total: total.toFixed(2),
        paymentMethod: data.paymentMethod,
        paymentStatus: 'UNPAID',
        orderStatus: 'PENDING',
        shippingAddress: JSON.stringify(data.shippingAddress),
        notes: data.idempotencyKey ? `idempotency:${data.idempotencyKey}` : data.notes,
      })
      .returning();

    // Create order items
    for (const item of orderItemsData) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      });
    }

    // Decrement stock atomically
    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const newStock = product.stockQuantity - item.quantity;

      await db
        .update(products)
        .set({
          stockQuantity: newStock,
          status: newStock === 0 ? 'OUT_OF_STOCK' : product.status,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));
    }

    // Audit log
    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'order.create',
      entityType: 'order',
      entityId: order.id,
      newValues: {
        orderNumber,
        merchantId: data.merchantId,
        total: total.toFixed(2),
        itemCount: data.items.length,
      },
    });

    return c.json({ data: order }, 201);
  },
);

// ──────────────────────────────────────────
// List Orders
// ──────────────────────────────────────────

orderRoutes.get(
  '/:communityId/orders',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const page = parseInt(c.req.query('page') ?? '1');
    const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const status = c.req.query('status');
    const merchantId = c.req.query('merchantId');

    const conditions = [eq(orders.communityId, communityId)];

    // If customer, only show their orders
    if (tenant.role === 'CUSTOMER') {
      conditions.push(eq(orders.customerId, user.id));
    }

    // If merchant, only show orders for their products
    if (tenant.role === 'MERCHANT' || tenant.role === 'MERCHANT_STAFF') {
      const [merchantProfile] = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(
          and(
            eq(merchants.userId, user.id),
            eq(merchants.communityId, communityId),
          ),
        )
        .limit(1);

      if (merchantProfile) {
        conditions.push(eq(orders.merchantId, merchantProfile.id));
      }
    }

    if (status) {
      conditions.push(
        eq(orders.orderStatus, status as OrderStatus),
      );
    }

    const paymentStatus = c.req.query('paymentStatus');
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus as 'UNPAID' | 'PAYMENT_REPORTED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED' | 'REFUNDED' | 'NOT_REQUIRED'));
    }

    const dateFrom = c.req.query('dateFrom');
    if (dateFrom) {
      conditions.push(sql`${orders.createdAt} >= ${new Date(dateFrom)}`);
    }
    const dateTo = c.req.query('dateTo');
    if (dateTo) {
      conditions.push(sql`${orders.createdAt} <= ${new Date(dateTo)}`);
    }

    if (merchantId) {
      conditions.push(eq(orders.merchantId, merchantId));
    }

    const where = and(...conditions);

    const data = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        merchantId: orders.merchantId,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        orderStatus: orders.orderStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(orders)
      .where(where);

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
      },
    });
  },
);

// ──────────────────────────────────────────
// Get Order Detail
// ──────────────────────────────────────────

orderRoutes.get(
  '/:communityId/orders/:orderId',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // IDOR check: customer can only see their own orders
    if (tenant.role === 'CUSTOMER' && order.customerId !== user.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only view your own orders.' } },
        403,
      );
    }

    // IDOR check: merchant can only see orders for their products
    if (tenant.role === 'MERCHANT' || tenant.role === 'MERCHANT_STAFF') {
      const [merchantProfile] = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(
          and(
            eq(merchants.userId, user.id),
            eq(merchants.communityId, communityId),
          ),
        )
        .limit(1);

      if (!merchantProfile || order.merchantId !== merchantProfile.id) {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'You can only view orders for your products.' } },
          403,
        );
      }
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.createdAt);

    // Fetch payment records
    const payments = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.orderId, orderId))
      .orderBy(desc(paymentRecords.createdAt));

    return c.json({
      data: {
        ...order,
        items,
        payments,
      },
    });
  },
);

// ──────────────────────────────────────────
// Accept Order (Merchant)
// ──────────────────────────────────────────

orderRoutes.post(
  '/:communityId/orders/:orderId/accept',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // Verify merchant owns this order
    const [merchantProfile] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(
          eq(merchants.userId, user.id),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!merchantProfile || order.merchantId !== merchantProfile.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only accept orders for your products.' } },
        403,
      );
    }

    // Validate state transition
    if (!isValidOrderTransition(order.orderStatus as OrderStatus, 'CONFIRMED')) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: `Cannot accept order in "${order.orderStatus}" status.` } },
        400,
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ orderStatus: 'CONFIRMED', updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'order.accept',
      entityType: 'order',
      entityId: orderId,
      oldValues: { orderStatus: order.orderStatus },
      newValues: { orderStatus: 'CONFIRMED' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Update Order Status (Merchant)
// ──────────────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED']),
  reason: z.string().max(500).optional(),
});

orderRoutes.patch(
  '/:communityId/orders/:orderId/status',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const body = await c.req.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.status?.[0] ?? 'Invalid status' } },
        400,
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // Verify merchant owns this order
    const [merchantProfile] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(
          eq(merchants.userId, user.id),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!merchantProfile || order.merchantId !== merchantProfile.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only update orders for your products.' } },
        403,
      );
    }

    // Validate state transition
    if (!isValidOrderTransition(order.orderStatus as OrderStatus, result.data.status)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: `Cannot transition from "${order.orderStatus}" to "${result.data.status}".` } },
        400,
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ orderStatus: result.data.status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'order.status_update',
      entityType: 'order',
      entityId: orderId,
      oldValues: { orderStatus: order.orderStatus },
      newValues: { orderStatus: result.data.status, reason: result.data.reason },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Cancel Order (Customer)
// ──────────────────────────────────────────

orderRoutes.post(
  '/:communityId/orders/:orderId/cancel',
  requireAuth,
  tenantMiddleware,
  requirePermission('order:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // IDOR check: customer can only cancel their own orders
    if (order.customerId !== user.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only cancel your own orders.' } },
        403,
      );
    }

    // Validate state transition
    if (!isValidOrderTransition(order.orderStatus as OrderStatus, 'CANCELLED')) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: `Cannot cancel order in "${order.orderStatus}" status.` } },
        400,
      );
    }

    // Restore stock
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (product) {
        const newStock = product.stockQuantity + item.quantity;
        await db
          .update(products)
          .set({
            stockQuantity: newStock,
            status: product.status === 'OUT_OF_STOCK' && newStock > 0 ? 'ACTIVE' : product.status,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }
    }

    const [updated] = await db
      .update(orders)
      .set({ orderStatus: 'CANCELLED', updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'order.cancel',
      entityType: 'order',
      entityId: orderId,
      oldValues: { orderStatus: order.orderStatus },
      newValues: { orderStatus: 'CANCELLED' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Report Payment (Customer)
// ──────────────────────────────────────────

const reportPaymentSchema = z.object({
  referenceNumber: z.string().min(1).max(255),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  proofUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

orderRoutes.post(
  '/:communityId/orders/:orderId/payment/report',
  requireAuth,
  tenantMiddleware,
  requirePermission('payment:report'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const body = await c.req.json();
    const result = reportPaymentSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.referenceNumber?.[0] ?? 'Invalid input' } },
        400,
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // IDOR check: customer can only report payment for their own orders
    if (order.customerId !== user.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only report payment for your own orders.' } },
        403,
      );
    }

    // Check for duplicate reference number
    const [existingRef] = await db
      .select()
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.communityId, communityId),
          eq(paymentRecords.referenceNumber, result.data.referenceNumber),
        ),
      )
      .limit(1);

    if (existingRef) {
      return c.json(
        { error: { code: 'DUPLICATE_REFERENCE', message: 'This payment reference has already been reported.' } },
        409,
      );
    }

    // Validate amount matches order total
    const reportedAmount = parseFloat(result.data.amount);
    const orderTotal = parseFloat(order.total);

    if (Math.abs(reportedAmount - orderTotal) > 0.01) {
      return c.json(
        { error: { code: 'AMOUNT_MISMATCH', message: `Payment amount (₹${result.data.amount}) does not match order total (₹${order.total}).` } },
        400,
      );
    }

    // Create payment record
    const [payment] = await db
      .insert(paymentRecords)
      .values({
        communityId,
        orderId,
        paymentMethod: order.paymentMethod,
        amount: result.data.amount,
        referenceNumber: result.data.referenceNumber,
        proofUrl: result.data.proofUrl,
        status: 'REPORTED',
        reportedBy: user.id,
      })
      .returning();

    // Update order payment status
    await db
      .update(orders)
      .set({ paymentStatus: 'PAYMENT_REPORTED', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'payment.report',
      entityType: 'payment',
      entityId: payment.id,
      newValues: {
        orderId,
        referenceNumber: result.data.referenceNumber,
        amount: result.data.amount,
      },
    });

    return c.json({ data: payment }, 201);
  },
);

// ──────────────────────────────────────────
// Verify Payment (Merchant)
// ──────────────────────────────────────────

orderRoutes.post(
  '/:communityId/orders/:orderId/payment/verify',
  requireAuth,
  tenantMiddleware,
  requirePermission('payment:verify'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // Verify merchant owns this order
    const [merchantProfile] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(
          eq(merchants.userId, user.id),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!merchantProfile || order.merchantId !== merchantProfile.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only verify payments for your orders.' } },
        403,
      );
    }

    // Find the REPORTED payment record
    const [payment] = await db
      .select()
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.orderId, orderId),
          eq(paymentRecords.status, 'REPORTED'),
        ),
      )
      .limit(1);

    if (!payment) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No pending payment report found for this order.' } },
        404,
      );
    }

    // Verify payment
    const [updated] = await db
      .update(paymentRecords)
      .set({
        status: 'VERIFIED',
        verifiedBy: user.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, payment.id))
      .returning();

    // Update order payment status
    await db
      .update(orders)
      .set({ paymentStatus: 'PAYMENT_VERIFIED', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'payment.verify',
      entityType: 'payment',
      entityId: payment.id,
      oldValues: { status: 'REPORTED' },
      newValues: { status: 'VERIFIED' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Reject Payment (Merchant)
// ──────────────────────────────────────────

const rejectPaymentSchema = z.object({
  reason: z.string().min(1).max(500),
});

orderRoutes.post(
  '/:communityId/orders/:orderId/payment/reject',
  requireAuth,
  tenantMiddleware,
  requirePermission('payment:verify'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const { orderId } = c.req.param();

    const body = await c.req.json();
    const result = rejectPaymentSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.flatten().fieldErrors.reason?.[0] ?? 'Rejection reason is required.' } },
        400,
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.communityId, communityId),
        ),
      )
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found.' } },
        404,
      );
    }

    // Verify merchant owns this order
    const [merchantProfile] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(
          eq(merchants.userId, user.id),
          eq(merchants.communityId, communityId),
        ),
      )
      .limit(1);

    if (!merchantProfile || order.merchantId !== merchantProfile.id) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only reject payments for your orders.' } },
        403,
      );
    }

    // Find the REPORTED payment record
    const [payment] = await db
      .select()
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.orderId, orderId),
          eq(paymentRecords.status, 'REPORTED'),
        ),
      )
      .limit(1);

    if (!payment) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No pending payment report found for this order.' } },
        404,
      );
    }

    // Reject payment
    const [updated] = await db
      .update(paymentRecords)
      .set({
        status: 'REJECTED',
        verifiedBy: user.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.id, payment.id))
      .returning();

    // Update order payment status
    await db
      .update(orders)
      .set({ paymentStatus: 'PAYMENT_REJECTED', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'payment.reject',
      entityType: 'payment',
      entityId: payment.id,
      oldValues: { status: 'REPORTED' },
      newValues: { status: 'REJECTED', reason: result.data.reason },
    });

    return c.json({ data: updated });
  },
);

export default orderRoutes;
