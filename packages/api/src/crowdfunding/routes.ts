import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  crowdfundingProjects,
  crowdfundingContributions,
  investmentInterests,
} from '../db/schema/crowdfunding';
import { auditLogs } from '../db/schema/audit';
import { requireAuth } from '../auth/middleware';
import { tenantMiddleware } from '../tenancy/middleware';
import { requirePermission } from '../rbac/middleware';

const crowdfundingRoutes = new Hono();

// ──────────────────────────────────────────
// Create Sadaqah/Donation Project
// ──────────────────────────────────────────

const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  goalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

crowdfundingRoutes.post(
  '/:communityId/crowdfunding/projects',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate goal amount is positive
    if (parseFloat(result.data.goalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Goal amount must be positive.' } },
        400,
      );
    }

    const [project] = await db
      .insert(crowdfundingProjects)
      .values({
        communityId,
        creatorId: user.id,
        title: result.data.title,
        description: result.data.description,
        goalAmount: result.data.goalAmount,
        projectType: 'DONATION',
        status: 'ACTIVE',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'crowdfunding.project.create',
      entityType: 'crowdfunding_project',
      entityId: project.id,
      newValues: { title: project.title, goalAmount: project.goalAmount, projectType: 'DONATION' },
    });

    return c.json({ data: project }, 201);
  },
);

// ──────────────────────────────────────────
// List Sadaqah/Donation Projects
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/projects',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const projects = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.communityId, communityId),
          eq(crowdfundingProjects.projectType, 'DONATION'),
        ),
      )
      .orderBy(desc(crowdfundingProjects.createdAt));

    return c.json({ data: projects });
  },
);

// ──────────────────────────────────────────
// Get Project Details
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/projects/:projectId',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const projectId = c.req.param('projectId')!;

    const [project] = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.id, projectId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!project) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        404,
      );
    }

    // Get contributions for this project
    const contributions = await db
      .select()
      .from(crowdfundingContributions)
      .where(eq(crowdfundingContributions.projectId, projectId))
      .orderBy(desc(crowdfundingContributions.createdAt));

    return c.json({ data: { ...project, contributions } });
  },
);

// ──────────────────────────────────────────
// Record Donation Contribution
// ──────────────────────────────────────────

const recordContributionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.string().max(50).optional(),
  referenceNumber: z.string().max(255).optional(),
  proofUrl: z.string().url().optional(),
});

crowdfundingRoutes.post(
  '/:communityId/crowdfunding/projects/:projectId/contributions',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const projectId = c.req.param('projectId')!;

    const body = await c.req.json();
    const result = recordContributionSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate amount is positive
    if (parseFloat(result.data.amount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' } },
        400,
      );
    }

    // Check project exists and is active
    const [project] = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.id, projectId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!project) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        404,
      );
    }

    if (project.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Project is not active.' } },
        400,
      );
    }

    // Prevent mixing donation and investment
    if (project.projectType !== 'DONATION') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'This project does not accept donations.' } },
        400,
      );
    }

    // Check for duplicate reference number
    if (result.data.referenceNumber) {
      const [existingRef] = await db
        .select()
        .from(crowdfundingContributions)
        .where(eq(crowdfundingContributions.referenceNumber, result.data.referenceNumber))
        .limit(1);

      if (existingRef) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'Reference number already used.' } },
          409,
        );
      }
    }

    const [contribution] = await db
      .insert(crowdfundingContributions)
      .values({
        projectId,
        contributorId: user.id,
        amount: result.data.amount,
        contributionType: 'DONATION',
        paymentMethod: result.data.paymentMethod,
        referenceNumber: result.data.referenceNumber,
        proofUrl: result.data.proofUrl,
        status: 'REPORTED',
      })
      .returning();

    // Update raised amount
    const newRaisedAmount = parseFloat(project.raisedAmount) + parseFloat(result.data.amount);
    await db
      .update(crowdfundingProjects)
      .set({
        raisedAmount: newRaisedAmount.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(crowdfundingProjects.id, projectId));

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'crowdfunding.contribution.record',
      entityType: 'crowdfunding_contribution',
      entityId: contribution.id,
      newValues: { amount: contribution.amount, projectId, contributionType: 'DONATION' },
    });

    return c.json({ data: contribution }, 201);
  },
);

// ──────────────────────────────────────────
// Verify Donation Contribution
// ──────────────────────────────────────────

