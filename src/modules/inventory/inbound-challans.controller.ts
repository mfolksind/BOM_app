import { Request, Response } from 'express';
import { inboundChallansService } from './inbound-challans.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateInboundChallanInput,
  UpdateInboundChallanInput,
  PostInboundChallanInput,
  InboundChallanQueryParams,
} from './inbound-challans.validation';

export class InboundChallansController {
  createDraft = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateInboundChallanInput;
    const result = await inboundChallansService.createDraft(
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.created(res, result, 'Draft inbound challan created successfully');
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as InboundChallanQueryParams;
    const result = await inboundChallansService.list(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Inbound challans retrieved successfully',
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
    const result = await inboundChallansService.getById(req.params.id);
    return ApiResponseUtil.success(res, result, 'Inbound challan retrieved successfully');
  });

  updateDraft = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateInboundChallanInput;
    const result = await inboundChallansService.updateDraft(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Draft inbound challan updated successfully');
  });

  cancelDraft = asyncHandler(async (req: Request, res: Response) => {
    const result = await inboundChallansService.cancelDraft(
      req.params.id,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Inbound challan cancelled successfully');
  });

  postChallan = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as PostInboundChallanInput;
    const headerKey = req.get('x-idempotency-key') || req.get('idempotency-key');
    if (!input.idempotencyKey && headerKey) {
      input.idempotencyKey = headerKey;
    }

    const result = await inboundChallansService.postChallan(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Inbound challan posted successfully');
  });
}

export const inboundChallansController = new InboundChallansController();
