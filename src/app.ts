import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger, errorHandler, notFoundHandler } from './common/middleware';
import { appRouter } from './routes';
import { reportRoutes } from './modules/reports';

const createApp = (): Application => {
  const app = express();

  // 1. Basic security headers
  app.use(helmet());

  // 2. CORS configuration from environment variables
  const corsOrigins =
    env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  // 3. Request body parsing with safe limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Structured HTTP request logging (skip during automated test runs)
  if (env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // 5. Root status check
  app.get('/', (_req, res) => {
    res.json({
      name: 'Cable Manufacturing Job-Work ERP Backend',
      version: '1.0.0',
      apiDocs: '/api/v1',
      status: 'active',
    });
  });

  // 6. Mount API v1 routes and /api/reports alias
  app.use('/api/v1', appRouter);
  app.use('/api/reports', reportRoutes);

  // 7. 404 handler for unknown routes
  app.use(notFoundHandler);

  // 8. Centralized error handling middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
