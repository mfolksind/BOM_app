import mongoose from 'mongoose';
import { DrumModel, IDrum, DrumType, DrumStatus, DrumOwnership } from './drum.model';
import { DrumMovementModel, IDrumMovement } from './drum-movement.model';
import { PackingListModel, IPackingList } from './packing-list.model';
import { PackingListLineModel } from './packing-list-line.model';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { OutboundChallanModel, IOutboundChallan } from '../dispatch/outbound-challan.model';
import { CustomerModel } from '../customers/customer.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { ProductModel } from '../products/product.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { ProductionOutputModel } from '../production/production-output.model';
import { InventorySequenceUtil } from '../inventory/inventory-sequence.util';
import { InventoryAuditUtil } from '../inventory/inventory-audit.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';
import { TransactionUtil } from '../../common/utils/transaction.util';

export interface ReceiveCustomerDrumItemDto {
  drumNumber?: string;
  drumSize?: string;
  drumType?: DrumType;
  serialNumber?: string;
  tareWeightKg?: number;
  remarks?: string;
}

export interface ReceiveCustomerDrumsDto {
  customerId: string;
  customerChallanNumber: string; // Ref RGP No, e.g. "262740872"
  customerChallanDate?: string | Date;
  warehouseId?: string;
  vehicleNumber?: string;
  transporter?: string;
  lrNumber?: string;
  remarks?: string;
  drums: ReceiveCustomerDrumItemDto[];
}

export interface CreateDrumDto {
  drumNumber?: string;
  drumType?: DrumType;
  drumSize?: string;
  refRgpNumber?: string;
  inboundChallanId?: string;
  inboundChallanNumber?: string;
  receivedDate?: string | Date;
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
  drumSize?: string;
  refRgpNumber?: string;
  inboundChallanNumber?: string;
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
  sNo?: number;
  drumNumber?: string;
  lengthBottom?: number;
  lengthTop?: number;
  lengthTotal?: number;
  drumSize?: string;
  refRgpNumber?: string;
  refRgpNo?: string;
  drumType?: string;
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
  packingListNumber?: string;
  invoiceNumber?: string;
  challanNumber?: string;
  sizeDescription?: string;
  size?: string;
  workOrderNumber?: string;
  workOrderDate?: string | Date;
  packingWarehouseId?: string;
  packingDate?: string | Date;
  remarks?: string;
  lines: CreatePackingListLineDto[];
}

export interface GenerateChallanDto {
  challanNumber?: string;
  invoiceNumber?: string;
  vehicleNumber?: string;
  transporter?: string;
  lrNumber?: string;
  eWayBillNumber?: string;
  deliveryTerms?: string;
  remarks?: string;
}

export class PackingService {
  // ==========================================
  // 1. DRUM MANAGEMENT & INBOUND RECEIVING
  // ==========================================

