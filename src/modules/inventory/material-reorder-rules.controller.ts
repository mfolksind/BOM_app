import { Request, Response } from 'express';
import { materialReorderRulesService } from './material-reorder-rules.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateMaterialReorderRuleInput,
  UpdateMaterialReorderRuleInput,
  MaterialReorderRuleQueryParams,
} from './material-reorder-rules.validation';

export class MaterialReorderRulesController {
  createRule = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateMaterialReorderRuleInput;
    const result = await materialReorderRulesService.createRule(
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.created(res, result, 'Material reorder rule created successfully');
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as MaterialReorderRuleQueryParams;
    const result = await materialReorderRulesService.list(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Material reorder rules retrieved successfully',
      200,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
    );
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const result = await materialReorderRulesService.getById(req.params.id);
    return ApiResponseUtil.success(res, result, 'Material reorder rule retrieved successfully');
  });

  updateRule = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateMaterialReorderRuleInput;
    const result = await materialReorderRulesService.updateRule(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Material reorder rule updated successfully');
  });

  deleteRule = asyncHandler(async (req: Request, res: Response) => {
    const result = await materialReorderRulesService.deleteRule(
      req.params.id,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Material reorder rule deleted successfully');
  });
}

export const materialReorderRulesController = new MaterialReorderRulesController();
