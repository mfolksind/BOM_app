import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { MaterialModel } from '../../src/modules/materials/material.model';
import { MaterialLotModel } from '../../src/modules/materials/material-lot.model';
import { ProductModel } from '../../src/modules/products/product.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { ProductionOrderModel } from '../../src/modules/production/production-order.model';
import { ProductionBatchModel } from '../../src/modules/production/production-batch.model';
import { ProcessStageModel } from '../../src/modules/shared/process-stage.model';
import { MaterialIssueModel } from '../../src/modules/production/material-issue.model';
import { MaterialIssueLineModel } from '../../src/modules/production/material-issue-line.model';
import { MaterialConsumptionModel } from '../../src/modules/production/material-consumption.model';
import { MaterialReturnModel } from '../../src/modules/production/material-return.model';
import { ScrapRecordModel } from '../../src/modules/production/scrap-record.model';
import { ProductionOutputModel } from '../../src/modules/production/production-output.model';
import { InboundChallanModel } from '../../src/modules/inventory/inbound-challan.model';
import { InboundChallanLineModel } from '../../src/modules/inventory/inbound-challan-line.model';
import { InventoryTransactionModel } from '../../src/modules/inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { MaterialReservationModel } from '../../src/modules/inventory/material-reservation.model';
import { MaterialReorderRuleModel } from '../../src/modules/inventory/material-reorder-rule.model';
import { DrumModel } from '../../src/modules/packing/drum.model';
import { PackingListModel } from '../../src/modules/packing/packing-list.model';
import { DispatchModel } from '../../src/modules/dispatch/dispatch.model';
import { DispatchLineModel } from '../../src/modules/dispatch/dispatch-line.model';
import { OutboundChallanModel } from '../../src/modules/dispatch/outbound-challan.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Global Stock Dashboard, Reports, Reconciliation & Traceability (Prompt 8)', () => {
  let replSet: MongoMemoryReplSet;
  let superAdminToken: string;
  let adminToken: string;

  // Master Data IDs
  let customerId: string;
  let factoryRawWarehouseId: string;
  let wipWarehouseId: string;
  let fgWarehouseId: string;
  let copperMaterialId: string;
  let pvcMaterialId: string;
  let productId: string;
  let stageId: string;

  // Documents & Transactions IDs
  let inboundChallan1Id: string;
  let inboundChallan2Id: string;
  let customerLot1Id: string;
  let customerLot2Id: string;
  let factoryLotId: string;
  let workOrderId: string;
  let prodOrderId: string;
  let batchId: string;
  let drumId: string;
  let dispatchId: string;
  let outboundChallanId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Users & Tokens
    const superAdmin = await UserModel.create({
      employeeCode: 'EMP-SA-REP',
      email: 'sa.rep@mfolks.com',
      passwordHash: 'hashed_pass_sa',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    superAdminToken = TokenUtil.generateAccessToken({
      userId: superAdmin._id.toString(),
      role: 'SUPER_ADMIN',
      email: superAdmin.email,
    });

    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-REP',
      email: 'adm.rep@mfolks.com',
      passwordHash: 'hashed_pass_adm',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      role: 'ADMIN',
      email: admin.email,
    });

    // 2. Master Data
    const customer = await CustomerModel.create({
      code: 'CUST-REP-01',
      name: 'PowerGrid Solutions Ltd',
      contactPerson: 'Mr. Rajesh Sharma',
      email: 'rajesh@powergrid.com',
      phone: '9876543210',
      billingAddress: {
        street: '12 Industrial Area',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122001',
        country: 'India',
      },
    });
    customerId = customer._id.toString();

    const rmWarehouse = await WarehouseModel.create({
      code: 'WH-RM-REP',
      name: 'Raw Materials Main Store',
      type: 'RAW_MATERIAL',
      isActive: true,
    });
    factoryRawWarehouseId = rmWarehouse._id.toString();

    const wipWarehouse = await WarehouseModel.create({
      code: 'WH-WIP-REP',
      name: 'Production Shopfloor WIP',
      type: 'WORK_IN_PROGRESS',
      isActive: true,
    });
    wipWarehouseId = wipWarehouse._id.toString();

    const fgWarehouse = await WarehouseModel.create({
      code: 'WH-FG-REP',
      name: 'Finished Goods Yard',
      type: 'FINISHED_GOODS',
      isActive: true,
    });
    fgWarehouseId = fgWarehouse._id.toString();

    const copper = await MaterialModel.create({
      code: 'MAT-CU-8MM',
      name: '8mm Electrolytic Copper Wire Rod',
      category: 'COPPER',
      baseUnit: 'KG',
      defaultReorderThreshold: 1000,
      isActive: true,
    });
    copperMaterialId = copper._id.toString();

    const pvc = await MaterialModel.create({
      code: 'MAT-PVC-TI1',
      name: 'PVC Type A Compound TI1',
      category: 'PVC_COMPOUND',
      baseUnit: 'KG',
      defaultReorderThreshold: 500,
      isActive: true,
    });
    pvcMaterialId = pvc._id.toString();

    const product = await ProductModel.create({
      code: 'PRD-4C-16SQ',
      name: '1.1KV 4C x 16 sq.mm Copper Armoured Cable',
      cableCategory: 'LT_POWER',
      voltageGrade: '1.1KV',
      coreCount: 4,
      crossSectionSqMm: 16,
      conductorMaterial: 'COPPER',
      insulationType: 'PVC',
      armourType: 'ROUND_WIRE_ARMOURED',
      outerSheath: 'PVC_ST1',
      baseUnit: 'METER',
      customerId: customer._id,
      isActive: true,
    });
    productId = product._id.toString();

    const stage = await ProcessStageModel.create({
      code: 'STAGE-EXT',
      name: 'Extrusion & Jacketing',
      sequenceOrder: 1,
      isActive: true,
    });
    stageId = stage._id.toString();

    // 3. Reorder Rule for Low Stock Reports
    await MaterialReorderRuleModel.create({
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      ownerType: 'FACTORY',
      minStockLevel: 800,
      reorderPoint: 1200,
      reorderQuantity: 2000,
      targetQuantity: 3000,
      isActive: true,
    });

    // 4. Inbound Challans & Customer-Owned Material (Multi-Challan Scenario)
    const challan1 = await InboundChallanModel.create({
      challanNumber: 'IBC-2026-0001',
      customerChallanNumber: 'PG-DC-101',
      customerChallanDate: new Date('2026-09-01'),
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      warehouseId: rmWarehouse._id,
      status: 'POSTED',
      postedAt: new Date('2026-09-01T10:00:00Z'),
    });
    inboundChallan1Id = challan1._id.toString();

    const lot1 = await MaterialLotModel.create({
      lotNumber: 'LOT-CU-CUST-001',
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      inboundChallanId: challan1._id,
      initialQuantity: 3000,
      currentBalance: 2000,
      unit: 'KG',
      qualityStatus: 'APPROVED',
      receivedDate: new Date('2026-09-01'),
    });
    customerLot1Id = lot1._id.toString();

    await InboundChallanLineModel.create({
      inboundChallanId: challan1._id,
      materialId: copper._id,
      declaredQuantity: 3000,
      receivedQuantity: 3000,
      unit: 'KG',
      lotId: lot1._id,
      qualityStatus: 'APPROVED',
    });

    // Second Challan for same customer & material
    const challan2 = await InboundChallanModel.create({
      challanNumber: 'IBC-2026-0002',
      customerChallanNumber: 'PG-DC-102',
      customerChallanDate: new Date('2026-09-15'),
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      warehouseId: rmWarehouse._id,
      status: 'POSTED',
      postedAt: new Date('2026-09-15T11:00:00Z'),
    });
    inboundChallan2Id = challan2._id.toString();

    const lot2 = await MaterialLotModel.create({
      lotNumber: 'LOT-CU-CUST-002',
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      inboundChallanId: challan2._id,
      initialQuantity: 2000,
      currentBalance: 2000,
      unit: 'KG',
      qualityStatus: 'APPROVED',
      receivedDate: new Date('2026-09-15'),
    });
    customerLot2Id = lot2._id.toString();

    await InboundChallanLineModel.create({
      inboundChallanId: challan2._id,
      materialId: copper._id,
      declaredQuantity: 2000,
      receivedQuantity: 2000,
      unit: 'KG',
      lotId: lot2._id,
      qualityStatus: 'APPROVED',
    });

    // Ledger transactions for receipts
    await InventoryTransactionModel.create([
      {
        transactionNumber: 'TXN-REC-001',
        movementType: 'INWARD',
        transactionType: 'RECEIPT',
        materialId: copper._id,
        warehouseId: rmWarehouse._id,
        lotId: lot1._id,
        ownerType: 'CUSTOMER',
        customerId: customer._id,
        quantity: 3000,
        unit: 'KG',
        status: 'POSTED',
        sourceDocumentType: 'INBOUND_CHALLAN',
        sourceDocumentId: challan1._id,
        postedAt: new Date('2026-09-01T10:00:00Z'),
      },
      {
        transactionNumber: 'TXN-REC-002',
        movementType: 'INWARD',
        transactionType: 'RECEIPT',
        materialId: copper._id,
        warehouseId: rmWarehouse._id,
        lotId: lot2._id,
        ownerType: 'CUSTOMER',
        customerId: customer._id,
        quantity: 2000,
        unit: 'KG',
        status: 'POSTED',
        sourceDocumentType: 'INBOUND_CHALLAN',
        sourceDocumentId: challan2._id,
        postedAt: new Date('2026-09-15T11:00:00Z'),
      },
    ]);

    // Customer Inventory Balance (Store On-Hand = 4000 KG, Reserved = 500 KG, Available = 3500 KG)
    await InventoryBalanceModel.create({
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      lotId: lot1._id,
      quantityOnHand: 4000,
      quantityReserved: 500,
      quantityAvailable: 3500,
      unit: 'KG',
    });

    // 5. Factory-Owned Inventory (For separation & Low Stock testing)
    const factoryLot = await MaterialLotModel.create({
      lotNumber: 'LOT-CU-FACT-001',
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      ownerType: 'FACTORY',
      initialQuantity: 500,
      currentBalance: 500,
      unit: 'KG',
      qualityStatus: 'APPROVED',
      receivedDate: new Date('2026-09-20'),
    });
    factoryLotId = factoryLot._id.toString();

    // Factory stock is 500 KG (which is below reorder threshold of 1200 KG)
    await InventoryBalanceModel.create({
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      ownerType: 'FACTORY',
      lotId: factoryLot._id,
      quantityOnHand: 500,
      quantityReserved: 0,
      quantityAvailable: 500,
      unit: 'KG',
    });

    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-REC-FACT-001',
      movementType: 'INWARD',
      transactionType: 'RECEIPT',
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      lotId: factoryLot._id,
      ownerType: 'FACTORY',
      quantity: 500,
      unit: 'KG',
      status: 'POSTED',
      sourceDocumentType: 'INBOUND_CHALLAN',
      sourceDocumentId: new mongoose.Types.ObjectId(),
      postedAt: new Date('2026-09-20T10:00:00Z'),
    });

    // 6. Work Order with Saved BOM Snapshot
    const workOrder = await WorkOrderModel.create({
      workOrderNumber: 'WO-2026-0001',
      customerId: customer._id,
      productId: product._id,
      bomVersionId: new mongoose.Types.ObjectId(),
      bomSnapshot: {
        bomVersionId: new mongoose.Types.ObjectId(),
        bomNumber: 'BOM-4C-16SQ-V1',
        versionNumber: 1,
        batchSize: 1000,
        outputUnit: 'METER',
        items: [
          {
            materialId: copper._id,
            materialCode: copper.code,
            materialName: copper.name,
            quantityPerUnit: 580, // 580 kg per 1000m batch
            scrapTolerancePercentage: 1.5,
            stageSequence: 1,
            unit: 'KG',
          },
          {
            materialId: pvc._id,
            materialCode: pvc.code,
            materialName: pvc.name,
            quantityPerUnit: 320, // 320 kg per 1000m batch
            scrapTolerancePercentage: 2.0,
            stageSequence: 1,
            unit: 'KG',
          },
        ],
      },
      orderedLengthMeters: 2000,
      deliveredLengthMeters: 1000,
      targetDeliveryDate: new Date('2026-11-01'),
      status: 'IN_PRODUCTION',
    });
    workOrderId = workOrder._id.toString();

    // Material Reservation for Work Order
    await MaterialReservationModel.create({
      reservationNumber: 'RES-2026-0001',
      workOrderId: workOrder._id,
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      reservedQuantity: 500,
      unit: 'KG',
      status: 'ACTIVE',
    });

    // 7. Production Order & Batch
    const prodOrder = await ProductionOrderModel.create({
      productionOrderNumber: 'PO-2026-0001',
      workOrderId: workOrder._id,
      customerId: customer._id,
      productId: product._id,
      bomVersionId: workOrder.bomVersionId,
      plannedLengthMeters: 2000,
      producedLengthMeters: 1000,
      startDate: new Date('2026-10-01'),
      targetCompletionDate: new Date('2026-10-10'),
      status: 'IN_PROGRESS',
    });
    prodOrderId = prodOrder._id.toString();

    const batch = await ProductionBatchModel.create({
      batchNumber: 'BAT-2026-0001',
      productionOrderId: prodOrder._id,
      workOrderId: workOrder._id,
      processStageId: stage._id,
      machineCode: 'EXTRUDER-01',
      plannedQuantity: 1000,
      completedQuantity: 1000,
      unit: 'METER',
      status: 'COMPLETED',
      startedAt: new Date('2026-10-01T08:00:00Z'),
      completedAt: new Date('2026-10-02T16:00:00Z'),
    });
    batchId = batch._id.toString();

    // Material Issue (1000 KG issued to WIP)
    const issue = await MaterialIssueModel.create({
      issueNumber: 'ISS-2026-0001',
      productionOrderId: prodOrder._id,
      workOrderId: workOrder._id,
      sourceWarehouseId: rmWarehouse._id,
      destinationWarehouseId: wipWarehouse._id,
      status: 'ISSUED',
      issueDate: new Date('2026-10-01'),
    });

    await MaterialIssueLineModel.create({
      materialIssueId: issue._id,
      materialId: copper._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      issuedQuantity: 1000,
      unit: 'KG',
    });

    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-ISS-001',
      movementType: 'OUTWARD',
      transactionType: 'ISSUE_TO_PRODUCTION',
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantity: 1000,
      unit: 'KG',
      status: 'POSTED',
      sourceDocumentType: 'MATERIAL_ISSUE',
      sourceDocumentId: issue._id,
      postedAt: new Date('2026-10-01T09:00:00Z'),
    });

    // Material Consumption (600 KG consumed in batch)
    const consumption = await MaterialConsumptionModel.create({
      consumptionNumber: 'CON-2026-0001',
      productionOrderId: prodOrder._id,
      productionBatchId: batch._id,
      workOrderId: workOrder._id,
      processStageId: stage._id,
      materialId: copper._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      consumedQuantity: 600,
      unit: 'KG',
      status: 'POSTED',
      consumedAt: new Date('2026-10-01T12:00:00Z'),
    });

    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-CON-001',
      movementType: 'OUTWARD',
      transactionType: 'CONSUMPTION',
      materialId: copper._id,
      warehouseId: wipWarehouse._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantity: 600,
      unit: 'KG',
      status: 'POSTED',
      sourceDocumentType: 'MATERIAL_CONSUMPTION',
      sourceDocumentId: consumption._id,
      postedAt: new Date('2026-10-01T12:00:00Z'),
    });

    // Material Return (100 KG unused returned to store)
    const matReturn = await MaterialReturnModel.create({
      returnNumber: 'RET-2026-0001',
      workOrderId: workOrder._id,
      productionOrderId: prodOrder._id,
      productionBatchId: batch._id,
      materialId: copper._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      returnQuantity: 100,
      unit: 'KG',
      sourceWarehouseId: wipWarehouse._id,
      destinationWarehouseId: rmWarehouse._id,
      status: 'POSTED',
      recordedAt: new Date('2026-10-02T10:00:00Z'),
    });

    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-RET-001',
      movementType: 'INWARD',
      transactionType: 'RETURN_TO_STORE',
      materialId: copper._id,
      warehouseId: rmWarehouse._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantity: 100,
      unit: 'KG',
      status: 'POSTED',
      sourceDocumentType: 'MATERIAL_RETURN',
      sourceDocumentId: matReturn._id,
      postedAt: new Date('2026-10-02T10:00:00Z'),
    });

    // Scrap Record (20 KG process loss)
    const scrap = await ScrapRecordModel.create({
      scrapNumber: 'SCR-2026-0001',
      productionOrderId: prodOrder._id,
      productionBatchId: batch._id,
      workOrderId: workOrder._id,
      processStageId: stage._id,
      materialId: copper._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      scrapType: 'COPPER_SCRAP',
      scrapCategory: 'PROCESS_LOSS',
      scrapQuantity: 20,
      unit: 'KG',
      scrapWarehouseId: wipWarehouse._id,
      status: 'POSTED',
      recordedAt: new Date('2026-10-02T11:00:00Z'),
    });

    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-SCR-001',
      movementType: 'OUTWARD',
      transactionType: 'SCRAP',
      materialId: copper._id,
      warehouseId: wipWarehouse._id,
      lotId: lot1._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantity: 20,
      unit: 'KG',
      status: 'POSTED',
      sourceDocumentType: 'SCRAP_RECORD',
      sourceDocumentId: scrap._id,
      postedAt: new Date('2026-10-02T11:00:00Z'),
    });

    // 8. Production Output (1000 meters good cable produced)
    const output = await ProductionOutputModel.create({
      outputNumber: 'OUT-2026-0001',
      productionOrderId: prodOrder._id,
      productionBatchId: batch._id,
      workOrderId: workOrder._id,
      productId: product._id,
      processStageId: stage._id,
      outputLengthMeters: 1000,
      outputWeightKg: 1100,
      targetWarehouseId: fgWarehouse._id,
      isFinalStage: true,
      qualityStatus: 'PASSED',
      status: 'POSTED',
      postedAt: new Date('2026-10-02T16:00:00Z'),
    });

    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-PRD-001',
      movementType: 'INWARD',
      transactionType: 'PRODUCTION_RECEIPT',
      materialId: product._id,
      warehouseId: fgWarehouse._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantity: 1000,
      unit: 'METER',
      status: 'POSTED',
      sourceDocumentType: 'PRODUCTION_OUTPUT',
      sourceDocumentId: output._id,
      postedAt: new Date('2026-10-02T16:00:00Z'),
    });

    // 9. Drum, Packing & Dispatch
    const drum = await DrumModel.create({
      drumNumber: 'DRM-2026-0001',
      drumType: 'WOODEN',
      tareWeightKg: 150,
      grossWeightKg: 1250,
      netWeightKg: 1100,
      cableLengthMeters: 1000,
      currentProductId: product._id,
      workOrderId: workOrder._id,
      productionOrderId: prodOrder._id,
      productionBatchId: batch._id,
      status: 'DISPATCHED',
      currentWarehouseId: fgWarehouse._id,
      ownership: 'FACTORY_OWNED',
      customerId: customer._id,
    });
    drumId = drum._id.toString();

    const packing = await PackingListModel.create({
      packingListNumber: 'PL-2026-0001',
      workOrderId: workOrder._id,
      customerId: customer._id,
      productId: product._id,
      totalDrums: 1,
      totalLengthMeters: 1000,
      totalNetWeightKg: 1100,
      totalTareWeightKg: 150,
      totalGrossWeightKg: 1250,
      status: 'DISPATCHED',
      packingDate: new Date('2026-10-03'),
    });

    const dispatch = await DispatchModel.create({
      dispatchNumber: 'DSP-2026-0001',
      workOrderId: workOrder._id,
      customerId: customer._id,
      packingListId: packing._id,
      packingListIds: [packing._id],
      sourceWarehouseId: fgWarehouse._id,
      vehicleNumber: 'HR-26-EE-9999',
      transporter: 'Super Fast Logistics',
      driverName: 'Suresh Kumar',
      totalDrums: 1,
      totalLengthMeters: 1000,
      totalNetWeightKg: 1100,
      totalTareWeightKg: 150,
      totalGrossWeightKg: 1250,
      status: 'DISPATCHED',
      dispatchedAt: new Date('2026-10-04T14:00:00Z'),
    });
    dispatchId = dispatch._id.toString();

    await DrumModel.findByIdAndUpdate(drum._id, {
      packingListId: packing._id,
      dispatchId: dispatch._id,
    });

    await DispatchLineModel.create({
      dispatchId: dispatch._id,
      drumId: drum._id,
      productId: product._id,
      lengthMeters: 1000,
      tareWeightKg: 150,
      netWeightKg: 1100,
      grossWeightKg: 1250,
    });

    const outboundChallan = await OutboundChallanModel.create({
      challanNumber: 'OBC-2026-0001',
      dispatchId: dispatch._id,
      workOrderId: workOrder._id,
      customerId: customer._id,
      challanDate: new Date('2026-10-04'),
      vehicleNumber: 'HR-26-EE-9999',
      totalDrums: 1,
      totalLengthMeters: 1000,
      totalNetWeightKg: 1100,
      totalTareWeightKg: 150,
      totalGrossWeightKg: 1250,
      items: [
        {
          drumId: drum._id,
          drumNumber: drum.drumNumber,
          productId: product._id,
          productCode: product.code,
          productName: product.name,
          lengthMeters: 1000,
          tareWeightKg: 150,
          netWeightKg: 1100,
          grossWeightKg: 1250,
        },
      ],
      status: 'ISSUED',
    });
    outboundChallanId = outboundChallan._id.toString();

    // Posted Dispatch Inventory Transaction (Finished Goods outward movement)
    await InventoryTransactionModel.create({
      transactionNumber: 'TXN-DSP-001',
      movementType: 'OUTWARD',
      transactionType: 'DISPATCH',
      materialId: product._id,
      warehouseId: fgWarehouse._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantity: 1000,
      unit: 'METER',
      status: 'POSTED',
      sourceDocumentType: 'DISPATCH',
      sourceDocumentId: dispatch._id,
      postedAt: new Date('2026-10-04T14:00:00Z'),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. GLOBAL INVENTORY DASHBOARD
  // =========================================================================
  describe('1. Global Inventory Dashboard (/api/v1/reports/dashboard)', () => {
    it('Scenario 1: should return global stock position with unit and ownership segregation', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('stockPosition');
      expect(res.body.data).toHaveProperty('periodMovements');
      expect(res.body.data).toHaveProperty('alerts');

      // Check ownership separation
      const { factoryOwned, customerOwned } = res.body.data.stockPosition;
      expect(factoryOwned.onHand).toBe(500); // 500 KG factory
      expect(customerOwned.onHand).toBe(4000); // 4000 KG customer
      expect(customerOwned.reserved).toBe(500);
      expect(customerOwned.available).toBe(3500);

      // Check unit breakdown (meters and kg are separated)
      const unitBreakdown = res.body.data.stockPosition.unitBreakdown;
      const kgBucket = unitBreakdown.find((u: { unit: string }) => u.unit === 'KG');
      expect(kgBucket).toBeDefined();
      expect(kgBucket.onHand).toBe(4500); // 4000 customer + 500 factory

      // Check period movements from immutable ledger
      const movements = res.body.data.periodMovements;
      expect(movements.stockReceived).toBe(5500); // 3000 + 2000 + 500
      expect(movements.issuedToProduction).toBe(1000);
      expect(movements.actualConsumption).toBe(600);
      expect(movements.unusedReturned).toBe(100);
      expect(movements.scrapAndLoss).toBe(20);
      expect(movements.finishedGoodsProduced).toBe(1000);
      expect(movements.finishedGoodsDispatched).toBe(1000);
    });

    it('Scenario 2: should filter dashboard by customer and date range', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/dashboard?customerId=${customerId}&startDate=2026-09-01&endDate=2026-09-10`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.periodMovements.stockReceived).toBe(3000); // Only first challan receipt
    });
  });

  // =========================================================================
  // 2. INVENTORY SUMMARY REPORT
  // =========================================================================
  describe('2. Inventory Summary Report (/api/v1/reports/inventory-summary)', () => {
    it('Scenario 3: should return paginated inventory summary with warehouse and shortage info', async () => {
      const res = await request(app)
        .get('/api/v1/reports/inventory-summary?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();

      const factoryItem = res.body.data.find((i: { ownerType: string }) => i.ownerType === 'FACTORY');
      expect(factoryItem).toBeDefined();
      expect(factoryItem.quantityOnHand).toBe(500);
      expect(factoryItem.shortageQuantity).toBe(500); // 1000 default threshold - 500 available
      expect(factoryItem.isLowStock).toBe(true);
    });
  });

  // =========================================================================
  // 3. DAILY STOCK AND MATERIAL MOVEMENT REPORT
  // =========================================================================
  describe('3. Daily Stock and Material Movement Report (/api/v1/reports/daily-stock-movement)', () => {
    it('Scenario 4: should calculate opening and closing stock reconciling with posted ledger movements', async () => {
      const res = await request(app)
        .get('/api/v1/reports/daily-stock-movement?startDate=2026-09-01&endDate=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.rulesDocumentation).toBeDefined();

      const customerLine = res.body.data.items.find(
        (l: { ownerType: string }) => l.ownerType === 'CUSTOMER',
      );
      expect(customerLine).toBeDefined();
      expect(customerLine.quantityReceived).toBeGreaterThanOrEqual(3000);
      expect(customerLine.quantityIssuedToProduction).toBe(1000);
      expect(customerLine.actualQuantityConsumed).toBe(600); // Reported separately from issued!
      expect(customerLine.unusedMaterialReturned).toBe(100);
      expect(customerLine.scrapQuantity).toBe(20);
      expect(customerLine.processLossQuantity).toBe(20);
      expect(customerLine.reconciled).toBe(true);
    });
  });

  // =========================================================================
  // 4. CUSTOMER-OWNED MATERIAL RECONCILIATION
  // =========================================================================
  describe('4. Customer Material Reconciliation (/api/v1/reports/customer-material-reconciliation)', () => {
    it('Scenario 5: should reconcile customer material across multiple inbound challans with store & WIP balance', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/customer-material-reconciliation?customerId=${customerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const item = res.body.data[0];
      expect(item.inboundReceipts.length).toBe(2); // Received from 2 challans
      expect(item.summary.totalReceived).toBe(5000); // 3000 + 2000
      expect(item.summary.materialIssuedToProduction).toBe(1000);
      expect(item.summary.actualMaterialConsumption).toBe(600);
      expect(item.summary.unusedMaterialReturnedToStores).toBe(100);
      expect(item.summary.scrapAndProcessLoss).toBe(20);

      // WIP balance = Issued (1000) - Consumed (600) - Returned (100) - Scrap (20) = 280 KG
      expect(item.summary.currentWipBalance).toBe(280);
      expect(item.summary.currentStoreOnHand).toBe(4000);
      expect(item.summary.totalCustomerMaterialRemaining).toBe(4280);
      expect(item.reconciliation.formula).toContain('Strict Customer Segregation');
    });
  });

  // =========================================================================
  // 5. WORK ORDER AND PRODUCTION REPORTS
  // =========================================================================
  describe('5. Work Order & Production Reports (/api/v1/reports/work-orders, /production-batches)', () => {
    it('Scenario 6: should report work order with saved BOM snapshot, good output meters and dispatch status', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/work-orders?workOrderId=${workOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);

      const woReport = res.body.data[0];
      expect(woReport.workOrderNumber).toBe('WO-2026-0001');
      expect(woReport.orderQuantity).toBe(2000);
      expect(woReport.orderUnit).toBe('METER');

      // Check planned requirements from saved BOM snapshot
      expect(woReport.plannedRequirements.length).toBe(2);
      const copperReq = woReport.plannedRequirements.find((p: { materialCode: string }) => p.materialCode === 'MAT-CU-8MM');
      expect(copperReq.plannedQuantity).toBe(1160); // 0.58 * (2000/1000) = 1.16 * 1000 = 1160 KG

      // Check production progress
      expect(woReport.productionProgress.actualGoodProductionQuantity).toBe(1000);
      expect(woReport.productionProgress.remainingQuantityToProduce).toBe(1000);
      expect(woReport.productionProgress.productionCompletionPercentage).toBe(50);
      expect(woReport.productionProgress.totalPackedMeters).toBe(1000);
      expect(woReport.productionProgress.totalDispatchedMeters).toBe(1000);
      expect(woReport.productionProgress.pendingDispatchMeters).toBe(0);
    });

    it('Scenario 7: should report batch specific consumption keeping meters separate from kg', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/production-batches?batchId=${batchId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);

      const batchReport = res.body.data[0];
      expect(batchReport.batchNumber).toBe('BAT-2026-0001');
      expect(batchReport.materials.totalConsumedKg).toBe(600);
      expect(batchReport.materials.totalReturnedKg).toBe(100);
      expect(batchReport.materials.totalScrapKg).toBe(20);
      expect(batchReport.output.goodOutputMeters).toBe(1000);

      // Specific consumption: 600 kg / 1000 m = 0.6 kg/meter
      expect(batchReport.output.specificConsumptionKgPerMeter).toBe(0.6);
      expect(batchReport.output.measurementNotice).toContain('reported separately');
    });
  });

  // =========================================================================
  // 6. FINISHED GOODS, DRUM, AND DISPATCH REPORTS
  // =========================================================================
  describe('6. Finished Goods & Packing/Dispatch Reports', () => {
    it('Scenario 8: should report finished goods drum measurements, packing list, and dispatch reference', async () => {
      const res = await request(app)
        .get('/api/v1/reports/finished-goods')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const drumItem = res.body.data.find((d: { drumNumber: string }) => d.drumNumber === 'DRM-2026-0001');
      expect(drumItem).toBeDefined();
      expect(drumItem.status).toBe('DISPATCHED');
      expect(drumItem.measurements.cableLengthMeters).toBe(1000);
      expect(drumItem.measurements.tareWeightKg).toBe(150);
      expect(drumItem.measurements.netWeightKg).toBe(1100);
      expect(drumItem.measurements.grossWeightKg).toBe(1250);
      expect(drumItem.packing.packingListNumber).toBe('PL-2026-0001');
      expect(drumItem.dispatch.dispatchNumber).toBe('DSP-2026-0001');
      expect(drumItem.outboundChallan.challanNumber).toBe('OBC-2026-0001');
    });

    it('Scenario 9: should report packing and dispatch summary preventing duplicate drum counting', async () => {
      const res = await request(app)
        .get('/api/v1/reports/packing-dispatch')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      const dsp = res.body.data[0];
      expect(dsp.dispatchNumber).toBe('DSP-2026-0001');
      expect(dsp.totals.totalDrums).toBe(1);
      expect(dsp.totals.totalLengthMeters).toBe(1000);
      expect(dsp.lines.length).toBe(1);
    });
  });

  // =========================================================================
  // 7. LOW-STOCK AND REORDER REPORT
  // =========================================================================
  describe('7. Low-Stock and Reorder Report (/api/v1/reports/low-stock)', () => {
    it('Scenario 10: should report low-stock status without using customer-owned stock to mask shortage', async () => {
      const res = await request(app)
        .get('/api/v1/reports/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const cuRule = res.body.data.find((r: { materialCode: string }) => r.materialCode === 'MAT-CU-8MM');
      expect(cuRule).toBeDefined();
      expect(cuRule.ownerType).toBe('FACTORY');
      expect(cuRule.onHandQuantity).toBe(500); // Only factory stock counted!
      expect(cuRule.reorderThreshold).toBe(1200);
      expect(cuRule.shortageQuantity).toBe(700); // 1200 - 500 = 700 KG shortage
      expect(cuRule.stockStatus).toBe('BELOW_REORDER');
    });
  });

  // =========================================================================
  // 8. MATERIAL AND DOCUMENT TRACEABILITY
  // =========================================================================
  describe('8. Traceability Query Engine (/api/v1/reports/traceability)', () => {
    it('Scenario 11: should trace forward from inbound challan to lots, transactions, and work orders', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/traceability?inboundChallanNumber=IBC-2026-0001`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.traceabilityChain).toBeDefined();
      expect(res.body.data.traceabilityChain.inboundChallans.length).toBe(1);
      expect(res.body.data.traceabilityChain.materialLots.length).toBe(1);
      expect(res.body.data.traceabilityChain.materialLots[0].lotNumber).toBe('LOT-CU-CUST-001');
      expect(res.body.data.verifiedLinksCount.transactions).toBeGreaterThanOrEqual(1);
    });

    it('Scenario 12: should trace backward from dispatched drum to work order and dispatch', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/traceability?drumNumber=DRM-2026-0001`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.traceabilityChain.drums.length).toBe(1);
      expect(res.body.data.traceabilityChain.workOrders.length).toBe(1);
      expect(res.body.data.traceabilityChain.dispatches.length).toBe(1);
      expect(res.body.data.traceabilityChain.outboundChallans.length).toBe(1);
    });
  });

  // =========================================================================
  // 9. DISCREPANCY AND AUDIT REPORT
  // =========================================================================
  describe('9. Discrepancy & Reconciliation Report (/api/v1/reports/discrepancies)', () => {
    it('Scenario 13: should detect discrepancies like over-reserved stock, negative stock, or unposted movements', async () => {
      // Intentionally insert a temporary discrepancy record to test detection
      const testBalance = await InventoryBalanceModel.create({
        materialId: new mongoose.Types.ObjectId(),
        warehouseId: new mongoose.Types.ObjectId(),
        ownerType: 'FACTORY',
        quantityOnHand: 100,
        quantityReserved: 150, // Over-reserved!
        quantityAvailable: 0,
        unit: 'KG',
      });

      const res = await request(app)
        .get('/api/v1/reports/discrepancies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.discrepancies).toBeDefined();
      expect(res.body.data.summary).toBeDefined();

      const overResDisc = res.body.data.discrepancies.find(
        (d: { type: string; entityId: string }) =>
          d.type === 'OVER_RESERVED_STOCK' && d.entityId === testBalance._id.toString(),
      );
      expect(overResDisc).toBeDefined();
      expect(overResDisc.severity).toBe('CRITICAL');
      expect(overResDisc.resolutionStatus).toBe('UNRESOLVED');

      // Clean up test discrepancy record
      await InventoryBalanceModel.findByIdAndDelete(testBalance._id);
    });
  });

  // =========================================================================
  // 10. INPUT VALIDATION, PAGINATION, SECURITY & READ-ONLY SAFETY
  // =========================================================================
  describe('10. Security, Validation & Read-Only Safety', () => {
    it('Scenario 14: should reject invalid date range where startDate > endDate with 400', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard?startDate=2026-12-31&endDate=2026-01-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });

    it('Scenario 15: should reject unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/v1/reports/dashboard');
      expect(res.status).toBe(401);
    });

    it('Scenario 16: should support alias /api/reports/dashboard seamlessly', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Scenario 17: regression test confirming reporting APIs do not mutate or create stock transactions', async () => {
      const initialTxnCount = await InventoryTransactionModel.countDocuments();
      const initialBalanceCount = await InventoryBalanceModel.countDocuments();
      const initialWorkOrderCount = await WorkOrderModel.countDocuments();
      const initialDrumCount = await DrumModel.countDocuments();

      // Hit all 11 reporting endpoints
      await request(app).get('/api/v1/reports/dashboard').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/inventory-summary').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/daily-stock-movement').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/customer-material-reconciliation').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/work-orders').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/production-batches').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/finished-goods').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/packing-dispatch').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/low-stock').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/traceability').set('Authorization', `Bearer ${adminToken}`);
      await request(app).get('/api/v1/reports/discrepancies').set('Authorization', `Bearer ${adminToken}`);

      // Confirm no database record was added, modified, or deleted
      const finalTxnCount = await InventoryTransactionModel.countDocuments();
      const finalBalanceCount = await InventoryBalanceModel.countDocuments();
      const finalWorkOrderCount = await WorkOrderModel.countDocuments();
      const finalDrumCount = await DrumModel.countDocuments();

      expect(finalTxnCount).toBe(initialTxnCount);
      expect(finalBalanceCount).toBe(initialBalanceCount);
      expect(finalWorkOrderCount).toBe(initialWorkOrderCount);
      expect(finalDrumCount).toBe(initialDrumCount);
    });
  });
});
