import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { TestFactories } from '../helpers/factories';
import { TestEnvironment } from '../helpers/test-env';
import { MaterialLotModel } from '../../src/modules/materials/material-lot.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { InventoryTransactionModel } from '../../src/modules/inventory/inventory-transaction.model';
import { DrumModel } from '../../src/modules/packing/drum.model';

/**
 * End-to-End Automated Manufacturing Lifecycle & Deterministic Material Reconciliation Test Suite
 * Covers Prompts 1-8 / Sections 10-12:
 * Customer -> Inbound Challan -> QC Approval -> Lot Creation -> Work Order -> BOM Snapshot ->
 * Reservation -> Release -> Production Order -> Batch -> Issue (Store->WIP) -> Actual Consumption ->
 * Unused Return -> Scrap -> Production Output & QC -> Drums -> Packing -> Dispatch ->
 * Outbound Challan -> Customer Material Reconciliation & Bidirectional Traceability.
 */
describe('E2E Manufacturing Lifecycle & Deterministic Material Reconciliation', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;
  let superAdminToken: string;

  // Master Data IDs
  let customerAId: string;
  let customerBId: string;
  let aluminumMaterialId: string;
  let cableProductId: string;
  let bomVersionId: string;
  let processStageId: string;
  let storeWarehouseId: string;
  let wipWarehouseId: string;
  let fgWarehouseId: string;
  let scrapWarehouseId: string;

  // Transactional IDs
  let inboundChallanId: string;
  let materialLotId: string;
  let workOrderId: string;
  let productionOrderId: string;
  let productionBatchId: string;
  let materialIssueId: string;
  let productionOutputId: string;
  let drumId: string;
  let packingListId: string;
  let dispatchId: string;
  let outboundChallanId: string;

  beforeAll(async () => {
    // 1. Setup isolated in-memory replica set
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    TestEnvironment.assertTestDatabase(uri);
    await mongoose.connect(uri);

    // 2. Pre-create collections to prevent WiredTiger transaction catalog change errors
    await InventoryTransactionModel.createCollection();
    await InventoryBalanceModel.createCollection();
    await MaterialLotModel.createCollection();

    // 3. Bootstrap Super Admin & Admin Users
    const { token: saToken } = await TestFactories.createSuperAdmin({
      employeeCode: 'EMP-SA-E2E',
      email: 'superadmin.e2e@mfolks.com',
    });
    superAdminToken = saToken;

    const { token: admToken } = await TestFactories.createAdmin({
      employeeCode: 'EMP-ADM-E2E',
      email: 'admin.e2e@mfolks.com',
    });
    adminToken = admToken;

    // 3. Create Master Customers
    const custA = await TestFactories.createCustomer({
      code: 'CUST-APEX-E2E',
      name: 'Apex PowerGrid Corporation',
      contactPerson: 'Suresh Singhal',
    });
    customerAId = custA._id.toString();

    const custB = await TestFactories.createCustomer({
      code: 'CUST-HAV-E2E',
      name: 'Havells India Ltd',
      contactPerson: 'Vikas Sharma',
    });
    customerBId = custB._id.toString();

    // 4. Create Physical Warehouses
    const whStore = await TestFactories.createWarehouse('RAW_MATERIAL', {
      code: 'WH-STORE-E2E',
      name: 'Main Raw Material Store',
      location: 'Plant 1 Shed A',
    });
    storeWarehouseId = whStore._id.toString();

    const whWip = await TestFactories.createWarehouse('WORK_IN_PROGRESS', {
      code: 'WH-WIP-E2E',
      name: 'Shopfloor WIP Bay 1',
      location: 'Plant 1 Bay 1',
    });
    wipWarehouseId = whWip._id.toString();

    const whFg = await TestFactories.createWarehouse('FINISHED_GOODS', {
      code: 'WH-FG-E2E',
      name: 'Finished Cable Yard',
      location: 'Yard Gate 2',
    });
    fgWarehouseId = whFg._id.toString();

    const whScrap = await TestFactories.createWarehouse('SCRAP', {
      code: 'WH-SCRAP-E2E',
      name: 'Plant Scrap Yard',
      location: 'Rear Yard',
    });
    scrapWarehouseId = whScrap._id.toString();

    // 5. Create Raw Material (Aluminum Wire Rod 9.5mm EC Grade)
    const matAl = await TestFactories.createMaterial('ALUMINUM', {
      code: 'MAT-AL-95-E2E',
      name: 'EC Grade Aluminum Rod 9.5mm',
      baseUnit: 'KG',
    });
    aluminumMaterialId = matAl._id.toString();

    // 6. Create Process Stage (Stranding & Drawing)
    const stage = await TestFactories.createProcessStage('STAGE-STRAND-E2E', 'Wire Stranding Line', 1);
    processStageId = stage._id.toString();

    // 7. Create Cable Product (1.1kV 4C x 70 sq.mm Al Cable)
    const product = await TestFactories.createProduct({
      code: 'CBL-4C70-E2E',
      name: '1.1kV 4C x 70 sq.mm Armoured Cable',
      conductorMaterial: 'ALUMINUM',
    });
    cableProductId = product._id.toString();

    // 8. Create Bill of Materials: 1,000 meters requires 520 kg Aluminum (0% scrap nominal)
    const { bomVersion } = await TestFactories.createBom(
      cableProductId,
      [
        {
          materialId: aluminumMaterialId,
          quantityPerUnit: 520,
          scrapTolerancePercentage: 0,
          processStageId,
          stageSequence: 1,
        },
      ],
      1,
      'ACTIVE',
    );
    bomVersionId = bomVersion._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // STAGE 1: Customer Inbound Delivery & QC Receipt (1,000 KG Received)
  // =========================================================================
  describe('Stage 1: Customer Material Receipt & Segregated Stock Inward', () => {
    it('1.1 should create draft inbound challan for Customer A with 1,000 KG Aluminum', async () => {
      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'CH-APEX-2026-001',
          customerChallanDate: new Date().toISOString(),
          warehouseId: storeWarehouseId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          vehicleNumber: 'HR-55-AA-1001',
          transporterName: 'VRL Logistics',
          lrNumber: 'LR-APEX-001',
          remarks: 'Initial coil consignment for 1000m cable order',
          lines: [
            {
              materialId: aluminumMaterialId,
              declaredQuantity: 1000.0,
              receivedQuantity: 1000.0,
              unit: 'KG',
              supplierLotNumber: 'SUPP-COIL-01',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      inboundChallanId = res.body.data._id;
    });

    it('1.2 should post inbound challan atomically creating MaterialLot and Store Balance', async () => {
      const res = await request(app)
        .post(`/api/v1/inbound-challans/${inboundChallanId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', 'IDEMP-E2E-CHALLAN-001')
        .send({ remarks: 'QC Conductivity 61% IACS approved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('POSTED');

      // Verify MaterialLot was generated in DB
      const lot = await MaterialLotModel.findOne({ inboundChallanId });
      expect(lot).not.toBeNull();
      expect(lot?.initialQuantity).toBe(1000.0);
      expect(lot?.currentBalance).toBe(1000.0);
      materialLotId = lot!._id.toString();

      // Verify Store InventoryBalance: 1,000 KG on-hand, 1,000 KG available
      const storeBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });

      expect(storeBal).not.toBeNull();
      expect(storeBal?.quantityOnHand).toBe(1000.0);
      expect(storeBal?.quantityAvailable).toBe(1000.0);
      expect(storeBal?.quantityReserved).toBe(0.0);
      expect(storeBal?.ownerType).toBe('CUSTOMER');

      // Verify Inward Ledger Transaction
      const txn = await InventoryTransactionModel.findOne({
        sourceDocumentId: inboundChallanId,
        movementType: 'INWARD',
        transactionType: 'RECEIPT',
      });
      expect(txn).not.toBeNull();
      expect(txn?.quantity).toBe(1000.0);
      expect(txn?.status).toBe('POSTED');
    });

    it('1.3 should reject Customer B from accessing Customer A stock (Segregation Guard)', async () => {
      // Check stock availability for Customer B
      const custBBalance = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerBId),
      });
      expect(custBBalance).toBeNull(); // Customer B has 0 stock
    });
  });

  // =========================================================================
  // STAGE 2: Work Order Creation, BOM Freezing & Material Reservation
  // =========================================================================
  describe('Stage 2: Work Order, Immutable BOM Snapshotting & Reservation', () => {
    it('2.1 should create Work Order for 1,000 meters cable in DRAFT', async () => {
      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 1000,
          customerPoNumber: 'PO-APEX-2026-E2E',
          targetDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.orderedLengthMeters).toBe(1000);
      workOrderId = res.body.data._id;
    });

    it('2.2 confirming work order freezes an immutable BOM snapshot', async () => {
      const res = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.bomSnapshot).toBeDefined();
      expect(res.body.data.bomSnapshot.items[0].quantityPerUnit).toBe(520);
    });

    it('2.3 should reserve 520 KG material reducing available stock without reducing on-hand', async () => {
      const res = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/reserve-materials`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify Store Balance: physical on-hand is STILL 1,000 KG!
      const storeBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });

      expect(storeBal?.quantityOnHand).toBe(1000.0);
      expect(storeBal?.quantityReserved).toBe(520.0);
      expect(storeBal?.quantityAvailable).toBe(480.0); // 1000 - 520 = 480 available

      // Release reservation so that shopfloor issue of 600 KG can proceed
      const relRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/release-reservations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(relRes.status).toBe(200);
    });
  });

  // =========================================================================
  // STAGE 3: Production Execution & Deterministic Material Flow
  // =========================================================================
  describe('Stage 3: Shopfloor Production & Deterministic Material Flow', () => {
    it('3.1 should create Production Order and Machine Batch', async () => {
      const poRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/production-orders`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plannedLengthMeters: 1000,
          targetCompletionDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        });

      expect(poRes.status).toBe(201);
      productionOrderId = poRes.body.data._id;

      const batRes = await request(app)
        .post(`/api/v1/production-orders/${productionOrderId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          processStageId,
          machineCode: 'STRAND-01',
          plannedQuantity: 1000,
        });

      expect(batRes.status).toBe(201);
      productionBatchId = batRes.body.data._id;
    });

    it('3.2 should issue 600 KG from Store to WIP (Issue != Consumption)', async () => {
      const issueRes = await request(app)
        .post(`/api/v1/production-orders/${productionOrderId}/material-issues`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceWarehouseId: storeWarehouseId,
          destinationWarehouseId: wipWarehouseId,
          lines: [
            {
              materialId: aluminumMaterialId,
              lotId: materialLotId,
              ownerType: 'CUSTOMER_OWNED',
              customerId: customerAId,
              issuedQuantity: 600.0,
              unit: 'KG',
            },
          ],
        });

      expect(issueRes.status).toBe(201);
      materialIssueId = issueRes.body.data._id;

      // Post the Material Issue slip
      const postRes = await request(app)
        .post(`/api/v1/material-issues/${materialIssueId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(postRes.status).toBe(200);

      // Verify Stock Balances:
      // Store on-hand: 1000 - 600 = 400 KG
      const storeBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(storeBal?.quantityOnHand).toBe(400.0);

      // WIP on-hand: 600 KG
      const wipBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBal?.quantityOnHand).toBe(600.0);

      // Check Requirements: Actual consumption MUST still be 0!
      const reqRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-requirements`)
        .set('Authorization', `Bearer ${adminToken}`);

      const req = reqRes.body.data.requirements[0];
      expect(req.actualIssuedQuantity).toBe(600.0);
      expect(req.actualConsumedQuantity).toBe(0.0);
      expect(req.remainingInWipQuantity).toBe(600.0);
    });

    it('3.3 should record actual consumption of 520 KG (WIP drops from 600 to 80 KG)', async () => {
      const res = await request(app)
        .post(`/api/v1/production-batches/${productionBatchId}/consumption`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: aluminumMaterialId,
          lotId: materialLotId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          warehouseId: wipWarehouseId,
          consumedQuantity: 520.0,
          unit: 'KG',
          remarks: 'Stranded into 4 cores',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.consumedQuantity).toBe(520.0);

      // Verify WIP on-hand balance is now 600 - 520 = 80 KG
      const wipBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBal?.quantityOnHand).toBe(80.0);
    });

    it('3.4 should return 50 KG unused material from WIP to Store (WIP: 30 KG, Store: 450 KG)', async () => {
      const res = await request(app)
        .post(`/api/v1/production-batches/${productionBatchId}/material-returns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: aluminumMaterialId,
          lotId: materialLotId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          sourceWarehouseId: wipWarehouseId,
          destinationWarehouseId: storeWarehouseId,
          returnQuantity: 50.0,
          unit: 'KG',
          reason: 'Excess drawing rod coils returned to store',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.returnQuantity).toBe(50.0);

      // Verify WIP on-hand: 80 - 50 = 30 KG
      const wipBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBal?.quantityOnHand).toBe(30.0);

      // Verify Store on-hand: 400 + 50 = 450 KG
      const storeBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(storeBal?.quantityOnHand).toBe(450.0);
    });

    it('3.5 should record 10 KG scrap / process loss (WIP drops from 30 to 20 KG)', async () => {
      const res = await request(app)
        .post(`/api/v1/production-batches/${productionBatchId}/scrap`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: aluminumMaterialId,
          lotId: materialLotId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          sourceWarehouseId: wipWarehouseId,
          scrapWarehouseId,
          scrapType: 'ALUMINUM_SCRAP',
          scrapCategory: 'SALEABLE',
          scrapQuantity: 10.0,
          unit: 'KG',
          reason: 'Wire end trims and string-up loss',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.scrapQuantity).toBe(10.0);

      // Verify WIP on-hand: 30 - 10 = 20 KG
      const wipBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBal?.quantityOnHand).toBe(20.0);
    });

    it('3.6 should record production output: 1,000 meters good cable with Electrical QC certification', async () => {
      const outRes = await request(app)
        .post(`/api/v1/production-batches/${productionBatchId}/outputs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          outputLengthMeters: 1000,
          outputWeightKg: 480,
          targetWarehouseId: fgWarehouseId,
          isFinalStage: true,
          qualityStatus: 'PASSED',
          testReportNumber: 'TR-E2E-2026-001',
          remarks: 'Spark test at 12kV PASSED, Conductor resistance 0.441 ohm/km PASSED',
        });

      expect(outRes.status).toBe(201);
      productionOutputId = outRes.body.data._id;

      // Post the Production Output
      const postRes = await request(app)
        .post(`/api/v1/production-outputs/${productionOutputId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(postRes.status).toBe(200);

      // Initialize Finished Goods balance in warehouse
      await InventoryBalanceModel.create({
        materialId: new mongoose.Types.ObjectId(cableProductId),
        warehouseId: new mongoose.Types.ObjectId(fgWarehouseId),
        ownerType: 'CUSTOMER',
        customerId: new mongoose.Types.ObjectId(customerAId),
        quantityOnHand: 1000,
        quantityAvailable: 1000,
        quantityReserved: 0,
        unit: 'METER',
      });
    });
  });

  // =========================================================================
  // STAGE 4: Drum Packing, Dispatch & Outbound Challan
  // =========================================================================
  describe('Stage 4: Drum Packing, Dispatch & Outbound Challan', () => {
    it('4.1 should register Drum with separate length (1,000m) and weights (tare 150kg, net 480kg, gross 630kg)', async () => {
      const res = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-E2E-001',
          drumType: 'WOODEN',
          flangeDiameterMm: 1600,
          barrelDiameterMm: 800,
          traverseWidthMm: 1050,
          tareWeightKg: 150.0,
          netWeightKg: 480.0,
          grossWeightKg: 630.0,
          cableLengthMeters: 1000,
          currentProductId: cableProductId,
          customerId: customerAId,
          workOrderId,
          currentWarehouseId: fgWarehouseId,
          status: 'AVAILABLE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.drumNumber).toBe('DRM-E2E-001');
      expect(res.body.data.cableLengthMeters).toBe(1000);
      drumId = res.body.data._id;
    });

    it('4.2 should pack drum in a packing list and mark it PACKED', async () => {
      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId,
          customerId: customerAId,
          packingWarehouseId: fgWarehouseId,
          remarks: 'Packed 1000m on wooden drum for site dispatch',
          lines: [
            {
              drumId,
              lengthMeters: 1000,
              tareWeightKg: 150,
              netWeightKg: 480,
              grossWeightKg: 630,
            },
          ],
        });

      expect(res.status).toBe(201);
      packingListId = res.body.data._id;

      // Seal Packing List
      const packRes = await request(app)
        .post(`/api/v1/packing-lists/${packingListId}/pack`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(packRes.status).toBe(200);

      // Verify Drum status is now PACKED
      const drum = await DrumModel.findById(drumId);
      expect(drum?.status).toBe('PACKED');
    });

    it('4.3 should dispatch drum, deduct finished goods stock exactly once and mark drum DISPATCHED', async () => {
      const dspRes = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId,
          customerId: customerAId,
          sourceWarehouseId: fgWarehouseId,
          destinationAddress: 'Gurugram Substation Depot, Sector 58, Haryana',
          vehicleNumber: 'HR-55-XY-7788',
          transporter: 'SuperFast Cargo Lines',
          driverName: 'Joginder Singh',
          driverPhone: '+919811223344',
          lrNumber: 'LR-2026-E2E-01',
          eWayBillNumber: 'EWB-9911-2233-4455',
          lines: [
            {
              drumId,
              lengthMeters: 1000,
              tareWeightKg: 150,
              netWeightKg: 480,
              grossWeightKg: 630,
            },
          ],
        });

      expect(dspRes.status).toBe(201);
      dispatchId = dspRes.body.data._id;

      // Finalize Dispatch (Stock deduction)
      const postDspRes = await request(app)
        .post(`/api/v1/dispatches/${dispatchId}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', 'IDEMP-E2E-DISPATCH-001')
        .send({});

      expect(postDspRes.status).toBe(200);
      expect(postDspRes.body.data.status).toBe('DISPATCHED');

      // Verify Drum is now DISPATCHED
      const drum = await DrumModel.findById(drumId);
      expect(drum?.status).toBe('DISPATCHED');

      // Verify Finished Goods stock deducted: 1000 - 1000 = 0 meters
      const fgBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(cableProductId),
        warehouseId: new mongoose.Types.ObjectId(fgWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(fgBal?.quantityOnHand).toBe(0);
    });

    it('4.4 should generate legal Outbound Delivery Challan and return print data', async () => {
      const genRes = await request(app)
        .post(`/api/v1/dispatches/${dispatchId}/generate-outbound-challan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          challanDate: new Date().toISOString(),
          remarks: 'Delivered in good condition with test certificates',
        });

      expect(genRes.status).toBe(201);
      outboundChallanId = genRes.body.data._id;

      // Fetch printable data
      const printRes = await request(app)
        .get(`/api/v1/outbound-challans/${outboundChallanId}/print-data`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(printRes.status).toBe(200);
      expect(printRes.body.data.companyHeader.companyName).toBe('Mfolks Cables Private Limited');
      expect(printRes.body.data.consignee.customerName).toBe('Apex PowerGrid Corporation');
      expect(printRes.body.data.items[0].drumNumber).toBe('DRM-E2E-001');
      expect(printRes.body.data.items[0].lengthMeters).toBe(1000);
    });
  });

  // =========================================================================
  // STAGE 5: Exact Deterministic Material Accounting Verification (Section 11)
  // =========================================================================
  describe('Stage 5: Deterministic Material Accounting Identity Verification', () => {
    it('5.1 verifies exact physical quantities in Store and WIP match the formula', async () => {
      // 1. Store Balance: Initial (1000) - Issued (600) + Returned (50) = 450 KG
      const storeBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(storeBal?.quantityOnHand).toBe(450.0);

      // 2. WIP Balance: Issued (600) - Consumed (520) - Returned (50) - Scrap (10) = 20 KG
      const wipBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(aluminumMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBal?.quantityOnHand).toBe(20.0);

      // 3. Strict Accounting Equation:
      // Received (1,000) = Store (450) + WIP (20) + Consumed (520) + Scrap (10)
      const received = 1000.0;
      const store = storeBal?.quantityOnHand || 0;
      const wip = wipBal?.quantityOnHand || 0;
      const consumed = 520.0;
      const scrap = 10.0;

      const totalAccounted = store + wip + consumed + scrap;
      expect(totalAccounted).toBe(received);
      expect(received - totalAccounted).toBe(0.0); // Exact 0.00 discrepancy!
    });

    it('5.2 reports service confirms zero discrepancy across customer stock', async () => {
      const reconRes = await request(app)
        .get(`/api/v1/reports/customer-material-reconciliation?customerId=${customerAId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reconRes.status).toBe(200);
      expect(reconRes.body.success).toBe(true);

      const items = reconRes.body.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      const alItem = items[0];
      expect(alItem.summary.totalReceived).toBe(1000.0);
      expect(alItem.summary.actualMaterialConsumption).toBe(520.0);
      expect(alItem.summary.unusedMaterialReturnedToStores).toBe(50.0);
      expect(alItem.summary.scrapAndProcessLoss).toBe(10.0);
      expect(alItem.summary.currentStoreOnHand).toBe(450.0);
      expect(alItem.reconciliation.isBalanced).toBe(true);
      expect(alItem.reconciliation.discrepancy).toBe(0.0);
      expect(alItem.reconciliation.expectedTotalRemaining).toBe(470.0);
      expect(alItem.reconciliation.actualTotalRemaining).toBe(470.0);
    });

    it('5.3 bidirectional traceability traces from dispatched drum back to work order and dispatch', async () => {
      const traceRes = await request(app)
        .get(`/api/v1/reports/traceability?drumNumber=DRM-E2E-001`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(traceRes.status).toBe(200);
      expect(traceRes.body.success).toBe(true);
      expect(traceRes.body.data.traceabilityChain.drums).toHaveLength(1);
      expect(traceRes.body.data.traceabilityChain.drums[0].drumNumber).toBe('DRM-E2E-001');
      expect(traceRes.body.data.traceabilityChain.workOrders).toHaveLength(1);
      expect(traceRes.body.data.traceabilityChain.dispatches).toHaveLength(1);
      expect(traceRes.body.data.traceabilityChain.outboundChallans).toHaveLength(1);
    });
  });
});
