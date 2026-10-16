import mongoose from 'mongoose';
import { DrumModel, IDrum, DrumType, DrumStatus, DrumOwnership } from './drum.model';
import { DrumMovementModel, IDrumMovement } from './drum-movement.model';
import { PackingListModel, IPackingList } from './packing-list.model';
import { PackingListLineModel } from './packing-list-line.model';
import { CustomerModel } from '../customers/customer.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { ProductModel } from '../products/product.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { ProductionOutputModel } from '../production/production-output.model';
import { InventorySequenceUtil } from '../inventory/inventory-sequence.util';
import { InventoryAuditUtil } from '../inventory/inventory-audit.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';

export interface CreateDrumDto {
  drumNumber?: string;
  drumType?: DrumType;
  serialNumber?: string;
  flangeDiameterMm?: number;
  barrelDiameterMm?: number;
  traverseWidthMm?: number;
  tareWeightKg: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  cableLengthMeters?: number;
  currentProductId?: string;
  workOrderId?: string;
  productionOrderId?: string;
  productionBatchId?: string;
  productionOutputId?: string;
  customerId?: string;
  currentWarehouseId?: string;
  location?: string;
  ownership?: DrumOwnership;
  status?: DrumStatus;
  remarks?: string;
}

export interface UpdateDrumDto {
  drumType?: DrumType;
  serialNumber?: string;
  flangeDiameterMm?: number;
  barrelDiameterMm?: number;
  traverseWidthMm?: number;
  tareWeightKg?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  cableLengthMeters?: number;
  currentProductId?: string;
  workOrderId?: string;
  customerId?: string;
  currentWarehouseId?: string;
  location?: string;
  status?: DrumStatus;
  remarks?: string;
}

export interface CreatePackingListLineDto {
  drumId: string;
  productId?: string;
  lengthMeters?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  conductorResistanceOhmPerKm?: number;
  insulationResistanceMOhmKm?: number;
  highVoltageTestPassed?: boolean;
  remarks?: string;
}

export interface CreatePackingListDto {
  workOrderId: string;
  customerId: string;
  productId?: string;
  packingWarehouseId?: string;
  packingDate?: string | Date;
  remarks?: string;
  lines: CreatePackingListLineDto[];
}

export class PackingService {
  // ==========================================
  // 1. DRUM MANAGEMENT
  // ==========================================

