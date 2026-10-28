import { Router } from 'express';
import { dispatchController } from './dispatch.controller';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { authorizeRole } from '../../common/middleware/authorize.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import {
  createDispatchSchema,
  updateDispatchSchema,
  listDispatchesQuerySchema,
  dispatchIdParamSchema,
  cancelDispatchSchema,
  generateOutboundChallanSchema,
  createOutboundChallanSchema,
  listOutboundChallansQuerySchema,
  outboundChallanIdParamSchema,
} from './dispatch.validation';

// Dispatches Router (/api/v1/dispatches)
export const dispatchRoutes = Router();

dispatchRoutes.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

dispatchRoutes.post('/', validate(createDispatchSchema), (req, res, next) =>
  dispatchController.createDispatch(req, res, next),
);
dispatchRoutes.get('/', validate(listDispatchesQuerySchema), (req, res, next) =>
  dispatchController.listDispatches(req, res, next),
);
dispatchRoutes.get('/:id', validate(dispatchIdParamSchema), (req, res, next) =>
  dispatchController.getDispatchById(req, res, next),
);
dispatchRoutes.patch('/:id', validate(updateDispatchSchema), (req, res, next) =>
  dispatchController.updateDispatch(req, res, next),
);
dispatchRoutes.post('/:id/dispatch', validate(dispatchIdParamSchema), (req, res, next) =>
  dispatchController.postDispatch(req, res, next),
);
dispatchRoutes.post('/:id/cancel', validate(cancelDispatchSchema), (req, res, next) =>
  dispatchController.cancelDispatch(req, res, next),
);
dispatchRoutes.post(
  '/:id/generate-outbound-challan',
  validate(generateOutboundChallanSchema),
  (req, res, next) => dispatchController.generateOutboundChallanFromDispatch(req, res, next),
);

// Outbound Challans Router (/api/v1/outbound-challans)
export const outboundChallanRoutes = Router();

outboundChallanRoutes.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

outboundChallanRoutes.post('/', validate(createOutboundChallanSchema), (req, res, next) =>
  dispatchController.createOutboundChallan(req, res, next),
);
outboundChallanRoutes.get('/', validate(listOutboundChallansQuerySchema), (req, res, next) =>
  dispatchController.listOutboundChallans(req, res, next),
);
outboundChallanRoutes.get('/:id', validate(outboundChallanIdParamSchema), (req, res, next) =>
  dispatchController.getOutboundChallanById(req, res, next),
);
outboundChallanRoutes.get(
  '/:id/print-data',
  validate(outboundChallanIdParamSchema),
  (req, res, next) => dispatchController.getOutboundChallanPrintData(req, res, next),
);
outboundChallanRoutes.get(
  '/:id/consumption-sheet',
  validate(outboundChallanIdParamSchema),
  (req, res, next) => dispatchController.getOutboundChallanConsumptionSheet(req, res, next),
);
outboundChallanRoutes.post(
  '/:id/consumption-sheet',
  validate(outboundChallanIdParamSchema),
  (req, res, next) => dispatchController.saveOutboundChallanConsumptionSheet(req, res, next),
);
