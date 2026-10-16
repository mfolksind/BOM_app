import { Router } from 'express';
import { inventoryDashboardController } from './inventory-dashboard.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  inventorySummaryQuerySchema,
  inventoryTransactionQuerySchema,
  inventoryBalanceQuerySchema,
  dailySummaryQuerySchema,
  rebuildDailySummarySchema,
} from './inventory-dashboard.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.get(
  '/summary',
  validateRequest({ query: inventorySummaryQuerySchema }),
  inventoryDashboardController.getGlobalSummary,
);

router.get('/materials/:materialId', inventoryDashboardController.getMaterialStock);

router.get(
  '/transactions',
  validateRequest({ query: inventoryTransactionQuerySchema }),
  inventoryDashboardController.getTransactions,
);

router.get(
  '/balances',
  validateRequest({ query: inventoryBalanceQuerySchema }),
  inventoryDashboardController.getBalances,
);

router.get(
  '/daily-summary',
  validateRequest({ query: dailySummaryQuerySchema }),
  inventoryDashboardController.getDailySummaries,
);

router.post(
  '/daily-summary/rebuild',
  validateRequest({ body: rebuildDailySummarySchema }),
  inventoryDashboardController.rebuildDailySummary,
);

router.get('/low-stock', inventoryDashboardController.getLowStockAlerts);

export const inventoryRoutes = router;
