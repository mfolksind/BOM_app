import { Request, Response } from 'express';
import { processStagesService } from './process-stages.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateProcessStageInput,
  UpdateProcessStageInput,
  UpdateProcessStageStatusInput,
  ProcessStageQueryParams,
} from './process-stages.validation';

export class ProcessStagesController {
  createProcessStage = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateProcessStageInput;
    const stage = await processStagesService.createProcessStage(
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.created(res, stage, 'Process stage created successfully');
  });

  listProcessStages = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ProcessStageQueryParams;
    const result = await processStagesService.listProcessStages(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Process stages retrieved successfully',
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

  getProcessStageById = asyncHandler(async (req: Request, res: Response) => {
    const stage = await processStagesService.getProcessStageById(req.params.id);
    return ApiResponseUtil.success(res, stage, 'Process stage retrieved successfully');
  });

  updateProcessStage = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateProcessStageInput;
    const updated = await processStagesService.updateProcessStage(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Process stage updated successfully');
  });

  updateProcessStageStatus = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateProcessStageStatusInput;
    const updated = await processStagesService.updateProcessStageStatus(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Process stage status updated successfully');
  });

  deleteProcessStage = asyncHandler(async (req: Request, res: Response) => {
    await processStagesService.deleteProcessStage(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, null, 'Process stage deleted successfully');
  });
}

export const processStagesController = new ProcessStagesController();
