import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { ApiResponseUtil } from '../../common/utils';

export class ReportsController {
  // 1. Global Dashboard
  async getGlobalDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getGlobalDashboard(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, data, 'Global inventory dashboard retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // 2. Inventory Summary
  async getInventorySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getInventorySummary(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result.items, 'Inventory summary retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Daily Stock and Movement Report
  async getDailyStockMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getDailyStockMovementReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result, 'Daily stock and movement report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Customer Material Reconciliation
  async getCustomerMaterialReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getCustomerMaterialReconciliation(req.query as Record<string, unknown>);
      ApiResponseUtil.success(
        res,
        result.items,
        'Customer-owned material reconciliation report retrieved successfully',
        200,
        {
          pagination: result.pagination,
        },
      );
    } catch (err) {
      next(err);
    }
  }

  // 5. Work Order Report
  async getWorkOrdersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getWorkOrderReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result.items, 'Work orders report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Production Batch Report
  async getProductionBatchesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getProductionBatchReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result.items, 'Production batches report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Finished Goods Report
  async getFinishedGoodsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getFinishedGoodsReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result.items, 'Finished goods report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. Packing & Dispatch Report
  async getPackingDispatchReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getPackingDispatchReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result.items, 'Packing and dispatch report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Low-Stock and Reorder Report
  async getLowStockReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getLowStockReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result.items, 'Low stock and reorder report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. Traceability Query
  async getTraceabilityReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getTraceability(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result, 'Material and document traceability chain retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // 11. Discrepancies and Audit Report
  async getDiscrepanciesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.getDiscrepancyReport(req.query as Record<string, unknown>);
      ApiResponseUtil.success(res, result, 'Discrepancy and reconciliation report retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reportsController = new ReportsController();
