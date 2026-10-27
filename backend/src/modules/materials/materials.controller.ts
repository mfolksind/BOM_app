import { Request, Response } from 'express';
import { materialsService } from './materials.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateMaterialInput,
  UpdateMaterialInput,
  UpdateMaterialStatusInput,
  MaterialQueryParams,
} from './materials.validation';

export class MaterialsController {
  createMaterial = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateMaterialInput;
    const material = await materialsService.createMaterial(input, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.created(res, material, 'Material created successfully');
  });

  listMaterials = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as MaterialQueryParams;
    const result = await materialsService.listMaterials(query);
    return ApiResponseUtil.success(res, result.items, 'Materials retrieved successfully', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    });
  });

  getMaterialById = asyncHandler(async (req: Request, res: Response) => {
    const material = await materialsService.getMaterialById(req.params.id);
    return ApiResponseUtil.success(res, material, 'Material retrieved successfully');
  });

  updateMaterial = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateMaterialInput;
    const updated = await materialsService.updateMaterial(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Material updated successfully');
  });

  updateMaterialStatus = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateMaterialStatusInput;
    const updated = await materialsService.updateMaterialStatus(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Material status updated successfully');
  });

  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    await materialsService.deleteMaterial(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, null, 'Material deleted successfully');
  });
}

export const materialsController = new MaterialsController();
