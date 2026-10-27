import { Router } from 'express';
import { warehousesController } from './warehouses.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  updateWarehouseStatusSchema,
  warehouseQuerySchema,
} from './warehouses.validation';

const router = Router();

// Protect all warehouse routes with authentication and role authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createWarehouseSchema }),
  warehousesController.createWarehouse,
);
router.get(
  '/',
  validateRequest({ query: warehouseQuerySchema }),
  warehousesController.listWarehouses,
);
router.get('/:id', warehousesController.getWarehouseById);
router.patch(
  '/:id',
  validateRequest({ body: updateWarehouseSchema }),
  warehousesController.updateWarehouse,
);
router.patch(
  '/:id/status',
  validateRequest({ body: updateWarehouseStatusSchema }),
  warehousesController.updateWarehouseStatus,
);
router.delete('/:id', warehousesController.deleteWarehouse);

export const warehouseRoutes = router;
