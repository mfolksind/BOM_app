import { Router } from 'express';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import { reportsController } from './reports.controller';
import {
  dashboardReportQuerySchema,
  inventorySummaryReportQuerySchema,
  dailyStockMovementReportQuerySchema,
  customerReconciliationReportQuerySchema,
  workOrderReportQuerySchema,
  productionBatchReportQuerySchema,
  finishedGoodsReportQuerySchema,
  packingDispatchReportQuerySchema,
  lowStockReportQuerySchema,
  traceabilityReportQuerySchema,
  discrepanciesReportQuerySchema,
} from './reports.validation';

const router = Router();

// Protect all report endpoints with JWT authentication and strict 2-role authorization
router.use(authenticate);
router.use(authorizeRole('SUPER_ADMIN', 'ADMIN'));

// 1. Global Inventory Dashboard
router.get(
  '/dashboard',
  validateRequest(dashboardReportQuerySchema),
  reportsController.getGlobalDashboard.bind(reportsController),
);

// 2. Inventory Summary
router.get(
  '/inventory-summary',
  validateRequest(inventorySummaryReportQuerySchema),
  reportsController.getInventorySummary.bind(reportsController),
);

// 3. Daily Stock and Movement Report
router.get(
  '/daily-stock-movement',
  validateRequest(dailyStockMovementReportQuerySchema),
  reportsController.getDailyStockMovement.bind(reportsController),
);

// 4. Customer-Owned Material Reconciliation
router.get(
  '/customer-material-reconciliation',
  validateRequest(customerReconciliationReportQuerySchema),
  reportsController.getCustomerMaterialReconciliation.bind(reportsController),
);

// 5. Work Order and Material Requirements Report
router.get(
  '/work-orders',
  validateRequest(workOrderReportQuerySchema),
  reportsController.getWorkOrdersReport.bind(reportsController),
);

// 6. Production Batch Report
router.get(
  '/production-batches',
  validateRequest(productionBatchReportQuerySchema),
  reportsController.getProductionBatchesReport.bind(reportsController),
);

// 7. Finished Goods Report
router.get(
  '/finished-goods',
  validateRequest(finishedGoodsReportQuerySchema),
  reportsController.getFinishedGoodsReport.bind(reportsController),
);

// 8. Packing and Dispatch Report
router.get(
  '/packing-dispatch',
  validateRequest(packingDispatchReportQuerySchema),
  reportsController.getPackingDispatchReport.bind(reportsController),
);

// 9. Low-Stock and Reorder Report
router.get(
  '/low-stock',
  validateRequest(lowStockReportQuerySchema),
  reportsController.getLowStockReport.bind(reportsController),
);

// 10. Material and Document Traceability Query
router.get(
  '/traceability',
  validateRequest(traceabilityReportQuerySchema),
  reportsController.getTraceabilityReport.bind(reportsController),
);

// 11. Discrepancy and Integrity Audit Report
router.get(
  '/discrepancies',
  validateRequest(discrepanciesReportQuerySchema),
  reportsController.getDiscrepanciesReport.bind(reportsController),
);

export const reportRoutes = router;
