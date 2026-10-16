import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { ProductModel } from '../../src/modules/products/product.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { ProductionOrderModel } from '../../src/modules/production/production-order.model';
import { ProductionBatchModel } from '../../src/modules/production/production-batch.model';
import { ProcessStageModel } from '../../src/modules/shared/process-stage.model';
import { ProductionOutputModel } from '../../src/modules/production/production-output.model';
import { InventoryTransactionModel } from '../../src/modules/inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { DrumModel } from '../../src/modules/packing/drum.model';
import { DrumMovementModel } from '../../src/modules/packing/drum-movement.model';
import { PackingListModel } from '../../src/modules/packing/packing-list.model';
import { PackingListLineModel } from '../../src/modules/packing/packing-list-line.model';
import { DispatchModel } from '../../src/modules/dispatch/dispatch.model';
import { DispatchLineModel } from '../../src/modules/dispatch/dispatch-line.model';
import { OutboundChallanModel } from '../../src/modules/dispatch/outbound-challan.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Cable Packing, Drum Tracking, Dispatch, and Outbound Challans (Prompt 7)', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;
  let superAdminToken: string;

  // Master Data IDs
  let customerId: string;
  let productId: string;
  let fgWarehouseId: string;
  let workOrderId: string;
  let productionOrderId: string;
  let productionBatchId: string;
  let processStageId: string;

  // Drum IDs
  let drum1Id: string;
  let drum2Id: string;
  let drum3Id: string;
  let drum4Id: string;
  let damagedDrumId: string;
  let dispatch1Id: string;
  let dispatch2Id: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Bootstrap Super Admin
    const superAdmin = await UserModel.create({
      employeeCode: 'EMP-SA-DSP',
      email: 'sa.dsp@mfolks.com',
      passwordHash: 'hashed_pass_sa',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
    });
    superAdminToken = TokenUtil.generateAccessToken({
      userId: superAdmin._id.toString(),
      email: superAdmin.email,
      role: superAdmin.role,
    });

    // Bootstrap Admin
    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-DSP',
      email: 'adm.dsp@mfolks.com',
      passwordHash: 'hashed_pass_adm',
      firstName: 'Dispatch',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'DISPATCH',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    // Master Data: Customer
    const customer = await CustomerModel.create({
      code: 'CUST-HAVELLS',
      name: 'Havells India Ltd',
      legalName: 'Havells India Limited',
      contactPerson: 'Sunil Verma',
      email: 'sunil.verma@havells.com',
      phone: '+919876543210',
      gstin: '07AAACH1234A1Z5',
      billingAddress: {
        street: 'QRG Towers, 2D Expressway',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201304',
        country: 'India',
      },
      isActive: true,
    });
    customerId = customer._id.toString();

    // Master Data: Finished Goods Warehouse
    const fgWh = await WarehouseModel.create({
      code: 'FG-WH-01',
      name: 'Finished Goods Central Warehouse',
      type: 'FINISHED_GOODS',
      address: 'Plant Bay 4, Vadodara, Gujarat - 390010',
      isActive: true,
    });
    fgWarehouseId = fgWh._id.toString();

    // Master Data: Product
    const product = await ProductModel.create({
      code: 'CBL-3C-2.5',
      name: '1.1kV 3C x 2.5 sqmm XLPE Armoured Cable',
      cableCategory: 'LT_POWER',
      voltageGrade: '1.1KV',
      coreCount: 3,
      crossSectionSqMm: 2.5,
      conductorMaterial: 'COPPER',
      insulationType: 'XLPE',
      armourType: 'STRIP_ARMOURED',
      outerSheath: 'PVC_ST1',
      baseUnit: 'METER',
      isActive: true,
    });
    productId = product._id.toString();

    // Process Stage
    const stage = await ProcessStageModel.create({
      code: 'STG-TEST-SHEATH',
      name: 'Outer Sheathing & Spark Testing',
      stageType: 'SHEATHING',
      sequenceOrder: 4,
      isActive: true,
    });
    processStageId = stage._id.toString();

    // Work Order: 5000m
    const workOrder = await WorkOrderModel.create({
      workOrderNumber: 'WO-2026-DSP-001',
      customerId: customer._id,
      productId: product._id,
      bomVersionId: new mongoose.Types.ObjectId(),
      orderedLengthMeters: 5000,
      deliveredLengthMeters: 0,
      targetDeliveryDate: new Date(Date.now() + 86400000 * 14),
      customerPoNumber: 'PO-HVL-2026-889',
      customerPoDate: new Date(),
      status: 'IN_PROGRESS',
    });
    workOrderId = workOrder._id.toString();

    // Production Order & Batch
    const prodOrder = await ProductionOrderModel.create({
      productionOrderNumber: 'PO-2026-001',
      workOrderId: workOrder._id,
      customerId: customer._id,
      productId: product._id,
      bomVersionId: workOrder.bomVersionId,
      plannedLengthMeters: 5000,
      producedLengthMeters: 5000,
      startDate: new Date(),
      targetCompletionDate: new Date(Date.now() + 86400000 * 7),
      status: 'IN_PROGRESS',
    });
    productionOrderId = prodOrder._id.toString();

    const batch = await ProductionBatchModel.create({
      batchNumber: 'BAT-2026-001',
      productionOrderId: prodOrder._id,
      workOrderId: workOrder._id,
      processStageId: stage._id,
      machineCode: 'EXT-01',
      plannedQuantity: 5000,
      completedQuantity: 5000,
      unit: 'METER',
      status: 'COMPLETED',
    });
    productionBatchId = batch._id.toString();

    // Eligible Production Output (Prompt 6 linkage): 5000m PASSED and POSTED
    await ProductionOutputModel.create({
      outputNumber: 'OUT-2026-001',
      productionOrderId: prodOrder._id,
      productionBatchId: batch._id,
      workOrderId: workOrder._id,
      productId: product._id,
      processStageId: stage._id,
      outputLengthMeters: 5000,
      outputWeightKg: 1250,
      targetWarehouseId: fgWh._id,
      isFinalStage: true,
      qualityStatus: 'PASSED',
      status: 'POSTED',
      postedAt: new Date(),
    });

    // Stock Ledger & Balance for Finished Goods: 5000m on-hand
    await InventoryBalanceModel.create({
      materialId: product._id,
      warehouseId: fgWh._id,
      ownerType: 'CUSTOMER',
      customerId: customer._id,
      quantityOnHand: 5000,
      quantityAvailable: 5000,
      quantityReserved: 0,
      unit: 'METER',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // SUITE 1: Drum Management & Strict Measurement Separation
  // =========================================================================
  describe('1. Drum Management & Separate Measurements', () => {
    it('Scenario 1: Creates drum with separate length, tare, net, and gross weights', async () => {
      const res = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-2026-001',
          drumType: 'WOODEN',
          serialNumber: 'SN-W-1001',
          tareWeightKg: 150, // Empty drum tare weight
          netWeightKg: 250, // Pure cable weight
          grossWeightKg: 405, // Cable + drum + 5kg packaging
          cableLengthMeters: 1000, // Explicit length in meters
          currentProductId: productId,
          customerId: customerId,
          workOrderId: workOrderId,
          currentWarehouseId: fgWarehouseId,
          status: 'AVAILABLE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.drumNumber).toBe('DRM-2026-001');
      expect(res.body.data.cableLengthMeters).toBe(1000);
      expect(res.body.data.tareWeightKg).toBe(150);
      expect(res.body.data.netWeightKg).toBe(250);
      expect(res.body.data.grossWeightKg).toBe(405);
      expect(res.body.data.status).toBe('AVAILABLE');
      drum1Id = res.body.data._id;

      // Verify CREATED drum movement recorded
      const movements = await DrumMovementModel.find({ drumId: drum1Id });
      expect(movements.length).toBe(1);
      expect(movements[0].movementType).toBe('CREATED');
    });

    it('Scenario 2: Prevents duplicate drum numbers', async () => {
      const res = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-2026-001', // Duplicate
          drumType: 'WOODEN',
          tareWeightKg: 150,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 3: Validates positive tare weight and non-negative measurements', async () => {
      const res = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-INVALID',
          tareWeightKg: -10, // Invalid tare weight
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 4: Registers additional drums for partial packing & dispatch testing', async () => {
      // Drum 2: 1500m
      const res2 = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-2026-002',
          drumType: 'WOODEN',
          tareWeightKg: 180,
          netWeightKg: 375,
          grossWeightKg: 555,
          cableLengthMeters: 1500,
          currentProductId: productId,
          customerId: customerId,
          workOrderId: workOrderId,
          currentWarehouseId: fgWarehouseId,
          status: 'AVAILABLE',
        });
      expect(res2.status).toBe(201);
      drum2Id = res2.body.data._id;

      // Drum 3: 1500m
      const res3 = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-2026-003',
          drumType: 'STEEL',
          tareWeightKg: 220,
          netWeightKg: 375,
          grossWeightKg: 595,
          cableLengthMeters: 1500,
          currentProductId: productId,
          customerId: customerId,
          workOrderId: workOrderId,
          currentWarehouseId: fgWarehouseId,
          status: 'AVAILABLE',
        });
      expect(res3.status).toBe(201);
      drum3Id = res3.body.data._id;

      // Drum 4: 1000m
      const res4 = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-2026-004',
          drumType: 'WOODEN',
          tareWeightKg: 150,
          netWeightKg: 250,
          grossWeightKg: 400,
          cableLengthMeters: 1000,
          currentProductId: productId,
          customerId: customerId,
          workOrderId: workOrderId,
          currentWarehouseId: fgWarehouseId,
          status: 'AVAILABLE',
        });
      expect(res4.status).toBe(201);
      drum4Id = res4.body.data._id;

      // Damaged Drum: 500m (ineligible)
      const resDamaged = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-2026-DAMAGED',
          drumType: 'WOODEN',
          tareWeightKg: 150,
          cableLengthMeters: 500,
          customerId: customerId,
          status: 'DAMAGED',
        });
      expect(resDamaged.status).toBe(201);
      damagedDrumId = resDamaged.body.data._id;
    });

    it('Scenario 5: Retrieves drum details and movement history', async () => {
      const getRes = await request(app)
        .get(`/api/v1/drums/${drum1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.drumNumber).toBe('DRM-2026-001');

      const histRes = await request(app)
        .get(`/api/v1/drums/${drum1Id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(histRes.status).toBe(200);
      expect(histRes.body.data.drum._id).toBe(drum1Id);
      expect(histRes.body.data.movements.length).toBe(1);
      expect(histRes.body.data.movements[0].movementType).toBe('CREATED');
    });
  });

  // =========================================================================
  // SUITE 2: Packing List Management & Eligible Output Verification
  // =========================================================================
  describe('2. Packing List Management & Output Verification', () => {
    let packingList1Id: string;
    let packingList2Id: string;

    it('Scenario 6: Creating a draft packing list does NOT change finished-goods stock', async () => {
      const initialBalance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(initialBalance?.quantityOnHand).toBe(5000);

      // Create draft packing list 1: Drum 1 (1000m) + Drum 2 (1500m) = 2500m
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          packingWarehouseId: fgWarehouseId,
          remarks: 'First partial packing batch',
          lines: [
            {
              drumId: drum1Id,
              lengthMeters: 1000,
              tareWeightKg: 150,
              netWeightKg: 250,
              grossWeightKg: 405,
            },
            {
              drumId: drum2Id,
              lengthMeters: 1500,
              tareWeightKg: 180,
              netWeightKg: 375,
              grossWeightKg: 555,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.totalDrums).toBe(2);
      expect(res.body.data.totalLengthMeters).toBe(2500);
      expect(res.body.data.totalTareWeightKg).toBe(330);
      expect(res.body.data.totalNetWeightKg).toBe(625);
      expect(res.body.data.totalGrossWeightKg).toBe(960);
      packingList1Id = res.body.data._id;

      // Verify finished goods stock remains completely untouched in DRAFT
      const afterBalance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(afterBalance?.quantityOnHand).toBe(5000);

      // Verify no outward inventory transactions created
      const outwardTxns = await InventoryTransactionModel.find({
        materialId: productId,
        movementType: 'OUTWARD',
      });
      expect(outwardTxns.length).toBe(0);
    });

    it('Scenario 7: Prevents duplicate drum in the same packing list', async () => {
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [
            { drumId: drum3Id, lengthMeters: 1500 },
            { drumId: drum3Id, lengthMeters: 1500 }, // Duplicate drumId
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Duplicate drums');
    });

    it('Scenario 8: Prevents packing damaged or ineligible drums', async () => {
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [{ drumId: damagedDrumId, lengthMeters: 500 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('DAMAGED');
    });

    it('Scenario 9: Finalizing packing list (POST /pack) locks drums and records PACKING movement without issuing inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/packing-lists/${packingList1Id}/pack`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PACKED');

      // Verify drums are now PACKED
      const drum1 = await DrumModel.findById(drum1Id);
      const drum2 = await DrumModel.findById(drum2Id);
      expect(drum1?.status).toBe('PACKED');
      expect(drum2?.status).toBe('PACKED');
      expect(drum1?.packingListId?.toString()).toBe(packingList1Id);

      // Verify PACKING drum movements recorded
      const d1Movements = await DrumMovementModel.find({
        drumId: drum1Id,
        movementType: 'PACKING',
      });
      expect(d1Movements.length).toBe(1);
      expect(d1Movements[0].referenceDocumentType).toBe('PackingList');

      // Crucial: finished goods balance still untouched (packing is logical allocation only)
      const balance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(balance?.quantityOnHand).toBe(5000);
    });

    it('Scenario 10: Prevents packing an already PACKED drum again', async () => {
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [{ drumId: drum1Id, lengthMeters: 1000 }], // Already packed in packingList1
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("already in status 'PACKED'");
    });

    it('Scenario 11: Supports partial packing across multiple packing lists', async () => {
      // Packing List 2: Drum 3 (1500m)
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [
            {
              drumId: drum3Id,
              lengthMeters: 1500,
              tareWeightKg: 220,
              netWeightKg: 375,
              grossWeightKg: 595,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.totalLengthMeters).toBe(1500);
      packingList2Id = res.body.data._id;

      // Pack packing list 2
      const packRes = await request(app)
        .post(`/api/v1/packing-lists/${packingList2Id}/pack`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(packRes.status).toBe(200);
      expect(packRes.body.data.status).toBe('PACKED');

      const drum3 = await DrumModel.findById(drum3Id);
      expect(drum3?.status).toBe('PACKED');
    });

    it('Scenario 12: Prevents packing more cable than available eligible finished output', async () => {
      // Total good output = 5000m. Already packed = 2500 + 1500 = 4000m. Remaining available = 1000m.
      // Trying to pack Drum 4 (1000m) works, but trying to pack 1500m exceeds output!
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [{ drumId: drum4Id, lengthMeters: 1500 }], // Drum 4 has 1000m, passing 1500m exceeds available (1000m)
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds available finished output');
    });

    it('Scenario 13: Pack remaining eligible 1000m into Drum 4', async () => {
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [
            {
              drumId: drum4Id,
              lengthMeters: 1000,
              tareWeightKg: 150,
              netWeightKg: 250,
              grossWeightKg: 400,
            },
          ],
        });

      expect(res.status).toBe(201);
      const pkl3Id = res.body.data._id;

      const packRes = await request(app)
        .post(`/api/v1/packing-lists/${pkl3Id}/pack`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(packRes.status).toBe(200);

      // Now all 5000m are packed across drums 1, 2, 3, 4!
      const drum4 = await DrumModel.findById(drum4Id);
      expect(drum4?.status).toBe('PACKED');
    });

    it('Scenario 14: Packing summary reflects correct packed vs good output quantities', async () => {
      const summaryRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/packing-summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.workOrderNumber).toBe('WO-2026-DSP-001');
      expect(summaryRes.body.data.goodOutputMeters).toBe(5000);
      expect(summaryRes.body.data.totalPackedMeters).toBe(5000);
      expect(summaryRes.body.data.remainingUnpackedMeters).toBe(0);
      expect(summaryRes.body.data.packingLists.length).toBe(3);
    });
  });

  // =========================================================================
  // SUITE 3: Dispatch Management & Single-Movement Stock Posting
  // =========================================================================
  describe('3. Dispatch Management & Atomic Stock Posting', () => {
    it('Scenario 15: Draft dispatch does NOT reduce finished-goods stock', async () => {
      const beforeBalance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(beforeBalance?.quantityOnHand).toBe(5000);

      // Create draft dispatch 1: Drum 1 (1000m) + Drum 2 (1500m) = 2500m
      const res = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          sourceWarehouseId: fgWarehouseId,
          destinationAddress: 'Havells Logistics Hub, Greater Noida, UP',
          vehicleNumber: 'GJ-06-AX-4421',
          transporter: 'V-Trans Express',
          driverName: 'Ramesh Patel',
          driverPhone: '+919898989898',
          lrNumber: 'LR-2026-9901',
          eWayBillNumber: 'EWB-241234567890',
          lines: [
            {
              drumId: drum1Id,
              lengthMeters: 1000,
              tareWeightKg: 150,
              netWeightKg: 250,
              grossWeightKg: 405,
            },
            {
              drumId: drum2Id,
              lengthMeters: 1500,
              tareWeightKg: 180,
              netWeightKg: 375,
              grossWeightKg: 555,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.totalDrums).toBe(2);
      expect(res.body.data.totalLengthMeters).toBe(2500);
      expect(res.body.data.totalGrossWeightKg).toBe(960);
      dispatch1Id = res.body.data._id;

      // Finished goods inventory remains untouched in draft
      const afterBalance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(afterBalance?.quantityOnHand).toBe(5000);
    });

    it('Scenario 16: Prevents dispatching unpacked or ineligible drums', async () => {
      const res = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [{ drumId: damagedDrumId, lengthMeters: 500 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be dispatched');
    });

    it('Scenario 17: Finalizing dispatch (POST /dispatch) posts stock movement and sets drum status to DISPATCHED', async () => {
      const res = await request(app)
        .post(`/api/v1/dispatches/${dispatch1Id}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', 'IDEMP-DSP-POST-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DISPATCHED');
      expect(res.body.data.dispatchedAt).toBeDefined();

      // Verify drums are atomically marked DISPATCHED
      const drum1 = await DrumModel.findById(drum1Id);
      const drum2 = await DrumModel.findById(drum2Id);
      expect(drum1?.status).toBe('DISPATCHED');
      expect(drum2?.status).toBe('DISPATCHED');
      expect(drum1?.dispatchId?.toString()).toBe(dispatch1Id);

      // Verify DISPATCH drum movements recorded
      const d1Movements = await DrumMovementModel.find({
        drumId: drum1Id,
        movementType: 'DISPATCH',
      });
      expect(d1Movements.length).toBe(1);
      expect(d1Movements[0].referenceDocumentType).toBe('Dispatch');

      // Verify inventory movement posted EXACTLY ONCE
      const txns = await InventoryTransactionModel.find({
        sourceDocumentId: dispatch1Id,
        sourceDocumentType: 'DISPATCH',
      });
      expect(txns.length).toBe(2); // One per drum line
      expect(txns[0].movementType).toBe('OUTWARD');
      expect(txns[0].transactionType).toBe('DISPATCH');
      expect(txns[0].status).toBe('POSTED');

      // Verify Finished Goods stock balance decremented by 2500m (5000 - 2500 = 2500m)
      const afterBalance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(afterBalance?.quantityOnHand).toBe(2500);
    });

    it('Scenario 18: Prevents double dispatch or duplicate posting on repeated request', async () => {
      const res = await request(app)
        .post(`/api/v1/dispatches/${dispatch1Id}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already POSTED / DISPATCHED');

      // Stock balance remains 2500m, NOT decremented a second time
      const balance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(balance?.quantityOnHand).toBe(2500);
    });

    it('Scenario 19: Prevents dispatching the same drum in a second dispatch document', async () => {
      const res = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          lines: [{ drumId: drum1Id, lengthMeters: 1000 }], // Already dispatched in dispatch1!
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be dispatched');
    });

    it('Scenario 20: Supports partial dispatch of remaining packed drums in a second dispatch', async () => {
      // Dispatch 2: Drum 3 (1500m) + Drum 4 (1000m) = 2500m
      const createRes = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: workOrderId,
          customerId: customerId,
          sourceWarehouseId: fgWarehouseId,
          destinationAddress: 'Havells Logistics Hub, Greater Noida, UP',
          vehicleNumber: 'GJ-06-AX-8812',
          transporter: 'SafeXpress Logistics',
          lines: [
            {
              drumId: drum3Id,
              lengthMeters: 1500,
              tareWeightKg: 220,
              netWeightKg: 375,
              grossWeightKg: 595,
            },
            {
              drumId: drum4Id,
              lengthMeters: 1000,
              tareWeightKg: 150,
              netWeightKg: 250,
              grossWeightKg: 400,
            },
          ],
        });

      expect(createRes.status).toBe(201);
      dispatch2Id = createRes.body.data._id;

      // Post dispatch 2
      const postRes = await request(app)
        .post(`/api/v1/dispatches/${dispatch2Id}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(postRes.status).toBe(200);
      expect(postRes.body.data.status).toBe('DISPATCHED');

      // Stock is now 2500 - 2500 = 0m
      const balance = await InventoryBalanceModel.findOne({
        materialId: productId,
        warehouseId: fgWarehouseId,
      });
      expect(balance?.quantityOnHand).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 4: Outbound Challan Generation & Printable Documentation
  // =========================================================================
  describe('4. Outbound Challan Generation & Print Data', () => {
    let challan1Id: string;

    it('Scenario 21: Generates outbound delivery challan from finalized dispatch', async () => {
      const res = await request(app)
        .post(`/api/v1/dispatches/${dispatch1Id}/generate-outbound-challan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryTerms: 'Door Delivery / Job Work Return Under Rule 4(5)(a)',
          remarks: 'First consignment of 2500m cable drums',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.challanNumber).toMatch(/^OBC-\d{4}/);
      expect(res.body.data.dispatchId).toBe(dispatch1Id);
      expect(res.body.data.totalDrums).toBe(2);
      expect(res.body.data.totalLengthMeters).toBe(2500);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.items[0].drumNumber).toBeDefined();
      expect(res.body.data.status).toBe('ISSUED');
      challan1Id = res.body.data._id;
    });

    it('Scenario 22: Prevents duplicate challan generation for the same dispatch', async () => {
      const res = await request(app)
        .post(`/api/v1/dispatches/${dispatch1Id}/generate-outbound-challan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          remarks: 'Attempting duplicate challan generation',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already been generated');
    });

    it('Scenario 23: Prevents generating outbound challan for a draft dispatch', async () => {
      // Create a draft dispatch (no lines)
      const draft = await DispatchModel.create({
        dispatchNumber: 'DSP-2026-DRAFT',
        workOrderId: workOrderId,
        customerId: customerId,
        status: 'DRAFT',
      });

      const res = await request(app)
        .post(`/api/v1/dispatches/${draft._id}/generate-outbound-challan`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('only be generated for a finalized DISPATCHED shipment');
    });

    it('Scenario 24: Retrieves structured print-data for printable delivery challan/PDF', async () => {
      const res = await request(app)
        .get(`/api/v1/outbound-challans/${challan1Id}/print-data`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const printData = res.body.data;
      expect(printData.companyHeader.companyName).toBe('Mfolks Cables Private Limited');
      expect(printData.companyHeader.documentTitle).toContain('DELIVERY CHALLAN');
      expect(printData.consignee.customerName).toBe('Havells India Ltd');
      expect(printData.workOrder.workOrderNumber).toBe('WO-2026-DSP-001');
      expect(printData.transport.vehicleNumber).toBe('GJ-06-AX-4421');
      expect(printData.transport.transporter).toBe('V-Trans Express');
      expect(printData.items.length).toBe(2);
      expect(printData.totals.totalDrums).toBe(2);
      expect(printData.totals.totalLengthMeters).toBe(2500);
      expect(printData.signatories.authorizedSignatory).toBeDefined();
    });

    it('Scenario 25: Lists outbound challans with pagination and filtering', async () => {
      const res = await request(app)
        .get(`/api/v1/outbound-challans?customerId=${customerId}&status=ISSUED`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.pagination.total).toBe(1);
    });
  });

  // =========================================================================
  // SUITE 5: Full Traceability & Work-Order/Customer Summaries
  // =========================================================================
  describe('5. Traceability, Drum Movement History & Order Summaries', () => {
    it('Scenario 26: Complete drum lifecycle history preserves CREATED, PACKING, and DISPATCH events', async () => {
      const res = await request(app)
        .get(`/api/v1/drums/${drum1Id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.drum.drumNumber).toBe('DRM-2026-001');
      expect(res.body.data.drum.status).toBe('DISPATCHED');

      const movements = res.body.data.movements;
      expect(movements.length).toBe(3);

      const types = movements.map((m: { movementType: string }) => m.movementType);
      expect(types).toContain('CREATED');
      expect(types).toContain('PACKING');
      expect(types).toContain('DISPATCH');
    });

    it('Scenario 27: Work order dispatch summary correctly reflects 100% fulfillment without double counting', async () => {
      const res = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/dispatch-summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.workOrderNumber).toBe('WO-2026-DSP-001');
      expect(res.body.data.orderedLengthMeters).toBe(5000);
      expect(res.body.data.totalDispatchedMeters).toBe(5000);
      expect(res.body.data.totalDrumsDispatched).toBe(4);
      expect(res.body.data.fulfillmentPercentage).toBe(100);
      expect(res.body.data.dispatches.length).toBe(3);
    });

    it('Scenario 28: Customer dispatch history shows all shipments and outbound challan numbers', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customerId}/dispatch-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customerCode).toBe('CUST-HAVELLS');
      expect(res.body.data.totalDispatches).toBe(3);

      const dispatches = res.body.data.dispatches;
      expect(dispatches.length).toBe(3);

      const firstDisp = dispatches.find(
        (d: { dispatchId: string }) => d.dispatchId.toString() === dispatch1Id,
      );
      expect(firstDisp).toBeDefined();
      expect(firstDisp.outboundChallanNumber).toMatch(/^OBC-\d{4}/);
      expect(firstDisp.drums.length).toBe(2);
    });

    it('Scenario 29: Authentication and role-based access control enforcement', async () => {
      // Unauthenticated request rejected
      const unauthRes = await request(app).get('/api/v1/drums');
      expect(unauthRes.status).toBe(401);

      // Super Admin access allowed
      const saRes = await request(app)
        .get('/api/v1/dispatches')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(saRes.status).toBe(200);

      // Regular Admin access allowed
      const admRes = await request(app)
        .get('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(admRes.status).toBe(200);
    });
  });
});
