import { Request, Response } from 'express';
import { inventoryDashboardService } from './inventory-dashboard.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  InventorySummaryQueryParams,
  InventoryTransactionQueryParams,
  InventoryBalanceQueryParams,
  DailySummaryQueryParams,
  RebuildDailySummaryInput,
} from './inventory-dashboard.validation';

export class InventoryDashboardController {
  getGlobalSummary = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as InventorySummaryQueryParams;
    const result = await inventoryDashboardService.getGlobalSummary(query);
    return ApiResponseUtil.success(res, result, 'Global inventory summary retrieved successfully');
  });

  getMaterialStock = asyncHandler(async (req: Request, res: Response) => {
    const result = await inventoryDashboardService.getMaterialStock(
      req.params.materialId,
      req.query as { warehouseId?: string; ownerType?: string },
    );
    return ApiResponseUtil.success(res, result, 'Material stock details retrieved successfully');
  });

  getMaterialWiseGlobalStock = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { search?: string; category?: string };
    const result = await inventoryDashboardService.getMaterialWiseGlobalStock(query);
    return ApiResponseUtil.success(res, result, 'Material-wise global stock retrieved successfully');
  });

  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as InventoryTransactionQueryParams;
    const result = await inventoryDashboardService.getTransactions(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Inventory transactions retrieved successfully',
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

  getBalances = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as InventoryBalanceQueryParams;
    const result = await inventoryDashboardService.getBalances(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Inventory balances retrieved successfully',
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

  getDailySummaries = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as DailySummaryQueryParams;
    const result = await inventoryDashboardService.getDailySummaries(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Daily stock summaries retrieved successfully',
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

  rebuildDailySummary = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RebuildDailySummaryInput;
    const result = await inventoryDashboardService.rebuildDailySummary(input.date);
    return ApiResponseUtil.success(res, result, 'Daily stock summary refreshed successfully');
  });

  getLowStockAlerts = asyncHandler(async (_req: Request, res: Response) => {
    const result = await inventoryDashboardService.getLowStockAlerts();
    return ApiResponseUtil.success(res, result, 'Low stock alerts retrieved successfully');
  });
}

export const inventoryDashboardController = new InventoryDashboardController();
