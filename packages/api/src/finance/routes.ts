import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, desc, count, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  financeContracts,
  financeParticipants,
  financeTransactions,
  financeDocuments,
  financeReviews,
  financeTerms,
  financeAssets,
} from '../db/schema/finance';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const financeRoutes = new Hono();

// ──────────────────────────────────────────
// Create Qard Hasan Contract
// ──────────────────────────────────────────

const createContractSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  principalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().max(10).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createContractSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate principal amount is positive
    if (parseFloat(result.data.principalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Principal amount must be positive.' } },
        400,
      );
    }

    const [contract] = await db
      .insert(financeContracts)
      .values({
        communityId,
        initiatorId: user.id,
        contractType: 'QARD_HASAN',
        title: result.data.title,
        description: result.data.description,
        principalAmount: result.data.principalAmount,
        currency: result.data.currency || 'INR',
        status: 'DRAFT',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        shariahReviewStatus: 'PENDING_REVIEW',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.create',
      entityType: 'finance_contract',
      entityId: contract.id,
      newValues: {
        contractType: 'QARD_HASAN',
        title: contract.title,
        principalAmount: contract.principalAmount,
      },
    });

    return c.json({ data: contract }, 201);
  },
);

// ──────────────────────────────────────────
// List Finance Contracts (all types)
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const page = parseInt(c.req.query('page') ?? '1');
    const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 100);
    const contractType = c.req.query('contractType');
    const status = c.req.query('status');
    const search = c.req.query('search');

    const conditions = [eq(financeContracts.communityId, communityId)];

    if (contractType) {
      conditions.push(
        eq(financeContracts.contractType, contractType as 'MUDARABAH' | 'MUSHARAKAH' | 'MURABAHAH' | 'IJARAH' | 'QARD_HASAN' | 'SADAQAH'),
      );
    }

    if (status) {
      conditions.push(
        eq(financeContracts.status, status as 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED'),
      );
    }

    if (search) {
      conditions.push(sql`${financeContracts.title} ILIKE ${'%' + search + '%'}`);
    }

    const where = and(...conditions);

    const data = await db
      .select({
        id: financeContracts.id,
        communityId: financeContracts.communityId,
        contractType: financeContracts.contractType,
        title: financeContracts.title,
        description: financeContracts.description,
        initiatorId: financeContracts.initiatorId,
        status: financeContracts.status,
        currency: financeContracts.currency,
        principalAmount: financeContracts.principalAmount,
        startDate: financeContracts.startDate,
        endDate: financeContracts.endDate,
        termsVersion: financeContracts.termsVersion,
        shariahReviewStatus: financeContracts.shariahReviewStatus,
        legalStatus: financeContracts.legalStatus,
        executionApproved: financeContracts.executionApproved,
        createdAt: financeContracts.createdAt,
        updatedAt: financeContracts.updatedAt,
      })
      .from(financeContracts)
      .where(where)
      .orderBy(desc(financeContracts.createdAt))
      .limit(limit);

    const totalResult = await db
      .select({ count: count() })
      .from(financeContracts)
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
// Get Contract Details
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/:contractId',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    // Get participants, transactions, documents, and reviews
    const participants = await db
      .select()
      .from(financeParticipants)
      .where(eq(financeParticipants.contractId, contractId));

    const transactions = await db
      .select()
      .from(financeTransactions)
      .where(eq(financeTransactions.contractId, contractId))
      .orderBy(desc(financeTransactions.createdAt));

    const documents = await db
      .select()
      .from(financeDocuments)
      .where(eq(financeDocuments.contractId, contractId))
      .orderBy(desc(financeDocuments.createdAt));

    const reviews = await db
      .select()
      .from(financeReviews)
      .where(eq(financeReviews.contractId, contractId))
      .orderBy(desc(financeReviews.createdAt));

    // Calculate repayment summary
    const repayments = transactions.filter((t) => t.type === 'REPAYMENT' && t.status === 'COMPLETED');
    const totalRepaid = repayments.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const principal = parseFloat(contract.principalAmount);
    const remainingBalance = Math.max(0, principal - totalRepaid);

    return c.json({
      data: {
        ...contract,
        participants,
        transactions,
        documents,
        reviews,
        repaymentSummary: {
          principalAmount: contract.principalAmount,
          totalRepaid: totalRepaid.toFixed(2),
          remainingBalance: remainingBalance.toFixed(2),
          repaymentCount: repayments.length,
        },
      },
    });
  },
);

