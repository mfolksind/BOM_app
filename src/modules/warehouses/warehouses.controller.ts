import { Request, Response } from 'express';
import { warehousesService } from './warehouses.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  UpdateWarehouseStatusInput,
  WarehouseQueryParams,
} from './warehouses.validation';

export class WarehousesController {
  createWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateWarehouseInput;
    const warehouse = await warehousesService.createWarehouse(
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.created(res, warehouse, 'Warehouse created successfully');
  });

  listWarehouses = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as WarehouseQueryParams;
    const result = await warehousesService.listWarehouses(query);
    return ApiResponseUtil.success(res, result.items, 'Warehouses retrieved successfully', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    });
  });

  getWarehouseById = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await warehousesService.getWarehouseById(req.params.id);
    return ApiResponseUtil.success(res, warehouse, 'Warehouse retrieved successfully');
  });

  updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateWarehouseInput;
    const updated = await warehousesService.updateWarehouse(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Warehouse updated successfully');
  });

  updateWarehouseStatus = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateWarehouseStatusInput;
    const updated = await warehousesService.updateWarehouseStatus(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Warehouse status updated successfully');
  });

  deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
    await warehousesService.deleteWarehouse(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, null, 'Warehouse deleted successfully');
  });
}

export const warehousesController = new WarehousesController();
