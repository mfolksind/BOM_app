import { Router } from 'express';
import { machineController } from './machine.controller';
import { authenticate, validateRequest } from '../../common/middleware';
import {
  createMachineSchema,
  updateMachineSchema,
  listMachinesQuerySchema,
  machineIdParamSchema,
} from './machine.validation';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createMachineSchema), (req, res, next) =>
  machineController.createMachine(req, res, next),
);

router.get('/', validateRequest(listMachinesQuerySchema), (req, res, next) =>
  machineController.listMachines(req, res, next),
);

router.get('/:id', validateRequest(machineIdParamSchema), (req, res, next) =>
  machineController.getMachineById(req, res, next),
);

router.patch('/:id', validateRequest(updateMachineSchema), (req, res, next) =>
  machineController.updateMachine(req, res, next),
);

export const machineRoutes = router;
