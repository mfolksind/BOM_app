import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { MaterialModel } from '../../src/modules/materials/material.model';
import { ProductModel } from '../../src/modules/products/product.model';
import { BomVersionModel } from '../../src/modules/bom/bom-version.model';
import { BomItemModel } from '../../src/modules/bom/bom-item.model';
import { ProcessStageModel } from '../../src/modules/shared/process-stage.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { ProductionOrderModel } from '../../src/modules/production/production-order.model';
import { ProductionBatchModel } from '../../src/modules/production/production-batch.model';
import { MaterialIssueModel } from '../../src/modules/production/material-issue.model';
import { MaterialIssueLineModel } from '../../src/modules/production/material-issue-line.model';
import { MachineModel } from '../../src/modules/machines/machine.model';
import { DrumModel } from '../../src/modules/packing/drum.model';
import { DrumMovementModel } from '../../src/modules/packing/drum-movement.model';
import { inventoryBalanceService } from '../../src/modules/inventory/inventory-balance.service';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Phase 5 Machine-Based Multi-Stage Workflow & Packaging Integration Tests', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;

  let customerId: string;
  let copperMaterialId: string;
  let xlpeMaterialId: string;
  let productId: string;
  let bomVersionId: string;
  let stageDrawingId: string;
  let stageExtrusionId: string;
  let storeWarehouseId: string;
  let wipWarehouseId: string;
  let fgWarehouseId: string;
  let scrapWarehouseId: string;

  let machine1Id: string;
  let machine2Id: string;
  let workOrderId: string;
  let productionOrderId: string;
  let drumId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-P5',
      email: 'admin.p5@mfolks.com',
      passwordHash: 'hashed_pwd',
      firstName: 'Production',
      lastName: 'Manager',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      role: 'ADMIN',
      employeeCode: admin.employeeCode,
    });

    const customer = await CustomerModel.create({
      code: 'CUST-P5-001',
      name: 'Polycab Cables Ltd',
      gstin: '24AAAAA0000A1Z5',
      email: 'polycab@example.com',
      phone: '9876543210',
      billingAddress: { line1: 'GIDC', city: 'Vadodara', state: 'Gujarat', pincode: '390010' },
      isActive: true,
    });
    customerId = customer._id.toString();

    const matCopper = await MaterialModel.create({
      code: 'MAT-COP-P5',
      name: 'Electrolytic Copper Wire Rod',
      category: 'COPPER',
      baseUnit: 'KG',
      isActive: true,
    });
    copperMaterialId = matCopper._id.toString();

    const matXlpe = await MaterialModel.create({
      code: 'MAT-XLPE-P5',
      name: 'Crosslinked Polyethylene Compound',
      category: 'XLPE_COMPOUND',
      baseUnit: 'KG',
      isActive: true,
    });
    xlpeMaterialId = matXlpe._id.toString();

    const stage1 = await ProcessStageModel.create({
      code: 'STAGE-DRAWING-P5',
      name: 'Wire Drawing',
      sequenceOrder: 1,
      isActive: true,
    });
    stageDrawingId = stage1._id.toString();

    const stage2 = await ProcessStageModel.create({
      code: 'STAGE-EXTRUSION-P5',
      name: 'Insulation Extrusion',
      sequenceOrder: 2,
      isActive: true,
    });
    stageExtrusionId = stage2._id.toString();

    const product = await ProductModel.create({
      code: 'PROD-1CX16-P5',
      name: '1C x 16 sq.mm Copper XLPE Cable',
      voltageGrade: '1.1KV',
      cableCategory: 'POWER',
      coreCount: 1,
      crossSectionSqMm: 16,
      standardUnit: 'METER',
      isActive: true,
    });
    productId = product._id.toString();

    const bom = await BomVersionModel.create({
      bomNumber: 'BOM-P5-V1',
      productId: product._id,
      versionNumber: 1,
      batchSize: 1000,
      outputUnit: 'METER',
      effectiveFrom: new Date(),
      status: 'ACTIVE',
      approvedBy: admin._id,
    });
    bomVersionId = bom._id.toString();

    // Constant scrap tolerances: Copper 1.5%, XLPE 2.0%
    await BomItemModel.create([
      {
        bomVersionId: bom._id,
        materialId: matCopper._id,
        processStageId: stage1._id,
        quantityPerUnit: 0.15,
        scrapTolerancePercentage: 1.5,
        isMandatory: true,
        stageSequence: 1,
      },
      {
        bomVersionId: bom._id,
        materialId: matXlpe._id,
        processStageId: stage2._id,
        quantityPerUnit: 0.05,
        scrapTolerancePercentage: 2.0,
        isMandatory: true,
        stageSequence: 2,
      },
    ]);

    const whStore = await WarehouseModel.create({
      code: 'WH-STORE-P5',
      name: 'Main Store Warehouse',
      type: 'RAW_MATERIAL',
      isActive: true,
    });
    storeWarehouseId = whStore._id.toString();

    const whWip = await WarehouseModel.create({
      code: 'WH-WIP-P5',
      name: 'Shop Floor WIP',
      type: 'WORK_IN_PROGRESS',
      isActive: true,
    });
    wipWarehouseId = whWip._id.toString();

    const whFg = await WarehouseModel.create({
      code: 'WH-FG-P5',
      name: 'Finished Goods Yard',
      type: 'FINISHED_GOODS',
      isActive: true,
    });
    fgWarehouseId = whFg._id.toString();

    const whScrap = await WarehouseModel.create({
      code: 'WH-SCRAP-P5',
      name: 'Scrap Recovery Yard',
      type: 'SCRAP',
      isActive: true,
    });
    scrapWarehouseId = whScrap._id.toString();

    // Seed stock into store
    await inventoryBalanceService.increaseStock({
      materialId: matCopper._id,
      warehouseId: whStore._id,
      ownerType: 'FACTORY',
      quantity: 500,
      unit: 'KG',
    });
    await inventoryBalanceService.increaseStock({
      materialId: matXlpe._id,
      warehouseId: whStore._id,
      ownerType: 'FACTORY',
      quantity: 300,
      unit: 'KG',
    });

    // Create Work Order
    const workOrder = await WorkOrderModel.create({
      workOrderNumber: 'WO-P5-001',
      customerId: customer._id,
      productId: product._id,
      bomVersionId: bom._id,
      orderedLengthMeters: 1000,
      deliveredLengthMeters: 0,
      targetCompletionDate: new Date(Date.now() + 14 * 86400000),
      status: 'CONFIRMED',
    });
    workOrderId = workOrder._id.toString();

    // Create Empty Drum for Packaging
    const drum = await DrumModel.create({
      drumNumber: 'DRM-P5-TEST-001',
      drumType: 'WOODEN',
      tareWeightKg: 150,
      grossWeightKg: 150,
      netWeightKg: 0,
      cableLengthMeters: 0,
      status: 'AVAILABLE',
      ownership: 'FACTORY_OWNED',
    });
    drumId = drum._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // 1. GLOBAL MACHINE REGISTRATION
  it('1. should register machines globally and list them', async () => {
    const res1 = await request(app)
      .post('/api/v1/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'MCH-DRAW-01',
        name: 'Niehoff Multiwire Drawing Machine',
        processStageIds: [stageDrawingId],
        machineType: 'DRAWING',
        capacityPerShift: 5000,
        speedMetersPerMinute: 800,
        location: 'Bay 1',
      });
    expect(res1.status).toBe(201);
    expect(res1.body.data.code).toBe('MCH-DRAW-01');
    expect(res1.body.data.status).toBe('AVAILABLE');
    machine1Id = res1.body.data._id;

    const res2 = await request(app)
      .post('/api/v1/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'MCH-EXTR-01',
        name: 'Maillefer 80mm Extrusion Line',
        processStageIds: [stageExtrusionId],
        machineType: 'EXTRUSION',
        capacityPerShift: 3000,
        speedMetersPerMinute: 400,
        location: 'Bay 2',
      });
    expect(res2.status).toBe(201);
    machine2Id = res2.body.data._id;

    const listRes = await request(app)
      .get('/api/v1/machines')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  // 2. PRODUCTION ORDER & ISSUE MATERIAL TO SHOP FLOOR WIP
  it('2. should create production order and issue materials to WIP warehouse', async () => {
    const poRes = await request(app)
      .post(`/api/v1/work-orders/${workOrderId}/production-orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plannedLengthMeters: 1000,
        targetCompletionDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        remarks: 'Phase 5 Test Run',
      });
    expect(poRes.status).toBe(201);
    productionOrderId = poRes.body.data._id;

    // Issue materials from Store to WIP
    const issueRes = await request(app)
      .post(`/api/v1/production-orders/${productionOrderId}/material-issues`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceWarehouseId: storeWarehouseId,
        destinationWarehouseId: wipWarehouseId,
        lines: [
          {
            materialId: copperMaterialId,
            ownerType: 'FACTORY',
            issuedQuantity: 160,
            unit: 'KG',
          },
          {
            materialId: xlpeMaterialId,
            ownerType: 'FACTORY',
            issuedQuantity: 60,
            unit: 'KG',
          },
        ],
      });
    expect(issueRes.status).toBe(201);
    const issueId = issueRes.body.data._id;

    const postIssueRes = await request(app)
      .post(`/api/v1/material-issues/${issueId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(postIssueRes.status).toBe(200);
  });

  // 3. SELECT MACHINE 1 & START BATCH
  it('3. should select first machine, create batch, and update machine status to RUNNING', async () => {
    const batchRes = await request(app)
      .post(`/api/v1/production-orders/${productionOrderId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        processStageId: stageDrawingId,
        machineId: machine1Id,
        plannedQuantity: 1000,
        unit: 'METER',
        shift: 'SHIFT_A',
        remarks: 'Step 1 Wire Drawing on Niehoff',
      });
    expect(batchRes.status).toBe(201);
    const batchId = batchRes.body.data._id;
    expect(batchRes.body.data.machineId).toBe(machine1Id);
    expect(batchRes.body.data.machineCode).toBe('MCH-DRAW-01');

    // Verify machine transitioned to RUNNING
    const machine = await MachineModel.findById(machine1Id);
    expect(machine?.status).toBe('RUNNING');
    expect(machine?.currentBatchId?.toString()).toBe(batchId);
  });

  // 4. MULTI-MATERIAL BULK CONSUMPTION & AUTO-SCRAP CALCULATION
  it('4. should consume materials in bulk and auto-calculate scrap according to BOM constants', async () => {
    // Get batch
    const batch = await ProductionBatchModel.findOne({ machineId: machine1Id, status: 'IN_PROCESS' });
    expect(batch).toBeDefined();
    const batchId = batch!._id.toString();

    // Consume copper: 150 kg with autoCalculateScrap flag
    const bulkRes = await request(app)
      .post(`/api/v1/production-batches/${batchId}/consumptions/bulk`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        warehouseId: wipWarehouseId,
        ownerType: 'FACTORY',
        items: [
          {
            materialId: copperMaterialId,
            consumedQuantity: 100,
            unit: 'KG',
            remarks: 'Copper rod consumed in drawing',
          },
        ],
        autoCalculateScrap: true,
        scrapWarehouseId: scrapWarehouseId,
      });
    expect(bulkRes.status).toBe(201);
    expect(bulkRes.body.data.consumptions.length).toBe(1);
    expect(bulkRes.body.data.autoGeneratedScrap.length).toBe(1);

    // Auto-calculated scrap: 100 KG * 1.5% = 1.5 KG
    const scrap = bulkRes.body.data.autoGeneratedScrap[0];
    expect(scrap.scrapQuantity).toBe(1.5);
    expect(scrap.scrapType).toBe('PROCESS_LOSS');
  });

  // 5. TEST FAILURE & REVERSAL FROM MACHINE
  it('5. should handle test failure and reverse batch work, releasing machine back to AVAILABLE', async () => {
    // Create a temporary batch to test failure reversal
    const batchRes = await request(app)
      .post(`/api/v1/production-orders/${productionOrderId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        processStageId: stageDrawingId,
        machineId: machine1Id,
        plannedQuantity: 500,
        unit: 'METER',
        remarks: 'Defective test batch',
      });
    const batchId = batchRes.body.data._id;

    // Record consumption of 50 kg copper
    await request(app)
      .post(`/api/v1/production-batches/${batchId}/consumptions/bulk`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        warehouseId: wipWarehouseId,
        ownerType: 'FACTORY',
        items: [
          {
            materialId: copperMaterialId,
            consumedQuantity: 30,
            unit: 'KG',
          },
        ],
      });

    // Quality test fails - reverse work
    const reverseRes = await request(app)
      .post(`/api/v1/production-batches/${batchId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Conductor elongation test failed below 20% limit',
        testReportNumber: 'QC-FAIL-001',
        returnUnusedWipToStore: true,
        storeWarehouseId: storeWarehouseId,
        wipWarehouseId: wipWarehouseId,
      });

    expect(reverseRes.status).toBe(200);
    expect(reverseRes.body.data.status).toBe('REJECTED');
    expect(reverseRes.body.data.machineReleased).toBe(true);

    // Verify machine is released to AVAILABLE
    const machine = await MachineModel.findById(machine1Id);
    expect(machine?.status).toBe('AVAILABLE');
    expect(machine?.currentBatchId).toBeNull();
  });

  // 6. COMPLETE STAGES & FINAL OUTPUT TO PACKAGING DRUM ACCORDING TO LENGTH
  it('6. should complete final stage and automatically package cable into drum with length and weights', async () => {
    // Create final stage batch on machine 2
    const batchRes = await request(app)
      .post(`/api/v1/production-orders/${productionOrderId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        processStageId: stageExtrusionId,
        machineId: machine2Id,
        plannedQuantity: 1000,
        unit: 'METER',
        shift: 'SHIFT_B',
        remarks: 'Final Stage Extrusion on Maillefer',
      });
    expect(batchRes.status).toBe(201);
    const batchId = batchRes.body.data._id;

    // Create production output draft with quality status PASSED and drumId
    const outputRes = await request(app)
      .post(`/api/v1/production-batches/${batchId}/outputs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        outputLengthMeters: 1000,
        outputWeightKg: 200,
        targetWarehouseId: fgWarehouseId,
        isFinalStage: true,
        drumId: drumId,
        qualityStatus: 'PASSED',
        testReportNumber: 'TR-CABLE-FINAL-001',
        remarks: 'All routine tests passed (spark test, high voltage, resistance)',
      });
    expect(outputRes.status).toBe(201);
    const outputId = outputRes.body.data._id;

    // Post production output
    const postOutputRes = await request(app)
      .post(`/api/v1/production-outputs/${outputId}/post`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(postOutputRes.status).toBe(200);

    // Verify drum was automatically filled with the cable length and gross weight
    const updatedDrum = await DrumModel.findById(drumId);
    expect(updatedDrum?.status).toBe('FILLED');
    expect(updatedDrum?.cableLengthMeters).toBe(1000);
    expect(updatedDrum?.netWeightKg).toBe(200);
    expect(updatedDrum?.grossWeightKg).toBe(350); // 150 tare + 200 net
    expect(updatedDrum?.productionOutputId?.toString()).toBe(outputId);

    // Verify DrumMovement record was logged
    const drumMovement = await DrumMovementModel.findOne({
      drumId: updatedDrum?._id,
      movementType: 'PACKING',
    });
    expect(drumMovement).toBeDefined();
    expect(drumMovement?.referenceDocumentType).toBe('ProductionOutput');
    expect(drumMovement?.referenceDocumentId?.toString()).toBe(outputId);
  });
});
