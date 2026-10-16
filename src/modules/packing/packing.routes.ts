import { Router } from 'express';
import { packingController } from './packing.controller';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { authorizeRole } from '../../common/middleware/authorize.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import {
  createDrumSchema,
  updateDrumSchema,
  listDrumsQuerySchema,
  drumIdParamSchema,
  createPackingListSchema,
  updatePackingListSchema,
  listPackingListsQuerySchema,
  packingListIdParamSchema,
  cancelPackingListSchema,
} from './packing.validation';

// Drums Router (/api/v1/drums)
export const drumRoutes = Router();

drumRoutes.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

drumRoutes.post('/', validate(createDrumSchema), (req, res, next) =>
  packingController.createDrum(req, res, next),
);
drumRoutes.get('/', validate(listDrumsQuerySchema), (req, res, next) =>
  packingController.listDrums(req, res, next),
);
drumRoutes.get('/:id', validate(drumIdParamSchema), (req, res, next) =>
  packingController.getDrumById(req, res, next),
);
drumRoutes.patch('/:id', validate(updateDrumSchema), (req, res, next) =>
  packingController.updateDrum(req, res, next),
);
drumRoutes.get('/:id/history', validate(drumIdParamSchema), (req, res, next) =>
  packingController.getDrumHistory(req, res, next),
);

// Packing Lists Router (/api/v1/packing-lists)
export const packingListRoutes = Router();

packingListRoutes.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

packingListRoutes.post('/', validate(createPackingListSchema), (req, res, next) =>
  packingController.createPackingList(req, res, next),
);
packingListRoutes.get('/', validate(listPackingListsQuerySchema), (req, res, next) =>
  packingController.listPackingLists(req, res, next),
);
packingListRoutes.get('/:id', validate(packingListIdParamSchema), (req, res, next) =>
  packingController.getPackingListById(req, res, next),
);
packingListRoutes.patch('/:id', validate(updatePackingListSchema), (req, res, next) =>
  packingController.updatePackingList(req, res, next),
);
packingListRoutes.post('/:id/pack', validate(packingListIdParamSchema), (req, res, next) =>
  packingController.packPackingList(req, res, next),
);
packingListRoutes.post('/:id/cancel', validate(cancelPackingListSchema), (req, res, next) =>
  packingController.cancelPackingList(req, res, next),
);
