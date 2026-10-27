import { Request, Response } from 'express';
import { productsService } from './products.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateProductInput,
  UpdateProductInput,
  UpdateProductStatusInput,
  ProductQueryParams,
} from './products.validation';

export class ProductsController {
  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateProductInput;
    const product = await productsService.createProduct(input, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.created(res, product, 'Product created successfully');
  });

  listProducts = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ProductQueryParams;
    const result = await productsService.listProducts(query);
    return ApiResponseUtil.success(res, result.items, 'Products retrieved successfully', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    });
  });

  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.getProductById(req.params.id);
    return ApiResponseUtil.success(res, product, 'Product retrieved successfully');
  });

  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateProductInput;
    const updated = await productsService.updateProduct(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Product updated successfully');
  });

  updateProductStatus = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateProductStatusInput;
    const updated = await productsService.updateProductStatus(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Product status updated successfully');
  });

  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    await productsService.deleteProduct(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, null, 'Product deleted successfully');
  });
}

export const productsController = new ProductsController();
