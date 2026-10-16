import mongoose from 'mongoose';
import { WarehouseModel, IWarehouse } from './warehouse.model';
import { UserModel } from '../users/user.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { InventoryTransactionModel } from '../inventory/inventory-transaction.model';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { AuditLogModel } from '../shared/audit-log.model';
import {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  UpdateWarehouseStatusInput,
  WarehouseQueryParams,
} from './warehouses.validation';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { PaginatedResult } from '../../common/types';

export class WarehousesService {
  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid warehouse ID format: '${id}'`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create a new warehouse / factory storage location.
   */
  async createWarehouse(
    input: CreateWarehouseInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IWarehouse> {
    const existing = await WarehouseModel.findOne({ code: input.code });
    if (existing) {
      throw new ConflictError(`Warehouse with code '${input.code}' already exists`);
    }

    if (input.managerId) {
      const manager = await UserModel.findById(input.managerId);
      if (!manager) {
        throw new NotFoundError(`Referenced Manager user with ID '${input.managerId}' not found`);
      }
    }

    const warehouse = await WarehouseModel.create(input);

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'Warehouse',
      entityId: warehouse._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        code: warehouse.code,
        name: warehouse.name,
        type: warehouse.type,
      },
    });

    return warehouse;
  }

  /**
   * List warehouses with pagination, search, type, and status filtering.
   */
  async listWarehouses(params: WarehouseQueryParams): Promise<PaginatedResult<IWarehouse>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.type) filter.type = params.type;
    if (params.isActive !== undefined) filter.isActive = params.isActive;

    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      WarehouseModel.find(filter)
        .populate('managerId', 'firstName lastName email employeeCode')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      WarehouseModel.countDocuments(filter),
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

  /**
   * Get warehouse details by ID.
   */
  async getWarehouseById(id: string): Promise<IWarehouse> {
    const objectId = this.validateId(id);
    const warehouse = await WarehouseModel.findById(objectId).populate(
      'managerId',
      'firstName lastName email employeeCode',
    );

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${id}' not found`);
    }

    return warehouse;
  }

  /**
   * Update permitted details of a warehouse.
   */
  async updateWarehouse(
    id: string,
    input: UpdateWarehouseInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IWarehouse> {
    const objectId = this.validateId(id);
    const warehouse = await WarehouseModel.findById(objectId);

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${id}' not found`);
    }

    if (input.managerId) {
      const manager = await UserModel.findById(input.managerId);
      if (!manager) {
        throw new NotFoundError(`Referenced Manager user with ID '${input.managerId}' not found`);
      }
    }

    const oldValues = warehouse.toObject();

    Object.assign(warehouse, input);
    await warehouse.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Warehouse',
      entityId: warehouse._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues,
      newValues: input,
    });

    return warehouse;
  }

  /**
   * Deactivate or reactivate a warehouse.
   * Prevents deactivation if the warehouse currently holds active physical inventory.
   */
  async updateWarehouseStatus(
    id: string,
    input: UpdateWarehouseStatusInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IWarehouse> {
    const objectId = this.validateId(id);
    const warehouse = await WarehouseModel.findById(objectId);

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${id}' not found`);
    }

    if (!input.isActive) {
      const activeStockCount = await InventoryBalanceModel.countDocuments({
        warehouseId: objectId,
        $or: [{ quantityOnHand: { $gt: 0 } }, { quantityReserved: { $gt: 0 } }],
      });

      if (activeStockCount > 0) {
        throw new BadRequestError(
          `Cannot deactivate warehouse '${warehouse.name}' (${warehouse.code}) because it currently holds active stock (${activeStockCount} material balance entries). Please transfer or reconcile stock before deactivating.`,
        );
      }
    }

    const oldStatus = warehouse.isActive;
    warehouse.isActive = input.isActive;
    await warehouse.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Warehouse',
      entityId: warehouse._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: warehouse.isActive, reason: input.reason },
    });

    return warehouse;
  }

  /**
   * Delete a warehouse only when no historical transactions or balances exist.
   */
  async deleteWarehouse(id: string, performedByUserId: string, ipAddress?: string): Promise<void> {
    const objectId = this.validateId(id);
    const warehouse = await WarehouseModel.findById(objectId);

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${id}' not found`);
    }

    const [balancesCount, transactionsCount, challansCount] = await Promise.all([
      InventoryBalanceModel.countDocuments({ warehouseId: objectId }),
      InventoryTransactionModel.countDocuments({ warehouseId: objectId }),
      InboundChallanModel.countDocuments({ destinationWarehouseId: objectId }),
    ]);

    const totalRefs = balancesCount + transactionsCount + challansCount;
    if (totalRefs > 0) {
      throw new BadRequestError(
        `Cannot permanently delete warehouse '${warehouse.name}' (${warehouse.code}) because it is referenced by ${totalRefs} historical ERP record(s) (Inventory Balances: ${balancesCount}, Ledger Transactions: ${transactionsCount}, Inbound Challans: ${challansCount}). Please deactivate the warehouse instead.`,
      );
    }

    await WarehouseModel.findByIdAndDelete(objectId);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'Warehouse',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: {
        code: warehouse.code,
        name: warehouse.name,
      },
    });
  }
}

export const warehousesService = new WarehousesService();
