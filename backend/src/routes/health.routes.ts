import { Router, Request, Response } from 'express';
import { isDatabaseConnected, getDatabaseStatus } from '../config/database';
import { env } from '../config/env';
import { HttpStatus } from '../common/constants';
import { ApiResponseUtil } from '../common/utils';

const router = Router();

/**
 * Health endpoint: reports that the process is running and responsive.
 * GET /api/v1/health
 */
router.get('/health', (_req: Request, res: Response) => {
  return ApiResponseUtil.success(
    res,
    {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      nodeVersion: process.version,
    },
    'ERP Backend service is operational',
    HttpStatus.OK,
  );
});

/**
 * Readiness endpoint: reports whether the database connection is ready to handle traffic.
 * Returns HTTP 200 if connected, HTTP 503 if database is disconnected/unavailable.
 * GET /api/v1/ready
 */
router.get('/ready', (_req: Request, res: Response) => {
  const isConnected = isDatabaseConnected();
  const dbStatus = getDatabaseStatus();

  if (!isConnected) {
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Service is not ready: database connection is unavailable',
      data: {
        status: 'NOT_READY',
        database: dbStatus,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return ApiResponseUtil.success(
    res,
    {
      status: 'READY',
      database: dbStatus,
    },
    'Service is ready to accept requests',
    HttpStatus.OK,
  );
});

export const healthRoutes = router;