  async createDrum(dto: CreateDrumDto, userId?: string): Promise<IDrum> {
    const drumNumber =
      dto.drumNumber || (await InventorySequenceUtil.getNextSequence('DRUM', 'DRM'));

    const existing = await DrumModel.findOne({ drumNumber });
    if (existing) {
      throw new ConflictError(`Drum with number '${drumNumber}' already exists`);
    }

    if (dto.currentProductId) {
      const product = await ProductModel.findById(dto.currentProductId);
      if (!product) throw new NotFoundError('Product not found');
    }
    if (dto.customerId) {
      const customer = await CustomerModel.findById(dto.customerId);
      if (!customer) throw new NotFoundError('Customer not found');
    }
    if (dto.currentWarehouseId) {
      const warehouse = await WarehouseModel.findById(dto.currentWarehouseId);
      if (!warehouse) throw new NotFoundError('Warehouse not found');
    }

    const tareWeightKg = dto.tareWeightKg;
    const netWeightKg = dto.netWeightKg ?? 0;
    const grossWeightKg = dto.grossWeightKg ?? Number((tareWeightKg + netWeightKg).toFixed(3));
    const cableLengthMeters = dto.cableLengthMeters ?? 0;

    const drum = await DrumModel.create({
      drumNumber,
      drumType: dto.drumType || 'WOODEN',
      serialNumber: dto.serialNumber,
      flangeDiameterMm: dto.flangeDiameterMm,
      barrelDiameterMm: dto.barrelDiameterMm,
      traverseWidthMm: dto.traverseWidthMm,
      tareWeightKg,
      grossWeightKg,
      netWeightKg,
      cableLengthMeters,
      currentProductId: dto.currentProductId
        ? new mongoose.Types.ObjectId(dto.currentProductId)
        : undefined,
      workOrderId: dto.workOrderId ? new mongoose.Types.ObjectId(dto.workOrderId) : undefined,
      productionOrderId: dto.productionOrderId
        ? new mongoose.Types.ObjectId(dto.productionOrderId)
        : undefined,
      productionBatchId: dto.productionBatchId
        ? new mongoose.Types.ObjectId(dto.productionBatchId)
        : undefined,
      productionOutputId: dto.productionOutputId
        ? new mongoose.Types.ObjectId(dto.productionOutputId)
        : undefined,
      customerId: dto.customerId ? new mongoose.Types.ObjectId(dto.customerId) : undefined,
      currentWarehouseId: dto.currentWarehouseId
        ? new mongoose.Types.ObjectId(dto.currentWarehouseId)
        : undefined,
      location: dto.location,
      ownership: dto.ownership || 'FACTORY_OWNED',
      status: dto.status || 'AVAILABLE',
      remarks: dto.remarks,
    });

    // Record creation movement
    const movementNumber = await InventorySequenceUtil.getNextSequence('DRUM_MOVEMENT', 'DM');
    await DrumMovementModel.create({
      movementNumber,
      drumId: drum._id,
      movementType: 'CREATED',
      toWarehouseId: drum.currentWarehouseId,
      referenceDocumentType: dto.productionOutputId ? 'ProductionOutput' : undefined,
      referenceDocumentId: dto.productionOutputId
        ? new mongoose.Types.ObjectId(dto.productionOutputId)
        : undefined,
      movedAt: new Date(),
      recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      remarks: dto.remarks || 'Drum created and registered in inventory',
    });

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'Drum',
        entityId: drum._id,
        performedBy: userId,
        newValues: { drumNumber: drum.drumNumber, status: drum.status },
      });
    }

    return drum;
  }

  async getDrumById(id: string): Promise<IDrum> {
    const drum = await DrumModel.findById(id)
      .populate('currentProductId', 'code name voltageGrade coreCount crossSectionSqMm')
      .populate('customerId', 'code name')
      .populate('workOrderId', 'workOrderNumber status orderedLengthMeters')
      .populate('currentWarehouseId', 'code name type')
      .populate('packingListId', 'packingListNumber status')
      .populate('dispatchId', 'dispatchNumber status');

    if (!drum) throw new NotFoundError(`Drum with ID '${id}' not found`);
    return drum;
  }

  async listDrums(filter: {
    page: number;
    limit: number;
    status?: DrumStatus;
    drumType?: DrumType;
    currentProductId?: string;
    workOrderId?: string;
    customerId?: string;
    currentWarehouseId?: string;
    search?: string;
  }) {
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    if (filter.drumType) query.drumType = filter.drumType;
    if (filter.currentProductId)
      query.currentProductId = new mongoose.Types.ObjectId(filter.currentProductId);
    if (filter.workOrderId) query.workOrderId = new mongoose.Types.ObjectId(filter.workOrderId);
    if (filter.customerId) query.customerId = new mongoose.Types.ObjectId(filter.customerId);
    if (filter.currentWarehouseId)
      query.currentWarehouseId = new mongoose.Types.ObjectId(filter.currentWarehouseId);

    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [{ drumNumber: searchRegex }, { serialNumber: searchRegex }];
    }

    const skip = (filter.page - 1) * filter.limit;
    const [drums, total] = await Promise.all([
      DrumModel.find(query)
        .populate('currentProductId', 'code name')
        .populate('customerId', 'code name')
        .populate('currentWarehouseId', 'code name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit),
      DrumModel.countDocuments(query),
    ]);

    return {
      drums,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  async updateDrum(id: string, dto: UpdateDrumDto, userId?: string): Promise<IDrum> {
    const drum = await DrumModel.findById(id);
    if (!drum) throw new NotFoundError(`Drum with ID '${id}' not found`);

    // Prevent arbitrary content changes if drum is packed or dispatched
    if (drum.status === 'PACKED' || drum.status === 'DISPATCHED') {
      const restrictedFields: (keyof UpdateDrumDto)[] = [
        'cableLengthMeters',
        'currentProductId',
        'tareWeightKg',
        'netWeightKg',
        'grossWeightKg',
        'customerId',
        'workOrderId',
      ];
      for (const f of restrictedFields) {
        if (dto[f] !== undefined && dto[f] !== (drum as unknown as Record<string, unknown>)[f]) {
          throw new BadRequestError(
            `Cannot modify drum contents (${f}) while drum status is '${drum.status}'`,
          );
        }
      }
    }

    if (dto.currentWarehouseId && dto.currentWarehouseId !== drum.currentWarehouseId?.toString()) {
      // Record warehouse transfer movement
      const movementNumber = await InventorySequenceUtil.getNextSequence('DRUM_MOVEMENT', 'DM');
      await DrumMovementModel.create({
        movementNumber,
        drumId: drum._id,
        movementType: 'STORAGE',
        fromWarehouseId: drum.currentWarehouseId,
        toWarehouseId: new mongoose.Types.ObjectId(dto.currentWarehouseId),
        movedAt: new Date(),
        recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        remarks: `Physical relocation to warehouse ${dto.currentWarehouseId}`,
      });
      drum.currentWarehouseId = new mongoose.Types.ObjectId(dto.currentWarehouseId);
    }

    if (dto.status && dto.status !== drum.status) {
      if (dto.status === 'DAMAGED') {
        const movementNumber = await InventorySequenceUtil.getNextSequence('DRUM_MOVEMENT', 'DM');
        await DrumMovementModel.create({
          movementNumber,
          drumId: drum._id,
          movementType: 'DAMAGED',
          fromWarehouseId: drum.currentWarehouseId,
          movedAt: new Date(),
          recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          remarks: dto.remarks || 'Drum marked DAMAGED',
        });
      }
      drum.status = dto.status;
    }

    if (dto.drumType) drum.drumType = dto.drumType;
    if (dto.serialNumber !== undefined) drum.serialNumber = dto.serialNumber;
    if (dto.flangeDiameterMm !== undefined) drum.flangeDiameterMm = dto.flangeDiameterMm;
    if (dto.barrelDiameterMm !== undefined) drum.barrelDiameterMm = dto.barrelDiameterMm;
    if (dto.traverseWidthMm !== undefined) drum.traverseWidthMm = dto.traverseWidthMm;
    if (dto.tareWeightKg !== undefined) drum.tareWeightKg = dto.tareWeightKg;
    if (dto.netWeightKg !== undefined) drum.netWeightKg = dto.netWeightKg;
    if (dto.grossWeightKg !== undefined) drum.grossWeightKg = dto.grossWeightKg;
    if (dto.cableLengthMeters !== undefined) drum.cableLengthMeters = dto.cableLengthMeters;
    if (dto.location !== undefined) drum.location = dto.location;
    if (dto.remarks !== undefined) drum.remarks = dto.remarks;

    await drum.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'Drum',
        entityId: drum._id,
        performedBy: userId,
        newValues: { status: drum.status, location: drum.location },
      });
    }

    return drum;
  }

  async getDrumHistory(id: string): Promise<{ drum: IDrum; movements: IDrumMovement[] }> {
    const drum = await DrumModel.findById(id)
      .populate('currentProductId', 'code name')
      .populate('customerId', 'code name')
      .populate('currentWarehouseId', 'code name type');

    if (!drum) throw new NotFoundError(`Drum with ID '${id}' not found`);

    const movements = await DrumMovementModel.find({ drumId: drum._id })
      .populate('fromWarehouseId', 'code name type')
      .populate('toWarehouseId', 'code name type')
      .populate('recordedBy', 'firstName lastName email')
      .sort({ movedAt: -1, createdAt: -1 });

    return { drum, movements };
  }

  // ==========================================
  // 2. PACKING LIST MANAGEMENT
  // ==========================================

  async createPackingList(dto: CreatePackingListDto, userId?: string): Promise<IPackingList> {
    const customer = await CustomerModel.findById(dto.customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    const workOrder = await WorkOrderModel.findById(dto.workOrderId);
    if (!workOrder) throw new NotFoundError('Work order not found');

    if (workOrder.customerId.toString() !== customer._id.toString()) {
      throw new BadRequestError('Work order does not belong to the selected customer');
    }

    if (workOrder.status === 'CANCELLED' || workOrder.status === 'COMPLETED') {
      throw new BadRequestError(
        `Cannot create packing list for work order with status '${workOrder.status}'`,
      );
    }

    // Finished Goods Availability Check:
    // Total good cable length produced for this work order
    const outputs = await ProductionOutputModel.find({
      workOrderId: workOrder._id,
      status: 'POSTED',
      qualityStatus: 'PASSED',
      isFinalStage: true,
    });
    const totalGoodOutputMeters = outputs.reduce((sum, o) => sum + o.outputLengthMeters, 0);

    // Total already packed in active packing lists
    const existingPackingLists = await PackingListModel.find({
      workOrderId: workOrder._id,
      status: { $in: ['PACKED', 'COMPLETED', 'DISPATCHED'] },
    });
    const alreadyPackedMeters = existingPackingLists.reduce(
      (sum, p) => sum + p.totalLengthMeters,
      0,
    );

    const availableToPackMeters = Math.max(0, totalGoodOutputMeters - alreadyPackedMeters);

    // Validate drum lines
    const drumIds = dto.lines.map((l) => l.drumId);
    const uniqueDrumIds = new Set(drumIds);
    if (uniqueDrumIds.size !== drumIds.length) {
      throw new BadRequestError('Duplicate drums found in packing list items');
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

    const validatedLinesData = [];

    for (const lineDto of dto.lines) {
      const drum = drumMap.get(lineDto.drumId);
      if (!drum) continue;

      if (drum.status === 'PACKED' || drum.status === 'DISPATCHED') {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' is already in status '${drum.status}' and cannot be packed`,
        );
      }
      if (drum.status === 'DAMAGED' || drum.status === 'SCRAPPED' || drum.status === 'CANCELLED') {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' is '${drum.status}' and cannot be packed`,
        );
      }

      if (drum.customerId && drum.customerId.toString() !== customer._id.toString()) {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' belongs to a different customer and cannot be packed for this work order`,
        );
      }

      const lengthMeters = lineDto.lengthMeters ?? drum.cableLengthMeters;
      if (lengthMeters <= 0) {
        throw new BadRequestError(
          `Drum '${drum.drumNumber}' has no cable length recorded. Cannot pack an empty drum.`,
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

      validatedLinesData.push({
        drumId: drum._id,
        productId: new mongoose.Types.ObjectId(productId),
        lengthMeters,
        tareWeightKg,
        netWeightKg,
        grossWeightKg,
        conductorResistanceOhmPerKm: lineDto.conductorResistanceOhmPerKm,
        insulationResistanceMOhmKm: lineDto.insulationResistanceMOhmKm,
        highVoltageTestPassed: lineDto.highVoltageTestPassed ?? true,
        remarks: lineDto.remarks,
      });
    }

    if (calculatedLength > availableToPackMeters) {
      throw new BadRequestError(
        `Requested packing length (${calculatedLength} m) exceeds available finished output (${availableToPackMeters} m). Total output: ${totalGoodOutputMeters} m, already packed: ${alreadyPackedMeters} m.`,
      );
    }

    const packingListNumber = await InventorySequenceUtil.getNextSequence('PACKING_LIST', 'PKL');

    const packingList = await PackingListModel.create({
      packingListNumber,
      workOrderId: workOrder._id,
      customerId: customer._id,
      productId: dto.productId ? new mongoose.Types.ObjectId(dto.productId) : workOrder.productId,
      packingWarehouseId: dto.packingWarehouseId
        ? new mongoose.Types.ObjectId(dto.packingWarehouseId)
        : undefined,
      totalDrums: validatedLinesData.length,
      totalLengthMeters: Number(calculatedLength.toFixed(2)),
      totalTareWeightKg: Number(calculatedTare.toFixed(3)),
      totalNetWeightKg: Number(calculatedNet.toFixed(3)),
      totalGrossWeightKg: Number(calculatedGross.toFixed(3)),
      status: 'DRAFT',
      packingDate: dto.packingDate ? new Date(dto.packingDate) : new Date(),
      remarks: dto.remarks,
    });

    for (const lineData of validatedLinesData) {
      await PackingListLineModel.create({
        packingListId: packingList._id,
        ...lineData,
      });
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'PackingList',
        entityId: packingList._id,
        performedBy: userId,
        newValues: {
          packingListNumber: packingList.packingListNumber,
          totalLengthMeters: packingList.totalLengthMeters,
          status: 'DRAFT',
        },
      });
    }

    return packingList;
  }

  async getPackingListById(id: string) {
    const packingList = await PackingListModel.findById(id)
      .populate('customerId', 'code name')
      .populate('workOrderId', 'workOrderNumber orderedLengthMeters status')
      .populate('productId', 'code name voltageGrade coreCount crossSectionSqMm')
      .populate('packingWarehouseId', 'code name type')
      .populate('packedBy', 'firstName lastName email');

    if (!packingList) throw new NotFoundError(`Packing list with ID '${id}' not found`);

    const lines = await PackingListLineModel.find({ packingListId: packingList._id })
      .populate('drumId', 'drumNumber serialNumber drumType status tareWeightKg grossWeightKg')
      .populate('productId', 'code name');

    return { ...packingList.toObject(), lines };
  }

  async listPackingLists(filter: {
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
      query.packingListNumber = new RegExp(filter.search, 'i');
    }

    const skip = (filter.page - 1) * filter.limit;
    const [packingLists, total] = await Promise.all([
      PackingListModel.find(query)
        .populate('customerId', 'code name')
        .populate('workOrderId', 'workOrderNumber')
        .populate('productId', 'code name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit),
      PackingListModel.countDocuments(query),
    ]);

    return {
      packingLists,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  async updatePackingList(
    id: string,
    dto: {
      packingWarehouseId?: string;
      packingDate?: string | Date;
      remarks?: string;
      lines?: CreatePackingListLineDto[];
    },
    userId?: string,
  ) {
    const packingList = await PackingListModel.findById(id);
    if (!packingList) throw new NotFoundError('Packing list not found');

    if (packingList.status !== 'DRAFT') {
      throw new BadRequestError(`Cannot edit packing list in status '${packingList.status}'`);
    }

    if (dto.packingWarehouseId) {
      packingList.packingWarehouseId = new mongoose.Types.ObjectId(dto.packingWarehouseId);
    }
    if (dto.packingDate) packingList.packingDate = new Date(dto.packingDate);
    if (dto.remarks !== undefined) packingList.remarks = dto.remarks;

    if (dto.lines && dto.lines.length > 0) {
      // Re-validate and recalculate lines
      await PackingListLineModel.deleteMany({ packingListId: packingList._id });

      const drumIds = dto.lines.map((l) => l.drumId);
      const drums = await DrumModel.find({ _id: { $in: drumIds } });
      const drumMap = new Map(drums.map((d) => [d._id.toString(), d]));

      let calculatedLength = 0;
      let calculatedTare = 0;
      let calculatedNet = 0;
      let calculatedGross = 0;

      for (const lineDto of dto.lines) {
        const drum = drumMap.get(lineDto.drumId);
        if (!drum) continue;

        const lengthMeters = lineDto.lengthMeters ?? drum.cableLengthMeters;
        const tareWeightKg = lineDto.tareWeightKg ?? drum.tareWeightKg;
        const netWeightKg = lineDto.netWeightKg ?? drum.netWeightKg;
        const grossWeightKg =
          lineDto.grossWeightKg ??
          drum.grossWeightKg ??
          Number((tareWeightKg + netWeightKg).toFixed(3));

        calculatedLength += lengthMeters;
        calculatedTare += tareWeightKg;
        calculatedNet += netWeightKg;
        calculatedGross += grossWeightKg;

        await PackingListLineModel.create({
          packingListId: packingList._id,
          drumId: drum._id,
          productId: lineDto.productId
            ? new mongoose.Types.ObjectId(lineDto.productId)
            : drum.currentProductId || packingList.productId,
          lengthMeters,
          tareWeightKg,
          netWeightKg,
          grossWeightKg,
          conductorResistanceOhmPerKm: lineDto.conductorResistanceOhmPerKm,
          insulationResistanceMOhmKm: lineDto.insulationResistanceMOhmKm,
          highVoltageTestPassed: lineDto.highVoltageTestPassed ?? true,
          remarks: lineDto.remarks,
        });
      }

      packingList.totalDrums = dto.lines.length;
      packingList.totalLengthMeters = Number(calculatedLength.toFixed(2));
      packingList.totalTareWeightKg = Number(calculatedTare.toFixed(3));
      packingList.totalNetWeightKg = Number(calculatedNet.toFixed(3));
      packingList.totalGrossWeightKg = Number(calculatedGross.toFixed(3));
    }

    await packingList.save();

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'UPDATE',
        entityType: 'PackingList',
        entityId: packingList._id,
        performedBy: userId,
        newValues: { totalLengthMeters: packingList.totalLengthMeters },
      });
    }

    return this.getPackingListById(packingList._id.toString());
  }

  /**
   * Finalize/Post packing list: transitions status to PACKED.
   * Atomically locks drums, sets drum.status = 'PACKED', and records PACKING drum movements.
   * Does NOT count as dispatch and does NOT decrement finished-goods stock.
   */
  async packPackingList(id: string, userId?: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const packingList = await PackingListModel.findById(id).session(session);
      if (!packingList) throw new NotFoundError('Packing list not found');

      if (packingList.status === 'PACKED' || packingList.status === 'COMPLETED') {
        throw new ConflictError('Packing list is already finalized / PACKED');
      }
      if (packingList.status !== 'DRAFT') {
        throw new BadRequestError(`Cannot pack a packing list in status '${packingList.status}'`);
      }

      const lines = await PackingListLineModel.find({ packingListId: packingList._id }).session(
        session,
      );
      if (!lines.length) throw new BadRequestError('Cannot pack an empty packing list');

      // Verify and lock each drum
      for (const line of lines) {
        const drum = await DrumModel.findById(line.drumId).session(session);
        if (!drum) throw new NotFoundError(`Drum '${line.drumId}' not found`);

        if (
          drum.status === 'PACKED' &&
          drum.packingListId?.toString() !== packingList._id.toString()
        ) {
          throw new ConflictError(
            `Drum '${drum.drumNumber}' has already been packed in another packing list`,
          );
        }
        if (drum.status === 'DISPATCHED') {
          throw new ConflictError(`Drum '${drum.drumNumber}' has already been dispatched`);
        }

        drum.status = 'PACKED';
        drum.packingListId = packingList._id;
        drum.workOrderId = packingList.workOrderId;
        drum.customerId = packingList.customerId;
        drum.currentProductId = line.productId;
        drum.cableLengthMeters = line.lengthMeters;
        drum.tareWeightKg = line.tareWeightKg;
        drum.netWeightKg = line.netWeightKg;
        drum.grossWeightKg = line.grossWeightKg;
        if (packingList.packingWarehouseId) {
          drum.currentWarehouseId = packingList.packingWarehouseId;
        }

        await drum.save({ session });

        // Record PACKING drum movement
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
              toWarehouseId: drum.currentWarehouseId,
              referenceDocumentType: 'PackingList',
              referenceDocumentId: packingList._id,
              movedAt: new Date(),
              recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              remarks: `Packed into Packing List ${packingList.packingListNumber}`,
            },
          ],
          { session },
        );
      }

      packingList.status = 'PACKED';
      packingList.packedAt = new Date();
      if (userId) packingList.packedBy = new mongoose.Types.ObjectId(userId);
      await packingList.save({ session });

      await session.commitTransaction();

      if (userId) {
        await InventoryAuditUtil.record({
          action: 'POST',
          entityType: 'PackingList',
          entityId: packingList._id,
          performedBy: userId,
          newValues: { status: 'PACKED', totalLengthMeters: packingList.totalLengthMeters },
        });
      }

      return packingList;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel packing list: releases drums back to AVAILABLE.
   */
  async cancelPackingList(id: string, reason: string, userId?: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const packingList = await PackingListModel.findById(id).session(session);
      if (!packingList) throw new NotFoundError('Packing list not found');

      if (packingList.status === 'DISPATCHED') {
        throw new BadRequestError('Cannot cancel a packing list that has already been DISPATCHED');
      }
      if (packingList.status === 'CANCELLED') {
        throw new BadRequestError('Packing list is already CANCELLED');
      }

      // If it was PACKED, release all drums
      if (packingList.status === 'PACKED' || packingList.status === 'COMPLETED') {
        const lines = await PackingListLineModel.find({ packingListId: packingList._id }).session(
          session,
        );
        for (const line of lines) {
          const drum = await DrumModel.findById(line.drumId).session(session);
          if (drum && drum.packingListId?.toString() === packingList._id.toString()) {
            drum.status = 'AVAILABLE';
            drum.packingListId = undefined;
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
                  movementType: 'UNPACKED',
                  fromWarehouseId: drum.currentWarehouseId,
                  referenceDocumentType: 'PackingList',
                  referenceDocumentId: packingList._id,
                  movedAt: new Date(),
                  recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                  remarks: `Unpacked on Packing List ${packingList.packingListNumber} cancellation: ${reason}`,
                },
              ],
              { session },
            );
          }
        }
      }

      packingList.status = 'CANCELLED';
      packingList.cancelledAt = new Date();
      packingList.cancelReason = reason;
      if (userId) packingList.cancelledBy = new mongoose.Types.ObjectId(userId);
      await packingList.save({ session });

      await session.commitTransaction();

      if (userId) {
        await InventoryAuditUtil.record({
          action: 'CANCEL',
          entityType: 'PackingList',
          entityId: packingList._id,
          performedBy: userId,
          metadata: { reason },
        });
      }

      return packingList;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export const packingService = new PackingService();
