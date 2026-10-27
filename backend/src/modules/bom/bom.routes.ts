import { Router } from 'express';
import { bomController } from './bom.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import { createBomSchema, updateBomSchema, bomQuerySchema } from './bom.validation';

const router = Router();

// Protect all BOM routes with authentication and role authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post('/', validateRequest({ body: createBomSchema }), bomController.createBom);
router.get('/', validateRequest({ query: bomQuerySchema }), bomController.listBoms);
router.get('/product/:productId', bomController.getProductBoms);
router.get('/:id', bomController.getBomById);
router.patch('/:id', validateRequest({ body: updateBomSchema }), bomController.updateBom);
router.post('/:id/activate', bomController.activateBom);
router.post('/:id/archive', bomController.archiveBom);
router.delete('/:id', bomController.deleteBom);

export const bomRoutes = router;
