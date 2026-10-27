import { Router } from 'express';
import { materialReservationsController } from './material-reservations.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createMaterialReservationSchema,
  releaseMaterialReservationSchema,
  materialReservationQuerySchema,
} from './material-reservations.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createMaterialReservationSchema }),
  materialReservationsController.createReservation,
);

router.get(
  '/',
  validateRequest({ query: materialReservationQuerySchema }),
  materialReservationsController.list,
);

router.get('/:id', materialReservationsController.getById);

router.post(
  '/:id/release',
  validateRequest({ body: releaseMaterialReservationSchema }),
  materialReservationsController.releaseReservation,
);

export const materialReservationRoutes = router;
