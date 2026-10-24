import mongoose from 'mongoose';
import { UserModel, IUser } from '../users/user.model';
import { AuditLogModel } from '../shared/audit-log.model';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { MaterialIssueModel } from '../production/material-issue.model';
import { ProductionOutputModel } from '../production/production-output.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { DispatchModel } from '../dispatch/dispatch.model';
import { PasswordUtil } from '../../common/utils/password.util';
import { PaginatedResult } from '../../common/types/common.types';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';
import {
  CreateAdminInput,
  UpdateAdminInput,
  UpdateAdminStatusInput,
  ResetAdminPasswordInput,
  AdminQueryParams,
} from './admins.validation';
import { UserAuthProfile } from '../auth/auth.service';

export class AdminsService {
  private formatProfile(user: IUser): UserAuthProfile {
    return {
      id: user._id.toString(),
      employeeCode: user.employeeCode,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestError(`Invalid Admin ID format: ${id}`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create an Admin account (Only 'ADMIN' role allowed; never creates SUPER_ADMIN).
   */
  async createAdmin(
    input: CreateAdminInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<UserAuthProfile> {
    const existingEmail = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existingEmail) {
      throw new ConflictError(`Email address '${input.email}' is already registered`);
    }

    const existingCode = await UserModel.findOne({
      employeeCode: input.employeeCode.toUpperCase(),
    });
    if (existingCode) {
      throw new ConflictError(`Employee code '${input.employeeCode}' is already registered`);
    }

    const passwordHash = await PasswordUtil.hash(input.password);

    // Strictly enforce ADMIN role
    const admin = new UserModel({
      employeeCode: input.employeeCode.toUpperCase(),
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      department: input.department || 'MANAGEMENT',
      role: 'ADMIN',
      isActive: true,
    });

    await admin.save();

    // Record in AuditLog
    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'User',
      entityId: admin._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        employeeCode: admin.employeeCode,
        email: admin.email,
        role: admin.role,
        department: admin.department,
        isActive: admin.isActive,
      },
    });

    return this.formatProfile(admin);
  }

  /**
   * List Admin accounts with pagination and filtering.
   */
  async listAdmins(params: AdminQueryParams): Promise<PaginatedResult<UserAuthProfile>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { role: { $in: ['ADMIN', 'SUPER_ADMIN'] } };

    if (params.isActive !== undefined) {
      filter.isActive = params.isActive === 'true';
    }