// ──────────────────────────────────────────
// Add Participant
// ──────────────────────────────────────────

const addParticipantSchema = z.object({
  userId: z.string().uuid(),
  participantRole: z.string().min(1).max(100),
  contributionAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/participants',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = addParticipantSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Check contract exists and is in editable state
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (!['DRAFT', 'PENDING_REVIEW'].includes(contract.status)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only add participants to DRAFT or PENDING_REVIEW contracts.' } },
        400,
      );
    }

    // Validate participant role for Qard Hasan
    const validRoles = ['LENDER', 'BORROWER'];
    if (!validRoles.includes(result.data.participantRole)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid participant role. Must be LENDER or BORROWER.' } },
        400,
      );
    }

    // Validate contribution amount matches principal
    if (result.data.contributionAmount) {
      if (parseFloat(result.data.contributionAmount) !== parseFloat(contract.principalAmount)) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Contribution amount must match principal amount.' } },
          400,
        );
      }
    }

    // Check for duplicate participant
    const [existing] = await db
      .select()
      .from(financeParticipants)
      .where(
        and(
          eq(financeParticipants.contractId, contractId),
          eq(financeParticipants.userId, result.data.userId),
        ),
      )
      .limit(1);

    if (existing) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'User is already a participant in this contract.' } },
        409,
      );
    }

    const [participant] = await db
      .insert(financeParticipants)
      .values({
        contractId,
        userId: result.data.userId,
        participantRole: result.data.participantRole,
        contributionAmount: result.data.contributionAmount,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.participant.add',
      entityType: 'finance_participant',
      entityId: participant.id,
      newValues: { contractId, userId: result.data.userId, role: result.data.participantRole },
    });

    return c.json({ data: participant }, 201);
  },
);

// ──────────────────────────────────────────
// Record Repayment
// ──────────────────────────────────────────

const recordRepaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reference: z.string().max(255).optional(),
  paymentMethod: z.string().max(50).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/repayments',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = recordRepaymentSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate amount is positive
    if (parseFloat(result.data.amount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Repayment amount must be positive.' } },
        400,
      );
    }

    // Check contract exists and is active
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (contract.contractType !== 'QARD_HASAN') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'This endpoint is for Qard Hasan contracts only.' } },
        400,
      );
    }

    if (contract.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only record repayments for ACTIVE contracts.' } },
        400,
      );
    }

    // Check for duplicate reference
    if (result.data.reference) {
      const [existingRef] = await db
        .select()
        .from(financeTransactions)
        .where(eq(financeTransactions.reference, result.data.reference))
        .limit(1);

      if (existingRef) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'Reference number already used.' } },
          409,
        );
      }
    }

    // Calculate total repaid to validate against principal
    const existingRepayments = await db
      .select()
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.contractId, contractId),
          eq(financeTransactions.type, 'REPAYMENT'),
          eq(financeTransactions.status, 'COMPLETED'),
        ),
      );

    const totalRepaid = existingRepayments.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const newTotal = totalRepaid + parseFloat(result.data.amount);

    // Reject overpayment
    if (newTotal > parseFloat(contract.principalAmount)) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Repayment of ${result.data.amount} would exceed remaining balance of ${(parseFloat(contract.principalAmount) - totalRepaid).toFixed(2)}.`,
          },
        },
        400,
      );
    }

    const [transaction] = await db
      .insert(financeTransactions)
      .values({
        contractId,
        type: 'REPAYMENT',
        amount: result.data.amount,
        reference: result.data.reference,
        paymentMethod: result.data.paymentMethod,
        status: 'COMPLETED',
        recordedBy: user.id,
      })
      .returning();

    // If fully repaid, mark contract as COMPLETED
    if (newTotal >= parseFloat(contract.principalAmount)) {
      await db
        .update(financeContracts)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(financeContracts.id, contractId));
    }

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.repayment.record',
      entityType: 'finance_transaction',
      entityId: transaction.id,
      newValues: { contractId, amount: result.data.amount, totalRepaid: newTotal.toFixed(2) },
    });

    return c.json({ data: transaction }, 201);
  },
);

// ──────────────────────────────────────────
// Get Repayments
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/:contractId/repayments',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    // Verify contract belongs to community
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    const repayments = await db
      .select()
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.contractId, contractId),
          eq(financeTransactions.type, 'REPAYMENT'),
        ),
      )
      .orderBy(desc(financeTransactions.createdAt));

    return c.json({ data: repayments });
  },
);

// ──────────────────────────────────────────
// Add Document
// ──────────────────────────────────────────

const addDocumentSchema = z.object({
  documentType: z.string().min(1).max(100),
  fileUrl: z.string().url(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/documents',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = addDocumentSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Verify contract belongs to community
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    const [document] = await db
      .insert(financeDocuments)
      .values({
        contractId,
        documentType: result.data.documentType,
        fileUrl: result.data.fileUrl,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.document.add',
      entityType: 'finance_document',
      entityId: document.id,
      newValues: { contractId, documentType: result.data.documentType },
    });

    return c.json({ data: document }, 201);
  },
);

// ──────────────────────────────────────────
// Submit for Shariah Review
// ──────────────────────────────────────────

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/submit-review',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    // Check contract exists
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (!['DRAFT', 'NEEDS_REVISION'].includes(contract.shariahReviewStatus)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Contract cannot be submitted for review in current state.' } },
        400,
      );
    }

    const [updated] = await db
      .update(financeContracts)
      .set({
        shariahReviewStatus: 'PENDING_REVIEW',
        status: 'PENDING_REVIEW',
        updatedAt: new Date(),
      })
      .where(eq(financeContracts.id, contractId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.submit_review',
      entityType: 'finance_contract',
      entityId: contractId,
      oldValues: { shariahReviewStatus: contract.shariahReviewStatus },
      newValues: { shariahReviewStatus: 'PENDING_REVIEW' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Record Shariah Review
// ──────────────────────────────────────────

const reviewSchema = z.object({
  reviewer: z.string().min(1).max(255),
  status: z.enum(['REVIEWED', 'NEEDS_REVISION']),
  comments: z.string().max(5000).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/reviews',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = reviewSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Check contract exists
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (contract.shariahReviewStatus !== 'PENDING_REVIEW') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Contract is not pending review.' } },
        400,
      );
    }

    // Create review
    const [review] = await db
      .insert(financeReviews)
      .values({
        contractId,
        reviewer: result.data.reviewer,
        status: result.data.status,
        comments: result.data.comments,
        reviewedAt: new Date(),
      })
      .returning();

    // Update contract review status
    const newContractStatus = result.data.status === 'REVIEWED' ? 'ACTIVE' : contract.status;
    await db
      .update(financeContracts)
      .set({
        shariahReviewStatus: result.data.status,
        status: newContractStatus,
        updatedAt: new Date(),
      })
      .where(eq(financeContracts.id, contractId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.review.record',
      entityType: 'finance_review',
      entityId: review.id,
      newValues: { contractId, reviewer: result.data.reviewer, status: result.data.status },
    });

    return c.json({ data: review }, 201);
  },
);

// ──────────────────────────────────────────
// Cancel Contract
// ──────────────────────────────────────────

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/cancel',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (!['DRAFT', 'PENDING_REVIEW'].includes(contract.status)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only cancel DRAFT or PENDING_REVIEW contracts.' } },
        400,
      );
    }

    const [updated] = await db
      .update(financeContracts)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(financeContracts.id, contractId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.contract.cancel',
      entityType: 'finance_contract',
      entityId: contractId,
      oldValues: { status: contract.status },
      newValues: { status: 'CANCELLED' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Create Mudarabah Contract (Profit-Sharing)
// ──────────────────────────────────────────

const createMudarabahSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  principalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().max(10).optional(),
  profitSharingRatio: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  managerRole: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

financeRoutes.post(
  '/:communityId/finance/mudarabah',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createMudarabahSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    if (parseFloat(result.data.principalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Principal amount must be positive.' } },
        400,
      );
    }

    const [contract] = await db
      .insert(financeContracts)
      .values({
        communityId,
        initiatorId: user.id,
        contractType: 'MUDARABAH',
        title: result.data.title,
        description: result.data.description,
        principalAmount: result.data.principalAmount,
        currency: result.data.currency || 'INR',
        status: 'DRAFT',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        shariahReviewStatus: 'PENDING_REVIEW',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.mudarabah.create',
      entityType: 'finance_contract',
      entityId: contract.id,
      newValues: { contractType: 'MUDARABAH', title: contract.title },
    });

    return c.json({ data: contract }, 201);
  },
);

// ──────────────────────────────────────────
// Create Musharakah Contract (Partnership)
// ──────────────────────────────────────────

const createMusharakahSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  principalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().max(10).optional(),
  profitSharingRatio: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  ownershipShares: z.record(z.string(), z.string()).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

financeRoutes.post(
  '/:communityId/finance/musharakah',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createMusharakahSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    if (parseFloat(result.data.principalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Principal amount must be positive.' } },
        400,
      );
    }

    const [contract] = await db
      .insert(financeContracts)
      .values({
        communityId,
        initiatorId: user.id,
        contractType: 'MUSHARAKAH',
        title: result.data.title,
        description: result.data.description,
        principalAmount: result.data.principalAmount,
        currency: result.data.currency || 'INR',
        status: 'DRAFT',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        shariahReviewStatus: 'PENDING_REVIEW',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.musharakah.create',
      entityType: 'finance_contract',
      entityId: contract.id,
      newValues: { contractType: 'MUSHARAKAH', title: contract.title },
    });

    return c.json({ data: contract }, 201);
  },
);

// ──────────────────────────────────────────
// Create Murabahah Contract (Asset Sale)
// ──────────────────────────────────────────

const createMurabahahSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  principalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().max(10).optional(),
  assetDescription: z.string().min(1).max(1000),
  seller: z.string().min(1).max(255),
  purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

financeRoutes.post(
  '/:communityId/finance/murabahah',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createMurabahahSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    if (parseFloat(result.data.principalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Principal amount must be positive.' } },
        400,
      );
    }

    if (parseFloat(result.data.purchasePrice) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Purchase price must be positive.' } },
        400,
      );
    }

    if (parseFloat(result.data.salePrice) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Sale price must be positive.' } },
        400,
      );
    }

    // Sale price must be greater than purchase price (markup)
    if (parseFloat(result.data.salePrice) <= parseFloat(result.data.purchasePrice)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Sale price must be greater than purchase price.' } },
        400,
      );
    }

    const [contract] = await db
      .insert(financeContracts)
      .values({
        communityId,
        initiatorId: user.id,
        contractType: 'MURABAHAH',
        title: result.data.title,
        description: result.data.description,
        principalAmount: result.data.principalAmount,
        currency: result.data.currency || 'INR',
        status: 'DRAFT',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        shariahReviewStatus: 'PENDING_REVIEW',
      })
      .returning();

    // Create asset record for Murabahah
    await db.insert(financeAssets).values({
      contractId: contract.id,
      description: result.data.assetDescription,
      seller: result.data.seller,
      purchasePrice: result.data.purchasePrice,
      salePrice: result.data.salePrice,
      ownershipStatus: 'PENDING',
      possessionStatus: 'PENDING',
    });

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.murabahah.create',
      entityType: 'finance_contract',
      entityId: contract.id,
      newValues: { contractType: 'MURABAHAH', title: contract.title },
    });

    return c.json({ data: contract }, 201);
  },
);

// ──────────────────────────────────────────
// Create Ijarah Contract (Leasing)
// ──────────────────────────────────────────

const createIjarahSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  principalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().max(10).optional(),
  assetDescription: z.string().min(1).max(1000),
  leasePeriod: z.string().max(100),
  leasePayments: z.string().regex(/^\d+(\.\d{1,2})?$/),
  lessorRole: z.string().max(100).optional(),
  lesseeRole: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

financeRoutes.post(
  '/:communityId/finance/ijarah',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createIjarahSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    if (parseFloat(result.data.principalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Principal amount must be positive.' } },
        400,
      );
    }

    if (parseFloat(result.data.leasePayments) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Lease payments must be positive.' } },
        400,
      );
    }

    const [contract] = await db
      .insert(financeContracts)
      .values({
        communityId,
        initiatorId: user.id,
        contractType: 'IJARAH',
        title: result.data.title,
        description: result.data.description,
        principalAmount: result.data.principalAmount,
        currency: result.data.currency || 'INR',
        status: 'DRAFT',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        shariahReviewStatus: 'PENDING_REVIEW',
      })
      .returning();

    // Create asset record for Ijarah
    await db.insert(financeAssets).values({
      contractId: contract.id,
      description: result.data.assetDescription,
      ownershipStatus: 'LESSOR',
      possessionStatus: 'PENDING',
    });

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.ijarah.create',
      entityType: 'finance_contract',
      entityId: contract.id,
      newValues: { contractType: 'IJARAH', title: contract.title },
    });

    return c.json({ data: contract }, 201);
  },
);

// ──────────────────────────────────────────
// Record Profit Distribution (Mudarabah/Musharakah)
// ──────────────────────────────────────────

const recordProfitDistributionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  period: z.string().max(100),
  reference: z.string().max(255).optional(),
  paymentMethod: z.string().max(50).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/profit-distributions',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = recordProfitDistributionSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    if (parseFloat(result.data.amount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' } },
        400,
      );
    }

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (!['MUDARABAH', 'MUSHARAKAH'].includes(contract.contractType)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Profit distribution only allowed for Mudarabah/Musharakah contracts.' } },
        400,
      );
    }

    if (contract.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only record distributions for ACTIVE contracts.' } },
        400,
      );
    }

    // Check for duplicate reference
    if (result.data.reference) {
      const [existingRef] = await db
        .select()
        .from(financeTransactions)
        .where(eq(financeTransactions.reference, result.data.reference))
        .limit(1);

      if (existingRef) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'Reference number already used.' } },
          409,
        );
      }
    }

    const [transaction] = await db
      .insert(financeTransactions)
      .values({
        contractId,
        type: 'PROFIT_DISTRIBUTION',
        amount: result.data.amount,
        reference: result.data.reference,
        paymentMethod: result.data.paymentMethod,
        status: 'COMPLETED',
        recordedBy: user.id,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.profit_distribution.record',
      entityType: 'finance_transaction',
      entityId: transaction.id,
      newValues: { contractId, amount: result.data.amount, period: result.data.period },
    });

    return c.json({ data: transaction }, 201);
  },
);

// ──────────────────────────────────────────
// Record Lease Payment (Ijarah)
// ──────────────────────────────────────────

const recordLeasePaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  period: z.string().max(100),
  reference: z.string().max(255).optional(),
  paymentMethod: z.string().max(50).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/lease-payments',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = recordLeasePaymentSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    if (parseFloat(result.data.amount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' } },
        400,
      );
    }

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (contract.contractType !== 'IJARAH') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Lease payments only allowed for Ijarah contracts.' } },
        400,
      );
    }

    if (contract.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only record payments for ACTIVE contracts.' } },
        400,
      );
    }

    // Check for duplicate reference
    if (result.data.reference) {
      const [existingRef] = await db
        .select()
        .from(financeTransactions)
        .where(eq(financeTransactions.reference, result.data.reference))
        .limit(1);

      if (existingRef) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'Reference number already used.' } },
          409,
        );
      }
    }

    const [transaction] = await db
      .insert(financeTransactions)
      .values({
        contractId,
        type: 'LEASE_PAYMENT',
        amount: result.data.amount,
        reference: result.data.reference,
        paymentMethod: result.data.paymentMethod,
        status: 'COMPLETED',
        recordedBy: user.id,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.lease_payment.record',
      entityType: 'finance_transaction',
      entityId: transaction.id,
      newValues: { contractId, amount: result.data.amount, period: result.data.period },
    });

    return c.json({ data: transaction }, 201);
  },
);

// ──────────────────────────────────────────
// List Contracts by Type
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/type/:contractType',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractType = c.req.param('contractType')!;

    const validTypes = ['MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH', 'QARD_HASAN', 'SADAQAH'];
    if (!validTypes.includes(contractType)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid contract type.' } },
        400,
      );
    }

    const contracts = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.communityId, communityId),
          eq(financeContracts.contractType, contractType as 'MUDARABAH' | 'MUSHARAKAH' | 'MURABAHAH' | 'IJARAH' | 'QARD_HASAN' | 'SADAQAH'),
        ),
      )
      .orderBy(desc(financeContracts.createdAt));

    return c.json({ data: contracts });
  },
);

// ──────────────────────────────────────────
// Get Review Queue (Pending Reviews)
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/review-queue',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const contracts = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.communityId, communityId),
          eq(financeContracts.shariahReviewStatus, 'PENDING_REVIEW'),
        ),
      )
      .orderBy(desc(financeContracts.createdAt));

    return c.json({ data: contracts });
  },
);

// ──────────────────────────────────────────
// Get Review History for a Contract
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/:contractId/reviews',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    // Verify contract belongs to community
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    const reviews = await db
      .select()
      .from(financeReviews)
      .where(eq(financeReviews.contractId, contractId))
      .orderBy(desc(financeReviews.createdAt));

    return c.json({ data: reviews });
  },
);

// ──────────────────────────────────────────
// Update Legal Status
// ──────────────────────────────────────────

const updateLegalStatusSchema = z.object({
  legalStatus: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED_FOR_DISPLAY', 'APPROVED_FOR_EXECUTION', 'BLOCKED', 'ARCHIVED']),
  comments: z.string().max(2000).optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/legal-status',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = updateLegalStatusSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    // Only allow certain transitions
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['UNDER_REVIEW', 'BLOCKED', 'ARCHIVED'],
      'UNDER_REVIEW': ['APPROVED_FOR_DISPLAY', 'APPROVED_FOR_EXECUTION', 'BLOCKED', 'ARCHIVED'],
      'APPROVED_FOR_DISPLAY': ['APPROVED_FOR_EXECUTION', 'BLOCKED', 'ARCHIVED'],
      'APPROVED_FOR_EXECUTION': ['BLOCKED', 'ARCHIVED'],
      'BLOCKED': ['UNDER_REVIEW', 'ARCHIVED'],
      'ARCHIVED': [],
    };

    if (!validTransitions[contract.legalStatus]?.includes(result.data.legalStatus)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: `Cannot transition from ${contract.legalStatus} to ${result.data.legalStatus}.` } },
        400,
      );
    }

    const [updated] = await db
      .update(financeContracts)
      .set({
        legalStatus: result.data.legalStatus,
        executionApproved: result.data.legalStatus === 'APPROVED_FOR_EXECUTION' ? 'YES' : contract.executionApproved,
        updatedAt: new Date(),
      })
      .where(eq(financeContracts.id, contractId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.legal_status.update',
      entityType: 'finance_contract',
      entityId: contractId,
      oldValues: { legalStatus: contract.legalStatus },
      newValues: { legalStatus: result.data.legalStatus, comments: result.data.comments },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Create Terms Version
// ──────────────────────────────────────────

const createTermsSchema = z.object({
  termsJson: z.record(z.unknown()),
  effectiveAt: z.string().datetime().optional(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/terms',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = createTermsSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    if (!['DRAFT', 'PENDING_REVIEW'].includes(contract.status)) {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only add terms to DRAFT or PENDING_REVIEW contracts.' } },
        400,
      );
    }

    const newVersion = contract.termsVersion + 1;

    const [terms] = await db
      .insert(financeTerms)
      .values({
        contractId,
        version: newVersion,
        termsJson: result.data.termsJson,
        effectiveAt: result.data.effectiveAt ? new Date(result.data.effectiveAt) : undefined,
      })
      .returning();

    // Update contract terms version
    await db
      .update(financeContracts)
      .set({ termsVersion: newVersion, updatedAt: new Date() })
      .where(eq(financeContracts.id, contractId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.terms.create',
      entityType: 'finance_terms',
      entityId: terms.id,
      newValues: { contractId, version: newVersion },
    });

    return c.json({ data: terms }, 201);
  },
);

// ──────────────────────────────────────────
// Get Terms History
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/:contractId/terms',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    // Verify contract belongs to community
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    const terms = await db
      .select()
      .from(financeTerms)
      .where(eq(financeTerms.contractId, contractId))
      .orderBy(desc(financeTerms.version));

    return c.json({ data: terms });
  },
);

// ──────────────────────────────────────────
// Add Document Version
// ──────────────────────────────────────────

const addDocumentVersionSchema = z.object({
  documentType: z.string().min(1).max(100),
  fileUrl: z.string().url(),
});

financeRoutes.post(
  '/:communityId/finance/contracts/:contractId/documents',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const body = await c.req.json();
    const result = addDocumentVersionSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Verify contract belongs to community
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    // Get existing document count for this type
    const existingDocs = await db
      .select()
      .from(financeDocuments)
      .where(
        and(
          eq(financeDocuments.contractId, contractId),
          eq(financeDocuments.documentType, result.data.documentType),
        ),
      );

    const newVersion = existingDocs.length + 1;

    const [document] = await db
      .insert(financeDocuments)
      .values({
        contractId,
        documentType: result.data.documentType,
        fileUrl: result.data.fileUrl,
        version: newVersion,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'finance.document.version.create',
      entityType: 'finance_document',
      entityId: document.id,
      newValues: { contractId, documentType: result.data.documentType, version: newVersion },
    });

    return c.json({ data: document }, 201);
  },
);

// ──────────────────────────────────────────
// Get Document History
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/:contractId/documents',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    // Verify contract belongs to community
    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    const documents = await db
      .select()
      .from(financeDocuments)
      .where(eq(financeDocuments.contractId, contractId))
      .orderBy(desc(financeDocuments.createdAt));

    return c.json({ data: documents });
  },
);

// ──────────────────────────────────────────
// Check Execution Gate (Can Execute?)
// ──────────────────────────────────────────

financeRoutes.get(
  '/:communityId/finance/contracts/:contractId/execution-gate',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contractId = c.req.param('contractId')!;

    const [contract] = await db
      .select()
      .from(financeContracts)
      .where(
        and(
          eq(financeContracts.id, contractId),
          eq(financeContracts.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contract) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found.' } },
        404,
      );
    }

    const canExecute = contract.executionApproved === 'YES' &&
      contract.legalStatus === 'APPROVED_FOR_EXECUTION' &&
      contract.shariahReviewStatus === 'REVIEWED';

    return c.json({
      data: {
        contractId: contract.id,
        canExecute,
        shariahReviewStatus: contract.shariahReviewStatus,
        legalStatus: contract.legalStatus,
        executionApproved: contract.executionApproved,
        reasons: canExecute ? [] : [
          contract.shariahReviewStatus !== 'REVIEWED' ? 'Shariah review not completed' : null,
          contract.legalStatus !== 'APPROVED_FOR_EXECUTION' ? 'Legal approval not granted' : null,
          contract.executionApproved !== 'YES' ? 'Execution not approved' : null,
        ].filter(Boolean),
      },
    });
  },
);

export default financeRoutes;
