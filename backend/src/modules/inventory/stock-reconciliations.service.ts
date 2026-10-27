import mongoose from 'mongoose';
import { StockReconciliationModel } from './stock-reconciliation.model';
import { InventoryTransactionModel } from './inventory-transaction.model';
import { MaterialModel } from '../materials/material.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { CustomerModel } from '../customers/customer.model';
import { ApprovalModel } from '../shared/approval.model';
import { inventoryBalanceService } from './inventory-balance.service';
import { InventorySequenceUtil } from './inventory-sequence.util';
import { InventoryIdempotencyUtil } from './inventory-idempotency.util';
import { InventoryAuditUtil } from './inventory-audit.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';
import {
  CreateStockReconciliationInput,
  ApproveStockReconciliationInput,
  PostStockReconciliationInput,
  StockReconciliationQueryParams,
} from './stock-reconciliations.validation';

export class StockReconciliationsService {
  async createReconciliation(
    input: CreateStockReconciliationInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const [material, warehouse] = await Promise.all([
      MaterialModel.findById(input.materialId),
      WarehouseModel.findById(input.warehouseId),
    ]);

    if (!material) throw new NotFoundError(`Material with ID '${input.materialId}' not found`);
    if (!material.isActive) throw new BadRequestError(`Material '${material.name}' is inactive`);
    if (!warehouse) throw new NotFoundError(`Warehouse with ID '${input.warehouseId}' not found`);
    if (!warehouse.isActive) throw new BadRequestError(`Warehouse '${warehouse.name}' is inactive`);

    if (input.ownerType === 'CUSTOMER') {
      if (!input.customerId) {
        throw new BadRequestError(
          'Customer reference is required for customer-owned reconciliation',
        );
      }
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) throw new NotFoundError(`Customer with ID '${input.customerId}' not found`);
      if (!customer.isActive) throw new BadRequestError(`Customer '${customer.name}' is inactive`);
    }

    // Inspect authoritative system quantity from current balance projection
    const balance = await inventoryBalanceService.getBalance({
      materialId: input.materialId,
      warehouseId: input.warehouseId,
      ownerType: input.ownerType,
      customerId: input.customerId,
      lotId: input.lotId,
    });

    const systemQuantity = balance ? balance.quantityOnHand : 0;
    const discrepancyQuantity = input.physicalQuantity - systemQuantity;

    const reconciliationNumber = await InventorySequenceUtil.getNextSequence(
      'STOCK_RECONCILIATION',
      'REC',
    );

    const reconciliation = await StockReconciliationModel.create({
      reconciliationNumber,
      warehouseId: input.warehouseId,
      materialId: input.materialId,
      lotId: input.lotId || null,
      ownerType: input.ownerType,
      customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
      systemQuantity,
      physicalQuantity: input.physicalQuantity,
      discrepancyQuantity,
      unit: input.unit,
      reason: input.reason,
      status: 'DRAFT',
      conductedBy: new mongoose.Types.ObjectId(userId),
      conductedAt: new Date(),
    });

    await InventoryAuditUtil.record({
      action: 'CREATE',
      entityType: 'StockReconciliation',
      entityId: reconciliation._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: {
        reconciliationNumber,
        systemQuantity,
        physicalQuantity: input.physicalQuantity,
        discrepancyQuantity,
      },
    });

