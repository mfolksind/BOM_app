import { Router } from 'express';
import { materialReorderRulesController } from './material-reorder-rules.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createMaterialReorderRuleSchema,
  updateMaterialReorderRuleSchema,
  materialReorderRuleQuerySchema,
} from './material-reorder-rules.validation';

const router = Router();

router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post(
  '/',
  validateRequest({ body: createMaterialReorderRuleSchema }),
  materialReorderRulesController.createRule,
);

router.get(
  '/',
  validateRequest({ query: materialReorderRuleQuerySchema }),
  materialReorderRulesController.list,
);

router.get('/:id', materialReorderRulesController.getById);

router.patch(
  '/:id',
  validateRequest({ body: updateMaterialReorderRuleSchema }),
  materialReorderRulesController.updateRule,
);

router.delete('/:id', materialReorderRulesController.deleteRule);

export const materialReorderRuleRoutes = router;
