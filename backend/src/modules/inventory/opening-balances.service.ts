import mongoose from 'mongoose';
import { OpeningBalanceModel } from './opening-balance.model';
import { InventoryTransactionModel } from './inventory-transaction.model';
import { MaterialModel } from '../materials/material.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { CustomerModel } from '../customers/customer.model';
import { inventoryBalanceService } from './inventory-balance.service';
import { InventorySequenceUtil } from './inventory-sequence.util';
import { InventoryIdempotencyUtil } from './inventory-idempotency.util';
import { InventoryAuditUtil } from './inventory-audit.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';
import {
  CreateOpeningBalanceInput,
  UpdateOpeningBalanceInput,
  PostOpeningBalanceInput,
  OpeningBalanceQueryParams,
} from './opening-balances.validation';

export class OpeningBalancesService {
  /**
   * Create a Draft Opening Balance. Does NOT modify stock.
   */
  async createDraft(
    input: CreateOpeningBalanceInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const material = await MaterialModel.findById(input.materialId);
    if (!material) {
      throw new NotFoundError(`Material with ID '${input.materialId}' not found`);
    }
    if (!material.isActive) {
      throw new BadRequestError(`Material '${material.name}' is inactive`);
    }

    const warehouse = await WarehouseModel.findById(input.warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${input.warehouseId}' not found`);
    }
    if (!warehouse.isActive) {
      throw new BadRequestError(`Warehouse '${warehouse.name}' is inactive`);
    }

    if (input.ownerType === 'CUSTOMER') {
      if (!input.customerId) {
        throw new BadRequestError('Customer ID is required for customer-owned opening balance');
      }
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) {
        throw new NotFoundError(`Customer with ID '${input.customerId}' not found`);
      }
      if (!customer.isActive) {
        throw new BadRequestError(`Customer '${customer.name}' is inactive`);
      }
    }

    const openingBalanceNumber = await InventorySequenceUtil.getNextSequence(
      'OPENING_BALANCE',
      'OPB',
    );

    const doc = await OpeningBalanceModel.create({
      openingBalanceNumber,
      materialId: input.materialId,
      warehouseId: input.warehouseId,
      ownerType: input.ownerType,
      customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
      quantity: input.quantity,
      unit: input.unit,
      valuationRate: input.valuationRate,
      effectiveDate: input.effectiveDate || new Date(),
      status: 'DRAFT',
      createdBy: userId,
      remarks: input.remarks,
    });

    await InventoryAuditUtil.record({
      action: 'CREATE',
      entityType: 'OpeningBalance',
      entityId: doc._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: { openingBalanceNumber, quantity: input.quantity },
    });

