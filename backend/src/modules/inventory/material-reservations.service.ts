import mongoose from 'mongoose';
import { MaterialReservationModel, IMaterialReservation } from './material-reservation.model';
import { MaterialLotModel } from '../materials/material-lot.model';
import { InventoryTransactionModel } from './inventory-transaction.model';
import { MaterialModel } from '../materials/material.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { CustomerModel } from '../customers/customer.model';
import { inventoryBalanceService } from './inventory-balance.service';
import { InventorySequenceUtil } from './inventory-sequence.util';
import { InventoryAuditUtil } from './inventory-audit.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';
import {
  CreateMaterialReservationInput,
  ReleaseMaterialReservationInput,
  MaterialReservationQueryParams,
} from './material-reservations.validation';

export class MaterialReservationsService {
  /**
   * Create an Active Material Reservation atomically.
   * Decrements quantityAvailable and increments quantityReserved without altering on-hand physical stock.
   */
  async createReservation(
    input: CreateMaterialReservationInput,
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
          'Customer reference is required for customer-owned material reservation',
        );
      }
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) throw new NotFoundError(`Customer with ID '${input.customerId}' not found`);
      if (!customer.isActive) throw new BadRequestError(`Customer '${customer.name}' is inactive`);
    }

    if (input.lotId) {
      const lot = await MaterialLotModel.findById(input.lotId);
      if (!lot) throw new NotFoundError(`Material lot with ID '${input.lotId}' not found`);
      if (lot.materialId.toString() !== input.materialId) {
        throw new BadRequestError('Specified lot does not match reservation material');
      }
      if (lot.ownerType !== input.ownerType) {
        throw new BadRequestError('Specified lot does not match reservation owner type');
      }
    }

    const session = await mongoose.startSession();
    let reservation: IMaterialReservation;

    try {
      await session.withTransaction(async () => {
        // 1. Atomically reserve stock from available balance projection
        await inventoryBalanceService.reserveStock({
          materialId: input.materialId,
          warehouseId: input.warehouseId,
          ownerType: input.ownerType,
          customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
          lotId: input.lotId || null,
          quantity: input.reservedQuantity,
          unit: input.unit,
          session,
        });

        // 2. Generate unique reservation number
        const reservationNumber = await InventorySequenceUtil.getNextSequence(
          'MATERIAL_RESERVATION',
          'RES',
          session,
        );

        // 3. Create active reservation record
        const [resDoc] = await MaterialReservationModel.create(
          [
            {
              reservationNumber,
              materialId: input.materialId,
              warehouseId: input.warehouseId,
              ownerType: input.ownerType,
              customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
              lotId: input.lotId || null,
              reservedQuantity: input.reservedQuantity,
              unit: input.unit,
              workOrderId: input.workOrderId,
              productionOrderId: input.productionOrderId,
              status: 'ACTIVE',
              expiresAt: input.expiresAt,
              reservedBy: new mongoose.Types.ObjectId(userId),
              remarks: input.remarks,
            },
          ],
          { session },
        );
        reservation = resDoc;

        // 4. Generate transaction number
        const transactionNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );

        // 5. Create immutable ledger entry for reservation audit
        await InventoryTransactionModel.create(
          [
            {
              transactionNumber,
              movementType: 'ADJUSTMENT',
              transactionType: 'RESERVATION',
              materialId: input.materialId,
              warehouseId: input.warehouseId,
              lotId: input.lotId || null,
              ownerType: input.ownerType,
              customerId: input.ownerType === 'CUSTOMER' ? input.customerId : null,
              quantity: input.reservedQuantity,
              unit: input.unit,
              status: 'POSTED',
              sourceDocumentType: 'MATERIAL_RESERVATION',
              sourceDocumentId: resDoc._id,
              postedAt: new Date(),
              postedBy: new mongoose.Types.ObjectId(userId),
              remarks: input.remarks || `Stock reserved under ${reservationNumber}`,
            },
          ],
          { session },
        );

        // 6. Record Audit Log
        await InventoryAuditUtil.record({
          action: 'CREATE',
          entityType: 'MaterialReservation',
          entityId: resDoc._id,
          performedBy: userId,
          ipAddress,
          userAgent,
          newValues: { reservationNumber, reservedQuantity: input.reservedQuantity },
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    return reservation!;
  }

  /**
   * Release an Active Material Reservation atomically.
   * Restores quantityAvailable and decrements quantityReserved without altering on-hand physical stock.
   */
  async releaseReservation(
    id: string,
    input: ReleaseMaterialReservationInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await MaterialReservationModel.findById(id);
    if (!existing) {
      throw new NotFoundError(`Material Reservation with ID '${id}' not found`);
    }
    if (existing.status !== 'ACTIVE') {
      throw new BadRequestError(
        `Cannot release reservation with status '${existing.status}'. Only ACTIVE reservations can be released.`,
      );
    }

    const session = await mongoose.startSession();
    let released: unknown;

    try {
      await session.withTransaction(async () => {
        // 1. Atomically lock and update status
        const lockedRes = await MaterialReservationModel.findOneAndUpdate(
          { _id: existing._id, status: 'ACTIVE' },
          {
            $set: {
              status: 'RELEASED',
              releasedBy: new mongoose.Types.ObjectId(userId),
              releasedAt: new Date(),
              remarks: input.remarks || existing.remarks,
            },
          },
          { session, new: true },
        );

        if (!lockedRes) {
          throw new ConflictError(
            `Material Reservation '${existing.reservationNumber}' was already released concurrently`,
          );
        }

        // 2. Atomically restore availability in balance projection
        await inventoryBalanceService.releaseReservation({
          materialId: lockedRes.materialId,
          warehouseId: lockedRes.warehouseId,
          ownerType: lockedRes.ownerType,
          customerId: lockedRes.customerId,
          lotId: lockedRes.lotId || null,
          quantity: lockedRes.reservedQuantity,
          unit: lockedRes.unit,
          session,
        });

        // 3. Generate transaction number
        const transactionNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );

        // 4. Create immutable ledger record for release
        await InventoryTransactionModel.create(
          [
            {
              transactionNumber,
              movementType: 'ADJUSTMENT',
              transactionType: 'RESERVATION_RELEASE',
              materialId: lockedRes.materialId,
              warehouseId: lockedRes.warehouseId,
              lotId: lockedRes.lotId || null,
              ownerType: lockedRes.ownerType,
              customerId: lockedRes.customerId || null,
              quantity: lockedRes.reservedQuantity,
              unit: lockedRes.unit,
              status: 'POSTED',
              sourceDocumentType: 'MATERIAL_RESERVATION',
              sourceDocumentId: lockedRes._id,
              postedAt: new Date(),
              postedBy: new mongoose.Types.ObjectId(userId),
              remarks:
                input.remarks || `Stock released from reservation ${lockedRes.reservationNumber}`,
            },
          ],
          { session },
        );

        // 5. Record Audit Log
        await InventoryAuditUtil.record({
          action: 'UPDATE',
          entityType: 'MaterialReservation',
          entityId: lockedRes._id,
          performedBy: userId,
          ipAddress,
          userAgent,
          newValues: { status: 'RELEASED', releasedBy: userId },
          session,
        });

        released = {
          ...lockedRes.toObject(),
          message: 'Reservation released and stock availability restored successfully',
        };
      });
    } finally {
      await session.endSession();
    }

    return released;
  }

  async getById(id: string) {
    const doc = await MaterialReservationModel.findById(id)
      .populate('materialId', 'code name category baseUnit')
      .populate('warehouseId', 'code name')
      .populate('customerId', 'code name')
      .populate('lotId', 'lotNumber initialQuantity currentBalance')
      .populate('reservedBy', 'firstName lastName employeeCode')
      .populate('releasedBy', 'firstName lastName employeeCode');

    if (!doc) {
      throw new NotFoundError(`Material Reservation with ID '${id}' not found`);
    }
    return doc;
  }

  async list(query: MaterialReservationQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.status) filter.status = query.status;
    if (query.workOrderId) filter.workOrderId = query.workOrderId;
    if (query.ownerType) {
      let owner = query.ownerType as string;
      if (owner === 'FACTORY_OWNED') owner = 'FACTORY';
      if (owner === 'CUSTOMER_OWNED') owner = 'CUSTOMER';
      filter.ownerType = owner;
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      MaterialReservationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('materialId', 'code name')
        .populate('warehouseId', 'code name')
        .populate('customerId', 'code name')
        .populate('reservedBy', 'firstName lastName')
        .lean(),
      MaterialReservationModel.countDocuments(filter),
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
}

export const materialReservationsService = new MaterialReservationsService();
