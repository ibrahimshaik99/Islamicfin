import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, desc, count, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  bnplContracts,
  bnplInstallments,
} from '../db/schema/bnpl';
import { orders, orderItems } from '../db/schema/orders';
import { merchants } from '../db/schema/merchants';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const bnplRoutes = new Hono();

/**
 * Deferred-payment (BNPL / Murabahah-style) routes.
 *
 * Money rules:
 * - All arithmetic is done in integer paise. Never floats.
 * - totalSalePrice is fixed at creation from the order total. There is no
 *   interest, APR, compounding or late fee anywhere in this module.
 * - installmentAmount + schedule are derived once and stored; they are never
 *   recalculated.
 *
 * Shariah rules:
 * - Contracts start as PENDING_REVIEW / PENDING_REVIEW.
 * - They only become ACTIVE once shariahReviewStatus is REVIEWED by a reviewer
 *   with bnpl:review permission (see docs/SHARIAH.md — actual Shariah approval
 *   belongs to qualified human reviewers; this flag must not be used to market
 *   unreviewed products as "Shariah approved").
 */

const moneyRegex = /^\d+(\.\d{1,2})?$/;

function paiseToDecimal(paise: number): string {
  return (paise / 100).toFixed(2);
}

function decimalToPaise(value: string): number {
  const [whole, frac = ''] = value.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(fracPadded, 10);
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const day = Math.min(d, lastDay);
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${target.getUTCFullYear()}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

function nextDueDate(dueDate: string, frequency: string): string {
  if (frequency === 'WEEKLY') return addDays(dueDate, 7);
  if (frequency === 'BIWEEKLY') return addDays(dueDate, 14);
  return addMonths(dueDate, 1);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadContractInTenant(contractId: string, communityId: string) {
  const [contract] = await db
    .select()
    .from(bnplContracts)
    .where(
      and(
        eq(bnplContracts.id, contractId),
        eq(bnplContracts.communityId, communityId),
      ),
    )
    .limit(1);
  return contract ?? null;
}

// Create a deferred-payment contract for an order
const createContractSchema = z.object({
  orderId: z.string().uuid(),
  downPayment: z.string().regex(moneyRegex).default('0'),
  installmentCount: z.number().int().min(2).max(24),
  installmentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  firstDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  contractTerms: z.string().max(5000).optional(),
});

bnplRoutes.post(
  '/:communityId/bnpl/contracts',
  requireAuth,
  tenantMiddleware,
  requirePermission('bnpl:create'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createContractSchema.safeParse(body);

    if (!result.success) {
      const first = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: first ?? 'Invalid input' } },
        400,
      );
    }

    const data = result.data;

    if (data.firstDueDate < todayIso()) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'First due date cannot be in the past' } },
        400,
      );
    }

    // Order must exist INSIDE this tenant (never trust client-supplied ids)
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, data.orderId), eq(orders.communityId, communityId)))
      .limit(1);

    if (!order) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        404,
      );
    }

    if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'REJECTED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Order cannot be used for deferred payment' } },
        400,
      );
    }

    if (order.paymentStatus === 'REFUNDED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Order has been refunded' } },
        400,
      );
    }

    // Merchant must belong to the same community (cross-community contract check)
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, order.merchantId))
      .limit(1);

    if (!merchant || merchant.communityId !== communityId) {
      return c.json(
        { error: { code: 'CROSS_COMMUNITY_BLOCKED', message: 'Merchant does not belong to this community' } },
        403,
      );
    }

    // Customers may only create contracts for their own orders
    if (tenant.role === 'CUSTOMER' && order.customerId !== tenant.userId) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only request deferred payment for your own orders' } },
        403,
      );
    }

    // One contract per order (duplicate submission guard, enforced again by unique index)
    const [existingContract] = await db
      .select({ id: bnplContracts.id })
      .from(bnplContracts)
      .where(eq(bnplContracts.orderId, order.id))
      .limit(1);

    if (existingContract) {
      return c.json(
        { error: { code: 'ALREADY_EXISTS', message: 'A contract already exists for this order' } },
        409,
      );
    }

    // ---- Integer paise math (never floats) ----
    const totalPaise = decimalToPaise(order.total);
    const downPaise = decimalToPaise(data.downPayment);

    if (totalPaise <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Order total must be greater than zero' } },
        400,
      );
    }

    if (downPaise < 0 || downPaise >= totalPaise) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Down payment must be at least 0 and less than the order total' } },
        400,
      );
    }

    const remainingPaise = totalPaise - downPaise;
    const count_ = data.installmentCount;
    const basePaise = Math.floor(remainingPaise / count_);
    const remainderPaise = remainingPaise - basePaise * count_;

    if (basePaise <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Installment amount must be greater than zero' } },
        400,
      );
    }

    // Schedule: first (count - 1) installments at base, last absorbs the remainder
    // so that down + sum(schedule) === total exactly (no paise lost or created).
    const schedule: Array<{ n: number; dueDate: string; paise: number }> = [];
    let due = data.firstDueDate;
    for (let n = 1; n <= count_; n++) {
      const amount = n === count_ ? basePaise + remainderPaise : basePaise;
      schedule.push({ n, dueDate: due, paise: amount });
      due = nextDueDate(due, data.installmentFrequency);
    }

    const sumSchedule = schedule.reduce((acc, s) => acc + s.paise, 0);
    const totalPayablePaise = downPaise + sumSchedule;
    if (totalPayablePaise !== totalPaise) {
      return c.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Schedule does not match order total' } },
        500,
      );
    }

    // Items snapshot (informational)
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    try {
      const contract = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(bnplContracts)
          .values({
            communityId,
            orderId: order.id,
            customerId: order.customerId,
            merchantId: order.merchantId,
            itemsSnapshot: items.map((i) => ({
              productId: i.productId,
              name: i.productNameSnapshot,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
            })),
            purchasePrice: order.subtotal,
            totalSalePrice: order.total,
            downPayment: paiseToDecimal(downPaise),
            installmentAmount: paiseToDecimal(basePaise),
            installmentCount: count_,
            installmentFrequency: data.installmentFrequency,
            startDate: todayIso(),
            firstDueDate: data.firstDueDate,
            totalAmountPayable: paiseToDecimal(totalPayablePaise),
            status: 'PENDING_REVIEW',
            shariahReviewStatus: 'PENDING_REVIEW',
            contractTerms:
              data.contractTerms ??
              'Deferred sale at a fixed total price. No interest, compounding, or late fees apply. Shariah review pending.',
            createdBy: tenant.userId,
          })
          .returning();

        await tx.insert(bnplInstallments).values(
          schedule.map((s) => ({
            contractId: created.id,
            installmentNumber: s.n,
            dueDate: s.dueDate,
            amount: paiseToDecimal(s.paise),
            status: 'PENDING' as const,
          })),
        );

        return created;
      });

      await db.insert(auditLogs).values({
        communityId,
        actorId: tenant.userId,
        action: 'bnpl.contract.create',
        entityType: 'bnpl_contract',
        entityId: contract.id,
        newValues: {
          orderId: order.id,
          totalSalePrice: contract.totalSalePrice,
          installmentCount: contract.installmentCount,
          status: contract.status,
        },
      });

      return c.json({ data: contract }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('bnpl_contracts_order_idx')) {
        return c.json(
          { error: { code: 'ALREADY_EXISTS', message: 'A contract already exists for this order' } },
          409,
        );
      }
      throw err;
    }
  },
);

