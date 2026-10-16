import { Router } from 'express';
import { processStagesController } from './process-stages.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createProcessStageSchema,
  updateProcessStageSchema,
  updateProcessStageStatusSchema,
  processStageQuerySchema,
} from './process-stages.validation';

const router = Router();

// Protect all process stage routes with authentication and role authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createProcessStageSchema }),
  processStagesController.createProcessStage,
);
router.get(
  '/',
  validateRequest({ query: processStageQuerySchema }),
  processStagesController.listProcessStages,
);
router.get('/:id', processStagesController.getProcessStageById);
router.patch(
  '/:id',
  validateRequest({ body: updateProcessStageSchema }),
  processStagesController.updateProcessStage,
);
router.patch(
  '/:id/status',
  validateRequest({ body: updateProcessStageStatusSchema }),
  processStagesController.updateProcessStageStatus,
);
router.delete('/:id', processStagesController.deleteProcessStage);

export const processStageRoutes = router;
