import { Router } from 'express';
import { productionController } from './production.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  listProductionOrdersQuerySchema,
  productionOrderIdParamSchema,
  createProductionBatchSchema,
  updateProductionBatchSchema,
  createMaterialIssueSchema,
  listMaterialIssuesQuerySchema,
  createMaterialConsumptionSchema,
  createMaterialReturnSchema,
  createProductionOutputSchema,
  createScrapRecordSchema,
  createBulkMaterialConsumptionSchema,
  autoScrapSchema,
  reverseBatchSchema,
} from './production.validation';

// ==========================================
// 1. PRODUCTION ORDERS ROUTER (/api/v1/production-orders)
// ==========================================
const ordersRouter = Router();
ordersRouter.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

ordersRouter.get(
  '/',
  validateRequest(listProductionOrdersQuerySchema),
  productionController.listProductionOrders.bind(productionController),
);

ordersRouter.get(
  '/:id',
  validateRequest(productionOrderIdParamSchema),
  productionController.getProductionOrderById.bind(productionController),
);

ordersRouter.post(
  '/:id/start',
  validateRequest(productionOrderIdParamSchema),
  productionController.startProductionOrder.bind(productionController),
);

ordersRouter.post(
  '/:id/complete',
  validateRequest(productionOrderIdParamSchema),
  productionController.completeProductionOrder.bind(productionController),
);

ordersRouter.post(
  '/:id/batches',
  validateRequest(createProductionBatchSchema),
  productionController.createProductionBatch.bind(productionController),
);

ordersRouter.get('/:id/batches', (req, res, next) => {
  req.query.productionOrderId = req.params.id;
  return productionController.listProductionBatches(req, res, next);
});

ordersRouter.post(
  '/:id/material-issues',
  validateRequest(createMaterialIssueSchema),
  productionController.createMaterialIssue.bind(productionController),
);

// ==========================================
// 2. PRODUCTION BATCHES ROUTER (/api/v1/production-batches)
// ==========================================
const batchesRouter = Router();
batchesRouter.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

batchesRouter.get('/', productionController.listProductionBatches.bind(productionController));
batchesRouter.get('/:id', productionController.getProductionBatchById.bind(productionController));

batchesRouter.post(
  '/:id/pass-test',
  productionController.passBatchTest.bind(productionController),
);

batchesRouter.post(
  '/:id/fail-test',
  productionController.failBatchTest.bind(productionController),
);

batchesRouter.patch(
  '/:id',
  validateRequest(updateProductionBatchSchema),
  productionController.updateProductionBatch.bind(productionController),
);

batchesRouter.post(
  '/:id/consumption',
  validateRequest(createMaterialConsumptionSchema),
  productionController.recordConsumption.bind(productionController),
);

batchesRouter.post(
  '/:id/consumptions/bulk',
  validateRequest(createBulkMaterialConsumptionSchema),
  productionController.recordBatchConsumption.bind(productionController),
);

batchesRouter.get(
  '/:id/consumption',
  productionController.listConsumptions.bind(productionController),
);

batchesRouter.post(
  '/:id/material-returns',
  validateRequest(createMaterialReturnSchema),
  productionController.recordMaterialReturn.bind(productionController),
);

batchesRouter.get(
  '/:id/material-returns',
  productionController.listMaterialReturns.bind(productionController),
);

batchesRouter.post(
  '/:id/outputs',
  validateRequest(createProductionOutputSchema),
  productionController.createProductionOutput.bind(productionController),
);

batchesRouter.get(
  '/:id/outputs',
  productionController.listProductionOutputs.bind(productionController),
);

batchesRouter.post(
  '/:id/scrap',
  validateRequest(createScrapRecordSchema),
  productionController.recordScrap.bind(productionController),
);

batchesRouter.post(
  '/:id/auto-scrap',
  validateRequest(autoScrapSchema),
  productionController.calculateAndRecordAutoScrap.bind(productionController),
);

batchesRouter.post(
  '/:id/reverse',
  validateRequest(reverseBatchSchema),
  productionController.reverseBatchWork.bind(productionController),
);

batchesRouter.get('/:id/scrap', productionController.listScrapRecords.bind(productionController));

batchesRouter.get(
  '/:id/material-reconciliation',
  productionController.getProductionBatchMaterialReconciliation.bind(productionController),
);

// ==========================================
// 3. MATERIAL ISSUES ROUTER (/api/v1/material-issues)
// ==========================================
const issuesRouter = Router();
issuesRouter.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

issuesRouter.get(
  '/',
  validateRequest(listMaterialIssuesQuerySchema),
  productionController.listMaterialIssues.bind(productionController),
);

issuesRouter.get('/:id', productionController.getMaterialIssueById.bind(productionController));

issuesRouter.post('/:id/post', productionController.postMaterialIssue.bind(productionController));

// ==========================================
// 4. PRODUCTION OUTPUTS ROUTER (/api/v1/production-outputs)
// ==========================================
const outputsRouter = Router();
outputsRouter.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

outputsRouter.get('/:id', productionController.getProductionOutputById.bind(productionController));

outputsRouter.post(
  '/:id/post',
  productionController.postProductionOutput.bind(productionController),
);

export {
  ordersRouter as productionOrderRoutes,
  batchesRouter as productionBatchRoutes,
  issuesRouter as materialIssueRoutes,
  outputsRouter as productionOutputRoutes,
};