  /**
   * Receive customer-supplied empty drums arriving with a delivery challan / Returnable Gate Pass (RGP).
   * Records the Inbound Challan, creates drums in inventory with customer ownership,
   * stores Ref RGP No, and logs INBOUND_RECEIPT drum movements.
   */
  async receiveCustomerDrums(
    dto: ReceiveCustomerDrumsDto,
    userId?: string,
  ): Promise<{ challan: unknown; drums: IDrum[] }> {
    const customer = await CustomerModel.findById(dto.customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    let warehouseId: mongoose.Types.ObjectId;
    if (dto.warehouseId) {
      const warehouse = await WarehouseModel.findById(dto.warehouseId);
      if (!warehouse) throw new NotFoundError('Warehouse not found');
      warehouseId = warehouse._id;
    } else {
      const defaultWh = await WarehouseModel.findOne({ isActive: true });
      if (!defaultWh) throw new NotFoundError('No active warehouse found for drum storage');
      warehouseId = defaultWh._id;
    }

    const challanNumber = await InventorySequenceUtil.getNextSequence('INBOUND_CHALLAN', 'IBC');
    const challanDate = dto.customerChallanDate ? new Date(dto.customerChallanDate) : new Date();

    const inboundChallan = await InboundChallanModel.create({
      challanNumber,
      customerChallanNumber: dto.customerChallanNumber,
      customerChallanDate: challanDate,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      warehouseId,
      vehicleNumber: dto.vehicleNumber,
      transporterName: dto.transporter,
      lrNumber: dto.lrNumber,
      status: 'RECEIVED',
      receivedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      receivedAt: new Date(),
      remarks:
        dto.remarks ||
        `Inbound receipt of customer drums under Challan/RGP ${dto.customerChallanNumber}`,
    });

    const createdDrums: IDrum[] = [];

    for (let i = 0; i < dto.drums.length; i++) {
      const d = dto.drums[i];
      const drumNumber =
        d.drumNumber || (await InventorySequenceUtil.getNextSequence('DRUM', 'DRM'));

      const existing = await DrumModel.findOne({ drumNumber });
      if (existing) {
        throw new ConflictError(`Drum with number '${drumNumber}' already exists`);
      }

      const tareWeightKg = d.tareWeightKg ?? 150;
      const drum = await DrumModel.create({
        drumNumber,
        drumType: d.drumType || 'WOODEN',
        drumSize: d.drumSize || '44X16X24',
        refRgpNumber: dto.customerChallanNumber,
        inboundChallanId: inboundChallan._id,
        inboundChallanNumber: dto.customerChallanNumber,
        receivedDate: challanDate,
        serialNumber: d.serialNumber,
        tareWeightKg,
        grossWeightKg: tareWeightKg,
        netWeightKg: 0,
        cableLengthMeters: 0,
        customerId: customer._id,
        currentWarehouseId: warehouseId,
        ownership: 'CUSTOMER_SUPPLIED',
        status: 'AVAILABLE',
        remarks: d.remarks,
      });

      const movementNumber = await InventorySequenceUtil.getNextSequence('DRUM_MOVEMENT', 'DM');
      await DrumMovementModel.create({
        movementNumber,
        drumId: drum._id,
        movementType: 'INBOUND_RECEIPT',
        toWarehouseId: warehouseId,
        referenceDocumentType: 'InboundChallan',
        referenceDocumentId: inboundChallan._id,
        movedAt: new Date(),
        recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        remarks: `Received from customer ${customer.name} under Challan/RGP ${dto.customerChallanNumber}`,
      });

      createdDrums.push(drum);
    }

    if (userId) {
      await InventoryAuditUtil.record({
        action: 'CREATE',
        entityType: 'InboundChallan',
        entityId: inboundChallan._id,
        performedBy: userId,
        newValues: {
          challanNumber: inboundChallan.challanNumber,
          customerChallanNumber: inboundChallan.customerChallanNumber,
          drumCount: createdDrums.length,
        },
      });
    }

    return { challan: inboundChallan, drums: createdDrums };
  }

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
      drumSize: dto.drumSize,
      refRgpNumber: dto.refRgpNumber,
      inboundChallanId: dto.inboundChallanId
        ? new mongoose.Types.ObjectId(dto.inboundChallanId)
        : undefined,
      inboundChallanNumber: dto.inboundChallanNumber,
      receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
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
    if (dto.drumSize !== undefined) drum.drumSize = dto.drumSize;
    if (dto.refRgpNumber !== undefined) drum.refRgpNumber = dto.refRgpNumber;
    if (dto.inboundChallanNumber !== undefined) drum.inboundChallanNumber = dto.inboundChallanNumber;
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

    const product = await ProductModel.findById(dto.productId || workOrder.productId);
    let sizeDescription = dto.sizeDescription || dto.size;
    if (!sizeDescription) {
      if (product?.coreCount && product?.crossSectionSqMm) {
        sizeDescription = `${product.coreCount}CX${product.crossSectionSqMm} SQMM ${product.code || ''}`.trim();
      } else if (product?.description) {
        sizeDescription = product.description;
      } else if (product?.name) {
        sizeDescription = product.name;
      } else {
        sizeDescription = '4CX35 SQMM A2XFY';
      }
    }

    const validatedLinesData = [];

    for (let i = 0; i < dto.lines.length; i++) {
      const lineDto = dto.lines[i];
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

      const lengthBottom = lineDto.lengthBottom ?? 0;
      const lengthTop = lineDto.lengthTop ?? (lineDto.lengthMeters ?? drum.cableLengthMeters);
      const lengthTotal = lineDto.lengthTotal || (lengthBottom + lengthTop);
      const lengthMeters = lengthTotal > 0 ? lengthTotal : (lineDto.lengthMeters ?? drum.cableLengthMeters);

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

      const lineProductId =
        lineDto.productId || drum.currentProductId?.toString() || workOrder.productId.toString();

      calculatedLength += lengthMeters;
      calculatedTare += tareWeightKg;
      calculatedNet += netWeightKg;
      calculatedGross += grossWeightKg;

      validatedLinesData.push({
        drumId: drum._id,
        productId: new mongoose.Types.ObjectId(lineProductId),
        sNo: lineDto.sNo ?? (i + 1),
        drumNumber: lineDto.drumNumber || drum.drumNumber,
        lengthBottom,
        lengthTop,
        lengthTotal: lengthMeters,
        drumSize: lineDto.drumSize || drum.drumSize || '44X16X24',
        refRgpNumber: lineDto.refRgpNumber || lineDto.refRgpNo || drum.refRgpNumber || 'N/A',
        drumType: lineDto.drumType || drum.drumType || 'WOODEN',
        lengthMeters,
        tareWeightKg,
        netWeightKg,
        grossWeightKg,
        conductorResistanceOhmPerKm: lineDto.conductorResistanceOhmPerKm,
        insulationResistanceMOhmKm: lineDto.insulationResistanceMOhmKm,
        highVoltageTestPassed: lineDto.highVoltageTestPassed ?? true,
        remarks: lineDto.remarks || 'STD.LENGTH',
      });
    }

    if (calculatedLength > availableToPackMeters) {
      throw new BadRequestError(
        `Requested packing length (${calculatedLength} m) exceeds available finished output (${availableToPackMeters} m). Total output: ${totalGoodOutputMeters} m, already packed: ${alreadyPackedMeters} m.`,
      );
    }

    const packingListNumber =
      dto.packingListNumber ||
      (await InventorySequenceUtil.getNextSequence('PACKING_LIST', 'PKL'));

    const packingList = await PackingListModel.create({
      packingListNumber,
      workOrderId: workOrder._id,
      workOrderNumber: dto.workOrderNumber || workOrder.workOrderNumber,
      workOrderDate: dto.workOrderDate ? new Date(dto.workOrderDate) : workOrder.createdAt,
      sizeDescription,
      invoiceNumber: dto.invoiceNumber,
      challanNumber: dto.challanNumber,
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
      .populate('workOrderId', 'workOrderNumber orderedLengthMeters status createdAt')
      .populate('productId', 'code name voltageGrade coreCount crossSectionSqMm description')
      .populate('packingWarehouseId', 'code name type')
      .populate('packedBy', 'firstName lastName email');

    if (!packingList) throw new NotFoundError(`Packing list with ID '${id}' not found`);

    const lines = await PackingListLineModel.find({ packingListId: packingList._id })
      .populate(
        'drumId',
        'drumNumber serialNumber drumType status tareWeightKg grossWeightKg drumSize refRgpNumber',
      )
      .populate('productId', 'code name')
      .sort({ sNo: 1, createdAt: 1 });

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
      invoiceNumber?: string;
      challanNumber?: string;
      sizeDescription?: string;
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
    if (dto.invoiceNumber !== undefined) packingList.invoiceNumber = dto.invoiceNumber;
    if (dto.challanNumber !== undefined) packingList.challanNumber = dto.challanNumber;
    if (dto.sizeDescription !== undefined) packingList.sizeDescription = dto.sizeDescription;
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

      for (let i = 0; i < dto.lines.length; i++) {
        const lineDto = dto.lines[i];
        const drum = drumMap.get(lineDto.drumId);
        if (!drum) continue;

        const lengthBottom = lineDto.lengthBottom ?? 0;
        const lengthTop = lineDto.lengthTop ?? (lineDto.lengthMeters ?? drum.cableLengthMeters);
        const lengthTotal = lineDto.lengthTotal || (lengthBottom + lengthTop);
        const lengthMeters = lengthTotal > 0 ? lengthTotal : (lineDto.lengthMeters ?? drum.cableLengthMeters);

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
          sNo: lineDto.sNo ?? (i + 1),
          drumNumber: lineDto.drumNumber || drum.drumNumber,
          lengthBottom,
          lengthTop,
          lengthTotal: lengthMeters,
          drumSize: lineDto.drumSize || drum.drumSize || '44X16X24',
          refRgpNumber: lineDto.refRgpNumber || lineDto.refRgpNo || drum.refRgpNumber || 'N/A',
          drumType: lineDto.drumType || drum.drumType || 'WOODEN',
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
          remarks: lineDto.remarks || 'STD.LENGTH',
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
    const packingList = await TransactionUtil.runInTransaction(async (session) => {
      const pl = await PackingListModel.findById(id).session(session);
      if (!pl) throw new NotFoundError('Packing list not found');

      if (pl.status === 'PACKED' || pl.status === 'COMPLETED') {
        throw new ConflictError('Packing list is already finalized / PACKED');
      }
      if (pl.status !== 'DRAFT') {
        throw new BadRequestError(`Cannot pack a packing list in status '${pl.status}'`);
      }

      const lines = await PackingListLineModel.find({ packingListId: pl._id }).session(session);
      if (!lines.length) throw new BadRequestError('Cannot pack an empty packing list');

      // Verify and lock each drum
      for (const line of lines) {
        const drum = await DrumModel.findById(line.drumId).session(session);
        if (!drum) throw new NotFoundError(`Drum '${line.drumId}' not found`);

        if (
          drum.status === 'PACKED' &&
          drum.packingListId?.toString() !== pl._id.toString()
        ) {
          throw new ConflictError(
            `Drum '${drum.drumNumber}' has already been packed in another packing list`,
          );
        }
        if (drum.status === 'DISPATCHED') {
          throw new ConflictError(`Drum '${drum.drumNumber}' has already been dispatched`);
        }

        drum.status = 'PACKED';
        drum.packingListId = pl._id;
        drum.workOrderId = pl.workOrderId;
        drum.customerId = pl.customerId;
        drum.currentProductId = line.productId;
        drum.cableLengthMeters = line.lengthMeters;
        drum.tareWeightKg = line.tareWeightKg;
        drum.netWeightKg = line.netWeightKg;
        drum.grossWeightKg = line.grossWeightKg;
        if (pl.packingWarehouseId) {
          drum.currentWarehouseId = pl.packingWarehouseId;
        }

        await drum.save({ session });

        // Record PACKING drum movement
        const movementNumber = await InventorySequenceUtil.getNextSequence(
          'DRUM_MOVEMENT',
          'DM',
        );
        await DrumMovementModel.create(
          [
            {
              movementNumber,
              drumId: drum._id,
              movementType: 'PACKING',
              toWarehouseId: drum.currentWarehouseId,
              referenceDocumentType: 'PackingList',
              referenceDocumentId: pl._id,
              movedAt: new Date(),
              recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              remarks: `Packed into Packing List ${pl.packingListNumber}`,
            },
          ],
          { session },
        );
      }

      pl.status = 'PACKED';
      pl.packedAt = new Date();
      if (userId) pl.packedBy = new mongoose.Types.ObjectId(userId);
      await pl.save({ session });

      return pl;
    });

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
  }

  /**
   * Cancel packing list: releases drums back to AVAILABLE.
   */
  async cancelPackingList(id: string, reason: string, userId?: string) {
    const packingList = await TransactionUtil.runInTransaction(async (session) => {
      const pl = await PackingListModel.findById(id).session(session);
      if (!pl) throw new NotFoundError('Packing list not found');

      if (pl.status === 'DISPATCHED') {
        throw new BadRequestError('Cannot cancel a packing list that has already been DISPATCHED');
      }
      if (pl.status === 'CANCELLED') {
        throw new BadRequestError('Packing list is already CANCELLED');
      }

      // If it was PACKED, release all drums
      if (pl.status === 'PACKED' || pl.status === 'COMPLETED') {
        const lines = await PackingListLineModel.find({ packingListId: pl._id }).session(session);
        for (const line of lines) {
          const drum = await DrumModel.findById(line.drumId).session(session);
          if (drum && drum.packingListId?.toString() === pl._id.toString()) {
            drum.status = 'AVAILABLE';
            drum.packingListId = undefined;
            await drum.save({ session });

            const movementNumber = await InventorySequenceUtil.getNextSequence(
              'DRUM_MOVEMENT',
              'DM',
            );
            await DrumMovementModel.create(
              [
                {
                  movementNumber,
                  drumId: drum._id,
                  movementType: 'UNPACKED',
                  fromWarehouseId: drum.currentWarehouseId,
                  referenceDocumentType: 'PackingList',
                  referenceDocumentId: pl._id,
                  movedAt: new Date(),
                  recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                  remarks: `Unpacked on Packing List ${pl.packingListNumber} cancellation: ${reason}`,
                },
              ],
              { session },
            );
          }
        }
      }

      pl.status = 'CANCELLED';
      pl.cancelledAt = new Date();
      pl.cancelReason = reason;
      if (userId) pl.cancelledBy = new mongoose.Types.ObjectId(userId);
      await pl.save({ session });

      return pl;
    });

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
  }

  // ==========================================
  // 3. PACKING LIST DOCUMENT & OUTBOUND CHALLAN
  // ==========================================

  /**
   * Generates the exact document payload for the Packing List,
   * matching the physical printed/scanned document layout.
   */
  async getPackingListDocument(id: string) {
    const packingList = await PackingListModel.findById(id)
      .populate('customerId', 'code name billingAddress gstin')
      .populate('workOrderId', 'workOrderNumber createdAt orderDate')
      .populate('productId', 'code name description coreCount crossSectionSqMm voltageGrade');

    if (!packingList) throw new NotFoundError(`Packing list with ID '${id}' not found`);

    const lines = await PackingListLineModel.find({ packingListId: packingList._id })
      .populate('drumId', 'drumNumber drumSize refRgpNumber drumType')
      .sort({ sNo: 1, createdAt: 1 });

    const customer = packingList.customerId as unknown as { name?: string; code?: string };
    const workOrder = packingList.workOrderId as unknown as {
      workOrderNumber?: string;
      createdAt?: Date;
    };
    const product = packingList.productId as unknown as {
      name?: string;
      code?: string;
      description?: string;
      coreCount?: number;
      crossSectionSqMm?: number;
    };

    const formatDate = (d?: Date) => {
      if (!d) return '';
      const date = new Date(d);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const customerName = customer?.name || 'V-MARC INDIA LIMITED';
    const workOrderNumber =
      packingList.workOrderNumber || workOrder?.workOrderNumber || 'MF-2026-01';
    const workOrderDate = formatDate(packingList.workOrderDate || workOrder?.createdAt);
    const packingDate = formatDate(packingList.packingDate);

    let sizeDescription = packingList.sizeDescription;
    if (!sizeDescription) {
      if (product?.coreCount && product?.crossSectionSqMm) {
        sizeDescription = `${product.coreCount}CX${product.crossSectionSqMm} SQMM ${product.code || ''}`.trim();
      } else if (product?.description) {
        sizeDescription = product.description;
      } else if (product?.name) {
        sizeDescription = product.name;
      } else {
        sizeDescription = '4CX35 SQMM A2XFY';
      }
    }

    const table = lines.map((line, idx) => {
      const drum = line.drumId as unknown as {
        drumNumber?: string;
        drumSize?: string;
        refRgpNumber?: string;
        drumType?: string;
      };
      const sNo = line.sNo || idx + 1;
      const dNo = line.drumNumber || drum?.drumNumber || `MF/${String(idx + 1).padStart(2, '0')}`;
      const lengthBottom = line.lengthBottom ?? 0;
      const lengthTop = line.lengthTop ?? line.lengthMeters;
      const lengthTotal = line.lengthTotal || lengthBottom + lengthTop;
      const drumSize = line.drumSize || drum?.drumSize || '44X16X24';
      const refRgpNo = line.refRgpNumber || drum?.refRgpNumber || '262740872';
      const type = line.drumType || drum?.drumType || '';
      const remark = line.remarks || 'STD.LENGTH';

      return {
        sNo,
        dNo,
        lengthBottom,
        lengthTop,
        lengthTotal,
        drumSize,
        refRgpNo,
        type,
        remark,
      };
    });

    return {
      company: {
        name: 'MFOLKS INDUSTRIES PRIVATE LIMITED',
        address:
          'F-279 A, RIICO Industrial Area, Chopanki, Tapukara, Alwar, Rajasthan, India - 301707',
        gstin: '08AAOCM2650D1ZI',
        pan: 'AAOCM2650D',
        cin: 'U27320DL2021PTC376425',
      },
      documentTitle: 'PACKING LIST',
      header: {
        customerName,
        workOrder: workOrderNumber,
        workOrderDate,
        size: sizeDescription,
        date: packingDate,
        invoiceNumber: packingList.invoiceNumber || '2025-26/RJ/JW/337',
        challanNumber: packingList.challanNumber || 'MF/DC/408',
        packingNumber: packingList.packingListNumber || 'MF/PL/389',
      },
      table,
      totalLength: packingList.totalLengthMeters,
      totalDrums: packingList.totalDrums,
      footer: 'For MFOLKS INDUSTRIES PRIVATE LIMITED',
    };
  }

  /**
   * Generates an Outbound Delivery Challan directly from the finalized or draft packing list,
   * retaining all drum measurement columns, RGP references, and assigning a Challan Number.
   */
  async generateChallanFromPackingList(
    packingListId: string,
    dto?: GenerateChallanDto,
    userId?: string,
  ): Promise<IOutboundChallan> {
    const packingList = await PackingListModel.findById(packingListId);
    if (!packingList) throw new NotFoundError('Packing list not found');

    const lines = await PackingListLineModel.find({ packingListId: packingList._id })
      .populate('drumId', 'drumNumber drumSize refRgpNumber drumType')
      .populate('productId', 'code name');

    if (!lines.length)
      throw new BadRequestError('Cannot generate challan for an empty packing list');

    // Return existing if already generated and active
    const existing = await OutboundChallanModel.findOne({
      packingListId: packingList._id,
      status: { $ne: 'CANCELLED' },
    });
    if (existing) {
      return existing;
    }

    const challanNumber =
      dto?.challanNumber ||
      packingList.challanNumber ||
      (await InventorySequenceUtil.getNextSequence('OUTBOUND_CHALLAN', 'OBC'));

    const invoiceNumber = dto?.invoiceNumber || packingList.invoiceNumber || '2025-26/RJ/JW/337';

    const items = lines.map((line, idx) => {
      const drum = line.drumId as unknown as {
        _id: mongoose.Types.ObjectId;
        drumNumber?: string;
        drumSize?: string;
        refRgpNumber?: string;
        drumType?: string;
      };
      const product = line.productId as unknown as {
        _id: mongoose.Types.ObjectId;
        code?: string;
        name?: string;
      };

      return {
        drumId: drum?._id || line.drumId,
        drumNumber:
          line.drumNumber || drum?.drumNumber || `MF/${String(idx + 1).padStart(2, '0')}`,
        sNo: line.sNo || idx + 1,
        productId: product?._id || line.productId,
        productCode: product?.code || 'CABLE',
        productName: product?.name || 'Finished Cable',
        sizeDescription: packingList.sizeDescription,
        lengthBottom: line.lengthBottom ?? 0,
        lengthTop: line.lengthTop ?? line.lengthMeters,
        lengthMeters: line.lengthTotal || line.lengthMeters,
        drumSize: line.drumSize || drum?.drumSize || '44X16X24',
        refRgpNumber: line.refRgpNumber || drum?.refRgpNumber,
        drumType: line.drumType || drum?.drumType || 'WOODEN',
        tareWeightKg: line.tareWeightKg || 0,
        netWeightKg: line.netWeightKg || 0,
        grossWeightKg: line.grossWeightKg || 0,
        remarks: line.remarks || 'STD.LENGTH',
      };
    });

    const outboundChallan = await OutboundChallanModel.create({
      challanNumber,
      packingListId: packingList._id,
      packingListNumber: packingList.packingListNumber,
      invoiceNumber,
      sizeDescription: packingList.sizeDescription,
      workOrderId: packingList.workOrderId,
      workOrderNumber: packingList.workOrderNumber,
      customerId: packingList.customerId,
      challanDate: new Date(),
      deliveryTerms: dto?.deliveryTerms,
      eWayBillNumber: dto?.eWayBillNumber,
      vehicleNumber: dto?.vehicleNumber,
      transporter: dto?.transporter,
      lrNumber: dto?.lrNumber,
      totalDrums: packingList.totalDrums,
      totalLengthMeters: packingList.totalLengthMeters,
      totalTareWeightKg: packingList.totalTareWeightKg,
      totalNetWeightKg: packingList.totalNetWeightKg,
      totalGrossWeightKg: packingList.totalGrossWeightKg,
      items,
      status: 'ISSUED',
      issuedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      remarks: dto?.remarks || packingList.remarks,
    });

    packingList.challanNumber = challanNumber;
    packingList.invoiceNumber = invoiceNumber;
    packingList.outboundChallanId = outboundChallan._id;
    await packingList.save();

    return outboundChallan;
  }
}

export const packingService = new PackingService();