    return reconciliation;
  }

  async getById(id: string) {
    const doc = await StockReconciliationModel.findById(id)
      .populate('warehouseId', 'code name')
      .populate('materialId', 'code name category baseUnit')
      .populate('lotId', 'lotNumber initialQuantity currentBalance')
      .populate('customerId', 'code name')
      .populate('conductedBy', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName employeeCode')
      .populate('postedBy', 'firstName lastName employeeCode')
      .populate('inventoryTransactionId');

    if (!doc) {
      throw new NotFoundError(`Stock Reconciliation with ID '${id}' not found`);
    }
    return doc;
  }

  async list(query: StockReconciliationQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.status) filter.status = query.status;
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      StockReconciliationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('warehouseId', 'code name')
        .populate('materialId', 'code name')
        .populate('customerId', 'code name')
        .populate('conductedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .lean(),
      StockReconciliationModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
      hasNext: query.page < Math.ceil(total / query.limit),
      hasPrev: query.page > 1,
    };
  }

  /**
   * Approve a Stock Reconciliation. Sets status to APPROVED and registers an Approval record.
   */
  async approveReconciliation(
    id: string,
    input: ApproveStockReconciliationInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const reconciliation = await StockReconciliationModel.findById(id);
    if (!reconciliation) {
      throw new NotFoundError(`Stock Reconciliation with ID '${id}' not found`);
    }
    if (reconciliation.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot approve stock reconciliation with status '${reconciliation.status}'. Only DRAFT records can be approved.`,
      );
    }

    reconciliation.status = 'APPROVED';
    reconciliation.approvedBy = new mongoose.Types.ObjectId(userId);
    await reconciliation.save();

    // Register with Approval model
    await ApprovalModel.findOneAndUpdate(
      { entityType: 'STOCK_RECONCILIATION', entityId: reconciliation._id },
      {
        entityType: 'STOCK_RECONCILIATION',
        entityId: reconciliation._id,
        status: 'APPROVED',
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date(),
        comments: input.comments,
      },
      { upsert: true, new: true },
    );

    await InventoryAuditUtil.record({
      action: 'APPROVE',
      entityType: 'StockReconciliation',
      entityId: reconciliation._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: { status: 'APPROVED', approvedBy: userId, comments: input.comments },
    });

    return reconciliation;
  }

  /**
   * Post Stock Reconciliation atomically.
   * Creates an immutable ADJUSTMENT_IN or ADJUSTMENT_OUT transaction and updates balances atomically.
   */
  async postReconciliation(
    id: string,
    input: PostStockReconciliationInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const endpoint = `/api/v1/stock-reconciliations/${id}/post`;
    const idempotencyKey = input.idempotencyKey;

    if (idempotencyKey) {
      const existing = await InventoryIdempotencyUtil.findRecord(idempotencyKey, endpoint);
      if (existing) {
        return existing.responseBody;
      }
    }

    const existingRec = await StockReconciliationModel.findById(id);
    if (!existingRec) {
      throw new NotFoundError(`Stock Reconciliation with ID '${id}' not found`);
    }
    if (existingRec.status === 'POSTED' || existingRec.status === 'APPLIED') {
      throw new ConflictError(
        `Stock Reconciliation '${existingRec.reconciliationNumber}' has already been posted`,
      );
    }
    if (existingRec.status !== 'APPROVED') {
      throw new BadRequestError(
        `Cannot post stock reconciliation with status '${existingRec.status}'. Record must be APPROVED before posting.`,
      );
    }

    const session = await mongoose.startSession();
    let result: unknown;

    try {
      await session.withTransaction(async () => {
        // Lock document atomically
        const lockedRec = await StockReconciliationModel.findOneAndUpdate(
          { _id: existingRec._id, status: 'APPROVED' },
          {
            $set: {
              status: 'POSTED',
              appliedAt: new Date(),
              postedBy: new mongoose.Types.ObjectId(userId),
              postedAt: new Date(),
            },
          },
          { session, new: true },
        );

        if (!lockedRec) {
          throw new ConflictError(
            `Stock Reconciliation '${existingRec.reconciliationNumber}' was posted concurrently`,
          );
        }

        const discrepancy = lockedRec.discrepancyQuantity;

        if (discrepancy !== 0) {
          const isSurplus = discrepancy > 0;
          const absQuantity = Math.abs(discrepancy);

          const transactionNumber = await InventorySequenceUtil.getNextSequence(
            'INVENTORY_TRANSACTION',
            'TXN',
            session,
          );

          // 1. Create immutable adjustment transaction
          const [txn] = await InventoryTransactionModel.create(
            [
              {
                transactionNumber,
                movementType: isSurplus ? 'INWARD' : 'OUTWARD',
                transactionType: isSurplus ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                materialId: lockedRec.materialId,
                warehouseId: lockedRec.warehouseId,
                lotId: lockedRec.lotId || null,
                ownerType: lockedRec.ownerType,
                customerId: lockedRec.customerId || null,
                quantity: absQuantity,
                unit: lockedRec.unit,
                status: 'POSTED',
                sourceDocumentType: 'STOCK_RECONCILIATION',
                sourceDocumentId: lockedRec._id,
                postedAt: new Date(),
                postedBy: new mongoose.Types.ObjectId(userId),
                remarks:
                  input.remarks ||
                  `Adjustment for ${lockedRec.reconciliationNumber}: difference ${discrepancy} ${lockedRec.unit}`,
              },
            ],
            { session },
          );

          // 2. Atomically update inventory balance projection
          if (isSurplus) {
            await inventoryBalanceService.increaseStock({
              materialId: lockedRec.materialId,
              warehouseId: lockedRec.warehouseId,
              ownerType: lockedRec.ownerType,
              customerId: lockedRec.customerId,
              lotId: lockedRec.lotId || null,
              quantity: absQuantity,
              unit: lockedRec.unit,
              transactionId: txn._id,
              session,
            });
          } else {
            await inventoryBalanceService.decreaseStock({
              materialId: lockedRec.materialId,
              warehouseId: lockedRec.warehouseId,
              ownerType: lockedRec.ownerType,
              customerId: lockedRec.customerId,
              lotId: lockedRec.lotId || null,
              quantity: absQuantity,
              unit: lockedRec.unit,
              transactionId: txn._id,
              session,
            });
          }

          lockedRec.inventoryTransactionId = txn._id;
          await lockedRec.save({ session });
        }

        // Record Audit Log
        await InventoryAuditUtil.record({
          action: 'POST',
          entityType: 'StockReconciliation',
          entityId: lockedRec._id,
          performedBy: userId,
          ipAddress,
          userAgent,
          newValues: { status: 'POSTED', postedBy: userId, discrepancyQuantity: discrepancy },
          session,
        });

        result = {
          ...lockedRec.toObject(),
          message: 'Stock reconciliation adjustment posted successfully',
        };

        if (idempotencyKey) {
          const reqHash = InventoryIdempotencyUtil.computeHash(input);
          await InventoryIdempotencyUtil.recordResponse(
            idempotencyKey,
            endpoint,
            reqHash,
            200,
            result,
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return result;
  }
}

export const stockReconciliationsService = new StockReconciliationsService();