// List contracts (visibility depends on role within the tenant)
bnplRoutes.get(
  '/:communityId/bnpl/contracts',
  requireAuth,
  tenantMiddleware,
  requirePermission('bnpl:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const status = c.req.query('status');
    const orderId = c.req.query('orderId');

    const conditions = [eq(bnplContracts.communityId, communityId)];

    if (status) {
      conditions.push(
        eq(
          bnplContracts.status,
          status as 'PENDING_REVIEW' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
        ),
      );
    }
    if (orderId) {
      conditions.push(eq(bnplContracts.orderId, orderId));
    }

    // Role-scoped visibility (server-side; never derived from the request body)
    if (tenant.role === 'CUSTOMER') {
      conditions.push(eq(bnplContracts.customerId, tenant.userId));
    } else if (tenant.role === 'MERCHANT' || tenant.role === 'MERCHANT_STAFF') {
      const myMerchants = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(
          and(eq(merchants.communityId, communityId), eq(merchants.userId, tenant.userId)),
        );

      const ids = myMerchants.map((m) => m.id);
      if (ids.length === 0) {
        return c.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      conditions.push(inArray(bnplContracts.merchantId, ids));
    }

    const where = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(bnplContracts)
      .where(where);

    const contracts = await db
      .select()
      .from(bnplContracts)
      .where(where)
      .orderBy(desc(bnplContracts.createdAt))
      .limit(limit)
      .offset(offset);

    // Installment progress for the page of contracts
    const contractIds = contracts.map((row) => row.id);
    const installments =
      contractIds.length > 0
        ? await db
            .select()
            .from(bnplInstallments)
            .where(inArray(bnplInstallments.contractId, contractIds))
            .orderBy(bnplInstallments.installmentNumber)
        : [];

    const enriched = contracts.map((contract) => {
      const rows = installments.filter((i) => i.contractId === contract.id);
      const paid = rows.filter(
        (i) => i.status === 'PAID' || i.status === 'VERIFIED',
      );
      const paidPaise = paid.reduce((acc, i) => acc + decimalToPaise(i.amount), 0);
      const next = rows.find((i) => i.status === 'PENDING');
      return {
        ...contract,
        installmentProgress: {
          total: rows.length,
          paid: paid.length,
          paidAmount: paiseToDecimal(paidPaise),
          nextDueDate: next?.dueDate ?? null,
          nextDueAmount: next?.amount ?? null,
        },
      };
    });

    return c.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit),
      },
    });
  },
);

