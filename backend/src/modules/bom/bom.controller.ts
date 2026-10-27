import { Request, Response } from 'express';
import { bomService } from './bom.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import { CreateBomInput, UpdateBomInput, BomQueryParams } from './bom.validation';

export class BomController {
  createBom = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateBomInput;
    const result = await bomService.createBom(input, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.created(res, result, 'BOM version created successfully');
  });

  listBoms = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as BomQueryParams;
    const result = await bomService.listBoms(query);
    return ApiResponseUtil.success(res, result.items, 'BOM versions retrieved successfully', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    });
  });

  getBomById = asyncHandler(async (req: Request, res: Response) => {
    const result = await bomService.getBomById(req.params.id);
    return ApiResponseUtil.success(res, result, 'BOM details retrieved successfully');
  });

  getProductBoms = asyncHandler(async (req: Request, res: Response) => {
    const result = await bomService.listBoms({
      productId: req.params.productId,
      page: 1,
      limit: 100,
    });
    return ApiResponseUtil.success(
      res,
      result.items,
      'Product BOM versions retrieved successfully',
    );
  });

  updateBom = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateBomInput;
    const updated = await bomService.updateBom(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'BOM version updated successfully');
  });

  activateBom = asyncHandler(async (req: Request, res: Response) => {
    const activated = await bomService.activateBom(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, activated, 'BOM version activated successfully');
  });

  archiveBom = asyncHandler(async (req: Request, res: Response) => {
    const archived = await bomService.archiveBom(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, archived, 'BOM version archived successfully');
  });

  deleteBom = asyncHandler(async (req: Request, res: Response) => {
    await bomService.deleteBom(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, null, 'BOM version deleted successfully');
  });
}

export const bomController = new BomController();
