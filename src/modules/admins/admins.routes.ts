import { Router } from 'express';
import { adminsController } from './admins.controller';
import { authenticate, authorizeRole, validate } from '../../common/middleware';
import {
  createAdminSchema,
  updateAdminSchema,
  updateAdminStatusSchema,
  resetAdminPasswordSchema,
  adminQuerySchema,
} from './admins.validation';

const router = Router();

// All Admin management routes require SUPER_ADMIN authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN'));

router.post('/', validate(createAdminSchema), adminsController.createAdmin);
router.get('/', validate({ query: adminQuerySchema }), adminsController.listAdmins);
router.get('/:id', adminsController.getAdminById);
router.patch('/:id', validate(updateAdminSchema), adminsController.updateAdmin);
router.patch('/:id/status', validate(updateAdminStatusSchema), adminsController.updateAdminStatus);
router.post(
  '/:id/reset-password',
  validate(resetAdminPasswordSchema),
  adminsController.resetAdminPassword,
);
router.delete('/:id', adminsController.deleteAdmin);

export const adminsRoutes = router;