// Contract detail + schedule
bnplRoutes.get(
  '/:communityId/bnpl/contracts/:contractId',
  requireAuth,
  tenantMiddleware,
  requirePermission('bnpl:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId } = c.req.param();

    const contract = await loadContractInTenant(contractId, tenant.communityId);
    if (!contract) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
    }

    if (tenant.role === 'CUSTOMER' && contract.customerId !== tenant.userId) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
    }

    if (tenant.role === 'MERCHANT' || tenant.role === 'MERCHANT_STAFF') {
      const [mine] = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(
          and(
            eq(merchants.id, contract.merchantId),
            eq(merchants.userId, tenant.userId),
          ),
        )
        .limit(1);
      if (!mine) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
      }
    }

    const installments = await db
      .select()
      .from(bnplInstallments)
      .where(eq(bnplInstallments.contractId, contract.id))
      .orderBy(bnplInstallments.installmentNumber);

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(eq(orders.id, contract.orderId))
      .limit(1);

    return c.json({ data: { ...contract, order: order ?? null, installments } });
  },
);

// Review a contract (community review + Shariah review status)
const reviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  shariahReviewStatus: z.enum(['PENDING_REVIEW', 'REVIEWED', 'NEEDS_REVISION', 'ARCHIVED']).optional(),
  comments: z.string().max(2000).optional(),
});

bnplRoutes.post(
  '/:communityId/bnpl/contracts/:contractId/review',
  requireAuth,
  tenantMiddleware,
  requirePermission('bnpl:review'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId } = c.req.param();

    const body = await c.req.json();
    const result = reviewSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const contract = await loadContractInTenant(contractId, tenant.communityId);
    if (!contract) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
    }

    if (contract.status === 'COMPLETED' || contract.status === 'CANCELLED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Contract is already closed' } },
        400,
      );
    }

    const { decision, shariahReviewStatus, comments } = result.data;

    if (decision === 'REJECT') {
      const [updated] = await db
        .update(bnplContracts)
        .set({
          status: 'CANCELLED',
          shariahReviewStatus: shariahReviewStatus ?? contract.shariahReviewStatus,
          reviewComments: comments ?? null,
          reviewedBy: tenant.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bnplContracts.id, contract.id))
        .returning();

      await db.insert(auditLogs).values({
        communityId: tenant.communityId,
        actorId: tenant.userId,
        action: 'bnpl.contract.reject',
        entityType: 'bnpl_contract',
        entityId: contract.id,
        oldValues: { status: contract.status },
        newValues: { status: 'CANCELLED', comments },
      });

      return c.json({ data: updated });
    }

    // APPROVE: the contract only becomes ACTIVE when Shariah status is REVIEWED.
    // Until then it stays PENDING_REVIEW and must not be marketed as approved.
    const newShariah = shariahReviewStatus ?? contract.shariahReviewStatus;
    const canActivate =
      newShariah === 'REVIEWED' && contract.shariahReviewStatus !== 'ARCHIVED';
    const newStatus = canActivate ? 'ACTIVE' : 'PENDING_REVIEW';

    const [updated] = await db
      .update(bnplContracts)
      .set({
        status: newStatus,
        shariahReviewStatus: newShariah,
        reviewComments: comments ?? contract.reviewComments,
        reviewedBy: tenant.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bnplContracts.id, contract.id))
      .returning();

    await db.insert(auditLogs).values({
      communityId: tenant.communityId,
      actorId: tenant.userId,
      action: 'bnpl.contract.review',
      entityType: 'bnpl_contract',
      entityId: contract.id,
      oldValues: {
        status: contract.status,
        shariahReviewStatus: contract.shariahReviewStatus,
      },
      newValues: {
        status: updated.status,
        shariahReviewStatus: updated.shariahReviewStatus,
        comments,
      },
    });

    return c.json({ data: updated });
  },
);

