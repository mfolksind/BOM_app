import mongoose from 'mongoose';
import { ProductionOrderModel, IProductionOrder } from './production-order.model';
import { ProductionBatchModel, IProductionBatch } from './production-batch.model';
import { MaterialIssueModel, IMaterialIssue } from './material-issue.model';
import { MaterialIssueLineModel } from './material-issue-line.model';
import { MaterialConsumptionModel, IMaterialConsumption } from './material-consumption.model';
import { MaterialReturnModel, IMaterialReturn } from './material-return.model';
import { ProductionOutputModel, IProductionOutput } from './production-output.model';
import { ScrapRecordModel, IScrapRecord } from './scrap-record.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { MaterialModel } from '../materials/material.model';
import { CustomerModel } from '../customers/customer.model';
import { InventoryTransactionModel } from '../inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { inventoryBalanceService } from '../inventory/inventory-balance.service';
import { InventorySequenceUtil } from '../inventory/inventory-sequence.util';
import { InventoryAuditUtil } from '../inventory/inventory-audit.util';
import { InventoryIdempotencyUtil } from '../inventory/inventory-idempotency.util';
import { StockOwnerType } from '../materials/material-lot.model';
import { MachineModel } from '../machines/machine.model';
import { DrumModel } from '../packing/drum.model';
import { DrumMovementModel } from '../packing/drum-movement.model';
import { BomItemModel } from '../bom/bom-item.model';
import { ProcessStageModel } from '../shared/process-stage.model';
import { TransactionUtil } from '../../common/utils';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';

export class ProductionService {
  /**
   * Helper to calculate remaining WIP for a material in a work order / batch
   */
  async getRemainingWip(params: {
    workOrderId: mongoose.Types.ObjectId | string;
    materialId: mongoose.Types.ObjectId | string;
    lotId?: mongoose.Types.ObjectId | string | null;
  }): Promise<number> {
    const workOrderId = new mongoose.Types.ObjectId(params.workOrderId.toString());
    const materialId = new mongoose.Types.ObjectId(params.materialId.toString());

    // 1. Find all posted issues for this work order
    const postedIssues = await MaterialIssueModel.find({
      workOrderId,
      status: 'ISSUED',
    }).select('_id');
    const issueIds = postedIssues.map((i) => i._id);

    const lineMatch: Record<string, unknown> = {
      materialIssueId: { $in: issueIds },
      materialId,
    };
    if (params.lotId) lineMatch.lotId = new mongoose.Types.ObjectId(params.lotId.toString());

    // Sum issued
    const issues = issueIds.length
      ? await MaterialIssueLineModel.aggregate([
          { $match: lineMatch },
          { $group: { _id: null, total: { $sum: '$issuedQuantity' } } },
        ])
      : [];
    const totalIssued = issues[0]?.total || 0;

    const movementMatch: Record<string, unknown> = { workOrderId, materialId, status: 'POSTED' };
    if (params.lotId) movementMatch.lotId = new mongoose.Types.ObjectId(params.lotId.toString());

    // Sum consumed
    const consumptions = await MaterialConsumptionModel.aggregate([
      { $match: movementMatch },
      { $group: { _id: null, total: { $sum: '$consumedQuantity' } } },
    ]);
    const totalConsumed = consumptions[0]?.total || 0;

    // Sum returned
    const returns = await MaterialReturnModel.aggregate([
      { $match: movementMatch },
      { $group: { _id: null, total: { $sum: '$returnQuantity' } } },
    ]);
    const totalReturned = returns[0]?.total || 0;

    // Sum scrapped
    const scraps = await ScrapRecordModel.aggregate([
      { $match: movementMatch },
      { $group: { _id: null, total: { $sum: '$scrapQuantity' } } },
    ]);
    const totalScrapped = scraps[0]?.total || 0;

    const remaining = totalIssued - totalConsumed - totalReturned - totalScrapped;
    return Number(Math.max(0, remaining).toFixed(4));
  }

  // ==========================================
  // 1. PRODUCTION ORDERS
  // ==========================================

  async createProductionOrder(
    workOrderId: string,
    dto: {
      plannedLengthMeters?: number;
      startDate?: string | Date;
      targetCompletionDate: string | Date;
      remarks?: string;
    },
    userId?: string,
  ): Promise<IProductionOrder> {
    const workOrder = await WorkOrderModel.findById(workOrderId);
    if (!workOrder) throw new NotFoundError('Work order not found');

    if (workOrder.status !== 'CONFIRMED' && workOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestError(
        `Cannot create production order for work order in '${workOrder.status}' status. Must be CONFIRMED or IN_PROGRESS.`,
      );
    }

    const plannedLength = dto.plannedLengthMeters || workOrder.orderedLengthMeters;
    const productionOrderNumber = await InventorySequenceUtil.getNextSequence(
      'PRODUCTION_ORDER',
      'PRD',
    );

    const productionOrder = await ProductionOrderModel.create({
      productionOrderNumber,
      workOrderId: workOrder._id,
      customerId: workOrder.customerId,
      productId: workOrder.productId,
      bomVersionId: workOrder.bomVersionId,
      plannedLengthMeters: plannedLength,
      producedLengthMeters: 0,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      targetCompletionDate: dto.targetCompletionDate
        ? new Date(dto.targetCompletionDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'RELEASED',
      releasedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      releasedAt: new Date(),
      remarks: dto.remarks,
    });

    if (workOrder.status === 'CONFIRMED') {
      workOrder.status = 'IN_PROGRESS';
      await workOrder.save();
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'ProductionOrder',
        entityId: productionOrder._id,
        performedBy: userId,
        newValues: { productionOrderNumber, plannedLengthMeters: plannedLength },
      });
    }

