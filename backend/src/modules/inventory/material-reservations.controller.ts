import { Request, Response } from 'express';
import { materialReservationsService } from './material-reservations.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateMaterialReservationInput,
  ReleaseMaterialReservationInput,
  MaterialReservationQueryParams,
} from './material-reservations.validation';

export class MaterialReservationsController {
  createReservation = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateMaterialReservationInput;
    const result = await materialReservationsService.createReservation(
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.created(res, result, 'Material reservation created successfully');
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as MaterialReservationQueryParams;
    const result = await materialReservationsService.list(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Material reservations retrieved successfully',
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
    const result = await materialReservationsService.getById(req.params.id);
    return ApiResponseUtil.success(res, result, 'Material reservation retrieved successfully');
  });

  releaseReservation = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ReleaseMaterialReservationInput;
    const result = await materialReservationsService.releaseReservation(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
      req.get('user-agent'),
    );
    return ApiResponseUtil.success(res, result, 'Material reservation released successfully');
  });
}

export const materialReservationsController = new MaterialReservationsController();
