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
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { MaterialReservationModel } from '../../src/modules/inventory/material-reservation.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Work Order Material Availability (Global Warehouse Stock) & Dual Customer/Factory Deduction', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;

  let customerId: string;
  let copperMaterialId: string;
  let cableProductId: string;
  let bomVersionId: string;
  let storeWarehouseId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-GS',
      email: 'admin.gs@mfolks.com',
      passwordHash: 'hashed_pass',
      firstName: 'Warehouse',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      role: admin.role,
      tokenVersion: 0,
    });

    const cust = await CustomerModel.create({
      code: 'CUST-ALPHA',
      name: 'Alpha Power Cables Ltd',
      legalName: 'Alpha Power Cables Ltd',
      contactPerson: 'Ramanathan',
      email: 'ramanathan@alphapower.com',
      phone: '+919988776655',
      gstin: '24AAACA1111A1Z1',
      billingAddress: {
        street: 'Phase 1 GIDC',
        city: 'Vadodara',
        state: 'Gujarat',
        postalCode: '390001',
        country: 'India',
      },
      isActive: true,
    });
    customerId = cust._id.toString();

    const matCopper = await MaterialModel.create({
      code: 'MAT-CU-ROD-08',
      name: 'Copper Wire Rod 8mm',
      category: 'COPPER',
      baseUnit: 'KG',
      standardRate: 750,
      isActive: true,
    });
    copperMaterialId = matCopper._id.toString();

    const stage = await ProcessStageModel.create({
      code: 'STG-DRAW-01',
      name: 'Wire Drawing Stage',
      sequenceOrder: 1,
      isActive: true,
    });

    const prod = await ProductModel.create({
      code: 'PRD-CU-1CX4',
      name: '1C x 4 sqmm Single Core Copper Cable',
      cableCategory: 'LT_POWER',
      voltageGrade: '1.1KV',
      coreCount: 1,
      crossSectionSqMm: 4,
      conductorMaterial: 'COPPER',
      insulationType: 'XLPE',
      armourType: 'UNARMOURED',
      outerSheath: 'PVC_ST1',
      baseUnit: 'METER',
      isActive: true,
    });
    cableProductId = prod._id.toString();

    const bomVersion = await BomVersionModel.create({
      productId: prod._id,
      versionNumber: 1,
      bomNumber: 'BOM-CU-1CX4-V1',
      effectiveFrom: new Date(),
      status: 'ACTIVE',
      batchSize: 1000,
      outputUnit: 'METER',
    });
    bomVersionId = bomVersion._id.toString();

    // 250 KG of copper per 1000 meters
    await BomItemModel.create({
      bomVersionId: bomVersion._id,
      materialId: matCopper._id,
      processStageId: stage._id,
      quantityPerUnit: 250,
      scrapTolerancePercentage: 0,
      stageSequence: 1,
    });

    const storeWh = await WarehouseModel.create({
      code: 'WH-STORE-01',
      name: 'Raw Materials Main Store',
      type: 'RAW_MATERIAL',
      address: 'Warehouse 1, Vadodara, Gujarat',
      isActive: true,
    });
    storeWarehouseId = storeWh._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. should preview material availability showing warehouse global stock and customer stock before work order creation', async () => {
    // Initially no stock in warehouse
    const previewInitial = await request(app)
      .post('/api/v1/work-orders/preview/material-availability')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bomVersionId,
        orderedLengthMeters: 1000, // Requires 250 KG copper
        customerId,
      });

    expect(previewInitial.status).toBe(200);
    expect(previewInitial.body.data.isFullySufficient).toBe(false);
    expect(previewInitial.body.data.materials[0].requiredQuantity).toBe(250);
    expect(previewInitial.body.data.materials[0].availableStock).toBe(0);
    expect(previewInitial.body.data.materials[0].globalAvailableQuantity).toBe(0);
    expect(previewInitial.body.data.materials[0].customerAvailableQuantity).toBe(0);
  });

  it('2. should receive customer-owned stock (100 KG) and factory-owned warehouse stock (400 KG) via Inbound Challans', async () => {
    // 1. Customer stock: 100 KG
    const custChallanRes = await request(app)
      .post('/api/v1/inbound-challans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerChallanNumber: 'CH-CUST-100',
        customerChallanDate: new Date().toISOString(),
        warehouseId: storeWarehouseId,
        ownerType: 'CUSTOMER_OWNED',
        customerId,
        lines: [
          {
            materialId: copperMaterialId,
            declaredQuantity: 100,
            receivedQuantity: 100,
            unit: 'KG',
          },
        ],
      });
    expect(custChallanRes.status).toBe(201);
    const postCustRes = await request(app)
      .post(`/api/v1/inbound-challans/${custChallanRes.body.data._id}/post`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(postCustRes.status).toBe(200);

    // 2. Factory stock: 400 KG
    const factoryChallanRes = await request(app)
      .post('/api/v1/inbound-challans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerChallanNumber: 'CH-FACTORY-400',
        customerChallanDate: new Date().toISOString(),
        warehouseId: storeWarehouseId,
        ownerType: 'FACTORY_OWNED',
        lines: [
          {
            materialId: copperMaterialId,
            declaredQuantity: 400,
            receivedQuantity: 400,
            unit: 'KG',
          },
        ],
      });
    expect(factoryChallanRes.status).toBe(201);
    const postFactoryRes = await request(app)
      .post(`/api/v1/inbound-challans/${factoryChallanRes.body.data._id}/post`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(postFactoryRes.status).toBe(200);

    // Preview availability again: Total Global Stock = 500 KG, Customer Stock = 100 KG
    const previewAfterStock = await request(app)
      .post('/api/v1/work-orders/preview/material-availability')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bomVersionId,
        orderedLengthMeters: 1000,
        customerId,
      });

    expect(previewAfterStock.status).toBe(200);
    expect(previewAfterStock.body.data.materials[0].availableStock).toBe(500); // Global warehouse stock!
    expect(previewAfterStock.body.data.materials[0].globalAvailableQuantity).toBe(500);
    expect(previewAfterStock.body.data.materials[0].customerAvailableQuantity).toBe(100);
    expect(previewAfterStock.body.data.isFullySufficient).toBe(true);
  });

  it('3. should create work order, confirm it, and verify material-availability endpoint reports both global warehouse stock and customer stock', async () => {
    const woRes = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        productId: cableProductId,
        bomVersionId,
        orderedLengthMeters: 1000, // Requires 250 KG copper
        targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    expect(woRes.status).toBe(201);
    const workOrderId = woRes.body.data._id;

    const confirmRes = await request(app)
      .post(`/api/v1/work-orders/${workOrderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(confirmRes.status).toBe(200);

    // Check material availability for this work order
    const availRes = await request(app)
      .get(`/api/v1/work-orders/${workOrderId}/material-availability`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(availRes.status).toBe(200);
    const mat = availRes.body.data.materials[0];
    expect(mat.availableStock).toBe(500); // Global warehouse stock
    expect(mat.globalAvailableQuantity).toBe(500);
    expect(mat.customerAvailableQuantity).toBe(100);
    expect(mat.eligibleAvailableQuantity).toBe(100); // Customer-segregated stock
    expect(mat.isSufficient).toBe(true);
    expect(mat.shortageQuantity).toBe(0);
  });

  it('4. should reserve 250 KG: first deducting 100 KG from customer stock, then remaining 150 KG from factory warehouse stock', async () => {
    // Create work order
    const woRes = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        productId: cableProductId,
        bomVersionId,
        orderedLengthMeters: 1000, // 250 KG needed
        targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    expect(woRes.status).toBe(201);
    const workOrderId = woRes.body.data._id;

    const confirmRes = await request(app)
      .post(`/api/v1/work-orders/${workOrderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(confirmRes.status).toBe(200);

    // Trigger reservation
    const reserveRes = await request(app)
      .post(`/api/v1/work-orders/${workOrderId}/reserve-materials`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(reserveRes.status).toBe(200);
    expect(reserveRes.body.data.reservationsCreated).toBe(2);

    const reservations = await MaterialReservationModel.find({ workOrderId });
    expect(reservations.length).toBe(2);

    // Reservation 1: 100 KG from CUSTOMER
    const custRes = reservations.find((r) => r.ownerType === 'CUSTOMER');
    expect(custRes).toBeDefined();
    expect(custRes!.reservedQuantity).toBe(100);

    // Reservation 2: 150 KG from FACTORY
    const factRes = reservations.find((r) => r.ownerType === 'FACTORY');
    expect(factRes).toBeDefined();
    expect(factRes!.reservedQuantity).toBe(150);

    // Verify Inventory Balances
    const customerBal = await InventoryBalanceModel.findOne({
      materialId: copperMaterialId,
      ownerType: 'CUSTOMER',
      customerId,
    });
    expect(customerBal).toBeDefined();
    expect(customerBal!.quantityOnHand).toBe(100);
    expect(customerBal!.quantityReserved).toBe(100);
    expect(customerBal!.quantityAvailable).toBe(0); // Customer stock fully utilized!

    const factoryBal = await InventoryBalanceModel.findOne({
      materialId: copperMaterialId,
      ownerType: 'FACTORY',
    });
    expect(factoryBal).toBeDefined();
    expect(factoryBal!.quantityOnHand).toBe(400);
    expect(factoryBal!.quantityReserved).toBe(150);
    expect(factoryBal!.quantityAvailable).toBe(250); // 400 - 150 = 250 KG available remaining
  });
});