    return productionOrder;
  }

  async listProductionOrders(filter: {
    page: number;
    limit: number;
    workOrderId?: string;
    customerId?: string;
    productId?: string;
    status?: string;
    search?: string;
  }) {
    const query: Record<string, unknown> = {};
    if (filter.workOrderId) query.workOrderId = new mongoose.Types.ObjectId(filter.workOrderId);
    if (filter.customerId) query.customerId = new mongoose.Types.ObjectId(filter.customerId);
    if (filter.productId) query.productId = new mongoose.Types.ObjectId(filter.productId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.productionOrderNumber = new RegExp(filter.search, 'i');
    }

    const skip = (filter.page - 1) * filter.limit;
    const [orders, total] = await Promise.all([
      ProductionOrderModel.find(query)
        .populate('workOrderId', 'workOrderNumber orderedLengthMeters status')
        .populate('productId', 'code name voltageGrade cableCategory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit)
        .lean(),
      ProductionOrderModel.countDocuments(query),
    ]);

    return {
      productionOrders: orders,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  async getProductionOrderById(id: string): Promise<IProductionOrder> {
    const order = await ProductionOrderModel.findById(id)
      .populate('workOrderId')
      .populate('productId')
      .populate('bomVersionId')
      .populate('releasedBy', 'firstName lastName email');

    if (!order) throw new NotFoundError(`Production order '${id}' not found`);
    return order;
  }

  async startProductionOrder(id: string, userId?: string): Promise<IProductionOrder> {
    const order = await ProductionOrderModel.findById(id);
    if (!order) throw new NotFoundError('Production order not found');

    if (order.status !== 'RELEASED' && order.status !== 'DRAFT') {
      throw new BadRequestError(`Cannot start production order with status '${order.status}'`);
    }

    order.status = 'IN_PROGRESS';
    order.startedAt = new Date();
    await order.save();

    await WorkOrderModel.findByIdAndUpdate(order.workOrderId, { status: 'IN_PROGRESS' });

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'ProductionOrder',
        entityId: order._id,
        performedBy: userId,
        newValues: { status: 'IN_PROGRESS' },
      });
    }

    return order;
  }

  async completeProductionOrder(id: string, userId?: string): Promise<IProductionOrder> {
    const order = await ProductionOrderModel.findById(id);
    if (!order) throw new NotFoundError('Production order not found');

    if (order.status === 'COMPLETED') {
      throw new BadRequestError('Production order is already COMPLETED');
    }

    order.status = 'COMPLETED';
    order.completedAt = new Date();
    await order.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'ProductionOrder',
        entityId: order._id,
        performedBy: userId,
        newValues: { status: 'COMPLETED' },
      });
    }

    return order;
  }

  // ==========================================
  // 2. PRODUCTION BATCHES
  // ==========================================

  async createProductionBatch(
    productionOrderId: string,
    dto: {
      processStageId: string;
      machineId?: string;
      machineCode?: string;
      plannedQuantity?: number;
      unit?: string;
      shift?: string;
      operatorId?: string;
      remarks?: string;
    },
    userId?: string,
  ): Promise<IProductionBatch> {
    const order = await ProductionOrderModel.findById(productionOrderId);
    if (!order) throw new NotFoundError('Production order not found');

    let machineId: mongoose.Types.ObjectId | undefined;
    let machineCode = (dto.machineCode || 'MACHINE_1').trim().toUpperCase();

    if (dto.machineId) {
      const machine = await MachineModel.findById(dto.machineId);
      if (!machine || !machine.isActive) {
        throw new BadRequestError(`Machine with ID '${dto.machineId}' not found or is inactive`);
      }
      machineId = machine._id;
      machineCode = machine.code;
    }

    const batchNumber = await InventorySequenceUtil.getNextSequence('BATCH', 'BAT');

    const batch = await ProductionBatchModel.create({
      batchNumber,
      productionOrderId: order._id,
      workOrderId: order.workOrderId,
      processStageId: new mongoose.Types.ObjectId(dto.processStageId),
      machineId,
      machineCode,
      plannedQuantity: dto.plannedQuantity ?? 0,
      completedQuantity: 0,
      unit: dto.unit || 'METER',
      status: 'IN_PROCESS',
      shift: dto.shift as never,
      operatorId: dto.operatorId ? new mongoose.Types.ObjectId(dto.operatorId) : undefined,
      startedAt: new Date(),
      remarks: dto.remarks,
    });

    if (machineId) {
      await MachineModel.findByIdAndUpdate(machineId, {
        status: 'RUNNING',
        currentBatchId: batch._id,
      });
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'ProductionBatch',
        entityId: batch._id,
        performedBy: userId,
        newValues: { batchNumber, machineCode, machineId },
      });
    }

    return batch;
  }

  async getProductionBatchById(id: string): Promise<IProductionBatch> {
    const batch = await ProductionBatchModel.findById(id)
      .populate('productionOrderId')
      .populate('processStageId')
      .populate('machineId')
      .populate('operatorId', 'firstName lastName email employeeCode');

    if (!batch) throw new NotFoundError(`Production batch '${id}' not found`);
    return batch;
  }

  async updateProductionBatch(
    id: string,
    dto: {
      status?: 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'HALTED' | 'REJECTED';
      completedQuantity?: number;
      remarks?: string;
    },
    userId?: string,
  ): Promise<IProductionBatch> {
    const batch = await ProductionBatchModel.findById(id);
    if (!batch) throw new NotFoundError('Production batch not found');

    if (dto.status) {
      batch.status = dto.status;
      if (['COMPLETED', 'HALTED', 'REJECTED'].includes(dto.status) && batch.machineId) {
        await MachineModel.findByIdAndUpdate(batch.machineId, {
          status: 'AVAILABLE',
          currentBatchId: null,
        });
      }
    }
    if (dto.completedQuantity !== undefined) batch.completedQuantity = dto.completedQuantity;
    if (dto.remarks !== undefined) batch.remarks = dto.remarks;
    if (dto.status === 'COMPLETED' && !batch.completedAt) batch.completedAt = new Date();

    await batch.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'ProductionBatch',
        entityId: batch._id,
        performedBy: userId,
        newValues: dto,
      });
    }

    return batch;
  }

  /**
   * List production batches with optional filters
   */
  async listProductionBatches(query: {
    productionOrderId?: string;
    machineId?: string;
    status?: string;
    testStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.productionOrderId) {
      filter.productionOrderId = new mongoose.Types.ObjectId(query.productionOrderId);
    }
    if (query.machineId) {
      filter.machineId = new mongoose.Types.ObjectId(query.machineId);
    }
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.testStatus && query.testStatus !== 'ALL') {
      filter.testStatus = query.testStatus;
    }

    const [items, total] = await Promise.all([
      ProductionBatchModel.find(filter)
        .populate('productionOrderId')
        .populate('processStageId')
        .populate('machineId')
        .populate('operatorId', 'firstName lastName employeeCode email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProductionBatchModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Pass Quality Tests on Machine Batch -> Complete batch, Release machine, and determine next machine stage
   */
  async passBatchTest(
    batchId: string,
    dto: {
      tests?: Array<{
        testName: string;
        testType?: string;
        unit?: string;
        standardSpecification?: string;
        minValue?: number;
        maxValue?: number;
        expectedValue?: string;
        actualValue?: string;
        result?: 'PASSED' | 'FAILED' | 'PENDING';
        remarks?: string;
      }>;
      testReportNumber?: string;
      completedQuantity?: number;
      remarks?: string;
    },
    userId?: string,
  ) {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    if (batch.status === 'COMPLETED') {
      throw new BadRequestError('Production batch is already COMPLETED');
    }

    const testRecords = (dto.tests || []).map((t) => ({
      ...t,
      result: 'PASSED' as const,
    }));

    batch.tests = testRecords.length ? testRecords : batch.tests;
    batch.testStatus = 'TEST_PASSED';
    batch.status = 'COMPLETED';
    batch.completedAt = new Date();
    if (dto.testReportNumber) batch.testReportNumber = dto.testReportNumber.trim();
    if (userId) batch.testedBy = new mongoose.Types.ObjectId(userId);
    batch.testedAt = new Date();
    if (dto.completedQuantity !== undefined && dto.completedQuantity > 0) {
      batch.completedQuantity = dto.completedQuantity;
    } else if (!batch.completedQuantity || batch.completedQuantity === 0) {
      batch.completedQuantity = batch.plannedQuantity;
    }
    if (dto.remarks) {
      batch.remarks = [batch.remarks, `[TEST PASSED]: ${dto.remarks}`].filter(Boolean).join(' | ');
    }
    await batch.save();

    // Release machine back to AVAILABLE
    if (batch.machineId) {
      await MachineModel.findByIdAndUpdate(batch.machineId, {
        status: 'AVAILABLE',
        currentBatchId: null,
      });
    }

    // Determine Next Process Stage in Sequence for this Production Order
    const currentStage = await ProcessStageModel.findById(batch.processStageId);
    const currentSequence = currentStage?.sequenceOrder || 1;

    // Fetch all process stages sorted by sequenceOrder
    const allStages = await ProcessStageModel.find({ isActive: true }).sort({ sequenceOrder: 1 });
    const nextStage = allStages.find((s) => s.sequenceOrder > currentSequence);

    let nextStageInfo = null;
    if (nextStage) {
      const availableMachines = await MachineModel.find({
        processStageIds: nextStage._id,
        isActive: true,
      });
      nextStageInfo = {
        hasMoreStages: true,
        nextStageId: nextStage._id,
        nextStageName: nextStage.name,
        nextStageCode: nextStage.code,
        sequenceOrder: nextStage.sequenceOrder,
        category: nextStage.category,
        availableMachines: availableMachines.map((m) => ({
          _id: m._id,
          code: m.code,
          name: m.name,
          status: m.status,
          capacityPerShift: m.capacityPerShift,
          speedMetersPerMinute: m.speedMetersPerMinute,
        })),
      };
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'ProductionBatch',
        entityId: batch._id,
        performedBy: userId,
        newValues: { testStatus: 'TEST_PASSED', status: 'COMPLETED' },
      });
    }

    return {
      message: nextStageInfo
        ? `Quality test PASSED! Machine ${batch.machineCode} released. Next machine stage: ${nextStageInfo.nextStageName}.`
        : `Quality test PASSED! Machine ${batch.machineCode} released. Final stage completed. Ready for packaging.`,
      batch,
      nextStage: nextStageInfo,
      isFinalStage: !nextStageInfo,
    };
  }

  /**
   * Fail Quality Tests on Machine Batch -> Keep / Restart on the SAME machine for rework
   */
  async failBatchTest(
    batchId: string,
    dto: {
      reason: string;
      tests?: Array<{
        testName: string;
        testType?: string;
        unit?: string;
        standardSpecification?: string;
        minValue?: number;
        maxValue?: number;
        expectedValue?: string;
        actualValue?: string;
        result?: 'PASSED' | 'FAILED' | 'PENDING';
        remarks?: string;
      }>;
      testReportNumber?: string;
      remarks?: string;
    },
    userId?: string,
  ) {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const newReworkCount = (batch.reworkCount || 0) + 1;
    const testRecords = (dto.tests || []).map((t) => ({
      ...t,
      result: (t.result || 'FAILED') as 'PASSED' | 'FAILED' | 'PENDING',
    }));

    batch.tests = testRecords.length ? testRecords : batch.tests;
    batch.testStatus = 'TEST_FAILED';
    batch.status = 'IN_PROCESS'; // Keep working on the SAME machine
    batch.reworkCount = newReworkCount;
    if (dto.testReportNumber) batch.testReportNumber = dto.testReportNumber.trim();
    if (userId) batch.testedBy = new mongoose.Types.ObjectId(userId);
    batch.testedAt = new Date();

    if (!batch.reworkHistory) batch.reworkHistory = [];
    batch.reworkHistory.push({
      reworkNumber: newReworkCount,
      failedAt: new Date(),
      reason: dto.reason,
      tests: testRecords,
      operatorNotes: dto.remarks,
    });

    batch.remarks = [
      batch.remarks,
      `[FAILED TEST / REWORK #${newReworkCount} ON SAME MACHINE ${batch.machineCode}]: ${dto.reason}`,
    ]
      .filter(Boolean)
      .join(' | ');

    await batch.save();

    // Ensure machine remains RUNNING on this batch for rework
    if (batch.machineId) {
      await MachineModel.findByIdAndUpdate(batch.machineId, {
        status: 'RUNNING',
        currentBatchId: batch._id,
      });
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'ProductionBatch',
        entityId: batch._id,
        performedBy: userId,
        newValues: { testStatus: 'TEST_FAILED', reworkCount: newReworkCount, reason: dto.reason },
      });
    }

    return {
      message: `Quality test marked FAILED. Work restarted on the SAME machine (${batch.machineCode}). Operator can adjust settings and re-test.`,
      batch,
      reworkCount: newReworkCount,
      machineCode: batch.machineCode,
    };
  }

  async reverseBatchWork(
    batchId: string,
    dto: {
      reason: string;
      testReportNumber?: string;
      failedMeasurements?: Record<string, unknown>;
      returnUnusedWipToStore?: boolean;
      storeWarehouseId?: string;
      wipWarehouseId?: string;
      remarks?: string;
    },
    userId?: string,
  ) {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    if (batch.status === 'REJECTED') {
      throw new BadRequestError('Production batch is already REJECTED / reversed');
    }

    batch.status = 'REJECTED';
    batch.remarks = [batch.remarks, `[REVERSED]: ${dto.reason}`].filter(Boolean).join(' | ');
    await batch.save();

    if (batch.machineId) {
      await MachineModel.findByIdAndUpdate(batch.machineId, {
        status: 'AVAILABLE',
        currentBatchId: null,
      });
    }

    await ProductionOutputModel.updateMany(
      { productionBatchId: batch._id, status: 'DRAFT' },
      {
        qualityStatus: 'REJECTED',
        remarks: `Work reversed from failed machine. Reason: ${dto.reason}`,
        testReportNumber: dto.testReportNumber,
      },
    );

    const returnedMaterials: Array<{ materialId: string; returnQuantity: number; returnNumber: string }> = [];

    if (dto.returnUnusedWipToStore && dto.storeWarehouseId && dto.wipWarehouseId && batch.workOrderId) {
      const postedIssues = await MaterialIssueModel.find({
        workOrderId: batch.workOrderId,
        status: 'ISSUED',
      }).select('_id');
      const issueIds = postedIssues.map((i) => i._id);

      const lines = await MaterialIssueLineModel.find({ materialIssueId: { $in: issueIds } });
      const uniqueMaterials = new Map<string, { materialId: string; lotId?: string; ownerType: StockOwnerType; customerId?: string }>();

      for (const line of lines) {
        const key = `${line.materialId.toString()}_${line.lotId ? line.lotId.toString() : 'nolot'}`;
        if (!uniqueMaterials.has(key)) {
          uniqueMaterials.set(key, {
            materialId: line.materialId.toString(),
            lotId: line.lotId ? line.lotId.toString() : undefined,
            ownerType: line.ownerType as StockOwnerType,
            customerId: line.customerId ? line.customerId.toString() : undefined,
          });
        }
      }

      for (const item of uniqueMaterials.values()) {
        const remainingWip = await this.getRemainingWip({
          workOrderId: batch.workOrderId,
          materialId: item.materialId,
          lotId: item.lotId,
        });

        if (remainingWip > 0) {
          const ret = await this.recordMaterialReturn(
            batchId,
            {
              materialId: item.materialId,
              lotId: item.lotId,
              ownerType: item.ownerType,
              customerId: item.customerId,
              sourceWarehouseId: dto.wipWarehouseId,
              destinationWarehouseId: dto.storeWarehouseId,
              returnQuantity: remainingWip,
              unit: 'KG',
              reason: `Returned to store after work reversal at machine ${batch.machineCode}: ${dto.reason}`,
            },
            userId,
          );
          returnedMaterials.push({
            materialId: item.materialId,
            returnQuantity: remainingWip,
            returnNumber: ret.returnNumber,
          });
        }
      }
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'ProductionBatch',
        entityId: batch._id,
        performedBy: userId,
        newValues: {
          status: 'REJECTED',
          reversalReason: dto.reason,
          testReportNumber: dto.testReportNumber,
          returnedMaterialsCount: returnedMaterials.length,
        },
      });
    }

    return {
      message: `Production batch '${batch.batchNumber}' work successfully reversed from machine '${batch.machineCode}'`,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      machineReleased: !!batch.machineId,
      returnedMaterials,
    };
  }

  // ==========================================
  // 3. MATERIAL ISSUE TO PRODUCTION
  // ==========================================

  async createMaterialIssue(
    productionOrderId: string,
    dto: {
      sourceWarehouseId: string;
      destinationWarehouseId: string;
      processStageId?: string;
      remarks?: string;
      lines: Array<{
        materialId: string;
        lotId?: string;
        ownerType: StockOwnerType;
        customerId?: string;
        issuedQuantity: number;
        unit: string;
        remarks?: string;
      }>;
    },
    userId?: string,
  ): Promise<IMaterialIssue> {
    const order = await ProductionOrderModel.findById(productionOrderId);
    if (!order) throw new NotFoundError('Production order not found');

    const sourceWarehouse = await WarehouseModel.findById(dto.sourceWarehouseId);
    if (!sourceWarehouse || !sourceWarehouse.isActive) {
      throw new BadRequestError('Source warehouse not found or is inactive');
    }

    const destWarehouse = await WarehouseModel.findById(dto.destinationWarehouseId);
    if (!destWarehouse || !destWarehouse.isActive) {
      throw new BadRequestError('Destination warehouse not found or is inactive');
    }

    if (sourceWarehouse._id.toString() === destWarehouse._id.toString()) {
      throw new BadRequestError('Destination warehouse must be different from source warehouse');
    }

    const issueNumber = await InventorySequenceUtil.getNextSequence('ISSUE', 'ISS');

    const issue = await MaterialIssueModel.create({
      issueNumber,
      productionOrderId: order._id,
      workOrderId: order.workOrderId,
      processStageId: dto.processStageId
        ? new mongoose.Types.ObjectId(dto.processStageId)
        : undefined,
      sourceWarehouseId: sourceWarehouse._id,
      destinationWarehouseId: destWarehouse._id,
      issuedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      status: 'DRAFT',
      issueDate: new Date(),
      remarks: dto.remarks,
    });

    const lines = dto.lines.map((l) => ({
      materialIssueId: issue._id,
      materialId: new mongoose.Types.ObjectId(l.materialId),
      lotId: l.lotId ? new mongoose.Types.ObjectId(l.lotId) : undefined,
      ownerType: l.ownerType,
      customerId: l.customerId ? new mongoose.Types.ObjectId(l.customerId) : undefined,
      issuedQuantity: l.issuedQuantity,
      unit: l.unit,
      remarks: l.remarks,
    }));

    await MaterialIssueLineModel.insertMany(lines);
    return issue;
  }

  async listMaterialIssues(filter: {
    page: number;
    limit: number;
    productionOrderId?: string;
    workOrderId?: string;
    status?: string;
  }) {
    const query: Record<string, unknown> = {};
    if (filter.productionOrderId)
      query.productionOrderId = new mongoose.Types.ObjectId(filter.productionOrderId);
    if (filter.workOrderId) query.workOrderId = new mongoose.Types.ObjectId(filter.workOrderId);
    if (filter.status) query.status = filter.status;

    const skip = (filter.page - 1) * filter.limit;
    const [issues, total] = await Promise.all([
      MaterialIssueModel.find(query)
        .populate('sourceWarehouseId', 'code name type')
        .populate('destinationWarehouseId', 'code name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit)
        .lean(),
      MaterialIssueModel.countDocuments(query),
    ]);

    return {
      materialIssues: issues,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  async getMaterialIssueById(id: string) {
    const issue = await MaterialIssueModel.findById(id)
      .populate('sourceWarehouseId')
      .populate('destinationWarehouseId')
      .populate('productionOrderId');

    if (!issue) throw new NotFoundError('Material issue not found');

    const lines = await MaterialIssueLineModel.find({ materialIssueId: issue._id })
      .populate('materialId', 'code name baseUnit')
      .populate('lotId', 'lotNumber supplierHeatNumber');

    return { ...issue.toObject(), lines };
  }

  async postMaterialIssue(id: string, idempotencyKey?: string, userId?: string) {
    const endpoint = `/api/v1/material-issues/${id}/post`;

    if (idempotencyKey) {
      const existingRecord = await InventoryIdempotencyUtil.findRecord(idempotencyKey, endpoint);
      if (existingRecord) {
        return existingRecord.responseBody;
      }
    }

    return await TransactionUtil.runInTransaction(async (session) => {
      const issue = await MaterialIssueModel.findById(id).session(session);
      if (!issue) throw new NotFoundError('Material issue not found');

      if (issue.status === 'ISSUED') {
        throw new ConflictError('Material issue is already POSTED / ISSUED');
      }
      if (issue.status !== 'DRAFT') {
        throw new BadRequestError(`Cannot post material issue with status '${issue.status}'`);
      }

      const lines = await MaterialIssueLineModel.find({ materialIssueId: issue._id }).session(
        session,
      );
      if (!lines.length) throw new BadRequestError('Cannot post an issue with no line items');

      for (const line of lines) {
        // 1. Decrease stock at store warehouse
        await inventoryBalanceService.decreaseStock({
          materialId: line.materialId,
          warehouseId: issue.sourceWarehouseId,
          ownerType: line.ownerType,
          customerId: line.customerId,
          lotId: line.lotId,
          quantity: line.issuedQuantity,
          unit: line.unit,
          session,
        });

        // 2. Increase stock at destination WIP warehouse
        await inventoryBalanceService.increaseStock({
          materialId: line.materialId,
          warehouseId: issue.destinationWarehouseId!,
          ownerType: line.ownerType,
          customerId: line.customerId,
          lotId: line.lotId,
          quantity: line.issuedQuantity,
          unit: line.unit,
          session,
        });

        // 3. Create outbound ledger movement (ISSUE_TO_PRODUCTION)
        const txnOutNumber = await InventorySequenceUtil.getNextSequence(
          'INVENTORY_TRANSACTION',
          'TXN',
          session,
        );
        const txn = await InventoryTransactionModel.create(
          [
            {
              transactionNumber: txnOutNumber,
              movementType: 'TRANSFER',
              transactionType: 'ISSUE_TO_PRODUCTION',
              materialId: line.materialId,
              warehouseId: issue.sourceWarehouseId,
              lotId: line.lotId || null,
              ownerType: line.ownerType,
              customerId: line.customerId || null,
              quantity: line.issuedQuantity,
              unit: line.unit,
              status: 'POSTED',
              sourceDocumentType: 'MATERIAL_ISSUE',
              sourceDocumentId: issue._id,
              sourceDocumentLineId: line._id,
              postedAt: new Date(),
              postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              remarks: `Issued from Store to WIP for Production Order`,
            },
          ],
          { session },
        );

        line.inventoryTransactionId = txn[0]._id;
        await line.save({ session });
      }

      issue.status = 'ISSUED';
      issue.postedAt = new Date();
      if (userId) issue.postedBy = new mongoose.Types.ObjectId(userId);
      await issue.save({ session });

      // Mark work order IN_PROGRESS if not already
      if (issue.workOrderId) {
        await WorkOrderModel.findByIdAndUpdate(
          issue.workOrderId,
          { status: 'IN_PROGRESS' },
          { session },
        );
      }

      const responseData = {
        message: 'Material issue successfully posted to stock ledger and WIP',
        issueId: issue._id,
        issueNumber: issue.issueNumber,
        status: issue.status,
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
  }

  // ==========================================
  // 4. ACTUAL MATERIAL CONSUMPTION
  // ==========================================

  async recordConsumption(
    batchId: string,
    dto: {
      materialId: string;
      lotId?: string;
      ownerType: StockOwnerType;
      customerId?: string;
      warehouseId: string;
      consumedQuantity: number;
      unit: string;
      remarks?: string;
    },
    userId?: string,
  ): Promise<IMaterialConsumption> {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const remainingWip = await this.getRemainingWip({
      workOrderId: batch.workOrderId!,
      materialId: dto.materialId,
      lotId: dto.lotId,
    });

    if (dto.consumedQuantity > remainingWip) {
      throw new BadRequestError(
        `Consumption quantity (${dto.consumedQuantity} ${dto.unit}) exceeds remaining eligible material in WIP (${remainingWip} ${dto.unit}).`,
      );
    }

    return await TransactionUtil.runInTransaction(async (session) => {
      // 1. Decrease stock from WIP warehouse
      await inventoryBalanceService.decreaseStock({
        materialId: dto.materialId,
        warehouseId: dto.warehouseId,
        ownerType: dto.ownerType,
        customerId: dto.customerId,
        lotId: dto.lotId,
        quantity: dto.consumedQuantity,
        unit: dto.unit,
        session,
      });

      // 2. Create consumption record
      const consumptionNumber = await InventorySequenceUtil.getNextSequence(
        'CONSUMPTION',
        'CON',
        session,
      );
      const consumption = await MaterialConsumptionModel.create(
        [
          {
            consumptionNumber,
            productionOrderId: batch.productionOrderId,
            productionBatchId: batch._id,
            workOrderId: batch.workOrderId,
            processStageId: batch.processStageId,
            warehouseId: new mongoose.Types.ObjectId(dto.warehouseId),
            materialId: new mongoose.Types.ObjectId(dto.materialId),
            lotId: dto.lotId ? new mongoose.Types.ObjectId(dto.lotId) : undefined,
            ownerType: dto.ownerType,
            customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : undefined,
            consumedQuantity: dto.consumedQuantity,
            unit: dto.unit,
            status: 'POSTED',
            consumedAt: new Date(),
            postedAt: new Date(),
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            remarks: dto.remarks,
          },
        ],
        { session },
      );

      // 3. Post immutable outward ledger transaction
      const txnNumber = await InventorySequenceUtil.getNextSequence(
        'INVENTORY_TRANSACTION',
        'TXN',
        session,
      );
      const txn = await InventoryTransactionModel.create(
        [
          {
            transactionNumber: txnNumber,
            movementType: 'OUTWARD',
            transactionType: 'CONSUMPTION',
            materialId: new mongoose.Types.ObjectId(dto.materialId),
            warehouseId: new mongoose.Types.ObjectId(dto.warehouseId),
            lotId: dto.lotId ? new mongoose.Types.ObjectId(dto.lotId) : null,
            ownerType: dto.ownerType,
            customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : null,
            quantity: dto.consumedQuantity,
            unit: dto.unit,
            status: 'POSTED',
            sourceDocumentType: 'MATERIAL_CONSUMPTION',
            sourceDocumentId: consumption[0]._id,
            postedAt: new Date(),
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            remarks: `Actual consumption in manufacturing batch ${batch.batchNumber}`,
          },
        ],
        { session },
      );

      consumption[0].inventoryTransactionId = txn[0]._id;
      await consumption[0].save({ session });

      return consumption[0];
    });
  }

  async listConsumptions(batchId: string) {
    return MaterialConsumptionModel.find({ productionBatchId: batchId })
      .populate('materialId', 'code name baseUnit')
      .populate('lotId', 'lotNumber supplierHeatNumber')
      .sort({ createdAt: -1 });
  }

  async recordBatchConsumption(
    batchId: string,
    dto: {
      warehouseId?: string;
      ownerType?: StockOwnerType;
      items: Array<{
        materialId: string;
        lotId?: string;
        ownerType?: StockOwnerType;
        customerId?: string;
        warehouseId?: string;
        consumedQuantity: number;
        unit?: string;
        remarks?: string;
      }>;
      autoCalculateScrap?: boolean;
      scrapWarehouseId?: string;
    },
    userId?: string,
  ) {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const consumptions: IMaterialConsumption[] = [];

    for (const item of dto.items) {
      const warehouseId = item.warehouseId || dto.warehouseId;
      if (!warehouseId) {
        throw new BadRequestError('Warehouse ID is required for material consumption');
      }
      const ownerType = item.ownerType || dto.ownerType || 'FACTORY';

      const consumption = await this.recordConsumption(
        batchId,
        {
          materialId: item.materialId,
          lotId: item.lotId,
          ownerType,
          customerId: item.customerId,
          warehouseId,
          consumedQuantity: item.consumedQuantity,
          unit: item.unit || 'KG',
          remarks: item.remarks,
        },
        userId,
      );
      consumptions.push(consumption);
    }

    let autoGeneratedScrap: IScrapRecord[] = [];
    if (dto.autoCalculateScrap && dto.scrapWarehouseId) {
      autoGeneratedScrap = await this.calculateAndRecordAutoScrap(
        batchId,
        {
          scrapWarehouseId: dto.scrapWarehouseId,
          reason: 'Auto-calculated scrap from bulk consumption using BOM tolerance constants',
        },
        userId,
      );
    }

    return {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      consumptions,
      autoGeneratedScrap,
    };
  }

  // ==========================================
  // 5. UNUSED MATERIAL RETURNS
  // ==========================================

  async recordMaterialReturn(
    batchId: string,
    dto: {
      materialId: string;
      lotId?: string;
      ownerType: StockOwnerType;
      customerId?: string;
      sourceWarehouseId: string;
      destinationWarehouseId: string;
      returnQuantity: number;
      unit: string;
      reason?: string;
    },
    userId?: string,
  ): Promise<IMaterialReturn> {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const remainingWip = await this.getRemainingWip({
      workOrderId: batch.workOrderId!,
      materialId: dto.materialId,
      lotId: dto.lotId,
    });

    if (dto.returnQuantity > remainingWip) {
      throw new BadRequestError(
        `Return quantity (${dto.returnQuantity} ${dto.unit}) exceeds remaining eligible material in WIP (${remainingWip} ${dto.unit}).`,
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Decrease stock in source WIP warehouse
      await inventoryBalanceService.decreaseStock({
        materialId: dto.materialId,
        warehouseId: dto.sourceWarehouseId,
        ownerType: dto.ownerType,
        customerId: dto.customerId,
        lotId: dto.lotId,
        quantity: dto.returnQuantity,
        unit: dto.unit,
        session,
      });

      // 2. Increase stock in destination Store warehouse
      await inventoryBalanceService.increaseStock({
        materialId: dto.materialId,
        warehouseId: dto.destinationWarehouseId,
        ownerType: dto.ownerType,
        customerId: dto.customerId,
        lotId: dto.lotId,
        quantity: dto.returnQuantity,
        unit: dto.unit,
        session,
      });

      // 3. Create MaterialReturn record
      const returnNumber = await InventorySequenceUtil.getNextSequence('RETURN', 'RET', session);
      const returnDoc = await MaterialReturnModel.create(
        [
          {
            returnNumber,
            workOrderId: batch.workOrderId,
            productionOrderId: batch.productionOrderId,
            productionBatchId: batch._id,
            materialId: new mongoose.Types.ObjectId(dto.materialId),
            lotId: dto.lotId ? new mongoose.Types.ObjectId(dto.lotId) : undefined,
            ownerType: dto.ownerType,
            customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : undefined,
            returnQuantity: dto.returnQuantity,
            unit: dto.unit,
            sourceWarehouseId: new mongoose.Types.ObjectId(dto.sourceWarehouseId),
            destinationWarehouseId: new mongoose.Types.ObjectId(dto.destinationWarehouseId),
            status: 'POSTED',
            reason: dto.reason,
            recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            recordedAt: new Date(),
            postedAt: new Date(),
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          },
        ],
        { session },
      );

      // 4. Create RETURN_TO_STORE ledger entry
      const txnNumber = await InventorySequenceUtil.getNextSequence(
        'INVENTORY_TRANSACTION',
        'TXN',
        session,
      );
      const txn = await InventoryTransactionModel.create(
        [
          {
            transactionNumber: txnNumber,
            movementType: 'TRANSFER',
            transactionType: 'RETURN_TO_STORE',
            materialId: new mongoose.Types.ObjectId(dto.materialId),
            warehouseId: new mongoose.Types.ObjectId(dto.destinationWarehouseId),
            lotId: dto.lotId ? new mongoose.Types.ObjectId(dto.lotId) : null,
            ownerType: dto.ownerType,
            customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : null,
            quantity: dto.returnQuantity,
            unit: dto.unit,
            status: 'POSTED',
            sourceDocumentType: 'MATERIAL_RETURN',
            sourceDocumentId: returnDoc[0]._id,
            postedAt: new Date(),
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            remarks: `Unused material returned from production batch ${batch.batchNumber} to store`,
          },
        ],
        { session },
      );

      returnDoc[0].inventoryTransactionId = txn[0]._id;
      await returnDoc[0].save({ session });

      await session.commitTransaction();
      return returnDoc[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async listMaterialReturns(batchId: string) {
    return MaterialReturnModel.find({ productionBatchId: batchId })
      .populate('materialId', 'code name baseUnit')
      .populate('sourceWarehouseId', 'code name')
      .populate('destinationWarehouseId', 'code name')
      .sort({ createdAt: -1 });
  }

  // ==========================================
  // 6. PRODUCTION OUTPUT
  // ==========================================

  async createProductionOutput(
    batchId: string,
    dto: {
      outputLengthMeters: number;
      outputWeightKg: number;
      targetWarehouseId: string;
      isFinalStage?: boolean;
      drumId?: string;
      qualityStatus?: 'PASSED' | 'PENDING' | 'REJECTED';
      testReportNumber?: string;
      remarks?: string;
    },
    userId?: string,
  ): Promise<IProductionOutput> {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const order = await ProductionOrderModel.findById(batch.productionOrderId);
    if (!order) throw new NotFoundError('Production order not found');

    const warehouse = await WarehouseModel.findById(dto.targetWarehouseId);
    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestError('Target warehouse not found or is inactive');
    }

    const outputNumber = await InventorySequenceUtil.getNextSequence('OUTPUT', 'OUT');

    const output = await ProductionOutputModel.create({
      outputNumber,
      productionOrderId: order._id,
      productionBatchId: batch._id,
      workOrderId: order.workOrderId,
      productId: order.productId,
      processStageId: batch.processStageId,
      outputLengthMeters: dto.outputLengthMeters,
      outputWeightKg: dto.outputWeightKg,
      targetWarehouseId: warehouse._id,
      isFinalStage: dto.isFinalStage ?? false,
      drumId: dto.drumId ? new mongoose.Types.ObjectId(dto.drumId) : undefined,
      qualityStatus: dto.qualityStatus || 'PASSED',
      status: 'DRAFT',
      testReportNumber: dto.testReportNumber,
      testedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      remarks: dto.remarks,
    });

    return output;
  }

  async listProductionOutputs(batchId: string) {
    return ProductionOutputModel.find({ productionBatchId: batchId })
      .populate('targetWarehouseId', 'code name type')
      .populate('drumId', 'drumNumber')
      .sort({ createdAt: -1 });
  }

  async getProductionOutputById(id: string) {
    const output = await ProductionOutputModel.findById(id)
      .populate('productionOrderId')
      .populate('productionBatchId')
      .populate('targetWarehouseId')
      .populate('drumId');

    if (!output) throw new NotFoundError('Production output not found');
    return output;
  }

  async postProductionOutput(id: string, userId?: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const output = await ProductionOutputModel.findById(id).session(session);
      if (!output) throw new NotFoundError('Production output not found');

      if (output.status === 'POSTED') {
        throw new ConflictError('Production output is already POSTED');
      }

      // If passed and final stage, update produced length on batch and work order
      if (output.qualityStatus === 'PASSED' && output.isFinalStage) {
        await WorkOrderModel.findByIdAndUpdate(
          output.workOrderId,
          { $inc: { deliveredLengthMeters: output.outputLengthMeters } },
          { session },
        );

        await ProductionOrderModel.findByIdAndUpdate(
          output.productionOrderId,
          { $inc: { producedLengthMeters: output.outputLengthMeters } },
          { session },
        );

        await ProductionBatchModel.findByIdAndUpdate(
          output.productionBatchId,
          { $inc: { completedQuantity: output.outputLengthMeters } },
          { session },
        );
      }

      // If passed and assigned to a drum, update drum details and log packing movement
      if (output.qualityStatus === 'PASSED' && output.drumId) {
        const drum = await DrumModel.findById(output.drumId).session(session);
        if (drum) {
          const grossWeight = Number((drum.tareWeightKg + output.outputWeightKg).toFixed(4));
          drum.cableLengthMeters = output.outputLengthMeters;
          drum.netWeightKg = output.outputWeightKg;
          drum.grossWeightKg = grossWeight;
          drum.status = 'FILLED';
          drum.currentWarehouseId = output.targetWarehouseId;
          drum.currentProductId = output.productId;
          drum.workOrderId = output.workOrderId;
          drum.productionOrderId = output.productionOrderId;
          drum.productionBatchId = output.productionBatchId;
          drum.productionOutputId = output._id;
          await drum.save({ session });

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
                movementType: 'PACKING',
                toWarehouseId: output.targetWarehouseId,
                referenceDocumentType: 'ProductionOutput',
                referenceDocumentId: output._id,
                movedAt: new Date(),
                recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                remarks: `Packaged cable output (${output.outputLengthMeters}m) into drum ${drum.drumNumber}`,
              },
            ],
            { session },
          );
        }
      }

      output.status = 'POSTED';
      output.postedAt = new Date();
      if (userId) output.postedBy = new mongoose.Types.ObjectId(userId);
      await output.save({ session });

      await session.commitTransaction();
      return {
        message: 'Production output posted successfully',
        outputId: output._id,
        outputNumber: output.outputNumber,
        status: output.status,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ==========================================
  // 7. SCRAP, PROCESS LOSS, & REUSABLE MATERIAL
  // ==========================================

  async recordScrap(
    batchId: string,
    dto: {
      materialId: string;
      lotId?: string;
      ownerType: StockOwnerType;
      customerId?: string;
      scrapType: string;
      scrapCategory: 'REUSABLE' | 'SALEABLE' | 'PROCESS_LOSS' | 'REJECTED';
      scrapQuantity: number;
      unit?: string;
      sourceWarehouseId: string;
      scrapWarehouseId: string;
      reason?: string;
    },
    userId?: string,
  ): Promise<IScrapRecord> {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const remainingWip = await this.getRemainingWip({
      workOrderId: batch.workOrderId!,
      materialId: dto.materialId,
      lotId: dto.lotId,
    });

    if (dto.scrapQuantity > remainingWip) {
      throw new BadRequestError(
        `Scrap quantity (${dto.scrapQuantity} ${dto.unit || 'KG'}) exceeds remaining eligible material in WIP (${remainingWip} ${dto.unit || 'KG'}).`,
      );
    }

    return await TransactionUtil.runInTransaction(async (session) => {
      // 1. Decrease from WIP warehouse
      await inventoryBalanceService.decreaseStock({
        materialId: dto.materialId,
        warehouseId: dto.sourceWarehouseId,
        ownerType: dto.ownerType,
        customerId: dto.customerId,
        lotId: dto.lotId,
        quantity: dto.scrapQuantity,
        unit: dto.unit || 'KG',
        session,
      });

      // 2. If reusable or saleable, add to scrap warehouse
      if (dto.scrapCategory === 'REUSABLE' || dto.scrapCategory === 'SALEABLE') {
        await inventoryBalanceService.increaseStock({
          materialId: dto.materialId,
          warehouseId: dto.scrapWarehouseId,
          ownerType: dto.ownerType,
          customerId: dto.customerId,
          lotId: dto.lotId,
          quantity: dto.scrapQuantity,
          unit: dto.unit || 'KG',
          session,
        });
      }

      // 3. Create ScrapRecord
      const scrapNumber = await InventorySequenceUtil.getNextSequence('SCRAP', 'SCR', session);
      const scrap = await ScrapRecordModel.create(
        [
          {
            scrapNumber,
            productionOrderId: batch.productionOrderId,
            productionBatchId: batch._id,
            workOrderId: batch.workOrderId,
            processStageId: batch.processStageId,
            materialId: new mongoose.Types.ObjectId(dto.materialId),
            lotId: dto.lotId ? new mongoose.Types.ObjectId(dto.lotId) : undefined,
            ownerType: dto.ownerType,
            customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : undefined,
            scrapType: dto.scrapType,
            scrapCategory: dto.scrapCategory,
            scrapQuantity: dto.scrapQuantity,
            unit: dto.unit || 'KG',
            sourceWarehouseId: new mongoose.Types.ObjectId(dto.sourceWarehouseId),
            scrapWarehouseId: new mongoose.Types.ObjectId(dto.scrapWarehouseId),
            status: 'POSTED',
            reason: dto.reason,
            recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            recordedAt: new Date(),
            postedAt: new Date(),
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          },
        ],
        { session },
      );

      // 4. Create SCRAP transaction
      const txnNumber = await InventorySequenceUtil.getNextSequence(
        'INVENTORY_TRANSACTION',
        'TXN',
        session,
      );
      const txn = await InventoryTransactionModel.create(
        [
          {
            transactionNumber: txnNumber,
            movementType: 'OUTWARD',
            transactionType: 'SCRAP',
            materialId: new mongoose.Types.ObjectId(dto.materialId),
            warehouseId: new mongoose.Types.ObjectId(dto.sourceWarehouseId),
            lotId: dto.lotId ? new mongoose.Types.ObjectId(dto.lotId) : null,
            ownerType: dto.ownerType,
            customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : null,
            quantity: dto.scrapQuantity,
            unit: dto.unit || 'KG',
            status: 'POSTED',
            sourceDocumentType: 'SCRAP_RECORD',
            sourceDocumentId: scrap[0]._id,
            postedAt: new Date(),
            postedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            remarks: `Scrap recorded (${dto.scrapCategory}): ${dto.scrapType} from batch ${batch.batchNumber}`,
          },
        ],
        { session },
      );

      scrap[0].inventoryTransactionId = txn[0]._id;
      await scrap[0].save({ session });

      return scrap[0];
    });
  }

  async listScrapRecords(batchId: string) {
    return ScrapRecordModel.find({ productionBatchId: batchId })
      .populate('materialId', 'code name baseUnit')
      .populate('scrapWarehouseId', 'code name')
      .sort({ createdAt: -1 });
  }

  async calculateAndRecordAutoScrap(
    batchId: string,
    dto: {
      scrapWarehouseId: string;
      sourceWarehouseId?: string;
      reason?: string;
    },
    userId?: string,
  ): Promise<IScrapRecord[]> {
    const batch = await ProductionBatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Production batch not found');

    const order = await ProductionOrderModel.findById(batch.productionOrderId);
    if (!order) throw new NotFoundError('Production order not found');

    const consumptions = await MaterialConsumptionModel.find({
      productionBatchId: batch._id,
      status: 'POSTED',
    });

    if (!consumptions.length) {
      throw new BadRequestError(
        'No posted material consumptions found for this batch to calculate scrap',
      );
    }

    const existingScraps = await ScrapRecordModel.find({
      productionBatchId: batch._id,
      status: 'POSTED',
    });
    const scrappedMaterialIds = new Set(existingScraps.map((s) => s.materialId.toString()));

    const scrapRecords: IScrapRecord[] = [];

    for (const c of consumptions) {
      if (scrappedMaterialIds.has(c.materialId.toString())) {
        continue;
      }

      const bomItem = await BomItemModel.findOne({
        bomVersionId: order.bomVersionId,
        materialId: c.materialId,
      });

      const scrapTolerance = bomItem?.scrapTolerancePercentage ?? 0;
      if (scrapTolerance <= 0) continue;

      const calculatedScrapQty = Number(
        ((c.consumedQuantity * scrapTolerance) / 100).toFixed(4),
      );
      if (calculatedScrapQty <= 0) continue;

      const sourceWarehouseId = dto.sourceWarehouseId || c.warehouseId?.toString() || '';

      const remainingWip = await this.getRemainingWip({
        workOrderId: batch.workOrderId!,
        materialId: c.materialId,
        lotId: c.lotId ? c.lotId.toString() : undefined,
      });

      const actualScrapQty = Math.min(calculatedScrapQty, remainingWip);
      if (actualScrapQty <= 0) continue;

      const scrap = await this.recordScrap(
        batchId,
        {
          materialId: c.materialId.toString(),
          lotId: c.lotId ? c.lotId.toString() : undefined,
          ownerType: c.ownerType as StockOwnerType,
          customerId: c.customerId ? c.customerId.toString() : undefined,
          scrapType: 'PROCESS_LOSS',
          scrapCategory: 'SALEABLE',
          scrapQuantity: actualScrapQty,
          unit: c.unit,
          sourceWarehouseId,
          scrapWarehouseId: dto.scrapWarehouseId,
          reason:
            dto.reason ||
            `Auto-calculated scrap based on BOM constant (${scrapTolerance}%)`,
        },
        userId,
      );

      scrapRecords.push(scrap);
      scrappedMaterialIds.add(c.materialId.toString());
    }

    return scrapRecords;
  }

  // ==========================================
  // 8. CUSTOMER-WISE & ORDER-WISE MATERIAL RECONCILIATION
  // ==========================================

  async getCustomerMaterialReconciliation(
    customerId: string,
    options?: { startDate?: string; endDate?: string; materialId?: string },
  ) {
    const customer = await CustomerModel.findById(customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    const customerObjId = customer._id;
    const materialMatch: Record<string, unknown> = {};
    if (options?.materialId) {
      materialMatch._id = new mongoose.Types.ObjectId(options.materialId);
    }

    const materials = await MaterialModel.find(materialMatch);
    const dateQuery: Record<string, unknown> = {};
    if (options?.startDate || options?.endDate) {
      dateQuery.postedAt = {};
      if (options.startDate)
        (dateQuery.postedAt as Record<string, unknown>).$gte = new Date(options.startDate);
      if (options.endDate)
        (dateQuery.postedAt as Record<string, unknown>).$lte = new Date(options.endDate);
    }

    const report = await Promise.all(
      materials.map(async (mat) => {
        const matId = mat._id;

        // 1. Receipts (grouped by Inbound Challan and line)
        const receipts = await InventoryTransactionModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
          transactionType: 'RECEIPT',
          ...dateQuery,
        }).populate('sourceDocumentId');

        const totalReceived = receipts.reduce((sum, r) => sum + r.quantity, 0);

        // Challan breakdown
        const challanBreakdown = receipts.map((r) => ({
          transactionNumber: r.transactionNumber,
          quantity: r.quantity,
          unit: r.unit,
          lotId: r.lotId,
          sourceDocumentId: r.sourceDocumentId,
          postedAt: r.postedAt,
        }));

        // 2. Opening balance
        const openingTransactions = await InventoryTransactionModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
          transactionType: 'OPENING_BALANCE',
        });
        const openingQuantity = openingTransactions.reduce((sum, o) => sum + o.quantity, 0);

        // 3. Issues to production
        const issues = await InventoryTransactionModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
          transactionType: 'ISSUE_TO_PRODUCTION',
          ...dateQuery,
        });
        const totalIssued = issues.reduce((sum, i) => sum + i.quantity, 0);

        // 4. Actual consumption
        const consumptions = await InventoryTransactionModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
          transactionType: 'CONSUMPTION',
          ...dateQuery,
        });
        const totalConsumed = consumptions.reduce((sum, c) => sum + c.quantity, 0);

        // 5. Returns
        const returns = await InventoryTransactionModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
          transactionType: 'RETURN_TO_STORE',
          ...dateQuery,
        });
        const totalReturned = returns.reduce((sum, ret) => sum + ret.quantity, 0);

        // 6. Scrap breakdown
        const scrapRecords = await ScrapRecordModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
          status: 'POSTED',
        });

        const reusableScrap = scrapRecords
          .filter((s) => s.scrapCategory === 'REUSABLE')
          .reduce((sum, s) => sum + s.scrapQuantity, 0);

        const saleableScrap = scrapRecords
          .filter((s) => s.scrapCategory === 'SALEABLE')
          .reduce((sum, s) => sum + s.scrapQuantity, 0);

        const processLoss = scrapRecords
          .filter((s) => s.scrapCategory === 'PROCESS_LOSS' || s.scrapCategory === 'REJECTED')
          .reduce((sum, s) => sum + s.scrapQuantity, 0);

        // 7. Current Store Balances vs WIP Balances
        const allBalances = await InventoryBalanceModel.find({
          materialId: matId,
          ownerType: 'CUSTOMER',
          customerId: customerObjId,
        }).populate('warehouseId', 'code name type');

        let closingStoreQuantity = 0;
        let closingWipQuantity = 0;
        let totalReserved = 0;
        let totalAvailable = 0;

        for (const bal of allBalances) {
          const wh = bal.warehouseId as unknown as { type: string };
          if (wh?.type === 'WORK_IN_PROGRESS' || wh?.type === 'WIP') {
            closingWipQuantity += bal.quantityOnHand;
          } else {
            closingStoreQuantity += bal.quantityOnHand;
          }
          totalReserved += bal.quantityReserved;
          totalAvailable += bal.quantityAvailable;
        }

        return {
          materialId: mat._id,
          materialCode: mat.code,
          materialName: mat.name,
          unit: mat.baseUnit,
          openingQuantity: Number(openingQuantity.toFixed(4)),
          receivedQuantity: Number(totalReceived.toFixed(4)),
          issuedToProductionQuantity: Number(totalIssued.toFixed(4)),
          actualConsumedQuantity: Number(totalConsumed.toFixed(4)),
          returnedToStoreQuantity: Number(totalReturned.toFixed(4)),
          reusableScrapQuantity: Number(reusableScrap.toFixed(4)),
          saleableScrapQuantity: Number(saleableScrap.toFixed(4)),
          processLossQuantity: Number(processLoss.toFixed(4)),
          closingStoreQuantity: Number(closingStoreQuantity.toFixed(4)),
          closingWipQuantity: Number(closingWipQuantity.toFixed(4)),
          reservedQuantity: Number(totalReserved.toFixed(4)),
          availableQuantity: Number(totalAvailable.toFixed(4)),
          receiptsTraceability: challanBreakdown,
        };
      }),
    );

    // Filter out materials with zero movements and zero balances for clean reporting
    const activeReport = report.filter(
      (r) =>
        r.openingQuantity > 0 ||
        r.receivedQuantity > 0 ||
        r.issuedToProductionQuantity > 0 ||
        r.closingStoreQuantity > 0 ||
        r.closingWipQuantity > 0,
    );

    return {
      customerId: customer._id,
      customerCode: customer.code,
      customerName: customer.name,
      reconciliationDate: new Date(),
      materials: activeReport,
    };
  }

  async getWorkOrderMaterialReconciliation(workOrderId: string) {
    const workOrder = await WorkOrderModel.findById(workOrderId)
      .populate('customerId', 'code name')
      .populate('productId', 'code name');

    if (!workOrder) throw new NotFoundError('Work order not found');

    const customerReconciliation = await this.getCustomerMaterialReconciliation(
      workOrder.customerId._id.toString(),
    );

    return {
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      customer: workOrder.customerId,
      product: workOrder.productId,
      reconciliation: customerReconciliation.materials,
    };
  }

  async getProductionBatchMaterialReconciliation(batchId: string) {
    const batch = await ProductionBatchModel.findById(batchId)
      .populate('productionOrderId')
      .populate('processStageId');

    if (!batch) throw new NotFoundError('Production batch not found');

    const [consumptions, returns, scraps] = await Promise.all([
      MaterialConsumptionModel.find({ productionBatchId: batch._id, status: 'POSTED' }).populate(
        'materialId',
        'code name baseUnit',
      ),
      MaterialReturnModel.find({ productionBatchId: batch._id, status: 'POSTED' }).populate(
        'materialId',
        'code name baseUnit',
      ),
      ScrapRecordModel.find({ productionBatchId: batch._id, status: 'POSTED' }).populate(
        'materialId',
        'code name baseUnit',
      ),
    ]);

    return {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      plannedQuantity: batch.plannedQuantity,
      completedQuantity: batch.completedQuantity,
      consumptions,
      returns,
      scraps,
    };
  }
}

export const productionService = new ProductionService();