// Report an installment payment (customer/merchant/community)
const paySchema = z.object({
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']),
  referenceNumber: z.string().max(255).optional(),
  paidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

bnplRoutes.post(
  '/:communityId/bnpl/contracts/:contractId/installments/:installmentId/pay',
  requireAuth,
  tenantMiddleware,
  requirePermission('bnpl:create'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId, installmentId } = c.req.param();

    const body = await c.req.json();
    const result = paySchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const contract = await loadContractInTenant(contractId, tenant.communityId);
    if (!contract) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
    }

    if (tenant.role === 'CUSTOMER' && contract.customerId !== tenant.userId) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
    }

    if (contract.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Contract must be active before payments are recorded' } },
        400,
      );
    }

    const [installment] = await db
      .select()
      .from(bnplInstallments)
      .where(
        and(
          eq(bnplInstallments.id, installmentId),
          eq(bnplInstallments.contractId, contract.id),
        ),
      )
      .limit(1);

    if (!installment) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Installment not found' } }, 404);
    }

    if (installment.status !== 'PENDING') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Installment is not pending' } },
        400,
      );
    }

    const [updated] = await db
      .update(bnplInstallments)
      .set({
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: result.data.paymentMethod,
        referenceNumber: result.data.referenceNumber ?? null,
        updatedAt: new Date(),
      })
      .where(eq(bnplInstallments.id, installment.id))
      .returning();

    await db.insert(auditLogs).values({
      communityId: tenant.communityId,
      actorId: tenant.userId,
      action: 'bnpl.installment.pay',
      entityType: 'bnpl_installment',
      entityId: installment.id,
      newValues: {
        contractId: contract.id,
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
        referenceNumber: result.data.referenceNumber,
      },
    });

    return c.json({ data: updated });
  },
);

// Verify or reject a reported installment payment (community finance)
const verifySchema = z.object({
  decision: z.enum(['VERIFY', 'REJECT']),
  comments: z.string().max(1000).optional(),
});

bnplRoutes.post(
  '/:communityId/bnpl/contracts/:contractId/installments/:installmentId/verify',
  requireAuth,
  tenantMiddleware,
  requirePermission('bnpl:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const { contractId, installmentId } = c.req.param();

    const body = await c.req.json();
    const result = verifySchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const contract = await loadContractInTenant(contractId, tenant.communityId);
    if (!contract) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } }, 404);
    }

    const [installment] = await db
      .select()
      .from(bnplInstallments)
      .where(
        and(
          eq(bnplInstallments.id, installmentId),
          eq(bnplInstallments.contractId, contract.id),
        ),
      )
      .limit(1);

    if (!installment) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Installment not found' } }, 404);
    }

    if (result.data.decision === 'VERIFY') {
      if (installment.status !== 'PAID') {
        return c.json(
          { error: { code: 'INVALID_STATE', message: 'Only reported payments can be verified' } },
          400,
        );
      }

      const [updated] = await db
        .update(bnplInstallments)
        .set({
          status: 'VERIFIED',
          verifiedBy: tenant.userId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bnplInstallments.id, installment.id))
        .returning();

      // Complete the contract when every installment is verified
      const pending = await db
        .select({ value: count() })
        .from(bnplInstallments)
        .where(
          and(
            eq(bnplInstallments.contractId, contract.id),
            inArray(bnplInstallments.status, ['PENDING', 'PAID']),
          ),
        );

      if (pending[0].value === 0) {
        await db
          .update(bnplContracts)
          .set({ status: 'COMPLETED', updatedAt: new Date() })
          .where(eq(bnplContracts.id, contract.id));
      }

      await db.insert(auditLogs).values({
        communityId: tenant.communityId,
        actorId: tenant.userId,
        action: 'bnpl.installment.verify',
        entityType: 'bnpl_installment',
        entityId: installment.id,
        newValues: { contractId: contract.id, decision: 'VERIFY' },
      });

      return c.json({ data: updated });
    }

    const [updated] = await db
      .update(bnplInstallments)
      .set({
        status: installment.status === 'PAID' ? 'PENDING' : 'REJECTED',
        verifiedBy: tenant.userId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bnplInstallments.id, installment.id))
      .returning();

    await db.insert(auditLogs).values({
      communityId: tenant.communityId,
      actorId: tenant.userId,
      action: 'bnpl.installment.reject',
      entityType: 'bnpl_installment',
      entityId: installment.id,
      newValues: {
        contractId: contract.id,
        decision: 'REJECT',
        comments: result.data.comments,
      },
    });

    return c.json({ data: updated });
  },
);

export default bnplRoutes;
