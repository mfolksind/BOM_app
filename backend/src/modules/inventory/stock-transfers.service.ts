import mongoose from 'mongoose';
import { StockTransferModel } from './stock-transfer.model';
import { MaterialLotModel } from '../materials/material-lot.model';
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
  CreateStockTransferInput,
  PostStockTransferInput,
  StockTransferQueryParams,
} from './stock-transfers.validation';

export class StockTransfersService {
  async createTransfer(
    input: CreateStockTransferInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      throw new BadRequestError('Source and destination warehouses must be different');
    }

    const [sourceWh, destWh, material] = await Promise.all([
      WarehouseModel.findById(input.sourceWarehouseId),
      WarehouseModel.findById(input.destinationWarehouseId),
      MaterialModel.findById(input.materialId),
    ]);

    if (!sourceWh)
      throw new NotFoundError(`Source warehouse '${input.sourceWarehouseId}' not found`);
    if (!sourceWh.isActive)
      throw new BadRequestError(`Source warehouse '${sourceWh.name}' is inactive`);
    if (!destWh)
      throw new NotFoundError(`Destination warehouse '${input.destinationWarehouseId}' not found`);
    if (!destWh.isActive)
      throw new BadRequestError(`Destination warehouse '${destWh.name}' is inactive`);
    if (!material) throw new NotFoundError(`Material '${input.materialId}' not found`);
    if (!material.isActive) throw new BadRequestError(`Material '${material.name}' is inactive`);

