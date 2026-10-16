import { Request, Response } from 'express';
import { stockTransfersService } from './stock-transfers.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateStockTransferInput,
  PostStockTransferInput,
  StockTransferQueryParams,
} from './stock-transfers.validation';

export class StockTransfersController {
  createTransfer = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateStockTransferInput;
    const result = await stockTransfersService.createTransfer(
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.created(res, result, 'Stock transfer created successfully');
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as StockTransferQueryParams;
    const result = await stockTransfersService.list(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Stock transfers retrieved successfully',
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
    const result = await stockTransfersService.getById(req.params.id);
    return ApiResponseUtil.success(res, result, 'Stock transfer retrieved successfully');
  });

  postTransfer = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as PostStockTransferInput;
    const headerKey = req.get('x-idempotency-key') || req.get('idempotency-key');
    if (!input.idempotencyKey && headerKey) {
      input.idempotencyKey = headerKey;
    }

    const result = await stockTransfersService.postTransfer(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Stock transfer posted successfully');
  });
}

export const stockTransfersController = new StockTransfersController();
