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

// Authenticate all routes
router.use(authenticate);

// Listing admins requires SUPER_ADMIN
router.get('/', authorizeRole('SUPER_ADMIN'), validate({ query: adminQuerySchema }), adminsController.listAdmins);
router.get('/audit-logs', authorizeRole('SUPER_ADMIN'), adminsController.getAuditLogs);
router.get('/:id', authorizeRole('SUPER_ADMIN'), adminsController.getAdminById);

// Admin management mutations require SUPER_ADMIN
router.use(authorizeRole('SUPER_ADMIN'));

router.post('/', validate(createAdminSchema), adminsController.createAdmin);
router.patch('/:id', validate(updateAdminSchema), adminsController.updateAdmin);
router.patch('/:id/status', validate(updateAdminStatusSchema), adminsController.updateAdminStatus);
router.post(
  '/:id/reset-password',
  validate(resetAdminPasswordSchema),
  adminsController.resetAdminPassword,
);
router.delete('/:id', adminsController.deleteAdmin);

export const adminsRoutes = router;
