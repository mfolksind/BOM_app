import mongoose from 'mongoose';
import { InboundChallanModel } from './inbound-challan.model';
import { InboundChallanLineModel } from './inbound-challan-line.model';
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
  CreateInboundChallanInput,
  UpdateInboundChallanInput,
  PostInboundChallanInput,
  InboundChallanQueryParams,
} from './inbound-challans.validation';

export class InboundChallansService {
  /**
   * Create a Draft Inbound Challan with multiple lines.
   * Does NOT alter inventory stock.
   */
  async createDraft(
    input: CreateInboundChallanInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Validate receiving warehouse
    const warehouse = await WarehouseModel.findById(input.warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${input.warehouseId}' not found`);
    }
    if (!warehouse.isActive) {
      throw new BadRequestError(`Warehouse '${warehouse.name}' is inactive`);
    }

    // 2. Validate customer reference if customer-owned
    if (input.ownerType === 'CUSTOMER') {
      if (!input.customerId) {
        throw new BadRequestError('Customer reference is required for customer-owned receipts');
      }
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) {
        throw new NotFoundError(`Customer with ID '${input.customerId}' not found`);
      }
      if (!customer.isActive) {
        throw new BadRequestError(`Customer '${customer.name}' is inactive`);
      }
    }

    // 3. Validate line materials
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const material = await MaterialModel.findById(line.materialId);
      if (!material) {
        throw new NotFoundError(`Material at line ${i + 1} with ID '${line.materialId}' not found`);
      }
      if (!material.isActive) {
        throw new BadRequestError(`Material '${material.name}' at line ${i + 1} is inactive`);
      }
    }

    // 4. Generate internal document sequence
    const challanNumber = await InventorySequenceUtil.getNextSequence('INBOUND_CHALLAN', 'IBC');

    // 5. Create Draft Challan
    const challan = await InboundChallanModel.create({
      challanNumber,
      customerChallanNumber: input.customerChallanNumber,
      customerChallanDate: input.customerChallanDate,
      ownerType: input.ownerType,
      customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
      warehouseId: input.warehouseId,
      vehicleNumber: input.vehicleNumber,
      transporterName: input.transporterName,
      lrNumber: input.lrNumber,
      status: 'DRAFT',
      receivedBy: userId,
      receivedAt: new Date(),
      remarks: input.remarks,
    });

    // 6. Create Challan Lines
    const lineDocs = await InboundChallanLineModel.insertMany(
      input.lines.map((line) => ({
        inboundChallanId: challan._id,
        materialId: line.materialId,
        declaredQuantity: line.declaredQuantity,
        receivedQuantity: line.receivedQuantity,
        unit: line.unit,
        supplierLotNumber: line.supplierLotNumber,
        qualityStatus: 'PENDING_QC',
        remarks: line.remarks,
      })),
    );

    await InventoryAuditUtil.record({
      action: 'CREATE',
      entityType: 'InboundChallan',
      entityId: challan._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: { challanNumber, linesCount: lineDocs.length },
    });

    return {
      ...challan.toObject(),
      lines: lineDocs,
    };
  }

  /**
   * Get Challan by ID with populated lines and references
   */
  async getById(id: string) {
    const challan = await InboundChallanModel.findById(id)
      .populate('customerId', 'name code')
      .populate('warehouseId', 'name code')
      .populate('receivedBy', 'firstName lastName employeeCode')
      .populate('postedBy', 'firstName lastName employeeCode');

    if (!challan) {
      throw new NotFoundError(`Inbound Challan with ID '${id}' not found`);
    }

    const lines = await InboundChallanLineModel.find({ inboundChallanId: challan._id })
      .populate('materialId', 'code name category baseUnit')
      .populate('lotId', 'lotNumber initialQuantity currentBalance qualityStatus');

    return {
      ...challan.toObject(),
      lines,
    };
  }

  /**
   * List Inbound Challans with pagination and filtering
   */
  async list(query: InboundChallanQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.customerId) {
      filter.customerId = query.customerId;
    }
    if (query.warehouseId) {
      filter.warehouseId = query.warehouseId;
    }
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }
    if (query.startDate || query.endDate) {
      filter.customerChallanDate = {};
      if (query.startDate) {
        (filter.customerChallanDate as Record<string, unknown>).$gte = query.startDate;
      }
      if (query.endDate) {
        (filter.customerChallanDate as Record<string, unknown>).$lte = query.endDate;
      }
    }
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ challanNumber: regex }, { customerChallanNumber: regex }];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      InboundChallanModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('customerId', 'name code')
        .populate('warehouseId', 'name code')
        .populate('postedBy', 'firstName lastName')
        .lean(),
      InboundChallanModel.countDocuments(filter),
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
   * Update editable fields on a DRAFT Challan
   */
  async updateDraft(
    id: string,
    input: UpdateInboundChallanInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const challan = await InboundChallanModel.findById(id);
    if (!challan) {
      throw new NotFoundError(`Inbound Challan with ID '${id}' not found`);
    }
    if (challan.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot edit inbound challan with status '${challan.status}'. Only DRAFT challans may be modified.`,
      );
    }

    if (input.customerChallanNumber) challan.customerChallanNumber = input.customerChallanNumber;
    if (input.customerChallanDate) challan.customerChallanDate = input.customerChallanDate;
    if (input.vehicleNumber !== undefined) challan.vehicleNumber = input.vehicleNumber;
    if (input.transporterName !== undefined) challan.transporterName = input.transporterName;
    if (input.lrNumber !== undefined) challan.lrNumber = input.lrNumber;
    if (input.remarks !== undefined) challan.remarks = input.remarks;

    await challan.save();

    if (input.lines && input.lines.length > 0) {
      // Validate materials in new lines
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        const mat = await MaterialModel.findById(line.materialId);
        if (!mat || !mat.isActive) {
          throw new BadRequestError(`Invalid or inactive material at line ${i + 1}`);
        }
      }
      await InboundChallanLineModel.deleteMany({ inboundChallanId: challan._id });
      await InboundChallanLineModel.insertMany(
        input.lines.map((l) => ({
          inboundChallanId: challan._id,
          materialId: l.materialId,
          declaredQuantity: l.declaredQuantity,
          receivedQuantity: l.receivedQuantity,
          unit: l.unit,
          supplierLotNumber: l.supplierLotNumber,
          qualityStatus: 'PENDING_QC',
          remarks: l.remarks,
        })),
      );
    }

    await InventoryAuditUtil.record({
      action: 'UPDATE',
      entityType: 'InboundChallan',
      entityId: challan._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: input,
    });

    return this.getById(id);
  }

  /**
   * Cancel a DRAFT Challan without affecting stock
   */
  async cancelDraft(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const challan = await InboundChallanModel.findById(id);
    if (!challan) {
      throw new NotFoundError(`Inbound Challan with ID '${id}' not found`);
    }
    if (challan.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot cancel inbound challan with status '${challan.status}'. Only DRAFT challans may be cancelled.`,
      );
    }

    challan.status = 'CANCELLED';
    await challan.save();

    await InventoryAuditUtil.record({
      action: 'CANCEL',
      entityType: 'InboundChallan',
      entityId: challan._id,
      performedBy: userId,
      ipAddress,
      userAgent,
    });

    return challan;
  }

  /**
   * Post Inbound Challan atomically inside a MongoDB Transaction.
   * Generates lots, posts immutable transactions, and updates inventory balances atomically.
   */
  async postChallan(
    id: string,
    input: PostInboundChallanInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const endpoint = `/api/v1/inbound-challans/${id}/post`;
    const idempotencyKey = input.idempotencyKey;

    // Check idempotency cache if key provided
    if (idempotencyKey) {
      const existing = await InventoryIdempotencyUtil.findRecord(idempotencyKey, endpoint);
      if (existing) {
        return existing.responseBody;
      }
    }

    // Verify challan exists and is in DRAFT
    const existingChallan = await InboundChallanModel.findById(id);
    if (!existingChallan) {
      throw new NotFoundError(`Inbound Challan with ID '${id}' not found`);
    }
    if (existingChallan.status === 'POSTED') {
      throw new ConflictError(
        `Inbound Challan '${existingChallan.challanNumber}' has already been posted`,
      );
    }
    if (existingChallan.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot post inbound challan with status '${existingChallan.status}'. Only DRAFT challans can be posted.`,
      );
    }

    const lines = await InboundChallanLineModel.find({ inboundChallanId: existingChallan._id });
    if (!lines || lines.length === 0) {
      throw new BadRequestError('Cannot post an inbound challan with no line items');
    }

    // Execute atomic posting inside MongoDB session transaction
    const session = await mongoose.startSession();
    let result: unknown;

    try {
      await session.withTransaction(async () => {
        // 1. Atomically lock and update status from DRAFT to POSTED
        const lockedChallan = await InboundChallanModel.findOneAndUpdate(
          { _id: existingChallan._id, status: 'DRAFT' },
          {
            $set: {
              status: 'POSTED',
              postedBy: new mongoose.Types.ObjectId(userId),
              postedAt: new Date(),
            },
          },
          { session, new: true },
        );

        if (!lockedChallan) {
          throw new ConflictError(
            `Inbound Challan '${existingChallan.challanNumber}' was already posted concurrently`,
          );
        }

        // 2. Process each line item
        for (const line of lines) {
          // Generate unique Lot Number
          const lotNumber = await InventorySequenceUtil.getNextSequence(
            'MATERIAL_LOT',
            'LOT',
            session,
          );

          // Create traceable Material Lot
          const [lot] = await MaterialLotModel.create(
            [
              {
                lotNumber,
                materialId: line.materialId,
                warehouseId: lockedChallan.warehouseId,
                ownerType: lockedChallan.ownerType,
                customerId: lockedChallan.customerId,
                inboundChallanId: lockedChallan._id,
                inboundChallanLineId: line._id,
                supplierLotNumber: line.supplierLotNumber,
                initialQuantity: line.receivedQuantity,
                currentBalance: line.receivedQuantity,
                unit: line.unit,
                receivedDate: new Date(),
                qualityStatus: 'APPROVED',
              },
            ],
            { session },
          );

          // Update Challan Line with created lot reference
          line.lotId = lot._id;
          line.qualityStatus = 'APPROVED';
          await line.save({ session });

          // Generate Transaction Number
          const transactionNumber = await InventorySequenceUtil.getNextSequence(
            'INVENTORY_TRANSACTION',
            'TXN',
            session,
          );

          // Create Immutable Inventory Transaction
          const [txn] = await InventoryTransactionModel.create(
            [
              {
                transactionNumber,
                movementType: 'INWARD',
                transactionType: 'RECEIPT',
                materialId: line.materialId,
                warehouseId: lockedChallan.warehouseId,
                lotId: lot._id,
                ownerType: lockedChallan.ownerType,
                customerId: lockedChallan.customerId,
                quantity: line.receivedQuantity,
                unit: line.unit,
                status: 'POSTED',
                sourceDocumentType: 'INBOUND_CHALLAN',
                sourceDocumentId: lockedChallan._id,
                sourceDocumentLineId: line._id,
                postedAt: new Date(),
                postedBy: new mongoose.Types.ObjectId(userId),
                remarks: input.remarks || `Posted from Challan ${lockedChallan.challanNumber}`,
              },
            ],
            { session },
          );

          // Atomically update inventory balance projection
          await inventoryBalanceService.increaseStock({
            materialId: line.materialId,
            warehouseId: lockedChallan.warehouseId,
            ownerType: lockedChallan.ownerType,
            customerId: lockedChallan.customerId,
            lotId: lot._id,
            quantity: line.receivedQuantity,
            unit: line.unit,
            transactionId: txn._id,
            session,
          });
        }

        // 3. Record Audit Log inside transaction
        await InventoryAuditUtil.record({
          action: 'POST',
          entityType: 'InboundChallan',
          entityId: lockedChallan._id,
          performedBy: userId,
          ipAddress,
          userAgent,
          newValues: { status: 'POSTED', postedBy: userId },
          session,
        });

        result = {
          ...lockedChallan.toObject(),
          message: 'Inbound challan posted and inventory balances updated successfully',
        };

        // 4. Save Idempotency Record if key provided
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

export const inboundChallansService = new InboundChallansService();