    return doc;
  }

  async getById(id: string) {
    const doc = await OpeningBalanceModel.findById(id)
      .populate('materialId', 'code name category baseUnit')
      .populate('warehouseId', 'code name')
      .populate('customerId', 'code name')
      .populate('createdBy', 'firstName lastName employeeCode')
      .populate('postedBy', 'firstName lastName employeeCode')
      .populate('lotId');

    if (!doc) {
      throw new NotFoundError(`Opening Balance with ID '${id}' not found`);
    }
    return doc;
  }

  async list(query: OpeningBalanceQueryParams) {
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
      OpeningBalanceModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('materialId', 'code name')
        .populate('warehouseId', 'code name')
        .populate('customerId', 'code name')
        .populate('postedBy', 'firstName lastName')
        .lean(),
      OpeningBalanceModel.countDocuments(filter),
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

  async updateDraft(
    id: string,
    input: UpdateOpeningBalanceInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const doc = await OpeningBalanceModel.findById(id);
    if (!doc) {
      throw new NotFoundError(`Opening Balance with ID '${id}' not found`);
    }
    if (doc.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot edit opening balance with status '${doc.status}'. Only DRAFT records may be edited.`,
      );
    }

    if (input.quantity !== undefined) doc.quantity = input.quantity;
    if (input.unit !== undefined) doc.unit = input.unit;
    if (input.valuationRate !== undefined) doc.valuationRate = input.valuationRate;
    if (input.effectiveDate !== undefined) doc.effectiveDate = input.effectiveDate;
    if (input.remarks !== undefined) doc.remarks = input.remarks;

    await doc.save();

    await InventoryAuditUtil.record({
      action: 'UPDATE',
      entityType: 'OpeningBalance',
      entityId: doc._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: input,
    });

    return doc;
  }

  /**
   * Post Opening Balance atomically in a MongoDB transaction.
   */
  async postOpeningBalance(
    id: string,
    input: PostOpeningBalanceInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const endpoint = `/api/v1/opening-balances/${id}/post`;
    const idempotencyKey = input.idempotencyKey;

    if (idempotencyKey) {
      const existing = await InventoryIdempotencyUtil.findRecord(idempotencyKey, endpoint);
      if (existing) {
        return existing.responseBody;
      }
    }

    const existingDoc = await OpeningBalanceModel.findById(id);
    if (!existingDoc) {
      throw new NotFoundError(`Opening Balance with ID '${id}' not found`);
    }
    if (existingDoc.status === 'POSTED') {
      throw new ConflictError(
        `Opening Balance '${existingDoc.openingBalanceNumber}' has already been posted`,
      );
    }
    if (existingDoc.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot post opening balance with status '${existingDoc.status}'. Only DRAFT records may be posted.`,
      );
    }

    const session = await mongoose.startSession();
    let result: unknown;

    try {
      await session.withTransaction(async () => {
        // Lock document atomically
        const lockedDoc = await OpeningBalanceModel.findOneAndUpdate(
          { _id: existingDoc._id, status: 'DRAFT' },
          {
            $set: {
              status: 'POSTED',
              postedBy: new mongoose.Types.ObjectId(userId),
              postedAt: new Date(),
            },
          },
          { session, new: true },
        );

        if (!lockedDoc) {
          throw new ConflictError(
            `Opening balance '${existingDoc.openingBalanceNumber}' was posted concurrently`,
          );
        }

        // Generate Transaction Number
        const transactionNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );

        // Create Immutable Transaction
        const [txn] = await InventoryTransactionModel.create(
          [
            {
              transactionNumber,
              movementType: 'INWARD',
              transactionType: 'OPENING_BALANCE',
              materialId: lockedDoc.materialId,
              warehouseId: lockedDoc.warehouseId,
              lotId: lockedDoc.lotId || null,
              ownerType: lockedDoc.ownerType,
              customerId: lockedDoc.customerId || null,
              quantity: lockedDoc.quantity,
              unit: lockedDoc.unit,
              status: 'POSTED',
              sourceDocumentType: 'OPENING_BALANCE',
              sourceDocumentId: lockedDoc._id,
              postedAt: new Date(),
              postedBy: new mongoose.Types.ObjectId(userId),
              remarks:
                input.remarks || `Posted from Opening Balance ${lockedDoc.openingBalanceNumber}`,
            },
          ],
          { session },
        );

        // Atomically update inventory balance
        await inventoryBalanceService.increaseStock({
          materialId: lockedDoc.materialId,
          warehouseId: lockedDoc.warehouseId,
          ownerType: lockedDoc.ownerType,
          customerId: lockedDoc.customerId,
          lotId: lockedDoc.lotId || null,
          quantity: lockedDoc.quantity,
          unit: lockedDoc.unit,
          transactionId: txn._id,
          session,
        });

        // Record Audit Log
        await InventoryAuditUtil.record({
          action: 'POST',
          entityType: 'OpeningBalance',
          entityId: lockedDoc._id,
          performedBy: userId,
          ipAddress,
          userAgent,
          newValues: { status: 'POSTED', postedBy: userId },
          session,
        });

        result = {
          ...lockedDoc.toObject(),
          message: 'Opening balance posted and inventory balance updated successfully',
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

export const openingBalancesService = new OpeningBalancesService();