    if (input.ownerType === 'CUSTOMER') {
      if (!input.customerId) {
        throw new BadRequestError(
          'Customer reference is required for customer-owned stock transfer',
        );
      }
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) throw new NotFoundError(`Customer '${input.customerId}' not found`);
      if (!customer.isActive) throw new BadRequestError(`Customer '${customer.name}' is inactive`);
    }

    if (input.lotId) {
      const lot = await MaterialLotModel.findById(input.lotId);
      if (!lot) throw new NotFoundError(`Material lot '${input.lotId}' not found`);
      if (lot.materialId.toString() !== input.materialId) {
        throw new BadRequestError('Specified lot does not match transfer material');
      }
      if (lot.ownerType !== input.ownerType) {
        throw new BadRequestError('Specified lot does not match transfer ownership type');
      }
    }

    const transferNumber = await InventorySequenceUtil.getNextSequence('STOCK_TRANSFER', 'TRF');

    const transfer = await StockTransferModel.create({
      transferNumber,
      sourceWarehouseId: input.sourceWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      materialId: input.materialId,
      lotId: input.lotId || null,
      ownerType: input.ownerType,
      customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
      quantity: input.quantity,
      unit: input.unit,
      status: 'DRAFT',
      remarks: input.remarks,
    });

    await InventoryAuditUtil.record({
      action: 'CREATE',
      entityType: 'StockTransfer',
      entityId: transfer._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: { transferNumber, quantity: input.quantity },
    });

    if (input.autoPost) {
      return this.postTransfer(
        transfer._id.toString(),
        { remarks: input.remarks },
        userId,
        ipAddress,
        userAgent,
      );
    }

    return transfer;
  }

  async getById(id: string) {
    const transfer = await StockTransferModel.findById(id)
      .populate('sourceWarehouseId', 'code name')
      .populate('destinationWarehouseId', 'code name')
      .populate('materialId', 'code name category baseUnit')
      .populate('lotId', 'lotNumber initialQuantity currentBalance')
      .populate('customerId', 'code name')
      .populate('transferredBy', 'firstName lastName employeeCode');

    if (!transfer) {
      throw new NotFoundError(`Stock Transfer with ID '${id}' not found`);
    }
    return transfer;
  }

  async list(query: StockTransferQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.sourceWarehouseId) filter.sourceWarehouseId = query.sourceWarehouseId;
    if (query.destinationWarehouseId) filter.destinationWarehouseId = query.destinationWarehouseId;
    if (query.status) filter.status = query.status;
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      StockTransferModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('sourceWarehouseId', 'code name')
        .populate('destinationWarehouseId', 'code name')
        .populate('materialId', 'code name')
        .populate('customerId', 'code name')
        .populate('transferredBy', 'firstName lastName')
        .lean(),
      StockTransferModel.countDocuments(filter),
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
   * Post Stock Transfer atomically inside a MongoDB transaction.
   * Atomically decrements source warehouse and increments destination warehouse without altering total ownership.
   */
  async postTransfer(
    id: string,
    input: PostStockTransferInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const endpoint = `/api/v1/stock-transfers/${id}/post`;
    const idempotencyKey = input.idempotencyKey;

    if (idempotencyKey) {
      const existing = await InventoryIdempotencyUtil.findRecord(idempotencyKey, endpoint);
      if (existing) {
        return existing.responseBody;
      }
    }

    const existingTransfer = await StockTransferModel.findById(id);
    if (!existingTransfer) {
      throw new NotFoundError(`Stock Transfer with ID '${id}' not found`);
    }
    if (existingTransfer.status === 'POSTED') {
      throw new ConflictError(
        `Stock Transfer '${existingTransfer.transferNumber}' has already been posted`,
      );
    }
    if (existingTransfer.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot post transfer with status '${existingTransfer.status}'. Only DRAFT transfers can be posted.`,
      );
    }

    const session = await mongoose.startSession();
    let result: unknown;

    try {
      await session.withTransaction(async () => {
        // Lock transfer
        const lockedTransfer = await StockTransferModel.findOneAndUpdate(
          { _id: existingTransfer._id, status: 'DRAFT' },
          {
            $set: {
              status: 'POSTED',
              transferredBy: new mongoose.Types.ObjectId(userId),
              transferredAt: new Date(),
            },
          },
          { session, new: true },
        );

        if (!lockedTransfer) {
          throw new ConflictError(
            `Stock Transfer '${existingTransfer.transferNumber}' was posted concurrently`,
          );
        }

        // Generate Transaction Numbers for Outward and Inward movements
        const outTxnNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );
        const inTxnNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );

        // 1. Create TRANSFER_OUT ledger transaction from source warehouse
        const [outTxn] = await InventoryTransactionModel.create(
          [
            {
              transactionNumber: outTxnNumber,
              movementType: 'OUTWARD',
              transactionType: 'TRANSFER_OUT',
              materialId: lockedTransfer.materialId,
              warehouseId: lockedTransfer.sourceWarehouseId,
              lotId: lockedTransfer.lotId || null,
              ownerType: lockedTransfer.ownerType,
              customerId: lockedTransfer.customerId || null,
              quantity: lockedTransfer.quantity,
              unit: lockedTransfer.unit,
              status: 'POSTED',
              sourceDocumentType: 'STOCK_TRANSFER',
              sourceDocumentId: lockedTransfer._id,
              postedAt: new Date(),
              postedBy: new mongoose.Types.ObjectId(userId),
              remarks: `Transfer OUT to warehouse ${lockedTransfer.destinationWarehouseId}`,
            },
          ],
          { session },
        );

        // 2. Decrement source warehouse stock atomically
        await inventoryBalanceService.decreaseStock({
          materialId: lockedTransfer.materialId,
          warehouseId: lockedTransfer.sourceWarehouseId,
          ownerType: lockedTransfer.ownerType,
          customerId: lockedTransfer.customerId,
          lotId: lockedTransfer.lotId || null,
          quantity: lockedTransfer.quantity,
          unit: lockedTransfer.unit,
          transactionId: outTxn._id,
          session,
        });

        // 3. Create TRANSFER_IN ledger transaction to destination warehouse
        const [inTxn] = await InventoryTransactionModel.create(
          [
            {
              transactionNumber: inTxnNumber,
              movementType: 'INWARD',
              transactionType: 'TRANSFER_IN',
              materialId: lockedTransfer.materialId,
              warehouseId: lockedTransfer.destinationWarehouseId,
              lotId: lockedTransfer.lotId || null,
              ownerType: lockedTransfer.ownerType,
              customerId: lockedTransfer.customerId || null,
              quantity: lockedTransfer.quantity,
              unit: lockedTransfer.unit,
              status: 'POSTED',
              sourceDocumentType: 'STOCK_TRANSFER',
              sourceDocumentId: lockedTransfer._id,
              postedAt: new Date(),
              postedBy: new mongoose.Types.ObjectId(userId),
              remarks: `Transfer IN from warehouse ${lockedTransfer.sourceWarehouseId}`,
            },
          ],
          { session },
        );

        // 4. Increment destination warehouse stock atomically
        await inventoryBalanceService.increaseStock({
          materialId: lockedTransfer.materialId,
          warehouseId: lockedTransfer.destinationWarehouseId,
          ownerType: lockedTransfer.ownerType,
          customerId: lockedTransfer.customerId,
          lotId: lockedTransfer.lotId || null,
          quantity: lockedTransfer.quantity,
          unit: lockedTransfer.unit,
          transactionId: inTxn._id,
          session,
        });

        // 5. If lot was specified, update lot's current warehouse
        if (lockedTransfer.lotId) {
          await MaterialLotModel.findByIdAndUpdate(
            lockedTransfer.lotId,
            { warehouseId: lockedTransfer.destinationWarehouseId },
            { session },
          );
        }

        // Record Audit Log
        await InventoryAuditUtil.record({
          action: 'POST',
          entityType: 'StockTransfer',
          entityId: lockedTransfer._id,
          performedBy: userId,
          ipAddress,
          userAgent,
          newValues: { status: 'POSTED', transferredBy: userId },
          session,
        });

        result = {
          ...lockedTransfer.toObject(),
          message: 'Stock transfer posted successfully',
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

export const stockTransfersService = new StockTransfersService();
