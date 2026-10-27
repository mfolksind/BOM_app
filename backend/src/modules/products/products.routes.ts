import { Router } from 'express';
import { productsController } from './products.controller';
import { bomController } from '../bom/bom.controller';
import { authenticate, authorizeRole, validateRequest } from '../../common/middleware';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  productQuerySchema,
} from './products.validation';

const router = Router();

// Protect all product routes with authentication and role authorization
router.use(authenticate, authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.post('/', validateRequest({ body: createProductSchema }), productsController.createProduct);
router.get('/', validateRequest({ query: productQuerySchema }), productsController.listProducts);
router.get('/:id', productsController.getProductById);
router.get('/:productId/boms', bomController.getProductBoms);
router.patch(
  '/:id',
  validateRequest({ body: updateProductSchema }),
  productsController.updateProduct,
);
router.patch(
  '/:id/status',
  validateRequest({ body: updateProductStatusSchema }),
  productsController.updateProductStatus,
);
router.delete('/:id', productsController.deleteProduct);

export const productRoutes = router;
