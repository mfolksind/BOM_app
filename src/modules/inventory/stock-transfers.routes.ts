import { Router } from 'express';
import { stockTransfersController } from './stock-transfers.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createStockTransferSchema,
  postStockTransferSchema,
  stockTransferQuerySchema,
} from './stock-transfers.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createStockTransferSchema }),
  stockTransfersController.createTransfer,
);

router.get(
  '/',
  validateRequest({ query: stockTransferQuerySchema }),
  stockTransfersController.list,
);

router.get('/:id', stockTransfersController.getById);

router.post(
  '/:id/post',
  validateRequest({ body: postStockTransferSchema }),
  stockTransfersController.postTransfer,
);

export const stockTransferRoutes = router;
