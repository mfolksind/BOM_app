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
import { InboundChallanModel } from '../../src/modules/inventory/inbound-challan.model';
import { InboundChallanLineModel } from '../../src/modules/inventory/inbound-challan-line.model';
import { InventoryTransactionModel } from '../../src/modules/inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { MaterialReservationModel } from '../../src/modules/inventory/material-reservation.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { ProductionOrderModel } from '../../src/modules/production/production-order.model';
import { ProductionBatchModel } from '../../src/modules/production/production-batch.model';
import { MaterialIssueModel } from '../../src/modules/production/material-issue.model';
import { MaterialIssueLineModel } from '../../src/modules/production/material-issue-line.model';
import { MaterialConsumptionModel } from '../../src/modules/production/material-consumption.model';
import { MaterialReturnModel } from '../../src/modules/production/material-return.model';
import { ProductionOutputModel } from '../../src/modules/production/production-output.model';
import { ScrapRecordModel } from '../../src/modules/production/scrap-record.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Work Orders, Production, Material Consumption, and Customer-Wise Reconciliation (Prompt 6)', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;
  let superAdminToken: string;

  // Master data
  let customerAId: string;
  let customerBId: string;
  let copperMaterialId: string;
  let xlpeMaterialId: string;
  let cableProductId: string;
  let bomVersionId: string;
  let stageDrawingId: string;
  let storeWarehouseId: string;
  let wipWarehouseId: string;
  let fgWarehouseId: string;
  let scrapWarehouseId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Bootstrap Super Admin
    const superAdmin = await UserModel.create({
      employeeCode: 'EMP-SA-PRD',
      email: 'sa.prd@mfolks.com',
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
      employeeCode: 'EMP-ADM-PRD',
      email: 'adm.prd@mfolks.com',
      passwordHash: 'hashed_pass_adm',
      firstName: 'Production',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'PRODUCTION',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    // Master Data Setup
    const custA = await CustomerModel.create({
      code: 'CUST-POLYCAB',
      name: 'Polycab Wires Ltd',
      legalName: 'Polycab India Limited',
      contactPerson: 'Kishore Shah',
      email: 'kishore@polycab.com',
      phone: '+919812345678',
      gstin: '24AAACP1234A1Z1',
      billingAddress: {
        street: 'Halol GIDC',
        city: 'Vadodara',
        state: 'Gujarat',
        postalCode: '390001',
        country: 'India',
      },
      isActive: true,
    });
    customerAId = custA._id.toString();

    const custB = await CustomerModel.create({
      code: 'CUST-KEI',
      name: 'KEI Industries',
      legalName: 'KEI Industries Limited',
      contactPerson: 'Sanjay Gupta',
      email: 'sanjay@kei.com',
      phone: '+919812345679',
      gstin: '07AAACK1234A1Z2',
      billingAddress: {
        street: 'Bhiwadi Ind Area',
        city: 'Alwar',
        state: 'Rajasthan',
        postalCode: '301019',
        country: 'India',
      },
      isActive: true,
    });
    customerBId = custB._id.toString();

    const matCopper = await MaterialModel.create({
      code: 'MAT-CU-ROD-08',
      name: 'Copper Wire Rod 8mm',
      category: 'COPPER',
      baseUnit: 'KG',
      standardRate: 750,
      isActive: true,
    });
    copperMaterialId = matCopper._id.toString();

    const matXlpe = await MaterialModel.create({
      code: 'MAT-XLPE-INS',
      name: 'XLPE Insulation Compound',
      category: 'XLPE_COMPOUND',
      baseUnit: 'KG',
      standardRate: 180,
      isActive: true,
    });
    xlpeMaterialId = matXlpe._id.toString();

    const product = await ProductModel.create({
      code: 'PROD-4CX35-CU',
      name: '4C x 35 SQMM Copper Armoured Cable 1.1KV',
      cableCategory: 'LT_POWER',
      voltageGrade: '1.1KV',
      coreCount: 4,
      crossSectionSqMm: 35,
      conductorMaterial: 'COPPER',
      insulationType: 'XLPE',
      armourType: 'STRIP_ARMOURED',
      outerSheath: 'PVC_ST2',
      baseUnit: 'METER',
      isActive: true,
    });
    cableProductId = product._id.toString();

    const stage = await ProcessStageModel.create({
      code: 'STAGE-STRANDING',
      name: 'Conductor Stranding',
      sequenceOrder: 1,
      category: 'CONDUCTOR_PREPARATION',
      isActive: true,
    });
    stageDrawingId = stage._id.toString();

    // Warehouses
    const whStore = await WarehouseModel.create({
      code: 'WH-STORE-RM',
      name: 'Raw Material Store',
      type: 'RAW_MATERIAL',
      isActive: true,
    });
    storeWarehouseId = whStore._id.toString();

    const whWip = await WarehouseModel.create({
      code: 'WH-SHOP-WIP',
      name: 'Shopfloor WIP Bay 1',
      type: 'WORK_IN_PROGRESS',
      isActive: true,
    });
    wipWarehouseId = whWip._id.toString();

    const whFg = await WarehouseModel.create({
      code: 'WH-FG-MAIN',
      name: 'Finished Goods Yard',
      type: 'FINISHED_GOODS',
      isActive: true,
    });
    fgWarehouseId = whFg._id.toString();

    const whScrap = await WarehouseModel.create({
      code: 'WH-SCRAP-YARD',
      name: 'Plant Scrap Yard',
      type: 'SCRAP',
      isActive: true,
    });
    scrapWarehouseId = whScrap._id.toString();

    // Bill of Materials: 1,000 meters requires 348 kg Copper (2% scrap) + 98 kg XLPE (0% scrap)
    const bomVersion = await BomVersionModel.create({
      bomNumber: 'BOM-4CX35-CU-V1',
      productId: product._id,
      versionNumber: 1,
      status: 'ACTIVE',
      effectiveFrom: new Date(),
      batchSize: 1000,
      outputUnit: 'METER',
    });
    bomVersionId = bomVersion._id.toString();

    await BomItemModel.create([
      {
        bomVersionId: bomVersion._id,
        materialId: matCopper._id,
        processStageId: stage._id,
        quantityPerUnit: 348,
        scrapTolerancePercentage: 2.0,
        stageSequence: 1,
      },
      {
        bomVersionId: bomVersion._id,
        materialId: matXlpe._id,
        processStageId: stage._id,
        quantityPerUnit: 98,
        scrapTolerancePercentage: 0,
        stageSequence: 2,
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // ==========================================
  // SUITE 1: Work Order Lifecycle & BOM Snapshotting
  // ==========================================
  describe('1. Work Order Lifecycle & BOM Snapshotting', () => {
    let testWorkOrderId: string;

    it('Scenario 1: should create a work order in DRAFT status without stock impact', async () => {
      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 2000,
          customerPoNumber: 'PO-POLY-2026-001',
          targetDeliveryDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          priority: 'HIGH',
          notes: 'Priority job-work for Polycab',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.workOrderNumber).toMatch(/^WO-/);
      expect(res.body.data.orderedLengthMeters).toBe(2000);
      expect(res.body.data.bomSnapshot).toBeUndefined(); // Not snapshot until confirmed
      testWorkOrderId = res.body.data._id;
    });

    it('Scenario 2: confirming a work order captures an immutable snapshot of active BOM version & items', async () => {
      const res = await request(app)
        .post(`/api/v1/work-orders/${testWorkOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.bomSnapshot).toBeDefined();
      expect(res.body.data.bomSnapshot.bomNumber).toBe('BOM-4CX35-CU-V1');
      expect(res.body.data.bomSnapshot.batchSize).toBe(1000);
      expect(res.body.data.bomSnapshot.items).toHaveLength(2);

      const copperItem = res.body.data.bomSnapshot.items.find(
        (i: { materialCode: string }) => i.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copperItem).toBeDefined();
      expect(copperItem.quantityPerUnit).toBe(348);
      expect(copperItem.scrapTolerancePercentage).toBe(2);
    });

    it('Scenario 3: BOM snapshot stability - later revision of BOM does NOT alter confirmed work order', async () => {
      // Create a V2 BOM with changed quantities
      await BomVersionModel.create({
        bomNumber: 'BOM-4CX35-CU-V2',
        productId: new mongoose.Types.ObjectId(cableProductId),
        versionNumber: 2,
        status: 'ACTIVE',
        effectiveFrom: new Date(),
        batchSize: 1000,
        outputUnit: 'METER',
      });

      // Verify confirmed work order still has its original V1 snapshot
      const getRes = await request(app)
        .get(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.bomSnapshot.bomNumber).toBe('BOM-4CX35-CU-V1');
      expect(getRes.body.data.bomSnapshot.items[0].quantityPerUnit).toBe(348);
    });

    it('Scenario 4: work order status transitions (hold, resume, and cancellation release)', async () => {
      // Hold
      const holdRes = await request(app)
        .post(`/api/v1/work-orders/${testWorkOrderId}/hold`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Awaiting customer specification clarification' });
      expect(holdRes.status).toBe(200);
      expect(holdRes.body.data.status).toBe('ON_HOLD');

      // Resume
      const resumeRes = await request(app)
        .post(`/api/v1/work-orders/${testWorkOrderId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.status).toBe('CONFIRMED');
    });
  });

  // ==========================================
  // SUITE 2: BOM-Based Material Requirement Calculation & Availability
  // ==========================================
  describe('2. Planned Material Requirements and Shortage Reporting', () => {
    let workOrderId: string;

    beforeAll(async () => {
      // Create 2000m work order for Customer A
      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 2000, // 2x batchSize of 1000m
          targetDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        });
      workOrderId = res.body.data._id;
      await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('Scenario 5: correctly scale planned BOM quantities to requested production quantity', async () => {
      const res = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-requirements`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const copperReq = res.body.data.requirements.find(
        (r: { materialCode: string }) => r.materialCode === 'MAT-CU-ROD-08',
      );
      // 2000m / 1000m = factor 2
      // Standard = 348 * 2 = 696 kg
      // Scrap 2% = 696 * 0.02 = 13.92 kg
      // Planned = 709.92 kg
      expect(copperReq.standardQuantity).toBe(696);
      expect(copperReq.scrapAllowance).toBe(13.92);
      expect(copperReq.plannedQuantity).toBe(709.92);

      const xlpeReq = res.body.data.requirements.find(
        (r: { materialCode: string }) => r.materialCode === 'MAT-XLPE-INS',
      );
      // Standard = 98 * 2 = 196 kg, Scrap 0% -> Planned = 196 kg
      expect(xlpeReq.standardQuantity).toBe(196);
      expect(xlpeReq.plannedQuantity).toBe(196);
    });

    it('Scenario 6: report shortage when required customer material has not yet been received', async () => {
      const res = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-availability`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isFullySufficient).toBe(false);

      const copper = res.body.data.materials.find(
        (m: { materialCode: string }) => m.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper.eligibleAvailableQuantity).toBe(0);
      expect(copper.shortageQuantity).toBe(709.92);
      expect(copper.isSufficient).toBe(false);
    });
  });

  // ==========================================
  // SUITE 3: Customer-Owned Material & Multiple Inbound Challans
  // ==========================================
  describe('3. Customer-Owned Material & Multiple Challans', () => {
    let workOrderId: string;

    beforeAll(async () => {
      const woRes = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 2000,
          targetDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        });
      workOrderId = woRes.body.data._id;
      await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('Scenario 7: customer sends material across multiple challans, all eligible for same work order', async () => {
      // Inbound Challan 1: 500 KG Copper
      const ch1Res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'CH-POLY-001',
          customerChallanDate: new Date().toISOString(),
          warehouseId: storeWarehouseId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          lines: [
            {
              materialId: copperMaterialId,
              declaredQuantity: 500,
              receivedQuantity: 500,
              unit: 'KG',
              supplierLotNumber: 'COIL-POLY-A1',
            },
          ],
        });
      await request(app)
        .post(`/api/v1/inbound-challans/${ch1Res.body.data._id}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Inbound Challan 2: 400 KG Copper + 300 KG XLPE
      const ch2Res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'CH-POLY-002',
          customerChallanDate: new Date().toISOString(),
          warehouseId: storeWarehouseId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          lines: [
            {
              materialId: copperMaterialId,
              declaredQuantity: 400,
              receivedQuantity: 400,
              unit: 'KG',
              supplierLotNumber: 'COIL-POLY-A2',
            },
            {
              materialId: xlpeMaterialId,
              declaredQuantity: 300,
              receivedQuantity: 300,
              unit: 'KG',
              supplierLotNumber: 'BAGS-XLPE-P1',
            },
          ],
        });
      await request(app)
        .post(`/api/v1/inbound-challans/${ch2Res.body.data._id}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Check material availability for Customer A's work order
      const availRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-availability`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(availRes.status).toBe(200);
      expect(availRes.body.data.isFullySufficient).toBe(true);

      const copper = availRes.body.data.materials.find(
        (m: { materialCode: string }) => m.materialCode === 'MAT-CU-ROD-08',
      );
      // 500 from Ch1 + 400 from Ch2 = 900 KG available
      expect(copper.eligibleAvailableQuantity).toBe(900);
      expect(copper.shortageQuantity).toBe(0);
      expect(copper.isSufficient).toBe(true);

      const xlpe = availRes.body.data.materials.find(
        (m: { materialCode: string }) => m.materialCode === 'MAT-XLPE-INS',
      );
      expect(xlpe.eligibleAvailableQuantity).toBe(300);
      expect(xlpe.isSufficient).toBe(true);
    });

    it('Scenario 8: Customer B stock cannot satisfy Customer A requirements (segregation guarantee)', async () => {
      // Receive stock for Customer B
      const chBRes = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'CH-KEI-001',
          customerChallanDate: new Date().toISOString(),
          warehouseId: storeWarehouseId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerBId,
          lines: [
            {
              materialId: copperMaterialId,
              declaredQuantity: 10000,
              receivedQuantity: 10000,
              unit: 'KG',
            },
          ],
        });
      await request(app)
        .post(`/api/v1/inbound-challans/${chBRes.body.data._id}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Customer A's work order availability must still show only 900 KG (not 10,900 KG)
      const availRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-availability`)
        .set('Authorization', `Bearer ${adminToken}`);

      const copper = availRes.body.data.materials.find(
        (m: { materialCode: string }) => m.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper.eligibleAvailableQuantity).toBe(900);
    });

    it('Scenario 9: reserve and release material for work order', async () => {
      // Reserve materials for Customer A's work order
      const reserveRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/reserve-materials`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(reserveRes.status).toBe(200);
      expect(reserveRes.body.success).toBe(true);

      // Verify availability shows stock is now reserved for this order
      const availRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-availability`)
        .set('Authorization', `Bearer ${adminToken}`);

      const copper = availRes.body.data.materials.find(
        (m: { materialCode: string }) => m.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper.reservedForThisOrder).toBeGreaterThan(0);

      // Release reservations
      const releaseRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/release-reservations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.data.releasedCount).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // SUITE 4: Production Order, Material Issue, Consumption, and WIP
  // ==========================================
  describe('4. Production Order, Material Issue, Actual Consumption, Returns, and Scrap', () => {
    let workOrderId: string;
    let productionOrderId: string;
    let batchId: string;

    beforeAll(async () => {
      const woRes = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 1000,
          targetDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        });
      workOrderId = woRes.body.data._id;
      await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Create Production Order
      const prdRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/production-orders`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plannedLengthMeters: 1000,
          targetCompletionDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        });
      productionOrderId = prdRes.body.data._id;

      // Create Production Batch
      const batRes = await request(app)
        .post(`/api/v1/production-orders/${productionOrderId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          processStageId: stageDrawingId,
          machineCode: 'STRAND-01',
          plannedQuantity: 1000,
        });
      batchId = batRes.body.data._id;
    });

    it('Scenario 10: Material Issue moves stock from store to WIP without treating it as consumption', async () => {
      // Issue 400 KG Copper and 120 KG XLPE to WIP
      const issueRes = await request(app)
        .post(`/api/v1/production-orders/${productionOrderId}/material-issues`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceWarehouseId: storeWarehouseId,
          destinationWarehouseId: wipWarehouseId,
          lines: [
            {
              materialId: copperMaterialId,
              ownerType: 'CUSTOMER_OWNED',
              customerId: customerAId,
              issuedQuantity: 400,
              unit: 'KG',
            },
            {
              materialId: xlpeMaterialId,
              ownerType: 'CUSTOMER_OWNED',
              customerId: customerAId,
              issuedQuantity: 120,
              unit: 'KG',
            },
          ],
        });

      expect(issueRes.status).toBe(201);
      const issueId = issueRes.body.data._id;

      // Post the issue
      const postRes = await request(app)
        .post(`/api/v1/material-issues/${issueId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(postRes.status).toBe(200);

      // Verify WIP warehouse now has on-hand balance
      const wipBalance = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBalance?.quantityOnHand).toBe(400);

      // Requirements check: issued is 400, but actual consumed is 0, remaining in WIP is 400
      const reqRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-requirements`)
        .set('Authorization', `Bearer ${adminToken}`);

      const copper = reqRes.body.data.requirements.find(
        (r: { materialCode: string }) => r.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper.actualIssuedQuantity).toBe(400);
      expect(copper.actualConsumedQuantity).toBe(0);
      expect(copper.remainingInWipQuantity).toBe(400);
    });

    it('Scenario 11: recording actual material consumption reduces WIP balance', async () => {
      // Record 300 KG actual consumed
      const conRes = await request(app)
        .post(`/api/v1/production-batches/${batchId}/consumption`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: copperMaterialId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          warehouseId: wipWarehouseId,
          consumedQuantity: 300,
          unit: 'KG',
        });

      expect(conRes.status).toBe(201);
      expect(conRes.body.data.consumedQuantity).toBe(300);

      // WIP balance should now be 400 - 300 = 100 KG
      const wipBalance = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBalance?.quantityOnHand).toBe(100);

      // Check material requirements reflects 300 consumed, 100 remaining in WIP
      const reqRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-requirements`)
        .set('Authorization', `Bearer ${adminToken}`);

      const copper = reqRes.body.data.requirements.find(
        (r: { materialCode: string }) => r.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper.actualConsumedQuantity).toBe(300);
      expect(copper.remainingInWipQuantity).toBe(100);
    });

    it('Scenario 12: consumption cannot exceed eligible issued material remaining in WIP', async () => {
      // Attempting to consume 150 KG when only 100 KG remains in WIP must fail with 400
      const conRes = await request(app)
        .post(`/api/v1/production-batches/${batchId}/consumption`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: copperMaterialId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          warehouseId: wipWarehouseId,
          consumedQuantity: 150,
          unit: 'KG',
        });

      expect(conRes.status).toBe(400);
      expect(conRes.body.message).toMatch(/exceeds remaining eligible material in WIP/i);
    });

    it('Scenario 13: returning unused material restores store warehouse stock', async () => {
      // Return 40 KG of Copper from WIP back to Store
      const retRes = await request(app)
        .post(`/api/v1/production-batches/${batchId}/material-returns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: copperMaterialId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          sourceWarehouseId: wipWarehouseId,
          destinationWarehouseId: storeWarehouseId,
          returnQuantity: 40,
          unit: 'KG',
          reason: 'Excess drawing rod coils returned to store',
        });

      expect(retRes.status).toBe(201);
      expect(retRes.body.data.returnQuantity).toBe(40);

      // WIP balance should now be 100 - 40 = 60 KG
      const wipBalance = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBalance?.quantityOnHand).toBe(60);

      // Remaining in WIP should now be 60 KG
      const reqRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-requirements`)
        .set('Authorization', `Bearer ${adminToken}`);

      const copper = reqRes.body.data.requirements.find(
        (r: { materialCode: string }) => r.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper.returnedQuantity).toBe(40);
      expect(copper.remainingInWipQuantity).toBe(60);
    });

    it('Scenario 14: scrap records reduce WIP without double-counting', async () => {
      // Record 10 KG of saleable scrap
      const scrRes = await request(app)
        .post(`/api/v1/production-batches/${batchId}/scrap`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: copperMaterialId,
          ownerType: 'CUSTOMER_OWNED',
          customerId: customerAId,
          scrapType: 'COPPER_SCRAP',
          scrapCategory: 'SALEABLE',
          scrapQuantity: 10,
          unit: 'KG',
          sourceWarehouseId: wipWarehouseId,
          scrapWarehouseId: scrapWarehouseId,
          reason: 'Wire break offcuts',
        });

      expect(scrRes.status).toBe(201);

      // WIP balance should now be 60 - 10 = 50 KG
      const wipBalance = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(wipWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(wipBalance?.quantityOnHand).toBe(50);

      // Scrap warehouse should now have 10 KG on hand
      const scrapBalance = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(scrapWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(scrapBalance?.quantityOnHand).toBe(10);
    });

    it('Scenario 15: good production output records passed length and completion summary', async () => {
      // Record production output of 1000 meters good cable
      const outRes = await request(app)
        .post(`/api/v1/production-batches/${batchId}/outputs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          outputLengthMeters: 1000,
          outputWeightKg: 450,
          targetWarehouseId: fgWarehouseId,
          isFinalStage: true,
          qualityStatus: 'PASSED',
          testReportNumber: 'TR-2026-001',
        });

      expect(outRes.status).toBe(201);
      const outputId = outRes.body.data._id;

      // Post the output
      await request(app)
        .post(`/api/v1/production-outputs/${outputId}/post`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Get completion summary
      const sumRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/completion-summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(sumRes.status).toBe(200);
      expect(sumRes.body.data.goodOutputMeters).toBe(1000);
      expect(sumRes.body.data.outputFulfillmentPercentage).toBe(100);
      expect(sumRes.body.data.totalOutstandingWip).toBeGreaterThan(0); // 50 KG copper + 120 KG XLPE in WIP
    });

    it('Scenario 16: work order completion validates outstanding WIP', async () => {
      // Completing without clearing outstanding WIP fails when force is false
      const compFailRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ force: false });

      expect(compFailRes.status).toBe(400);
      expect(compFailRes.body.message).toMatch(/outstanding WIP/i);

      // Complete with explicit authorization / force: true
      const compSuccessRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ force: true, remarks: 'Completed with authorized variance' });

      expect(compSuccessRes.status).toBe(200);
      expect(compSuccessRes.body.data.status).toBe('COMPLETED');
    });

    it('Scenario 17: Customer-wise material reconciliation balances all transactions', async () => {
      const reconRes = await request(app)
        .get(`/api/v1/customers/${customerAId}/material-reconciliation`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reconRes.status).toBe(200);
      expect(reconRes.body.success).toBe(true);
      expect(reconRes.body.data.materials.length).toBeGreaterThan(0);

      const copper = reconRes.body.data.materials.find(
        (m: { materialCode: string }) => m.materialCode === 'MAT-CU-ROD-08',
      );
      expect(copper).toBeDefined();
      expect(copper.receivedQuantity).toBe(900); // 500 + 400 from earlier receipts
      expect(copper.issuedToProductionQuantity).toBe(400);
      expect(copper.actualConsumedQuantity).toBe(300);
      expect(copper.returnedToStoreQuantity).toBe(40);
      expect(copper.saleableScrapQuantity).toBe(10);
      expect(copper.closingWipQuantity).toBe(50);
      expect(copper.receiptsTraceability.length).toBeGreaterThanOrEqual(2);
    });

    it('Scenario 18: work-order-specific material reconciliation endpoint', async () => {
      const woReconRes = await request(app)
        .get(`/api/v1/work-orders/${workOrderId}/material-reconciliation`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(woReconRes.status).toBe(200);
      expect(woReconRes.body.data.workOrderId).toBe(workOrderId);
      expect(woReconRes.body.data.reconciliation).toBeDefined();
    });

    it('Scenario 19: production batch reconciliation endpoint', async () => {
      const batReconRes = await request(app)
        .get(`/api/v1/production-batches/${batchId}/material-reconciliation`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(batReconRes.status).toBe(200);
      expect(batReconRes.body.data.batchId).toBe(batchId);
      expect(batReconRes.body.data.consumptions.length).toBeGreaterThan(0);
      expect(batReconRes.body.data.returns.length).toBeGreaterThan(0);
      expect(batReconRes.body.data.scraps.length).toBeGreaterThan(0);
    });
  });
});
