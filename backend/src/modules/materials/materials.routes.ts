import { Router } from 'express';
import { materialsController } from './materials.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createMaterialSchema,
  updateMaterialSchema,
  updateMaterialStatusSchema,
  materialQuerySchema,
} from './materials.validation';

const router = Router();

// Protect all material routes with authentication and role authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createMaterialSchema }),
  materialsController.createMaterial,
);
router.get('/', validateRequest({ query: materialQuerySchema }), materialsController.listMaterials);
router.get('/:id', materialsController.getMaterialById);
router.patch(
  '/:id',
  validateRequest({ body: updateMaterialSchema }),
  materialsController.updateMaterial,
);
router.patch(
  '/:id/status',
  validateRequest({ body: updateMaterialStatusSchema }),
  materialsController.updateMaterialStatus,
);
router.delete('/:id', materialsController.deleteMaterial);

export const materialRoutes = router;
