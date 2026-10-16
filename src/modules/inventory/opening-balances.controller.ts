import { Request, Response } from 'express';
import { openingBalancesService } from './opening-balances.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateOpeningBalanceInput,
  UpdateOpeningBalanceInput,
  PostOpeningBalanceInput,
  OpeningBalanceQueryParams,
} from './opening-balances.validation';

export class OpeningBalancesController {
  createDraft = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateOpeningBalanceInput;
    const result = await openingBalancesService.createDraft(
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.created(res, result, 'Draft opening balance created successfully');
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as OpeningBalanceQueryParams;
    const result = await openingBalancesService.list(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Opening balances retrieved successfully',
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
    const result = await openingBalancesService.getById(req.params.id);
    return ApiResponseUtil.success(res, result, 'Opening balance retrieved successfully');
  });

  updateDraft = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateOpeningBalanceInput;
    const result = await openingBalancesService.updateDraft(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Draft opening balance updated successfully');
  });

  postOpeningBalance = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as PostOpeningBalanceInput;
    const headerKey = req.get('x-idempotency-key') || req.get('idempotency-key');
    if (!input.idempotencyKey && headerKey) {
      input.idempotencyKey = headerKey;
    }

    const result = await openingBalancesService.postOpeningBalance(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Opening balance posted successfully');
  });
}

export const openingBalancesController = new OpeningBalancesController();
