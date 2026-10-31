import mongoose from 'mongoose';
import { DispatchModel, IDispatch } from './dispatch.model';
import { DispatchLineModel } from './dispatch-line.model';
import { OutboundChallanModel, IOutboundChallan } from './outbound-challan.model';
import { PackingListModel } from '../packing/packing-list.model';
import { PackingListLineModel } from '../packing/packing-list-line.model';
import { DrumModel } from '../packing/drum.model';
import { DrumMovementModel } from '../packing/drum-movement.model';
import { CustomerModel } from '../customers/customer.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { ProductionOutputModel } from '../production/production-output.model';
import { InventoryTransactionModel } from '../inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { inventoryBalanceService } from '../inventory/inventory-balance.service';
import { InventorySequenceUtil } from '../inventory/inventory-sequence.util';
import { InventoryAuditUtil } from '../inventory/inventory-audit.util';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { InboundChallanLineModel } from '../inventory/inbound-challan-line.model';
import { InventoryIdempotencyUtil } from '../inventory/inventory-idempotency.util';
import { BomVersionModel } from '../bom/bom-version.model';
import { BomItemModel } from '../bom/bom-item.model';
import { TransactionUtil } from '../../common/utils/transaction.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';

export interface CreateDispatchLineDto {
  drumId: string;
  packingListLineId?: string;
  productId?: string;
  lengthMeters?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  remarks?: string;
}

export interface CreateDispatchDto {
  workOrderId: string;
  customerId: string;
  packingListId?: string;
  packingListIds?: string[];
  sourceWarehouseId?: string;
  destinationAddress?: string;
  vehicleNumber?: string;
  transporter?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;
  eWayBillNumber?: string;
  eWayBillDate?: string | Date;
  remarks?: string;
  lines?: CreateDispatchLineDto[];
}

export class DispatchService {
  // ==========================================
  // 1. DISPATCH CREATION & MANAGEMENT
  // ==========================================

  async createDispatch(dto: CreateDispatchDto, userId?: string): Promise<IDispatch> {
    const customer = await CustomerModel.findById(dto.customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    const workOrder = await WorkOrderModel.findById(dto.workOrderId);
    if (!workOrder) throw new NotFoundError('Work order not found');

    if (workOrder.customerId.toString() !== customer._id.toString()) {
      throw new BadRequestError('Work order does not belong to the selected customer');
    }

    if (workOrder.status === 'CANCELLED') {
      throw new BadRequestError('Cannot create dispatch for a cancelled work order');
    }

    const combinedPackingListIds: mongoose.Types.ObjectId[] = [];
    if (dto.packingListId) {
      combinedPackingListIds.push(new mongoose.Types.ObjectId(dto.packingListId));
    }
    if (dto.packingListIds && dto.packingListIds.length > 0) {
      for (const plId of dto.packingListIds) {
        const objId = new mongoose.Types.ObjectId(plId);
        if (!combinedPackingListIds.some((id) => id.equals(objId))) {
          combinedPackingListIds.push(objId);
        }
      }
    }

    let rawLines: CreateDispatchLineDto[] = dto.lines || [];

    // If lines not provided directly, populate automatically from packing list(s)
    if (rawLines.length === 0 && combinedPackingListIds.length > 0) {
      const plLines = await PackingListLineModel.find({
        packingListId: { $in: combinedPackingListIds },
      });
      rawLines = plLines.map((l) => ({
        drumId: l.drumId.toString(),
        packingListLineId: l._id.toString(),
        productId: l.productId.toString(),
        lengthMeters: l.lengthMeters,
        tareWeightKg: l.tareWeightKg,
        netWeightKg: l.netWeightKg,
        grossWeightKg: l.grossWeightKg,
        remarks: l.remarks,
      }));
    }

    if (rawLines.length === 0) {
      throw new BadRequestError('At least one drum item or packing list is required for dispatch');
    }

    // Validate drum lines
    const drumIds = rawLines.map((l) => l.drumId);
    const uniqueDrumIds = new Set(drumIds);
    if (uniqueDrumIds.size !== drumIds.length) {
      throw new BadRequestError('Duplicate drums found in dispatch lines');
    }

    const drums = await DrumModel.find({ _id: { $in: drumIds } });
    if (drums.length !== drumIds.length) {
      throw new NotFoundError('One or more specified drums were not found');
    }

    const drumMap = new Map(drums.map((d) => [d._id.toString(), d]));

    let calculatedLength = 0;
    let calculatedTare = 0;
    let calculatedNet = 0;
    let calculatedGross = 0;

    const validatedLines = [];

    for (const lineDto of rawLines) {
      const drum = drumMap.get(lineDto.drumId);
      if (!drum) continue;

      if (drum.status === 'DISPATCHED') {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' has already been dispatched and cannot be dispatched again`,
        );
      }
      if (drum.status === 'DAMAGED' || drum.status === 'SCRAPPED' || drum.status === 'CANCELLED') {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' is in status '${drum.status}' and cannot be dispatched`,
        );
      }

      if (drum.customerId && drum.customerId.toString() !== customer._id.toString()) {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' belongs to a different customer and cannot be dispatched for this work order`,
        );
      }

