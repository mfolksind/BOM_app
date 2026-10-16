import mongoose from 'mongoose';
import { WorkOrderModel, IWorkOrder, IBomSnapshot } from './work-order.model';
import { CustomerModel } from '../customers/customer.model';
import { ProductModel } from '../products/product.model';
import { BomVersionModel } from '../bom/bom-version.model';
import { BomItemModel } from '../bom/bom-item.model';
import { MaterialModel } from '../materials/material.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { MaterialReservationModel } from '../inventory/material-reservation.model';
import { InventoryTransactionModel } from '../inventory/inventory-transaction.model';
import { MaterialIssueModel } from '../production/material-issue.model';
import { MaterialIssueLineModel } from '../production/material-issue-line.model';
import { MaterialConsumptionModel } from '../production/material-consumption.model';
import { MaterialReturnModel } from '../production/material-return.model';
import { ScrapRecordModel } from '../production/scrap-record.model';
import { ProductionOutputModel } from '../production/production-output.model';
import { inventoryBalanceService } from '../inventory/inventory-balance.service';
import { InventorySequenceUtil } from '../inventory/inventory-sequence.util';
import { InventoryAuditUtil } from '../inventory/inventory-audit.util';
import { TransactionUtil } from '../../common/utils/transaction.util';
import { BadRequestError, NotFoundError } from '../../common/errors';

export interface CreateWorkOrderDto {
  customerId: string;
  productId: string;
  bomVersionId: string;
  orderedLengthMeters: number;
  customerPoNumber?: string;
  customerPoDate?: string | Date;
  jobWorkRatePerMeter?: number;
  targetDeliveryDate: string | Date;
  plannedStartDate?: string | Date;
  plannedCompletionDate?: string | Date;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notes?: string;
  remarks?: string;
  customerSpecifications?: string;
}

export interface ListWorkOrdersFilter {
  page: number;
  limit: number;
  customerId?: string;
  productId?: string;
  status?: string;
  priority?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class WorkOrdersService {
  /**
   * Create a new draft work order
   */
  async createWorkOrder(dto: CreateWorkOrderDto, userId?: string): Promise<IWorkOrder> {
    const customer = await CustomerModel.findById(dto.customerId);
    if (!customer || !customer.isActive) {
      throw new BadRequestError('Customer not found or is inactive');
    }

    const product = await ProductModel.findById(dto.productId);
    if (!product || !product.isActive) {
      throw new BadRequestError('Product not found or is inactive');
    }

    const bomVersion = await BomVersionModel.findById(dto.bomVersionId);
    if (!bomVersion) {
      throw new BadRequestError('BOM Version not found');
    }
    if (bomVersion.productId.toString() !== product._id.toString()) {
      throw new BadRequestError('Specified BOM version does not belong to the selected product');
    }

    const workOrderNumber = await InventorySequenceUtil.getNextSequence('WORK_ORDER', 'WO');

    const workOrder = await WorkOrderModel.create({
      workOrderNumber,
      customerId: customer._id,
      productId: product._id,
      bomVersionId: bomVersion._id,
      orderedLengthMeters: dto.orderedLengthMeters,
      deliveredLengthMeters: 0,
      customerPoNumber: dto.customerPoNumber,
      customerPoDate: dto.customerPoDate ? new Date(dto.customerPoDate) : undefined,
      jobWorkRatePerMeter: dto.jobWorkRatePerMeter,
      targetDeliveryDate: new Date(dto.targetDeliveryDate),
      plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
      plannedCompletionDate: dto.plannedCompletionDate
        ? new Date(dto.plannedCompletionDate)
        : undefined,
      priority: dto.priority || 'NORMAL',
      status: 'DRAFT',
      notes: dto.notes,
      remarks: dto.remarks,
      customerSpecifications: dto.customerSpecifications,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'WorkOrder',
        entityId: workOrder._id,
        performedBy: userId,
        newValues: { workOrderNumber, status: 'DRAFT' },
      });
    }

    return workOrder;
  }