    if (params.department) {
      filter.department = params.department;
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { employeeCode: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((user) => this.formatProfile(user)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get an Admin by ID.
   */
  async getAdminById(id: string): Promise<UserAuthProfile> {
    const objectId = this.validateId(id);
    const admin = await UserModel.findById(objectId);

    if (!admin) {
      throw new NotFoundError(`Admin with ID '${id}' not found`);
    }

    return this.formatProfile(admin);
  }

  /**
   * Update permitted details of an Admin account.
   */
  async updateAdmin(
    id: string,
    input: UpdateAdminInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<UserAuthProfile> {
    const objectId = this.validateId(id);
    const admin = await UserModel.findById(objectId);

    if (!admin) {
      throw new NotFoundError(`Admin with ID '${id}' not found`);
    }

    const oldValues = {
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      department: admin.department,
    };

    if (input.firstName !== undefined) admin.firstName = input.firstName;
    if (input.lastName !== undefined) admin.lastName = input.lastName;
    if (input.phone !== undefined) admin.phone = input.phone;
    if (input.department !== undefined) admin.department = input.department;

    await admin.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'User',
      entityId: admin._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues,
      newValues: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone,
        department: admin.department,
      },
    });

    return this.formatProfile(admin);
  }

  /**
   * Deactivate or reactivate an Admin account.
   * Safeguards: Prevents self-deactivation and deactivating the last active Super Admin.
   */
  async updateAdminStatus(
    id: string,
    input: UpdateAdminStatusInput,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<UserAuthProfile> {
    const objectId = this.validateId(id);

    if (id === currentUserId && !input.isActive) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    const admin = await UserModel.findById(objectId);
    if (!admin) {
      throw new NotFoundError(`Admin with ID '${id}' not found`);
    }

    // Protection for last active Super Admin
    if (admin.role === 'SUPER_ADMIN' && !input.isActive) {
      const activeSuperAdmins = await UserModel.countDocuments({
        role: 'SUPER_ADMIN',
        isActive: true,
      });

      if (activeSuperAdmins <= 1) {
        throw new BadRequestError('Cannot deactivate the last active Super Admin account');
      }
    }

    const oldStatus = admin.isActive;
    admin.isActive = input.isActive;

    const updatePayload: Record<string, unknown> = {
      isActive: input.isActive,
    };
    const unsetPayload: Record<string, unknown> = {};

    // Revoke refresh token upon deactivation
    if (!input.isActive) {
      unsetPayload.refreshTokenHash = 1;
    }

    const updatedAdmin = await UserModel.findByIdAndUpdate(
      objectId,
      {
        $set: updatePayload,
        ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {}),
      },
      { new: true },
    );

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'User',
      entityId: admin._id,
      performedBy: new mongoose.Types.ObjectId(currentUserId),
      ipAddress,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: admin.isActive, reason: input.reason },
    });

    return this.formatProfile(updatedAdmin || admin);
  }

  /**
   * Reset an Admin's password by Super Admin.
   */
  async resetAdminPassword(
    id: string,
    input: ResetAdminPasswordInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<void> {
    const objectId = this.validateId(id);
    const admin = await UserModel.findById(objectId);

    if (!admin) {
      throw new NotFoundError(`Admin with ID '${id}' not found`);
    }

    const newPasswordHash = await PasswordUtil.hash(input.newPassword);
    await UserModel.findByIdAndUpdate(objectId, {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
      $unset: { refreshTokenHash: 1 },
    });

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'User',
      entityId: admin._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      metadata: { event: 'PASSWORD_RESET_BY_SUPER_ADMIN' },
    });
  }

  /**
   * Delete an Admin account only when safe and permitted.
   * Safeguards:
   * - Cannot delete oneself.
   * - Cannot delete the last active Super Admin.
   * - Cannot delete if user is referenced in existing ERP records.
   */
  async deleteAdmin(
    id: string,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<{ deleted: true; id: string }> {
    const objectId = this.validateId(id);

    if (id === currentUserId) {
      throw new BadRequestError('You cannot delete your own account');
    }

    const targetUser = await UserModel.findById(objectId);
    if (!targetUser) {
      throw new NotFoundError(`Admin with ID '${id}' not found`);
    }

    // Protection for last active Super Admin
    if (targetUser.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await UserModel.countDocuments({
        role: 'SUPER_ADMIN',
        isActive: true,
      });

      if (activeSuperAdmins <= 1) {
        throw new BadRequestError('Cannot delete the last active Super Admin account');
      }
    }

    // Check ERP record associations across modules
    const [inboundCount, issueCount, outputCount, workOrderCount, dispatchCount] =
      await Promise.all([
        InboundChallanModel.countDocuments({
          $or: [{ receivedBy: objectId }, { verifiedBy: objectId }],
        }),
        MaterialIssueModel.countDocuments({
          $or: [{ issuedBy: objectId }, { receivedBy: objectId }],
        }),
        ProductionOutputModel.countDocuments({ testedBy: objectId }),
        WorkOrderModel.countDocuments({
          $or: [{ createdBy: objectId }, { approvedBy: objectId }],
        }),
        DispatchModel.countDocuments({ dispatchedBy: objectId }),
      ]);

    const totalReferences =
      inboundCount + issueCount + outputCount + workOrderCount + dispatchCount;

    if (totalReferences > 0) {
      throw new BadRequestError(
        `Cannot permanently delete this Admin because they are associated with existing ERP records (${totalReferences} references found in Challans, Issues, Production, or Orders). Please deactivate the account instead to maintain data integrity.`,
      );
    }

    await UserModel.findByIdAndDelete(objectId);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'User',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(currentUserId),
      ipAddress,
      oldValues: {
        employeeCode: targetUser.employeeCode,
        email: targetUser.email,
        role: targetUser.role,
      },
    });

    return { deleted: true, id };
  }

  /**
   * Retrieve audit logs with pagination and filters
   */
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    performedBy?: string;
  }): Promise<PaginatedResult<any>> {
    const page = Number(params.page) || 1;
    const limit = Math.min(Number(params.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.action && params.action !== 'ALL') {
      filter.action = params.action;
    }
    if (params.entityType && params.entityType !== 'ALL') {
      filter.entityType = params.entityType;
    }
    if (params.performedBy) {
      if (mongoose.isValidObjectId(params.performedBy)) {
        filter.performedBy = new mongoose.Types.ObjectId(params.performedBy);
      }
    }

    const [items, total] = await Promise.all([
      AuditLogModel.find(filter)
        .populate('performedBy', 'firstName lastName email employeeCode role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}

export const adminsService = new AdminsService();
