import { Router } from 'express';
import { stockReconciliationsController } from './stock-reconciliations.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createStockReconciliationSchema,
  approveStockReconciliationSchema,
  postStockReconciliationSchema,
  stockReconciliationQuerySchema,
} from './stock-reconciliations.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createStockReconciliationSchema }),
  stockReconciliationsController.createReconciliation,
);

router.get(
  '/',
  validateRequest({ query: stockReconciliationQuerySchema }),
  stockReconciliationsController.list,
);

router.get('/:id', stockReconciliationsController.getById);

router.post(
  '/:id/approve',
  validateRequest({ body: approveStockReconciliationSchema }),
  stockReconciliationsController.approveReconciliation,
);

router.post(
  '/:id/post',
  validateRequest({ body: postStockReconciliationSchema }),
  stockReconciliationsController.postReconciliation,
);

export const stockReconciliationRoutes = router;