  /**
   * List work orders with pagination and filtering
   */
  async listWorkOrders(filter: ListWorkOrdersFilter) {
    const query: Record<string, unknown> = {};

    if (filter.customerId) query.customerId = new mongoose.Types.ObjectId(filter.customerId);
    if (filter.productId) query.productId = new mongoose.Types.ObjectId(filter.productId);
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;

    if (filter.startDate || filter.endDate) {
      query.targetDeliveryDate = {};
      if (filter.startDate)
        (query.targetDeliveryDate as Record<string, unknown>).$gte = new Date(filter.startDate);
      if (filter.endDate)
        (query.targetDeliveryDate as Record<string, unknown>).$lte = new Date(filter.endDate);
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ workOrderNumber: regex }, { customerPoNumber: regex }, { remarks: regex }];
    }

    const skip = (filter.page - 1) * filter.limit;
    const [workOrders, total] = await Promise.all([
      WorkOrderModel.find(query)
        .populate('customerId', 'code name legalName gstin')
        .populate('productId', 'code name cableCategory voltageGrade')
        .populate('bomVersionId', 'bomNumber versionNumber status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit)
        .lean(),
      WorkOrderModel.countDocuments(query),
    ]);

    return {
      workOrders,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  /**
   * Get work order by ID
   */
  async getWorkOrderById(id: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id)
      .populate('customerId', 'code name legalName gstin')
      .populate('productId', 'code name cableCategory voltageGrade')
      .populate('bomVersionId', 'bomNumber versionNumber status batchSize outputUnit')
      .populate('createdBy', 'firstName lastName email')
      .populate('confirmedBy', 'firstName lastName email');

    if (!workOrder) {
      throw new NotFoundError(`Work order with ID '${id}' not found`);
    }

    return workOrder;
  }

  /**
   * Update draft work order
   */
  async updateWorkOrder(
    id: string,
    updates: Partial<CreateWorkOrderDto>,
    userId?: string,
  ): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) {
      throw new NotFoundError(`Work order with ID '${id}' not found`);
    }

    if (workOrder.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot edit work order in '${workOrder.status}' status. Only DRAFT work orders can be edited.`,
      );
    }

    if (updates.orderedLengthMeters !== undefined)
      workOrder.orderedLengthMeters = updates.orderedLengthMeters;
    if (updates.customerPoNumber !== undefined)
      workOrder.customerPoNumber = updates.customerPoNumber;
    if (updates.customerPoDate !== undefined)
      workOrder.customerPoDate = updates.customerPoDate
        ? new Date(updates.customerPoDate)
        : undefined;
    if (updates.jobWorkRatePerMeter !== undefined)
      workOrder.jobWorkRatePerMeter = updates.jobWorkRatePerMeter;
    if (updates.targetDeliveryDate !== undefined)
      workOrder.targetDeliveryDate = new Date(updates.targetDeliveryDate);
    if (updates.plannedStartDate !== undefined)
      workOrder.plannedStartDate = updates.plannedStartDate
        ? new Date(updates.plannedStartDate)
        : undefined;
    if (updates.plannedCompletionDate !== undefined)
      workOrder.plannedCompletionDate = updates.plannedCompletionDate
        ? new Date(updates.plannedCompletionDate)
        : undefined;
    if (updates.priority !== undefined) workOrder.priority = updates.priority;
    if (updates.notes !== undefined) workOrder.notes = updates.notes;
    if (updates.remarks !== undefined) workOrder.remarks = updates.remarks;
    if (updates.customerSpecifications !== undefined)
      workOrder.customerSpecifications = updates.customerSpecifications;
    if (userId) workOrder.updatedBy = new mongoose.Types.ObjectId(userId);

    await workOrder.save();
    return workOrder;
  }

  /**
   * Confirm work order and snapshot BOM
   */
  async confirmWorkOrder(id: string, userId?: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) {
      throw new NotFoundError(`Work order with ID '${id}' not found`);
    }

    if (workOrder.status !== 'DRAFT') {
      throw new BadRequestError(`Work order cannot be confirmed from status '${workOrder.status}'`);
    }

    const bomVersion = await BomVersionModel.findById(workOrder.bomVersionId);
    if (!bomVersion || bomVersion.status !== 'ACTIVE') {
      throw new BadRequestError('BOM Version must be in ACTIVE status to confirm a work order');
    }

    const bomItems = await BomItemModel.find({ bomVersionId: bomVersion._id }).sort({
      stageSequence: 1,
    });
    if (!bomItems.length) {
      throw new BadRequestError('BOM Version has no items defined');
    }

    // Populate materials to snapshot codes and names
    const materialIds = bomItems.map((item) => item.materialId);
    const materials = await MaterialModel.find({ _id: { $in: materialIds } });
    const materialMap = new Map(materials.map((m) => [m._id.toString(), m]));

    const snapshotItems = bomItems.map((item) => {
      const mat = materialMap.get(item.materialId.toString());
      return {
        materialId: item.materialId,
        materialCode: mat?.code || 'UNKNOWN',
        materialName: mat?.name || 'UNKNOWN',
        quantityPerUnit: item.quantityPerUnit,
        scrapTolerancePercentage: item.scrapTolerancePercentage || 0,
        stageSequence: item.stageSequence,
        unit: mat?.baseUnit || 'KG',
        processStageId: item.processStageId,
      };
    });

    const bomSnapshot: IBomSnapshot = {
      bomVersionId: bomVersion._id,
      bomNumber: bomVersion.bomNumber,
      versionNumber: bomVersion.versionNumber,
      batchSize: bomVersion.batchSize,
      outputUnit: bomVersion.outputUnit,
      items: snapshotItems,
    };

    workOrder.bomSnapshot = bomSnapshot;
    workOrder.status = 'CONFIRMED';
    workOrder.confirmedAt = new Date();
    if (userId) workOrder.confirmedBy = new mongoose.Types.ObjectId(userId);

    await workOrder.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'APPROVE',
        entityType: 'WorkOrder',
        entityId: workOrder._id,
        performedBy: userId,
        newValues: { status: 'CONFIRMED', bomVersion: bomVersion.bomNumber },
      });
    }

    return workOrder;
  }

  /**
   * Put work order on hold
   */
  async holdWorkOrder(id: string, reason: string, userId?: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError(`Work order with ID '${id}' not found`);

    if (workOrder.status !== 'CONFIRMED' && workOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestError(`Cannot put work order on hold from status '${workOrder.status}'`);
    }

    workOrder.status = 'ON_HOLD';
    workOrder.heldAt = new Date();
    workOrder.heldReason = reason;
    await workOrder.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'WorkOrder',
        entityId: workOrder._id,
        performedBy: userId,
        newValues: { status: 'ON_HOLD', reason },
      });
    }

    return workOrder;
  }

  /**
   * Resume work order from hold
   */
  async resumeWorkOrder(id: string, userId?: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError(`Work order with ID '${id}' not found`);

    if (workOrder.status !== 'ON_HOLD') {
      throw new BadRequestError(`Cannot resume work order with status '${workOrder.status}'`);
    }

    // If production issues or outputs already exist, resume as IN_PROGRESS, else CONFIRMED
    const hasIssued = await MaterialIssueLineModel.exists({ workOrderId: workOrder._id });
    workOrder.status = hasIssued ? 'IN_PROGRESS' : 'CONFIRMED';
    workOrder.heldAt = undefined;
    workOrder.heldReason = undefined;
    await workOrder.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'WorkOrder',
        entityId: workOrder._id,
        performedBy: userId,
        newValues: { status: workOrder.status },
      });
    }

    return workOrder;
  }

  /**
   * Cancel work order and release reservations
   */
  async cancelWorkOrder(id: string, reason: string, userId?: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError(`Work order with ID '${id}' not found`);

    if (workOrder.status === 'COMPLETED' || workOrder.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot cancel work order in '${workOrder.status}' status`);
    }

    // Release all active reservations tied to this work order
    const reservations = await MaterialReservationModel.find({
      workOrderId: workOrder._id,
      status: 'ACTIVE',
    });

    for (const res of reservations) {
      await inventoryBalanceService.releaseReservation({
        materialId: res.materialId,
        warehouseId: res.warehouseId,
        ownerType: res.ownerType,
        customerId: res.customerId,
        lotId: res.lotId,
        quantity: res.reservedQuantity,
        unit: res.unit,
      });

      res.status = 'RELEASED';
      res.releasedAt = new Date();
      if (userId) res.releasedBy = new mongoose.Types.ObjectId(userId);
      await res.save();

      const txnNumber = await InventorySequenceUtil.getNextSequence('INVENTORY_TRANSACTION', 'TXN');
      await InventoryTransactionModel.create({
        transactionNumber: txnNumber,
        movementType: 'ADJUSTMENT',
        transactionType: 'RESERVATION_RELEASE',
        materialId: res.materialId,
        warehouseId: res.warehouseId,
        lotId: res.lotId || null,
        ownerType: res.ownerType,
        customerId: res.customerId || null,
        quantity: res.reservedQuantity,
        unit: res.unit,
        status: 'POSTED',
        sourceDocumentType: 'MATERIAL_RESERVATION',
        sourceDocumentId: res._id,
        postedAt: new Date(),
        postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        remarks: `Auto-released on Work Order ${workOrder.workOrderNumber} cancellation`,
      });
    }

    workOrder.status = 'CANCELLED';
    workOrder.cancelledAt = new Date();
    workOrder.cancelReason = reason;
    if (userId) workOrder.cancelledBy = new mongoose.Types.ObjectId(userId);

    await workOrder.save();
    return workOrder;
  }

  /**
   * Calculate planned material requirements using confirmed BOM snapshot (or active BOM)
   * and compare against actual issues, actual consumptions, returns, and scrap.
   */
  async getMaterialRequirements(id: string) {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError(`Work order with ID '${id}' not found`);

    let items = workOrder.bomSnapshot?.items;
    let batchSize = workOrder.bomSnapshot?.batchSize || 1000;

    if (!items || !items.length) {
      // If not yet confirmed, read from active BomVersion
      const bomVersion = await BomVersionModel.findById(workOrder.bomVersionId);
      if (!bomVersion) throw new BadRequestError('BOM Version not found');
      batchSize = bomVersion.batchSize || 1000;

      const bomItems = await BomItemModel.find({ bomVersionId: bomVersion._id }).sort({
        stageSequence: 1,
      });
      const materialIds = bomItems.map((b) => b.materialId);
      const materials = await MaterialModel.find({ _id: { $in: materialIds } });
      const matMap = new Map(materials.map((m) => [m._id.toString(), m]));

      items = bomItems.map((b) => {
        const mat = matMap.get(b.materialId.toString());
        return {
          materialId: b.materialId,
          materialCode: mat?.code || 'UNKNOWN',
          materialName: mat?.name || 'UNKNOWN',
          quantityPerUnit: b.quantityPerUnit,
          scrapTolerancePercentage: b.scrapTolerancePercentage || 0,
          stageSequence: b.stageSequence,
          unit: mat?.baseUnit || 'KG',
          processStageId: b.processStageId,
        };
      });
    }

    const scaleFactor = workOrder.orderedLengthMeters / batchSize;

    // Find all posted issues for this work order
    const postedIssues = await MaterialIssueModel.find({
      workOrderId: workOrder._id,
      status: 'ISSUED',
    }).select('_id');
    const issueIds = postedIssues.map((i) => i._id);

    // Fetch actual movements for this work order
    const [issues, consumptions, returns, scraps] = await Promise.all([
      issueIds.length
        ? MaterialIssueLineModel.aggregate([
            { $match: { materialIssueId: { $in: issueIds } } },
            { $group: { _id: '$materialId', totalIssued: { $sum: '$issuedQuantity' } } },
          ])
        : Promise.resolve([]),
      MaterialConsumptionModel.aggregate([
        { $match: { workOrderId: workOrder._id, status: 'POSTED' } },
        { $group: { _id: '$materialId', totalConsumed: { $sum: '$consumedQuantity' } } },
      ]),
      MaterialReturnModel.aggregate([
        { $match: { workOrderId: workOrder._id, status: 'POSTED' } },
        { $group: { _id: '$materialId', totalReturned: { $sum: '$returnQuantity' } } },
      ]),
      ScrapRecordModel.aggregate([
        { $match: { workOrderId: workOrder._id, status: 'POSTED' } },
        { $group: { _id: '$materialId', totalScrapped: { $sum: '$scrapQuantity' } } },
      ]),
    ]);

    const issueMap = new Map(issues.map((i) => [i._id.toString(), i.totalIssued]));
    const consumeMap = new Map(consumptions.map((c) => [c._id.toString(), c.totalConsumed]));
    const returnMap = new Map(returns.map((r) => [r._id.toString(), r.totalReturned]));
    const scrapMap = new Map(scraps.map((s) => [s._id.toString(), s.totalScrapped]));

    const requirements = items.map((item) => {
      const matIdStr = item.materialId.toString();
      const standardQuantity = Number((item.quantityPerUnit * scaleFactor).toFixed(4));
      const scrapAllowance = Number(
        (standardQuantity * (item.scrapTolerancePercentage / 100)).toFixed(4),
      );
      const plannedQuantity = Number((standardQuantity + scrapAllowance).toFixed(4));

      const actualIssuedQuantity = Number((issueMap.get(matIdStr) || 0).toFixed(4));
      const actualConsumedQuantity = Number((consumeMap.get(matIdStr) || 0).toFixed(4));
      const returnedQuantity = Number((returnMap.get(matIdStr) || 0).toFixed(4));
      const scrapQuantity = Number((scrapMap.get(matIdStr) || 0).toFixed(4));

      const remainingInWipQuantity = Number(
        Math.max(
          0,
          actualIssuedQuantity - actualConsumedQuantity - returnedQuantity - scrapQuantity,
        ).toFixed(4),
      );

      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        stageSequence: item.stageSequence,
        unit: item.unit,
        standardQuantity,
        scrapAllowance,
        plannedQuantity,
        actualIssuedQuantity,
        actualConsumedQuantity,
        returnedQuantity,
        scrapQuantity,
        remainingInWipQuantity,
      };
    });

    return {
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      orderedLengthMeters: workOrder.orderedLengthMeters,
      batchSize,
      requirements,
    };
  }

  /**
   * Check material availability across all eligible customer stock and report shortages
   */
  async getMaterialAvailability(id: string) {
    const { requirements, workOrderNumber } = await this.getMaterialRequirements(id);
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError('Work order not found');

    const customerId = workOrder.customerId;

    const availability = await Promise.all(
      requirements.map(async (req) => {
        // Find customer-owned balances for this material across all warehouses
        const balances = await InventoryBalanceModel.find({
          materialId: req.materialId,
          ownerType: 'CUSTOMER',
          customerId: customerId,
        });

        const totalOnHand = balances.reduce((sum, b) => sum + b.quantityOnHand, 0);
        const totalReserved = balances.reduce((sum, b) => sum + b.quantityReserved, 0);
        const totalAvailable = balances.reduce((sum, b) => sum + b.quantityAvailable, 0);

        // Find active reservations specifically for this work order
        const thisOrderReservations = await MaterialReservationModel.find({
          workOrderId: workOrder._id,
          materialId: req.materialId,
          status: 'ACTIVE',
        });
        const reservedForThisOrder = thisOrderReservations.reduce(
          (sum, r) => sum + r.reservedQuantity,
          0,
        );
        const reservedForOtherOrders = Math.max(0, totalReserved - reservedForThisOrder);

        const netEligibleAvailable = totalAvailable;
        const shortageQuantity = Number(
          Math.max(0, req.plannedQuantity - (netEligibleAvailable + reservedForThisOrder)).toFixed(
            4,
          ),
        );
        const isSufficient = shortageQuantity === 0;

        return {
          materialId: req.materialId,
          materialCode: req.materialCode,
          materialName: req.materialName,
          unit: req.unit,
          requiredQuantity: req.plannedQuantity,
          totalOnHandQuantity: Number(totalOnHand.toFixed(4)),
          eligibleAvailableQuantity: Number(netEligibleAvailable.toFixed(4)),
          reservedForThisOrder: Number(reservedForThisOrder.toFixed(4)),
          reservedForOtherOrders: Number(reservedForOtherOrders.toFixed(4)),
          shortageQuantity,
          isSufficient,
        };
      }),
    );

    const isFullySufficient = availability.every((a) => a.isSufficient);

    return {
      workOrderId: workOrder._id,
      workOrderNumber,
      customerId,
      isFullySufficient,
      materials: availability,
    };
  }

  /**
   * Reserve required materials for work order
   */
  async reserveMaterials(id: string, userId?: string) {
    return TransactionUtil.runInTransaction(async (session) => {
      const workOrder = await WorkOrderModel.findById(id).session(session);
      if (!workOrder) throw new NotFoundError('Work order not found');

      if (workOrder.status !== 'CONFIRMED' && workOrder.status !== 'IN_PROGRESS') {
        throw new BadRequestError(
          `Cannot reserve materials for work order with status '${workOrder.status}'`,
        );
      }

      const { requirements } = await this.getMaterialRequirements(id);
      const customerId = workOrder.customerId;
      const reservedRecords = [];

      for (const req of requirements) {
        // Check existing reservation for this work order
        const existing = await MaterialReservationModel.findOne({
          workOrderId: workOrder._id,
          materialId: req.materialId,
          status: 'ACTIVE',
        }).session(session);

        const currentReserved = existing ? existing.reservedQuantity : 0;
        const needed = Number(Math.max(0, req.plannedQuantity - currentReserved).toFixed(4));

        if (needed <= 0) continue;

        // Find customer stock balance with available stock
        const eligibleBalances = await InventoryBalanceModel.find({
          materialId: req.materialId,
          ownerType: 'CUSTOMER',
          customerId: customerId,
          quantityAvailable: { $gt: 0 },
        }).session(session);

        let remainingToReserve = needed;

        for (const balance of eligibleBalances) {
          if (remainingToReserve <= 0) break;

          const toTake = Math.min(balance.quantityAvailable, remainingToReserve);

          await inventoryBalanceService.reserveStock({
            materialId: balance.materialId,
            warehouseId: balance.warehouseId,
            ownerType: 'CUSTOMER',
            customerId: customerId,
            lotId: balance.lotId || null,
            quantity: toTake,
            unit: req.unit,
            session,
          });

          const reservationNumber = await InventorySequenceUtil.getNextSequence(
            'MATERIAL_RESERVATION',
            'RES',
            session,
          );
          const reservation = await MaterialReservationModel.create(
            [
              {
                reservationNumber,
                workOrderId: workOrder._id,
                materialId: req.materialId,
                warehouseId: balance.warehouseId,
                lotId: balance.lotId || null,
                ownerType: 'CUSTOMER',
                customerId: customerId,
                reservedQuantity: toTake,
                unit: req.unit,
                status: 'ACTIVE',
                reservedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                remarks: `Reserved for Work Order ${workOrder.workOrderNumber}`,
              },
            ],
            { session },
          );

          const txnNumber = await InventorySequenceUtil.getNextSequence(
            'INVENTORY_TRANSACTION',
            'TXN',
            session,
          );
          await InventoryTransactionModel.create(
            [
              {
                transactionNumber: txnNumber,
                movementType: 'ADJUSTMENT',
                transactionType: 'RESERVATION',
                materialId: req.materialId,
                warehouseId: balance.warehouseId,
                lotId: balance.lotId || null,
                ownerType: 'CUSTOMER',
                customerId: customerId,
                quantity: toTake,
                unit: req.unit,
                status: 'POSTED',
                sourceDocumentType: 'MATERIAL_RESERVATION',
                sourceDocumentId: reservation[0]._id,
                postedAt: new Date(),
                postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                remarks: `Stock reserved for Work Order ${workOrder.workOrderNumber}`,
              },
            ],
            { session },
          );

          reservedRecords.push(reservation[0]);
          remainingToReserve -= toTake;
        }

        if (remainingToReserve > 0) {
          throw new BadRequestError(
            `Insufficient available stock for material '${req.materialCode || req.materialName || req.materialId}'. Required: ${needed} ${req.unit}, unfulfilled: ${remainingToReserve} ${req.unit}`,
          );
        }
      }

      return {
        message: 'Material reservation completed',
        workOrderId: workOrder._id,
        reservationsCreated: reservedRecords.length,
      };
    });
  }

  /**
   * Release all reservations for a work order
   */
  async releaseReservations(id: string, userId?: string) {
    return TransactionUtil.runInTransaction(async (session) => {
      const workOrder = await WorkOrderModel.findById(id).session(session);
      if (!workOrder) throw new NotFoundError('Work order not found');

      const activeReservations = await MaterialReservationModel.find({
        workOrderId: workOrder._id,
        status: 'ACTIVE',
      }).session(session);

      if (!activeReservations.length) {
        return { message: 'No active reservations found for this work order', releasedCount: 0 };
      }

      for (const res of activeReservations) {
        await inventoryBalanceService.releaseReservation({
          materialId: res.materialId,
          warehouseId: res.warehouseId,
          ownerType: res.ownerType,
          customerId: res.customerId,
          lotId: res.lotId || null,
          quantity: res.reservedQuantity,
          unit: res.unit,
          session,
        });

        res.status = 'RELEASED';
        res.releasedAt = new Date();
        if (userId) res.releasedBy = new mongoose.Types.ObjectId(userId);
        await res.save({ session });

        const txnNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );
        await InventoryTransactionModel.create(
          [
            {
              transactionNumber: txnNumber,
              movementType: 'ADJUSTMENT',
              transactionType: 'RESERVATION_RELEASE',
              materialId: res.materialId,
              warehouseId: res.warehouseId,
              lotId: res.lotId || null,
              ownerType: res.ownerType,
              customerId: res.customerId || null,
              quantity: res.reservedQuantity,
              unit: res.unit,
              status: 'POSTED',
              sourceDocumentType: 'MATERIAL_RESERVATION',
              sourceDocumentId: res._id,
              postedAt: new Date(),
              postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              remarks: `Released for Work Order ${workOrder.workOrderNumber}`,
            },
          ],
          { session },
        );
      }

      return {
        message: 'All active reservations released successfully',
        workOrderId: workOrder._id,
        releasedCount: activeReservations.length,
      };
    });
  }

  /**
   * Work order completion summary and variance analysis
   */
  async getCompletionSummary(id: string) {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError('Work order not found');

    const { requirements } = await this.getMaterialRequirements(id);

    // Sum actual good output length in meters
    const outputs = await ProductionOutputModel.find({
      workOrderId: workOrder._id,
      status: 'POSTED',
      qualityStatus: 'PASSED',
      isFinalStage: true,
    });
    const goodOutputMeters = outputs.reduce((sum, o) => sum + o.outputLengthMeters, 0);

    const rejectedOutputs = await ProductionOutputModel.find({
      workOrderId: workOrder._id,
      status: 'POSTED',
      qualityStatus: 'REJECTED',
    });
    const rejectedOutputMeters = rejectedOutputs.reduce((sum, o) => sum + o.outputLengthMeters, 0);

    const materialVariance = requirements.map((req) => {
      const varianceQuantity = Number(
        (req.actualConsumedQuantity - req.plannedQuantity).toFixed(4),
      );
      const variancePercentage =
        req.plannedQuantity > 0
          ? Number(((varianceQuantity / req.plannedQuantity) * 100).toFixed(2))
          : 0;

      return {
        materialId: req.materialId,
        materialCode: req.materialCode,
        materialName: req.materialName,
        unit: req.unit,
        plannedQuantity: req.plannedQuantity,
        actualIssuedQuantity: req.actualIssuedQuantity,
        actualConsumedQuantity: req.actualConsumedQuantity,
        returnedQuantity: req.returnedQuantity,
        scrapQuantity: req.scrapQuantity,
        remainingInWipQuantity: req.remainingInWipQuantity,
        varianceQuantity,
        variancePercentage,
      };
    });

    const totalOutstandingWip = materialVariance.reduce(
      (sum, m) => sum + m.remainingInWipQuantity,
      0,
    );

    return {
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      status: workOrder.status,
      plannedLengthMeters: workOrder.orderedLengthMeters,
      goodOutputMeters,
      rejectedOutputMeters,
      outputFulfillmentPercentage: Number(
        ((goodOutputMeters / workOrder.orderedLengthMeters) * 100).toFixed(2),
      ),
      totalOutstandingWip,
      canComplete: totalOutstandingWip === 0,
      materials: materialVariance,
    };
  }

  /**
   * Complete work order
   */
  async completeWorkOrder(
    id: string,
    force = false,
    remarks?: string,
    userId?: string,
  ): Promise<IWorkOrder> {
    const workOrder = await WorkOrderModel.findById(id);
    if (!workOrder) throw new NotFoundError('Work order not found');

    if (workOrder.status === 'COMPLETED') {
      throw new BadRequestError('Work order is already COMPLETED');
    }

    if (workOrder.status === 'CANCELLED') {
      throw new BadRequestError('Cannot complete a CANCELLED work order');
    }

    const summary = await this.getCompletionSummary(id);

    if (summary.totalOutstandingWip > 0 && !force) {
      throw new BadRequestError(
        `Cannot complete work order with outstanding WIP (${summary.totalOutstandingWip} units of material remaining in WIP). Please consume, scrap, or return remaining material to store, or set force: true with explicit authorization.`,
      );
    }

    workOrder.status = 'COMPLETED';
    if (remarks)
      workOrder.remarks = workOrder.remarks ? `${workOrder.remarks}; ${remarks}` : remarks;
    await workOrder.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'WorkOrder',
        entityId: workOrder._id,
        performedBy: userId,
        newValues: { status: 'COMPLETED', force, remarks },
      });
    }

    return workOrder;
  }
}

export const workOrdersService = new WorkOrdersService();
