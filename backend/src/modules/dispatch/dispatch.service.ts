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
import { InventoryIdempotencyUtil } from '../inventory/inventory-idempotency.util';
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
        authorizedSignatory: 'For Mfolks Cables Pvt. Ltd.',
        receiverAcknowledgement: 'Customer Stamp & Signature',
      },
    };
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
    const challanMap = new Map(challans.map((c) => [c.dispatchId.toString(), c]));

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
    const challanMap = new Map(challans.map((c) => [c.dispatchId.toString(), c]));

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
