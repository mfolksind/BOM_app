import { Request, Response } from 'express';
import { adminsService } from './admins.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  CreateAdminInput,
  UpdateAdminInput,
  UpdateAdminStatusInput,
  ResetAdminPasswordInput,
  AdminQueryParams,
} from './admins.validation';

export class AdminsController {
  createAdmin = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateAdminInput;
    const admin = await adminsService.createAdmin(input, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.created(res, admin, 'Admin account created successfully');
  });

  listAdmins = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as AdminQueryParams;
    const result = await adminsService.listAdmins(query);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Admin accounts retrieved successfully',
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

  getAdminById = asyncHandler(async (req: Request, res: Response) => {
    const admin = await adminsService.getAdminById(req.params.id);
    return ApiResponseUtil.success(res, admin, 'Admin details retrieved successfully');
  });

  updateAdmin = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateAdminInput;
    const updated = await adminsService.updateAdmin(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    return ApiResponseUtil.success(res, updated, 'Admin updated successfully');
  });

  updateAdminStatus = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateAdminStatusInput;
    const updated = await adminsService.updateAdminStatus(
      req.params.id,
      input,
      req.user!._id.toString(),
      req.ip,
    );
    const actionLabel = input.isActive ? 'reactivated' : 'deactivated';
    return ApiResponseUtil.success(res, updated, `Admin account successfully ${actionLabel}`);
  });

  resetAdminPassword = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ResetAdminPasswordInput;
    await adminsService.resetAdminPassword(req.params.id, input, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(
      res,
      { passwordReset: true },
      'Admin password reset successfully',
    );
  });

  deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminsService.deleteAdmin(req.params.id, req.user!._id.toString(), req.ip);
    return ApiResponseUtil.success(res, result, 'Admin account deleted successfully');
  });

  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminsService.getAuditLogs(req.query as any);
    return ApiResponseUtil.success(
      res,
      result.items,
      'Audit logs retrieved successfully',
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
}

export const adminsController = new AdminsController();