      const lengthMeters = lineDto.lengthMeters ?? drum.cableLengthMeters;
      if (lengthMeters <= 0) {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' has 0 cable length. Cannot dispatch an empty drum.`,
        );
      }

      const tareWeightKg = lineDto.tareWeightKg ?? drum.tareWeightKg;
      const netWeightKg = lineDto.netWeightKg ?? drum.netWeightKg;
      const grossWeightKg =
        lineDto.grossWeightKg ??
        drum.grossWeightKg ??
        Number((tareWeightKg + netWeightKg).toFixed(3));

      const productId =
        lineDto.productId || drum.currentProductId?.toString() || workOrder.productId.toString();

      calculatedLength += lengthMeters;
      calculatedTare += tareWeightKg;
      calculatedNet += netWeightKg;
      calculatedGross += grossWeightKg;

      validatedLines.push({
        drumId: drum._id,
        packingListLineId: lineDto.packingListLineId
          ? new mongoose.Types.ObjectId(lineDto.packingListLineId)
          : undefined,
        productId: new mongoose.Types.ObjectId(productId),
        lengthMeters,
        tareWeightKg,
        netWeightKg,
        grossWeightKg,
        remarks: lineDto.remarks,
      });
    }

    const dispatchNumber = await InventorySequenceUtil.getNextSequence('DISPATCH', 'DSP');

    const destinationAddress =
      dto.destinationAddress ||
      (customer.billingAddress
        ? `${customer.billingAddress.street}, ${customer.billingAddress.city}, ${customer.billingAddress.state} - ${customer.billingAddress.postalCode}`
        : undefined);

    const dispatch = await DispatchModel.create({
      dispatchNumber,
      workOrderId: workOrder._id,
      customerId: customer._id,
      packingListId: combinedPackingListIds[0],
      packingListIds: combinedPackingListIds,
      sourceWarehouseId: dto.sourceWarehouseId
        ? new mongoose.Types.ObjectId(dto.sourceWarehouseId)
        : undefined,
      destinationAddress,
      vehicleNumber: dto.vehicleNumber,
      transporter: dto.transporter,
      driverName: dto.driverName,
      driverPhone: dto.driverPhone,
      lrNumber: dto.lrNumber,
      eWayBillNumber: dto.eWayBillNumber,
      eWayBillDate: dto.eWayBillDate ? new Date(dto.eWayBillDate) : undefined,
      totalDrums: validatedLines.length,
      totalLengthMeters: Number(calculatedLength.toFixed(2)),
      totalTareWeightKg: Number(calculatedTare.toFixed(3)),
      totalNetWeightKg: Number(calculatedNet.toFixed(3)),
      totalGrossWeightKg: Number(calculatedGross.toFixed(3)),
      status: 'DRAFT',
      remarks: dto.remarks,
    });

    for (const lineData of validatedLines) {
      await DispatchLineModel.create({
        dispatchId: dispatch._id,
        ...lineData,
      });
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'Dispatch',
        entityId: dispatch._id,
        performedBy: userId,
        newValues: {
          dispatchNumber: dispatch.dispatchNumber,
          totalLengthMeters: dispatch.totalLengthMeters,
          status: 'DRAFT',
        },
      });
    }

    return dispatch;
  }

  async getDispatchById(id: string) {
    const dispatch = await DispatchModel.findById(id)
      .populate('customerId', 'code name legalName gstin billingAddress shippingAddresses')
      .populate('workOrderId', 'workOrderNumber customerPoNumber orderedLengthMeters status')
      .populate('packingListId', 'packingListNumber packingDate totalDrums status')
      .populate('packingListIds', 'packingListNumber packingDate totalDrums status')
      .populate('sourceWarehouseId', 'code name type location')
      .populate('dispatchedBy', 'firstName lastName email');

    if (!dispatch) throw new NotFoundError(`Dispatch with ID '${id}' not found`);

    const lines = await DispatchLineModel.find({ dispatchId: dispatch._id })
      .populate('drumId', 'drumNumber serialNumber drumType status tareWeightKg grossWeightKg')
      .populate('productId', 'code name voltageGrade coreCount crossSectionSqMm')
      .populate('packingListLineId');

    return { ...dispatch.toObject(), lines };
  }

  async listDispatches(filter: {
    page: number;
    limit: number;
    workOrderId?: string;
    customerId?: string;
    status?: string;
    search?: string;
  }) {
    const query: Record<string, unknown> = {};

    if (filter.workOrderId) query.workOrderId = new mongoose.Types.ObjectId(filter.workOrderId);
    if (filter.customerId) query.customerId = new mongoose.Types.ObjectId(filter.customerId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [
        { dispatchNumber: searchRegex },
        { vehicleNumber: searchRegex },
        { lrNumber: searchRegex },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;
    const [dispatches, total] = await Promise.all([
      DispatchModel.find(query)
        .populate('customerId', 'code name')
        .populate('workOrderId', 'workOrderNumber')
        .populate('sourceWarehouseId', 'code name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit),
      DispatchModel.countDocuments(query),
    ]);

    return {
      dispatches,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  async updateDispatch(id: string, dto: Partial<CreateDispatchDto>, userId?: string) {
    const dispatch = await DispatchModel.findById(id);
    if (!dispatch) throw new NotFoundError('Dispatch not found');

    if (dispatch.status === 'DISPATCHED' || dispatch.status === 'DELIVERED') {
      throw new BadRequestError(
        `Cannot edit a finalized dispatch with status '${dispatch.status}'`,
      );
    }
    if (dispatch.status === 'CANCELLED') {
      throw new BadRequestError('Cannot edit a cancelled dispatch');
    }

    if (dto.sourceWarehouseId) {
      dispatch.sourceWarehouseId = new mongoose.Types.ObjectId(dto.sourceWarehouseId);
    }
    if (dto.destinationAddress !== undefined) dispatch.destinationAddress = dto.destinationAddress;
    if (dto.vehicleNumber !== undefined) dispatch.vehicleNumber = dto.vehicleNumber;
    if (dto.transporter !== undefined) dispatch.transporter = dto.transporter;
    if (dto.driverName !== undefined) dispatch.driverName = dto.driverName;
    if (dto.driverPhone !== undefined) dispatch.driverPhone = dto.driverPhone;
    if (dto.lrNumber !== undefined) dispatch.lrNumber = dto.lrNumber;
    if (dto.eWayBillNumber !== undefined) dispatch.eWayBillNumber = dto.eWayBillNumber;
    if (dto.eWayBillDate) dispatch.eWayBillDate = new Date(dto.eWayBillDate);
    if (dto.remarks !== undefined) dispatch.remarks = dto.remarks;

    await dispatch.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'Dispatch',
        entityId: dispatch._id,
        performedBy: userId,
        newValues: { vehicleNumber: dispatch.vehicleNumber, lrNumber: dispatch.lrNumber },
      });
    }

    return this.getDispatchById(dispatch._id.toString());
  }

  /**
   * Finalize and post dispatch:
   * 1. Checks dispatch is DRAFT / READY_FOR_DISPATCH.
   * 2. Atomically marks drums as DISPATCHED.
   * 3. Records DISPATCH drum movement.
   * 4. Posts immutable OUTWARD / DISPATCH inventory ledger transaction from Finished Goods.
   * 5. Sets packing list(s) to DISPATCHED.
   * 6. Marks dispatch as DISPATCHED.
   */
  async postDispatch(id: string, userId?: string, idempotencyKey?: string) {
    const endpoint = `/api/v1/dispatches/${id}/dispatch`;

    if (idempotencyKey) {
      const existing = await InventoryIdempotencyUtil.findRecord(idempotencyKey, endpoint);
      if (existing) {
        return existing.responseBody;
      }
    }

    const responseData = await TransactionUtil.runInTransaction(async (session) => {
      const dispatch = await DispatchModel.findById(id).session(session);
      if (!dispatch) throw new NotFoundError('Dispatch not found');

      if (dispatch.status === 'DISPATCHED' || dispatch.status === 'DELIVERED') {
        throw new ConflictError('Dispatch is already POSTED / DISPATCHED');
      }
      if (dispatch.status === 'CANCELLED') {
        throw new BadRequestError('Cannot post a cancelled dispatch');
      }

      const lines = await DispatchLineModel.find({ dispatchId: dispatch._id }).session(session);
      if (!lines.length) throw new BadRequestError('Cannot post a dispatch with no line items');

      // Update drums and record movement
      for (const line of lines) {
        const drum = await DrumModel.findById(line.drumId).session(session);
        if (!drum) throw new NotFoundError(`Drum '${line.drumId}' not found`);

        if (drum.status === 'DISPATCHED') {
          throw new ConflictError(
            `Drum '${drum.drumNumber}' has already been dispatched. Duplicate dispatch prevented.`,
          );
        }

        drum.status = 'DISPATCHED';
        drum.dispatchId = dispatch._id;
        await drum.save({ session });

        // Record DISPATCH drum movement
        const movementNumber = await InventorySequenceUtil.getNextSequence(
          'DRUM_MOVEMENT',
          'DM',
          session,
        );
        await DrumMovementModel.create(
          [
            {
              movementNumber,
              drumId: drum._id,
              movementType: 'DISPATCH',
              fromWarehouseId: dispatch.sourceWarehouseId || drum.currentWarehouseId,
              referenceDocumentType: 'Dispatch',
              referenceDocumentId: dispatch._id,
              movedAt: new Date(),
              recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              remarks: `Physically dispatched on Dispatch ${dispatch.dispatchNumber} (Vehicle: ${dispatch.vehicleNumber || 'N/A'})`,
            },
          ],
          { session },
        );

        // Post Outward Finished Goods Ledger Movement
        const txnNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );
        const [txn] = await InventoryTransactionModel.create(
          [
            {
              transactionNumber: txnNumber,
              movementType: 'OUTWARD',
              transactionType: 'DISPATCH',
              materialId: line.productId, // Product reference
              warehouseId: dispatch.sourceWarehouseId || drum.currentWarehouseId,
              lotId: null,
              ownerType: 'CUSTOMER',
              customerId: dispatch.customerId,
              quantity: line.lengthMeters,
              unit: 'METER',
              status: 'POSTED',
              sourceDocumentType: 'DISPATCH',
              sourceDocumentId: dispatch._id,
              sourceDocumentLineId: line._id,
              postedAt: new Date(),
              postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              remarks: `Finished cable physically dispatched on Dispatch ${dispatch.dispatchNumber} (Drum: ${drum.drumNumber})`,
            },
          ],
          { session },
        );

        line.inventoryTransactionId = txn._id;
        await line.save({ session });

        // Update InventoryBalance if recorded
        if (line.productId) {
          const warehouseId = dispatch.sourceWarehouseId || drum.currentWarehouseId;
          if (warehouseId) {
            const existingBalance = await InventoryBalanceModel.findOne({
              materialId: line.productId,
              warehouseId,
              customerId: dispatch.customerId,
            }).session(session);

            if (existingBalance && existingBalance.quantityOnHand >= line.lengthMeters) {
              await inventoryBalanceService.decreaseStock({
                materialId: line.productId,
                warehouseId,
                ownerType: 'CUSTOMER',
                customerId: dispatch.customerId,
                quantity: line.lengthMeters,
                unit: 'METER',
                transactionId: txn._id,
                session,
              });
            }
          }
        }
      }

      // Mark associated Packing Lists as DISPATCHED
      const packingListIdsToUpdate = dispatch.packingListIds?.length
        ? dispatch.packingListIds
        : dispatch.packingListId
          ? [dispatch.packingListId]
          : [];

      if (packingListIdsToUpdate.length > 0) {
        await PackingListModel.updateMany(
          { _id: { $in: packingListIdsToUpdate }, status: { $ne: 'CANCELLED' } },
          { $set: { status: 'DISPATCHED' } },
          { session },
        );
      }

      dispatch.status = 'DISPATCHED';
      dispatch.dispatchedAt = new Date();
      if (userId) dispatch.dispatchedBy = new mongoose.Types.ObjectId(userId);
      await dispatch.save({ session });

      const responseData = {
        message: 'Dispatch successfully posted to ledger and drums marked dispatched',
        dispatchId: dispatch._id,
        dispatchNumber: dispatch.dispatchNumber,
        totalLengthMeters: dispatch.totalLengthMeters,
        totalDrums: dispatch.totalDrums,
        status: dispatch.status,
        dispatchedAt: dispatch.dispatchedAt,
      };

      if (idempotencyKey) {
        await InventoryIdempotencyUtil.recordResponse(
          idempotencyKey,
          endpoint,
          InventoryIdempotencyUtil.computeHash({ id }),
          200,
          responseData,
          session,
        );
      }

      return responseData;
    });

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'POST',
        entityType: 'Dispatch',
        entityId: responseData.dispatchId,
        performedBy: userId,
        newValues: { status: 'DISPATCHED', totalLengthMeters: responseData.totalLengthMeters },
      });
    }

    return responseData;
  }

  async cancelDispatch(id: string, reason: string, userId?: string) {
    const dispatch = await DispatchModel.findById(id);
    if (!dispatch) throw new NotFoundError('Dispatch not found');

    if (dispatch.status === 'DISPATCHED' || dispatch.status === 'DELIVERED') {
      throw new BadRequestError(
        'Cannot cancel a finalized dispatch. A physical stock reversal and credit workflow is required.',
      );
    }
    if (dispatch.status === 'CANCELLED') {
      throw new BadRequestError('Dispatch is already CANCELLED');
    }

    dispatch.status = 'CANCELLED';
    dispatch.cancelledAt = new Date();
    dispatch.cancelReason = reason;
    if (userId) dispatch.cancelledBy = new mongoose.Types.ObjectId(userId);
    await dispatch.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CANCEL',
        entityType: 'Dispatch',
        entityId: dispatch._id,
        performedBy: userId,
        metadata: { reason },
      });
    }

    return dispatch;
  }

  // ==========================================
  // 2. OUTBOUND CHALLAN GENERATION
  // ==========================================

  async generateOutboundChallan(
    dispatchId: string,
    dto: {
      deliveryTerms?: string;
      eWayBillNumber?: string;
      eWayBillDate?: string | Date;
      remarks?: string;
    },
    userId?: string,
  ): Promise<IOutboundChallan> {
    const dispatch = await DispatchModel.findById(dispatchId);
    if (!dispatch) throw new NotFoundError(`Dispatch with ID '${dispatchId}' not found`);

    if (dispatch.status !== 'DISPATCHED' && dispatch.status !== 'DELIVERED') {
      throw new BadRequestError(
        `Outbound Challan can only be generated for a finalized DISPATCHED shipment (Current status: '${dispatch.status}')`,
      );
    }

    // Prevent duplicate challan generation for the same dispatch
    const existing = await OutboundChallanModel.findOne({
      dispatchId: dispatch._id,
      status: { $ne: 'CANCELLED' },
    });
    if (existing) {
      throw new ConflictError(
        `Outbound Challan '${existing.challanNumber}' has already been generated for Dispatch '${dispatch.dispatchNumber}'`,
      );
    }

    const lines = await DispatchLineModel.find({ dispatchId: dispatch._id })
      .populate('drumId', 'drumNumber')
      .populate('productId', 'code name');

    const items = lines.map((line) => {
      const drum = line.drumId as unknown as { drumNumber: string };
      const product = line.productId as unknown as {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: string;
      };
      return {
        drumId: line.drumId._id,
        drumNumber: drum?.drumNumber || 'UNKNOWN',
        productId: product?._id,
        productCode: product?.code || 'UNKNOWN',
        productName: product?.name || 'UNKNOWN',
        lengthMeters: line.lengthMeters,
        tareWeightKg: line.tareWeightKg || 0,
        netWeightKg: line.netWeightKg || 0,
        grossWeightKg: line.grossWeightKg,
        remarks: line.remarks,
      };
    });

    const challanNumber = await InventorySequenceUtil.getNextSequence('OUTBOUND_CHALLAN', 'OBC');

    const outboundChallan = await OutboundChallanModel.create({
      challanNumber,
      dispatchId: dispatch._id,
      workOrderId: dispatch.workOrderId,
      customerId: dispatch.customerId,
      challanDate: new Date(),
      deliveryTerms: dto.deliveryTerms,
      eWayBillNumber: dto.eWayBillNumber || dispatch.eWayBillNumber,
      eWayBillDate: dto.eWayBillDate ? new Date(dto.eWayBillDate) : dispatch.eWayBillDate,
      vehicleNumber: dispatch.vehicleNumber,
      transporter: dispatch.transporter,
      lrNumber: dispatch.lrNumber,
      deliveryAddress: dispatch.destinationAddress,
      totalDrums: dispatch.totalDrums,
      totalLengthMeters: dispatch.totalLengthMeters,
      totalTareWeightKg: dispatch.totalTareWeightKg,
      totalNetWeightKg: dispatch.totalNetWeightKg,
      totalGrossWeightKg: dispatch.totalGrossWeightKg,
      items,
      status: 'ISSUED',
      issuedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      remarks: dto.remarks || dispatch.remarks,
    });

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'OutboundChallan',
        entityId: outboundChallan._id,
        performedBy: userId,
        newValues: {
          challanNumber: outboundChallan.challanNumber,
          dispatchId: dispatch._id,
          totalLengthMeters: outboundChallan.totalLengthMeters,
        },
      });
    }

    return outboundChallan;
  }

  async getOutboundChallanById(id: string): Promise<IOutboundChallan> {
    const challan = await OutboundChallanModel.findById(id)
      .populate('customerId', 'code name legalName gstin pan billingAddress')
      .populate(
        'workOrderId',
        'workOrderNumber customerPoNumber customerPoDate orderedLengthMeters',
      )
      .populate(
        'dispatchId',
        'dispatchNumber vehicleNumber transporter driverName driverPhone lrNumber',
      )
      .populate('issuedBy', 'firstName lastName email');

    if (!challan) throw new NotFoundError(`Outbound Challan '${id}' not found`);
    return challan;
  }

  async listOutboundChallans(filter: {
    page: number;
    limit: number;
    customerId?: string;
    workOrderId?: string;
    dispatchId?: string;
    status?: string;
    search?: string;
  }) {
    const query: Record<string, unknown> = {};

    if (filter.customerId) query.customerId = new mongoose.Types.ObjectId(filter.customerId);
    if (filter.workOrderId) query.workOrderId = new mongoose.Types.ObjectId(filter.workOrderId);
    if (filter.dispatchId) query.dispatchId = new mongoose.Types.ObjectId(filter.dispatchId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [
        { challanNumber: searchRegex },
        { vehicleNumber: searchRegex },
        { eWayBillNumber: searchRegex },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;
    const [challans, total] = await Promise.all([
      OutboundChallanModel.find(query)
        .populate('customerId', 'code name')
        .populate('workOrderId', 'workOrderNumber')
        .populate('dispatchId', 'dispatchNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit),
      OutboundChallanModel.countDocuments(query),
    ]);

    return {
      challans,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  /**
   * Structured print payload for printable document/PDF generation
   */
  async getOutboundChallanPrintData(id: string) {
    const challan = await OutboundChallanModel.findById(id)
      .populate('customerId')
      .populate('workOrderId')
      .populate('dispatchId')
      .populate('issuedBy', 'firstName lastName email');

    if (!challan) throw new NotFoundError(`Outbound Challan '${id}' not found`);

    const customer = challan.customerId as unknown as {
      code: string;
      name: string;
      legalName: string;
      gstin: string;
      pan: string;
      billingAddress: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    };

    const workOrder = challan.workOrderId as unknown as {
      workOrderNumber: string;
      customerPoNumber: string;
      customerPoDate: Date;
      orderedLengthMeters: number;
    };

    const dispatch = challan.dispatchId as unknown as {
      dispatchNumber: string;
      vehicleNumber: string;
      transporter: string;
      driverName: string;
      driverPhone: string;
      lrNumber: string;
    };

    return {
      companyHeader: {
        companyName: 'Mfolks Cables Private Limited',
        plantAddress: 'Plot 42, GIDC Industrial Estate, Vadodara, Gujarat - 390010',
        gstin: '24AAACM1234F1Z1',
        cin: 'U31300GJ2020PTC123456',
        documentTitle: 'DELIVERY CHALLAN (JOB-WORK RETURN / CABLE DISPATCH)',
      },
      challanHeader: {
        challanNumber: challan.challanNumber,
        challanDate: challan.challanDate,
        eWayBillNumber: challan.eWayBillNumber || 'N/A',
        eWayBillDate: challan.eWayBillDate || null,
        deliveryTerms: challan.deliveryTerms || 'Door Delivery / Job Work Return',
        status: challan.status,
      },
      consignee: {
        customerCode: customer?.code,
        customerName: customer?.name,
        legalName: customer?.legalName,
        gstin: customer?.gstin,
        pan: customer?.pan,
        address: customer?.billingAddress,
        deliveryAddress: challan.deliveryAddress,
      },
      workOrder: {
        workOrderNumber: workOrder?.workOrderNumber,
        customerPoNumber: workOrder?.customerPoNumber,
        customerPoDate: workOrder?.customerPoDate,
        orderedLengthMeters: workOrder?.orderedLengthMeters,
      },
      transport: {
        dispatchNumber: dispatch?.dispatchNumber,
        transporter: challan.transporter || dispatch?.transporter || 'Self / Own Arrangement',
        vehicleNumber: challan.vehicleNumber || dispatch?.vehicleNumber || 'N/A',
        lrNumber: challan.lrNumber || dispatch?.lrNumber || 'N/A',
        driverName: dispatch?.driverName || 'N/A',
        driverPhone: dispatch?.driverPhone || 'N/A',
      },
      items: challan.items.map((item, index) => ({
        srNo: index + 1,
        drumNumber: item.drumNumber,
        productCode: item.productCode,
        productName: item.productName,
        lengthMeters: item.lengthMeters,
        tareWeightKg: item.tareWeightKg,
        netWeightKg: item.netWeightKg,
        grossWeightKg: item.grossWeightKg,
        remarks: item.remarks,
      })),
      totals: {
        totalDrums: challan.totalDrums,
        totalLengthMeters: challan.totalLengthMeters,
        totalTareWeightKg: challan.totalTareWeightKg,
        totalNetWeightKg: challan.totalNetWeightKg,
        totalGrossWeightKg: challan.totalGrossWeightKg,
      },
      signatories: {
        issuedBy: challan.issuedBy,
        checkedBy: 'Authorized Dispatch Supervisor',
        authorizedSignatory: 'For MFOLKS INDUSTRIES PRIVATE LIMITED',
        receiverAcknowledgement: 'Customer Stamp & Signature',
      },
    };
  }

  /**
   * Generates or retrieves the exact Material Consumption Sheet matching Image 2.
   * Compiles customer-supplied inbound raw material lots, originally received quantities,
   * processing loss, earlier advice usage, advice usage for this dispatch, and balance in hand.
   */
  async getOutboundChallanConsumptionSheet(id: string) {
    const challan = await OutboundChallanModel.findById(id)
      .populate('customerId')
      .populate('workOrderId')
      .populate('packingListId');

    if (!challan) throw new NotFoundError(`Outbound challan '${id}' not found`);

    // If manual custom sheet was previously saved by user, return it
    if (challan.consumptionSheet && Object.keys(challan.consumptionSheet).length > 0) {
      return challan.consumptionSheet;
    }

    const customer = challan.customerId as any;
    const workOrder = challan.workOrderId as any;

    const formatDate = (d?: Date | string) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Find all inbound challans from this customer
    const rawInboundChallans = await InboundChallanModel.find({
      customerId: customer?._id,
      status: 'POSTED',
    }).lean();

    const icIds = rawInboundChallans.map((ic) => ic._id);
    const inboundLines = await InboundChallanLineModel.find({
      inboundChallanId: { $in: icIds },
    })
      .populate('materialId')
      .lean();

    const linesByChallan: Record<string, any[]> = {};
    for (const l of inboundLines) {
      const cid = l.inboundChallanId.toString();
      if (!linesByChallan[cid]) linesByChallan[cid] = [];
      linesByChallan[cid].push(l);
    }

    const inboundChallans = rawInboundChallans.map((ic) => ({
      ...ic,
      lines: linesByChallan[ic._id.toString()] || [],
    }));

    // Retrieve BOM if work order has bomVersionId
    let bomItems: any[] = [];
    let bomBatchSize = 1000; // Standard default batchSize in meters (e.g. 1000 meters)

    if (workOrder?.bomSnapshot?.items?.length) {
      bomBatchSize = workOrder.bomSnapshot.batchSize || 1000;
      bomItems = workOrder.bomSnapshot.items.map((item: any) => ({
        materialId: item.materialId,
        quantityPerUnit: item.quantityPerUnit,
        scrapTolerancePercentage: item.scrapTolerancePercentage ?? item.scrapTolerancePercent ?? 0,
        materialName: item.materialName,
        materialCode: item.materialCode,
      }));
    } else if (workOrder?.bomVersionId) {
      const [dbBomItems, dbBomVersion] = await Promise.all([
        BomItemModel.find({ bomVersionId: workOrder.bomVersionId }).populate('materialId'),
        BomVersionModel.findById(workOrder.bomVersionId),
      ]);
      bomItems = dbBomItems;
      if (dbBomVersion?.batchSize) {
        bomBatchSize = dbBomVersion.batchSize;
      }
    }

    // Find previous outbound challans for this customer to calculate earlier usage
    const previousChallans = await OutboundChallanModel.find({
      customerId: customer?._id,
      createdAt: { $lt: challan.createdAt },
      status: { $ne: 'CANCELLED' },
    }).sort({ createdAt: 1 });
    const previousDispatchedLength = previousChallans.reduce(
      (sum, c) => sum + (c.totalLengthMeters || 0),
      0,
    );

    const currentDispatchLength = challan.totalLengthMeters || 0;
    const columns: any[] = [];

    // Group inbound challans by material in FIFO order (oldest received first)
    // For each required material, deduct prior dispatched quantities, then allocate current advice quantity.
    // If a challan's balance is exhausted, spill over to the customer's newer challan for that material.
    // If no more challans exist and demand exceeds received stock, balance goes negative to indicate stock shortage.
    const sortedInboundChallans = [...inboundChallans].sort((a: any, b: any) => {
      const dateA = new Date(a.customerChallanDate || a.createdAt).getTime();
      const dateB = new Date(b.customerChallanDate || b.createdAt).getTime();
      return dateA - dateB;
    });

    // Collect all unique materials from BOM or inbound challans
    interface MaterialDemand {
      materialId?: string;
      materialName: string;
      hsn: string;
      normPerMeter: number;
      scrapPercentage: number;
      standardCost: number;
    }

    const materialDemands: MaterialDemand[] = [];

    // 1. From BOM items (including scrap factor: total gross requirement = base * (1 + scrap% / 100))
    for (const b of bomItems) {
      const mat = b.materialId as any;
      const matName = mat?.name || b.materialName || 'Raw Material';
      const hsn = mat?.hsnCode || '39011090';
      // Normalize norm to per 1 meter of cable:
      // If batchSize > 1 (e.g. standard 1000m batch in Indian cable manufacturing), divide quantityPerUnit by batchSize
      let rawNorm = b.quantityPerUnit || 0;
      let norm = rawNorm;
      if (bomBatchSize > 1 && rawNorm > 1) {
        // e.g. 250 kg per 1000m batch => 0.250 kg/meter
        norm = Number((rawNorm / bomBatchSize).toFixed(6));
      } else if (rawNorm > 50) {
        // Safety guard: no single meter of cable consumes > 50 kg of raw material
        norm = Number((rawNorm / 1000).toFixed(6));
      }

      // Include scrap tolerance / scrap factor in total quantity used per meter
      let scrapPct = Number(b.scrapTolerancePercentage || mat?.scrapTolerancePercentage || 0);
      if (scrapPct <= 0) {
        // Typical cable manufacturing industry scrap default (2% to 3% job work scrap)
        scrapPct = 2.5;
      }
      if (scrapPct > 0) {
        norm = Number((norm * (1 + scrapPct / 100)).toFixed(6));
      }

      const cost = mat?.standardCost || 100;

      const mId = mat?._id?.toString() || b.materialId?.toString();
      if (!materialDemands.some((m) => m.materialId === mId)) {
        materialDemands.push({
          materialId: mId,
          materialName: matName,
          hsn,
          normPerMeter: norm,
          scrapPercentage: scrapPct,
          standardCost: cost,
        });
      }
    }

    // 2. Add any materials present in inbound challans but not in BOM
    for (const ic of sortedInboundChallans) {
      for (const line of ic.lines) {
        const mat = line.materialId as any;
        const matId = mat?._id?.toString() || line.materialId?.toString();
        const matName = mat?.name || line.materialCode || 'Raw Material';
        const hsn = mat?.hsnCode || '39011090';
        const cost = line.unitRate || mat?.standardCost || 100;

        if (matId && !materialDemands.some((m) => m.materialId === matId)) {
          const lower = matName.toLowerCase();
          let norm = 0.1;
          if (lower.includes('aluminum') || lower.includes('aluminium') || lower.includes('conductor') || lower.includes('rod')) {
            norm = 0.348;
          } else if (lower.includes('xlpe') || lower.includes('insulation')) {
            norm = 0.098;
          } else if (lower.includes('frls') || lower.includes('sheath') || lower.includes('pvc')) {
            norm = 0.182;
          } else if (lower.includes('strip') || lower.includes('gi') || lower.includes('armour')) {
            norm = 0.228;
          } else if (lower.includes('master') || lower.includes('batch') || lower.includes('color')) {
            norm = 0.00049;
          }
          const defaultScrapPct = 2.5;
          norm = Number((norm * (1 + defaultScrapPct / 100)).toFixed(6));
          materialDemands.push({
            materialId: matId,
            materialName: matName,
            hsn,
            normPerMeter: norm,
            scrapPercentage: defaultScrapPct,
            standardCost: cost,
          });
        }
      }
    }

    if (materialDemands.length > 0 && sortedInboundChallans.length > 0) {
      for (const demand of materialDemands) {
        // Find all inbound challan lines for this material across sorted challans
        const matchingChallanEntries: {
          challanRef: string;
          challanDate: Date;
          origQty: number;
          unitRate: number;
          hsn: string;
          materialName: string;
        }[] = [];

        for (const ic of sortedInboundChallans) {
          const matchingLines = ic.lines.filter((l: any) => {
            const lineMatId = l.materialId?._id?.toString() || l.materialId?.toString();
            return lineMatId === demand.materialId ||
              (l.materialCode && demand.materialName.toLowerCase().includes(l.materialCode.toLowerCase()));
          });

          for (const ml of matchingLines) {
            const origQty = ml.receivedQuantity || ml.challanQuantity || 0;
            const unitRate = ml.unitRate || demand.standardCost || 100;
            const refDate = (ic as any).customerChallanDate || (ic as any).challanDate || (ic as any).createdAt;
            matchingChallanEntries.push({
              challanRef: `${(ic as any).customerChallanNumber || (ic as any).challanNumber} DT ${formatDate(refDate)}`,
              challanDate: new Date(refDate),
              origQty,
              unitRate,
              hsn: demand.hsn,
              materialName: demand.materialName,
            });
          }
        }

        if (matchingChallanEntries.length === 0) continue;

        let totalPriorDemand = Number((previousDispatchedLength * demand.normPerMeter).toFixed(2));
        let totalCurrentDemand = Number((currentDispatchLength * demand.normPerMeter).toFixed(2));

        // Track how earlier demand breaks down per prior advice
        const priorAdviceDemands = previousChallans.map((pc, idx) => ({
          adviceIndex: idx + 1,
          challanNumber: pc.challanNumber || `Prior Advice ${idx + 1}`,
          challanDate: formatDate(pc.challanDate || pc.createdAt),
          demandRemaining: Number(((pc.totalLengthMeters || 0) * demand.normPerMeter).toFixed(2)),
        }));

        for (let i = 0; i < matchingChallanEntries.length; i++) {
          const entry = matchingChallanEntries[i];
          const isLastChallan = i === matchingChallanEntries.length - 1;
          const origQty = entry.origQty;
          const rate = entry.unitRate;
          const origVal = Number((origQty * rate).toFixed(2));

          // 1. Deduct prior usage from this challan
          let earlierUsedInThis = 0;
          const earlierBreakdown: { label: string; qty: number; value: number }[] = [];

          if (totalPriorDemand > 0) {
            if (isLastChallan) {
              // If it's the last available challan, it absorbs any remaining prior demand even if it exceeds origQty
              earlierUsedInThis = totalPriorDemand;
              totalPriorDemand = 0;
            } else {
              earlierUsedInThis = Math.min(origQty, totalPriorDemand);
              totalPriorDemand = Number((totalPriorDemand - earlierUsedInThis).toFixed(2));
            }

            // Distribute earlierUsedInThis across prior dispatches sequentially
            let remainingToAllocate = earlierUsedInThis;
            for (const pad of priorAdviceDemands) {
              if (remainingToAllocate <= 0) break;
              if (pad.demandRemaining > 0) {
                const take = Math.min(pad.demandRemaining, remainingToAllocate);
                pad.demandRemaining = Number((pad.demandRemaining - take).toFixed(2));
                remainingToAllocate = Number((remainingToAllocate - take).toFixed(2));
                earlierBreakdown.push({
                  label: `${pad.challanNumber}${pad.challanDate ? ` (${pad.challanDate})` : ''}`,
                  qty: Number(take.toFixed(2)),
                  value: Number((take * rate).toFixed(2)),
                });
              }
            }
          }
          earlierUsedInThis = Number(earlierUsedInThis.toFixed(2));
          const earlierVal = Number((earlierUsedInThis * rate).toFixed(2));

          // Remaining quantity available in this challan for current advice
          const availInThis = origQty - earlierUsedInThis;

          // 2. Deduct current advice usage from this challan
          let thisAdviceInThis = 0;
          if (totalCurrentDemand > 0) {
            if (isLastChallan) {
              // Last challan: absorbs all remaining advice demand. If availInThis < totalCurrentDemand, balance goes negative!
              thisAdviceInThis = totalCurrentDemand;
              totalCurrentDemand = 0;
            } else {
              // Use up to available in this challan; remaining demand will be fulfilled by next (newer) challan
              if (availInThis > 0) {
                thisAdviceInThis = Math.min(availInThis, totalCurrentDemand);
                totalCurrentDemand = Number((totalCurrentDemand - thisAdviceInThis).toFixed(2));
              } else {
                thisAdviceInThis = 0;
              }
            }
          }
          thisAdviceInThis = Number(thisAdviceInThis.toFixed(2));
          const thisAdviceVal = Number((thisAdviceInThis * rate).toFixed(2));

          // 3. Balance In Hand: can be negative if demand exceeded total available stock
          const balanceQty = Number((origQty - earlierUsedInThis - thisAdviceInThis).toFixed(2));
          const balanceVal = Number((balanceQty * rate).toFixed(2));

          // If a challan has already been fully depleted in earlier advices (availInThis <= 0, thisAdviceInThis === 0, balanceQty === 0),
          // do not show it on the sheet/export.
          if (earlierUsedInThis >= origQty && thisAdviceInThis === 0 && balanceQty === 0) {
            continue;
          }

          // If a new/available challan was NOT used at all (neither earlier nor under this advice),
          // do not show it on the sheet/export.
          if (earlierUsedInThis === 0 && thisAdviceInThis === 0) {
            continue;
          }

          // Calculate scrap portion of this advice's usage: scrap = totalUsed * (scrapPct / (100 + scrapPct))
          const sPct = demand.scrapPercentage || 2.5;
          const scrapQtyFromThis = Number((thisAdviceInThis * (sPct / (100 + sPct))).toFixed(2));

          columns.push({
            challanRef: entry.challanRef,
            description: entry.materialName,
            hsn: entry.hsn,
            unitRate: rate,
            scrapPercentage: sPct,
            scrapQuantity: scrapQtyFromThis,
            originallyReceived: { qty: origQty, value: origVal },
            processingLoss: { qty: 0, value: 0 },
            netQuantity: { qty: origQty, value: origVal },
            qtyUsedEarlier: { qty: earlierUsedInThis, value: earlierVal },
            earlierBreakdown: earlierBreakdown.length > 0 ? earlierBreakdown : undefined,
            qtyUsedThisAdvice: { qty: thisAdviceInThis, value: thisAdviceVal },
            balanceInHand: { qty: balanceQty, value: balanceVal },
            qtyReturn: { qty: 0, value: 0 },
          });
        }
      }
    }


    const payload = {
      company: {
        name: 'MFOLKS INDUSTRIES PRIVATE LIMITED',
        address:
          'F-279 A, RIICO Industrial Area, Chopanki, Tapukara, Alwar, Rajasthan, India - 301707',
        gstin: '08AAOCM2650D1ZI',
        pan: 'AAOCM2650D',
        cin: 'U27320DL2021PTC376425',
      },
      documentTitle: 'Material Consumption Sheet',
      subtitle:
        '(For return of goods, in more than one lot to the parent factory received partially processed / goods for further processing / operation under rule of GST on job basis.)',
      metadata: {
        challanNumber: challan.challanNumber || 'MF/DC/408',
        date: formatDate(challan.challanDate) || '17-08-2026',
        recipientName: customer?.legalName || customer?.name || 'M/s. V-MARC INDIA LIMITED',
        recipientAddress: customer?.billingAddress
          ? `${customer.billingAddress.street || ''}, ${customer.billingAddress.city || ''}, ${customer.billingAddress.state || ''} - ${customer.billingAddress.postalCode || ''}`
          : 'Khasra No. 1,2,6, Village-Mukrabpur Bahadrabad Bhagwanpur Road Tehsil Roorkee-247667',
        recipientGstin: customer?.gstin || '05AAMCA4908L1ZG',
        natureOfProcess: 'Cable Processing (Semi finished cable)',
        descriptionOfGoodsReturned:
          challan.sizeDescription || workOrder?.productId?.name || '4CX35 SQMM A2XFY',
        dispatchQuantity: `${(challan.totalLengthMeters || 1997).toFixed(3)} mtrs (${challan.totalDrums || 4} drum as per packing list)`,
        workOrderNumberAndDate: `${challan.workOrderNumber || workOrder?.workOrderNumber || 'MF-2026-01'}`,
      },
      columns,
      dispatchDetails: {
        dateOfDispatch: formatDate(challan.challanDate) || '17-08-2026',
        vehicleNumber: challan.vehicleNumber || 'UP17BT 0896',
        placeOfSupply: customer?.billingAddress
          ? `${customer.billingAddress.city}-${customer.billingAddress.state}`
          : 'Haridwar-Uttarakhand',
        place: 'Chopanki',
        date: formatDate(challan.challanDate) || '17-08-2026',
        remarks:
          challan.remarks ||
          'Being goods returned back to prinicpal after partly completion of job work.',
        authorizedSignatory: 'For MFOLKS INDUSTRIES PRIVATE LIMITED',
      },
    };

    return payload;
  }

  async saveOutboundChallanConsumptionSheet(id: string, sheetData: any, userId?: string) {
    const challan = await OutboundChallanModel.findById(id);
    if (!challan) throw new NotFoundError(`Outbound challan '${id}' not found`);

    challan.consumptionSheet = sheetData;
    await challan.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'OutboundChallan',
        entityId: challan._id,
        performedBy: userId,
        newValues: { consumptionSheetSaved: true },
      });
    }

    return challan.consumptionSheet;
  }

  // ==========================================
  // 3. CUSTOMER-WISE & ORDER-WISE TRACEABILITY
  // ==========================================

  async getCustomerDispatchHistory(customerId: string) {
    const customer = await CustomerModel.findById(customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    const dispatches = await DispatchModel.find({ customerId: customer._id })
      .populate('workOrderId', 'workOrderNumber orderedLengthMeters')
      .populate('sourceWarehouseId', 'code name')
      .sort({ dispatchedAt: -1, createdAt: -1 });

    const dispatchIds = dispatches.map((d) => d._id);
    const challans = await OutboundChallanModel.find({ dispatchId: { $in: dispatchIds } });
    const challanMap = new Map(
      challans
        .filter((c) => c.dispatchId)
        .map((c) => [c.dispatchId!.toString(), c]),
    );

    const history = await Promise.all(
      dispatches.map(async (d) => {
        const lines = await DispatchLineModel.find({ dispatchId: d._id })
          .populate('drumId', 'drumNumber serialNumber drumType')
          .populate('productId', 'code name');

        const challan = challanMap.get(d._id.toString());

        return {
          dispatchId: d._id,
          dispatchNumber: d.dispatchNumber,
          workOrder: d.workOrderId,
          status: d.status,
          dispatchedAt: d.dispatchedAt,
          vehicleNumber: d.vehicleNumber,
          transporter: d.transporter,
          lrNumber: d.lrNumber,
          totalDrums: d.totalDrums,
          totalLengthMeters: d.totalLengthMeters,
          totalGrossWeightKg: d.totalGrossWeightKg,
          outboundChallanNumber: challan?.challanNumber || null,
          drums: lines.map((l) => ({
            drum: l.drumId,
            product: l.productId,
            lengthMeters: l.lengthMeters,
            grossWeightKg: l.grossWeightKg,
          })),
        };
      }),
    );

    return {
      customerId: customer._id,
      customerCode: customer.code,
      customerName: customer.name,
      totalDispatches: dispatches.length,
      dispatches: history,
    };
  }

  async getWorkOrderPackingSummary(workOrderId: string) {
    const workOrder = await WorkOrderModel.findById(workOrderId)
      .populate('customerId', 'code name')
      .populate('productId', 'code name');

    if (!workOrder) throw new NotFoundError('Work order not found');

    // Good production output
    const outputs = await ProductionOutputModel.find({
      workOrderId: workOrder._id,
      status: 'POSTED',
      qualityStatus: 'PASSED',
      isFinalStage: true,
    });
    const goodOutputMeters = outputs.reduce((sum, o) => sum + o.outputLengthMeters, 0);

    // Packing lists
    const packingLists = await PackingListModel.find({
      workOrderId: workOrder._id,
    }).sort({ createdAt: -1 });

    const packedLists = packingLists.filter(
      (p) => p.status === 'PACKED' || p.status === 'COMPLETED' || p.status === 'DISPATCHED',
    );
    const totalPackedMeters = packedLists.reduce((sum, p) => sum + p.totalLengthMeters, 0);

    // Dispatches
    const dispatches = await DispatchModel.find({
      workOrderId: workOrder._id,
      status: 'DISPATCHED',
    });
    const totalDispatchedMeters = dispatches.reduce((sum, d) => sum + d.totalLengthMeters, 0);

    const remainingUnpackedMeters = Math.max(0, goodOutputMeters - totalPackedMeters);

    return {
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      orderedLengthMeters: workOrder.orderedLengthMeters,
      goodOutputMeters,
      totalPackedMeters,
      totalDispatchedMeters,
      remainingUnpackedMeters,
      packingLists,
    };
  }

  async getWorkOrderDispatchSummary(workOrderId: string) {
    const workOrder = await WorkOrderModel.findById(workOrderId)
      .populate('customerId', 'code name')
      .populate('productId', 'code name');

    if (!workOrder) throw new NotFoundError('Work order not found');

    const dispatches = await DispatchModel.find({ workOrderId: workOrder._id }).sort({
      createdAt: -1,
    });
    const dispatchedOnly = dispatches.filter((d) => d.status === 'DISPATCHED');
    const totalDispatchedMeters = dispatchedOnly.reduce((sum, d) => sum + d.totalLengthMeters, 0);
    const totalGrossWeightKg = dispatchedOnly.reduce((sum, d) => sum + d.totalGrossWeightKg, 0);
    const totalDrumsDispatched = dispatchedOnly.reduce((sum, d) => sum + d.totalDrums, 0);

    const dispatchIds = dispatches.map((d) => d._id);
    const challans = await OutboundChallanModel.find({ dispatchId: { $in: dispatchIds } });
    const challanMap = new Map(
      challans
        .filter((c) => c.dispatchId)
        .map((c) => [c.dispatchId!.toString(), c]),
    );

    const fulfillmentPercentage =
      workOrder.orderedLengthMeters > 0
        ? Number(((totalDispatchedMeters / workOrder.orderedLengthMeters) * 100).toFixed(2))
        : 0;

    return {
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      orderedLengthMeters: workOrder.orderedLengthMeters,
      totalDispatchedMeters,
      totalDrumsDispatched,
      totalGrossWeightKg,
      fulfillmentPercentage,
      dispatches: dispatches.map((d) => ({
        dispatchId: d._id,
        dispatchNumber: d.dispatchNumber,
        status: d.status,
        dispatchedAt: d.dispatchedAt,
        totalLengthMeters: d.totalLengthMeters,
        totalDrums: d.totalDrums,
        vehicleNumber: d.vehicleNumber,
        outboundChallanNumber: challanMap.get(d._id.toString())?.challanNumber || null,
      })),
    };
  }
}

export const dispatchService = new DispatchService();