crowdfundingRoutes.post(
  '/:communityId/crowdfunding/contributions/:contributionId/verify',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const contributionId = c.req.param('contributionId')!;

    const [contribution] = await db
      .select({ contribution: crowdfundingContributions, project: crowdfundingProjects })
      .from(crowdfundingContributions)
      .innerJoin(crowdfundingProjects, eq(crowdfundingContributions.projectId, crowdfundingProjects.id))
      .where(
        and(
          eq(crowdfundingContributions.id, contributionId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contribution) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contribution not found.' } },
        404,
      );
    }

    if (contribution.contribution.status !== 'REPORTED') {
      return c.json(
        { error: { code: 'INVALID_STATE', message: 'Can only verify REPORTED contributions.' } },
        400,
      );
    }

    // Ensure contribution is for a donation project
    if (contribution.project.projectType !== 'DONATION') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot verify non-donation contributions.' } },
        400,
      );
    }

    const [updated] = await db
      .update(crowdfundingContributions)
      .set({
        status: 'VERIFIED',
        updatedAt: new Date(),
      })
      .where(eq(crowdfundingContributions.id, contributionId))
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'crowdfunding.contribution.verify',
      entityType: 'crowdfunding_contribution',
      entityId: contributionId,
      oldValues: { status: contribution.contribution.status },
      newValues: { status: 'VERIFIED' },
    });

    return c.json({ data: updated });
  },
);

// ──────────────────────────────────────────
// Get Contribution Details
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/contributions/:contributionId',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const contributionId = c.req.param('contributionId')!;

    const [contribution] = await db
      .select({ contribution: crowdfundingContributions, project: crowdfundingProjects })
      .from(crowdfundingContributions)
      .innerJoin(crowdfundingProjects, eq(crowdfundingContributions.projectId, crowdfundingProjects.id))
      .where(
        and(
          eq(crowdfundingContributions.id, contributionId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!contribution) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Contribution not found.' } },
        404,
      );
    }

    return c.json({ data: contribution.contribution });
  },
);

// ──────────────────────────────────────────
// Get Sadaqah Report
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/projects/:projectId/report',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const projectId = c.req.param('projectId')!;

    const [project] = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.id, projectId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!project) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Project not found.' } },
        404,
      );
    }

    const contributions = await db
      .select()
      .from(crowdfundingContributions)
      .where(eq(crowdfundingContributions.projectId, projectId));

    const verifiedContributions = contributions.filter((c) => c.status === 'VERIFIED');
    const totalVerified = verifiedContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const totalPending = contributions
      .filter((c) => c.status === 'REPORTED')
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    const progressPercent = parseFloat(project.goalAmount) > 0
      ? Math.min(100, (parseFloat(project.raisedAmount) / parseFloat(project.goalAmount)) * 100)
      : 0;

    return c.json({
      data: {
        project,
        summary: {
          totalContributions: contributions.length,
          verifiedContributions: verifiedContributions.length,
          totalVerified,
          totalPending,
          raisedAmount: project.raisedAmount,
          goalAmount: project.goalAmount,
          progressPercent: progressPercent.toFixed(2),
          remainingAmount: Math.max(0, parseFloat(project.goalAmount) - parseFloat(project.raisedAmount)).toFixed(2),
        },
        contributions,
      },
    });
  },
);

// ──────────────────────────────────────────
// Create Investment Project
// ──────────────────────────────────────────

const createInvestmentProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  goalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  contractType: z.string().min(1).max(50),
  riskDisclosure: z.string().min(1),
  expectedReturns: z.string().max(500),
  investmentThesis: z.string().max(5000),
  shariahReviewStatus: z.enum(['PENDING_REVIEW', 'REVIEWED', 'NEEDS_REVISION']).optional(),
  legalStatus: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

crowdfundingRoutes.post(
  '/:communityId/crowdfunding/investment-projects',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:manage'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;

    const body = await c.req.json();
    const result = createInvestmentProjectSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Validate goal amount is positive
    if (parseFloat(result.data.goalAmount) <= 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Goal amount must be positive.' } },
        400,
      );
    }

    // Risk disclosure is mandatory for investment projects
    if (!result.data.riskDisclosure || result.data.riskDisclosure.trim().length === 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Risk disclosure is mandatory for investment projects.' } },
        400,
      );
    }

    // Investment thesis is mandatory
    if (!result.data.investmentThesis || result.data.investmentThesis.trim().length === 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Investment thesis is mandatory.' } },
        400,
      );
    }

    const [project] = await db
      .insert(crowdfundingProjects)
      .values({
        communityId,
        creatorId: user.id,
        title: result.data.title,
        description: result.data.description,
        goalAmount: result.data.goalAmount,
        projectType: 'INVESTMENT',
        status: 'ACTIVE',
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        contractType: result.data.contractType,
        riskDisclosure: result.data.riskDisclosure,
        expectedReturns: result.data.expectedReturns,
        investmentThesis: result.data.investmentThesis,
        shariahReviewStatus: result.data.shariahReviewStatus || 'PENDING_REVIEW',
        legalStatus: result.data.legalStatus || 'PENDING',
        legalGatePassed: 'PENDING',
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'crowdfunding.investment_project.create',
      entityType: 'crowdfunding_project',
      entityId: project.id,
      newValues: { title: project.title, goalAmount: project.goalAmount, projectType: 'INVESTMENT' },
    });

    return c.json({ data: project }, 201);
  },
);

