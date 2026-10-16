import { Router } from 'express';
import { inboundChallansController } from './inbound-challans.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createInboundChallanSchema,
  updateInboundChallanSchema,
  postInboundChallanSchema,
  inboundChallanQuerySchema,
} from './inbound-challans.validation';

const router = Router();

// Protect all inbound challan routes
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createInboundChallanSchema }),
  inboundChallansController.createDraft,
);

router.get(
  '/',
  validateRequest({ query: inboundChallanQuerySchema }),
  inboundChallansController.list,
);

router.get('/:id', inboundChallansController.getById);

router.patch(
  '/:id',
  validateRequest({ body: updateInboundChallanSchema }),
  inboundChallansController.updateDraft,
);

router.post('/:id/cancel', inboundChallansController.cancelDraft);

router.post(
  '/:id/post',
  validateRequest({ body: postInboundChallanSchema }),
  inboundChallansController.postChallan,
);

export const inboundChallanRoutes = router;
