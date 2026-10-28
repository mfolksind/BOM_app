import { Router } from 'express';
import { workOrdersController } from './work-orders.controller';
import { productionController } from '../production/production.controller';
import { dispatchController } from '../dispatch/dispatch.controller';
import { createProductionOrderSchema } from '../production/production.validation';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  listWorkOrdersQuerySchema,
  workOrderIdParamSchema,
  cancelWorkOrderSchema,
  holdWorkOrderSchema,
  completeWorkOrderSchema,
} from './work-orders.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest(createWorkOrderSchema),
  workOrdersController.createWorkOrder.bind(workOrdersController),
);

router.get(
  '/',
  validateRequest(listWorkOrdersQuerySchema),
  workOrdersController.listWorkOrders.bind(workOrdersController),
);

router.post(
  '/preview/material-availability',
  workOrdersController.previewMaterialAvailability.bind(workOrdersController),
);

router.get(
  '/:id',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.getWorkOrderById.bind(workOrdersController),
);

router.patch(
  '/:id',
  validateRequest(updateWorkOrderSchema),
  workOrdersController.updateWorkOrder.bind(workOrdersController),
);

router.post(
  '/:id/confirm',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.confirmWorkOrder.bind(workOrdersController),
);

router.post(
  '/:id/hold',
  validateRequest(holdWorkOrderSchema),
  workOrdersController.holdWorkOrder.bind(workOrdersController),
);

router.post(
  '/:id/resume',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.resumeWorkOrder.bind(workOrdersController),
);

router.post(
  '/:id/cancel',
  validateRequest(cancelWorkOrderSchema),
  workOrdersController.cancelWorkOrder.bind(workOrdersController),
);

router.get(
  '/:id/material-requirements',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.getMaterialRequirements.bind(workOrdersController),
);

router.get(
  '/:id/material-availability',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.getMaterialAvailability.bind(workOrdersController),
);

router.post(
  '/:id/reserve-materials',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.reserveMaterials.bind(workOrdersController),
);

router.post(
  '/:id/release-reservations',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.releaseReservations.bind(workOrdersController),
);

router.get(
  '/:id/completion-summary',
  validateRequest(workOrderIdParamSchema),
  workOrdersController.getCompletionSummary.bind(workOrdersController),
);

router.post(
  '/:id/complete',
  validateRequest(completeWorkOrderSchema),
  workOrdersController.completeWorkOrder.bind(workOrdersController),
);

router.post(
  '/:id/production-orders',
  validateRequest(createProductionOrderSchema),
  productionController.createProductionOrder.bind(productionController),
);

router.get(
  '/:id/material-reconciliation',
  validateRequest(workOrderIdParamSchema),
  productionController.getWorkOrderMaterialReconciliation.bind(productionController),
);

router.get(
  '/:id/packing-summary',
  validateRequest(workOrderIdParamSchema),
  dispatchController.getWorkOrderPackingSummary.bind(dispatchController),
);

router.get(
  '/:id/dispatch-summary',
  validateRequest(workOrderIdParamSchema),
  dispatchController.getWorkOrderDispatchSummary.bind(dispatchController),
);

export const workOrderRoutes = router;
