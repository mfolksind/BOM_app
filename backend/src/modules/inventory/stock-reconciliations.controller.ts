import { Request, Response } from 'express';
import { stockReconciliationsService } from './stock-reconciliations.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateStockReconciliationInput,
  ApproveStockReconciliationInput,
  PostStockReconciliationInput,
  StockReconciliationQueryParams,
} from './stock-reconciliations.validation';

export class StockReconciliationsController {
  createReconciliation = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateStockReconciliationInput;
    const result = await stockReconciliationsService.createReconciliation(
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.created(res, result, 'Stock reconciliation created successfully');
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as StockReconciliationQueryParams;
    const result = await stockReconciliationsService.list(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Stock reconciliations retrieved successfully',
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
    const result = await stockReconciliationsService.getById(req.params.id);
    return ApiResponseUtil.success(res, result, 'Stock reconciliation retrieved successfully');
  });

  approveReconciliation = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ApproveStockReconciliationInput;
    const result = await stockReconciliationsService.approveReconciliation(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Stock reconciliation approved successfully');
  });

  postReconciliation = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as PostStockReconciliationInput;
    const headerKey = req.get('x-idempotency-key') || req.get('idempotency-key');
    if (!input.idempotencyKey && headerKey) {
      input.idempotencyKey = headerKey;
    }

    const result = await stockReconciliationsService.postReconciliation(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(
      res,
      result,
      'Stock reconciliation adjustment posted successfully',
    );
  });
}

export const stockReconciliationsController = new StockReconciliationsController();
