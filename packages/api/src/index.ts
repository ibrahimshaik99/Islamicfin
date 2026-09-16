import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import authRoutes from './auth/routes';
import communityRoutes from './community/routes';
import rbacRoutes from './rbac/routes';
import merchantRoutes from './merchant/routes';
import marketplaceRoutes from './marketplace/routes';
import orderRoutes from './orders/routes';
import kametiRoutes from './kameti/routes';
import messagingRoutes from './messaging/routes';
import servicesRoutes from './services/routes';
import zakatRoutes from './zakat/routes';
import crowdfundingRoutes from './crowdfunding/routes';
import financeRoutes from './finance/routes';
import financeRequestRoutes from './finance/finance-request-routes';
import directoryRoutes from './community/directory-routes';
import { superAdminDirectoryRoutes } from './community/directory-routes';
import adminRoutes from './admin/routes';
import returnRoutes from './orders/return-routes';
import membershipRequestRoutes from './membership-requests/routes';
import { authMiddleware } from './auth/middleware';

type Bindings = {
  ENVIRONMENT: string;
  DATABASE_URL: string;
  SESSION_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Set env vars from Workers bindings into process.env for modules that read process.env
app.use('*', async (c, next) => {
  if (c.env.DATABASE_URL) process.env.DATABASE_URL = c.env.DATABASE_URL;
  if (c.env.SESSION_SECRET) process.env.SESSION_SECRET = c.env.SESSION_SECRET;
  await next();
});

// Middleware
app.use('*', logger());
app.use('*', secureHeaders({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Auth middleware on all /api/v1 routes
app.use('/api/v1/*', authMiddleware);

// Health check
app.get('/api/v1/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// Auth routes
app.route('/api/v1/auth', authRoutes);

// Community routes
app.route('/api/v1/communities', communityRoutes);

// RBAC routes
app.route('/api/v1/communities', rbacRoutes);

// Merchant routes
app.route('/api/v1/communities', merchantRoutes);

// Marketplace routes
app.route('/api/v1/communities', marketplaceRoutes);

// Order routes
app.route('/api/v1/communities', orderRoutes);

// Return routes
app.route('/api/v1/communities', returnRoutes);

// Kameti routes
app.route('/api/v1/communities', kametiRoutes);

// Messaging routes
app.route('/api/v1/communities', messagingRoutes);

// Services routes
app.route('/api/v1/communities', servicesRoutes);

// Zakat routes (not community-scoped)
app.route('/api/v1', zakatRoutes);

// Crowdfunding routes
app.route('/api/v1/communities', crowdfundingRoutes);

// Finance routes
app.route('/api/v1/communities', financeRoutes);

// Finance request routes
app.route('/api/v1/communities', financeRequestRoutes);

// Directory and contract routes
app.route('/api/v1/communities', directoryRoutes);

// Admin routes (Super Admin only)
app.route('/api/v1/admin', adminRoutes);

// Super admin directory and contracts
app.route('/api/v1/admin', superAdminDirectoryRoutes);

// Membership request routes (join/create community)
app.route('/api/v1/membership-requests', membershipRequestRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
    },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    },
    500,
  );
});

export default app;
