import { Router } from 'express';
import { customersController } from './customers.controller';
import { productionController } from '../production/production.controller';
import { dispatchController } from '../dispatch/dispatch.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  customerQuerySchema,
} from './customers.validation';

const router = Router();

// Protect all customer routes with authentication and role authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  customersController.createCustomer,
);
router.get('/', validateRequest({ query: customerQuerySchema }), customersController.listCustomers);
router.get('/:id', customersController.getCustomerById);
router.patch(
  '/:id',
  validateRequest({ body: updateCustomerSchema }),
  customersController.updateCustomer,
);
router.patch(
  '/:id/status',
  validateRequest({ body: updateCustomerStatusSchema }),
  customersController.updateCustomerStatus,
);
router.delete('/:id', customersController.deleteCustomer);

router.get(
  '/:customerId/material-reconciliation',
  productionController.getCustomerMaterialReconciliation.bind(productionController),
);

router.get(
  '/:customerId/dispatch-history',
  dispatchController.getCustomerDispatchHistory.bind(dispatchController),
);

export const customerRoutes = router;
