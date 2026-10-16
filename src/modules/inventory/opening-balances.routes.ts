import { Router } from 'express';
import { openingBalancesController } from './opening-balances.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createOpeningBalanceSchema,
  updateOpeningBalanceSchema,
  postOpeningBalanceSchema,
  openingBalanceQuerySchema,
} from './opening-balances.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createOpeningBalanceSchema }),
  openingBalancesController.createDraft,
);

router.get(
  '/',
  validateRequest({ query: openingBalanceQuerySchema }),
  openingBalancesController.list,
);

router.get('/:id', openingBalancesController.getById);

router.patch(
  '/:id',
  validateRequest({ body: updateOpeningBalanceSchema }),
  openingBalancesController.updateDraft,
);

router.post(
  '/:id/post',
  validateRequest({ body: postOpeningBalanceSchema }),
  openingBalancesController.postOpeningBalance,
);

export const openingBalanceRoutes = router;