// ──────────────────────────────────────────
// List Investment Projects
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/investment-projects',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;

    const projects = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.communityId, communityId),
          eq(crowdfundingProjects.projectType, 'INVESTMENT'),
        ),
      )
      .orderBy(desc(crowdfundingProjects.createdAt));

    return c.json({ data: projects });
  },
);

// ──────────────────────────────────────────
// Get Investment Project Details
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/investment-projects/:projectId',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const projectId = c.req.param('projectId')!;

    const [project] = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.id, projectId),
          eq(crowdfundingProjects.communityId, communityId),
          eq(crowdfundingProjects.projectType, 'INVESTMENT'),
        ),
      )
      .limit(1);

    if (!project) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Investment project not found.' } },
        404,
      );
    }

    // Get investment interests for this project
    const interests = await db
      .select()
      .from(investmentInterests)
      .where(eq(investmentInterests.projectId, projectId))
      .orderBy(desc(investmentInterests.createdAt));

    return c.json({ data: { ...project, interests } });
  },
);

// ──────────────────────────────────────────
// Express Interest in Investment Project
// ──────────────────────────────────────────

const expressInterestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().max(2000).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
});

crowdfundingRoutes.post(
  '/:communityId/crowdfunding/investment-projects/:projectId/interests',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const user = c.get('user')!;
    const communityId = tenant.communityId;
    const projectId = c.req.param('projectId')!;

    const body = await c.req.json();
    const result = expressInterestSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
        400,
      );
    }

    // Check project exists and is active
    const [project] = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.id, projectId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!project) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Investment project not found.' } },
        404,
      );
    }

    if (project.status !== 'ACTIVE') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Project is not active.' } },
        400,
      );
    }

    // Prevent mixing donation and investment
    if (project.projectType !== 'INVESTMENT') {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'This project does not accept investment interests.' } },
        400,
      );
    }

    // Check if user already expressed interest
    const [existingInterest] = await db
      .select()
      .from(investmentInterests)
      .where(
        and(
          eq(investmentInterests.projectId, projectId),
          eq(investmentInterests.userId, user.id),
        ),
      )
      .limit(1);

    if (existingInterest) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'You have already expressed interest in this project.' } },
        409,
      );
    }

    // Create investment interest
    const [interest] = await db
      .insert(investmentInterests)
      .values({
        projectId,
        userId: user.id,
        amount: result.data.amount,
        status: 'INTERESTED',
        notes: result.data.notes,
        contactEmail: result.data.contactEmail,
        contactPhone: result.data.contactPhone,
      })
      .returning();

    await db.insert(auditLogs).values({
      communityId,
      actorId: user.id,
      action: 'crowdfunding.investment_interest.create',
      entityType: 'investment_interest',
      entityId: interest.id,
      newValues: { projectId, amount: interest.amount },
    });

    return c.json({ data: interest }, 201);
  },
);

// ──────────────────────────────────────────
// Get Investment Interests for a Project
// ──────────────────────────────────────────

crowdfundingRoutes.get(
  '/:communityId/crowdfunding/investment-projects/:projectId/interests',
  requireAuth,
  tenantMiddleware,
  requirePermission('finance:read'),
  async (c) => {
    const tenant = c.get('tenant')!;
    const communityId = tenant.communityId;
    const projectId = c.req.param('projectId')!;

    // Verify project exists and belongs to community
    const [project] = await db
      .select()
      .from(crowdfundingProjects)
      .where(
        and(
          eq(crowdfundingProjects.id, projectId),
          eq(crowdfundingProjects.communityId, communityId),
        ),
      )
      .limit(1);

    if (!project) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Investment project not found.' } },
        404,
      );
    }

    const interests = await db
      .select()
      .from(investmentInterests)
      .where(eq(investmentInterests.projectId, projectId))
      .orderBy(desc(investmentInterests.createdAt));

    return c.json({ data: interests });
  },
);

export default crowdfundingRoutes;
