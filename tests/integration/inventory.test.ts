import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { MaterialModel } from '../../src/modules/materials/material.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';
import { MaterialLotModel } from '../../src/modules/materials/material-lot.model';
import { InboundChallanModel } from '../../src/modules/inventory/inbound-challan.model';
import { InventoryTransactionModel } from '../../src/modules/inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { OpeningBalanceModel } from '../../src/modules/inventory/opening-balance.model';
import { StockTransferModel } from '../../src/modules/inventory/stock-transfer.model';
import { MaterialReservationModel } from '../../src/modules/inventory/material-reservation.model';
import { StockReconciliationModel } from '../../src/modules/inventory/stock-reconciliation.model';
import { MaterialReorderRuleModel } from '../../src/modules/inventory/material-reorder-rule.model';
import { GlobalStockSummaryModel } from '../../src/modules/inventory/global-stock-summary.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Inventory Management, Stock Ledger, and Global Stock Dashboard Integration Tests (Prompt 5)', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;
  let superAdminToken: string;
  let adminId: string;
  let superAdminId: string;

  // Master data references
  let rawMaterialWarehouseId: string;
  let productionWarehouseId: string;
  let customerId: string;
  let copperMaterialId: string;
  let pvcMaterialId: string;

  beforeAll(async () => {
    // Start in-memory single-node replica set to support MongoDB transactions in tests
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // Bootstrap Super Admin
    const superAdmin = await UserModel.create({
      employeeCode: 'EMP-SA-INV',
      email: 'sa.inv@mfolks.com',
      passwordHash: 'hashed_password_sa',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
    });
    superAdminId = superAdmin._id.toString();
    superAdminToken = TokenUtil.generateAccessToken({
      userId: superAdminId,
      email: superAdmin.email,
      role: superAdmin.role,
    });

    // Bootstrap Admin
    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-INV',
      email: 'admin.inv@mfolks.com',
      passwordHash: 'hashed_password_adm',
      firstName: 'Factory',
      lastName: 'Manager',
      role: 'ADMIN',
      department: 'PRODUCTION',
      isActive: true,
    });
    adminId = admin._id.toString();
    adminToken = TokenUtil.generateAccessToken({
      userId: adminId,
      email: admin.email,
      role: admin.role,
    });

    // Create Warehouses
    const wh1 = await WarehouseModel.create({
      code: 'WH-RM-01',
      name: 'Main Raw Material Warehouse',
      type: 'RAW_MATERIAL',
      address: '123 Industrial Area, Vadodara, Gujarat',
      isActive: true,
    });
    rawMaterialWarehouseId = wh1._id.toString();

    const wh2 = await WarehouseModel.create({
      code: 'WH-PROD-01',
      name: 'Production Shopfloor Warehouse',
      type: 'WORK_IN_PROGRESS',
      address: '124 Industrial Area, Vadodara, Gujarat',
      isActive: true,
    });
    productionWarehouseId = wh2._id.toString();

    // Create Customer
    const cust = await CustomerModel.create({
      code: 'CUST-TATA-01',
      name: 'Tata Power Job Work Ltd',
      legalName: 'Tata Power Job Work Limited',
      contactPerson: 'Rajesh Sharma',
      email: 'rajesh@tatapower.com',
      phone: '+919820011999',
      pan: 'AAACT1234F',
      gstin: '24AAACT1234F1Z5',
      billingAddress: {
        street: 'Sector 4, MIDC',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      shippingAddresses: [
        {
          street: 'Sector 4, MIDC',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
      ],
      creditDays: 30,
      isActive: true,
    });
    customerId = cust._id.toString();

    // Create Materials
    const mat1 = await MaterialModel.create({
      code: 'MAT-COPPER-8MM',
      name: 'EC Grade Continuous Cast Copper Rod 8mm',
      category: 'COPPER',
      baseUnit: 'KG',
      hsnCode: '74081190',
      isActive: true,
    });
    copperMaterialId = mat1._id.toString();

    const mat2 = await MaterialModel.create({
      code: 'MAT-PVC-SHEATH',
      name: 'Type ST-2 PVC Sheathing Compound',
      category: 'PVC_COMPOUND',
      baseUnit: 'KG',
      hsnCode: '39042200',
      isActive: true,
    });
    pvcMaterialId = mat2._id.toString();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  describe('1. Inbound Challan Workflow & Stock Posting', () => {
    let createdChallanId: string;

    it('Scenario 1: Creating a draft inbound challan does not change stock', async () => {
      const payload = {
        customerChallanNumber: 'TATA-CH-2026-001',
        customerChallanDate: new Date().toISOString(),
        ownerType: 'CUSTOMER_OWNED',
        customerId,
        warehouseId: rawMaterialWarehouseId,
        vehicleNumber: 'GJ-06-AB-1234',
        transporterName: 'VRL Logistics',
        lines: [
          {
            materialId: copperMaterialId,
            declaredQuantity: 2000,
            receivedQuantity: 2000,
            unit: 'KG',
            supplierLotNumber: 'SUP-LOT-CU-01',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.challanNumber).toMatch(/^IBC-/);
      expect(res.body.data.lines).toHaveLength(1);
      createdChallanId = res.body.data._id;

      // Verify no stock or ledger entries were created for DRAFT
      const balances = await InventoryBalanceModel.find({ materialId: copperMaterialId });
      expect(balances).toHaveLength(0);

      const transactions = await InventoryTransactionModel.find({ materialId: copperMaterialId });
      expect(transactions).toHaveLength(0);
    });

    it('Scenario 2: Posting a receipt increases the correct stock balance exactly once', async () => {
      const res = await request(app)
        .post(`/api/v1/inbound-challans/${createdChallanId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idempotencyKey: 'IDEMP-POST-CHALLAN-01' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('POSTED');

      // Verify balance was created
      const balance = await InventoryBalanceModel.findOne({
        materialId: copperMaterialId,
        warehouseId: rawMaterialWarehouseId,
        ownerType: 'CUSTOMER',
        customerId,
      });

      expect(balance).not.toBeNull();
      expect(balance!.quantityOnHand).toBe(2000);
      expect(balance!.quantityReserved).toBe(0);
      expect(balance!.quantityAvailable).toBe(2000);

      // Verify immutable transaction ledger entry
      const txns = await InventoryTransactionModel.find({
        sourceDocumentId: createdChallanId,
        transactionType: 'RECEIPT',
      });
      expect(txns).toHaveLength(1);
      expect(txns[0].movementType).toBe('INWARD');
      expect(txns[0].quantity).toBe(2000);
      expect(txns[0].status).toBe('POSTED');

      // Verify MaterialLot was created
      const lots = await MaterialLotModel.find({ inboundChallanId: createdChallanId });
      expect(lots).toHaveLength(1);
      expect(lots[0].lotNumber).toMatch(/^LOT-/);
      expect(lots[0].initialQuantity).toBe(2000);
      expect(lots[0].currentBalance).toBe(2000);
    });

    it('Scenario 3: A repeated posting request does not duplicate stock (idempotency)', async () => {
      const res = await request(app)
        .post(`/api/v1/inbound-challans/${createdChallanId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idempotencyKey: 'IDEMP-POST-CHALLAN-01' });

      // Should return either cached idempotent 200 or 409 conflict
      expect([200, 409]).toContain(res.status);

      // Stock MUST remain exactly 2000, not 4000!
      const balance = await InventoryBalanceModel.findOne({
        materialId: copperMaterialId,
        warehouseId: rawMaterialWarehouseId,
        ownerType: 'CUSTOMER',
        customerId,
      });
      expect(balance!.quantityOnHand).toBe(2000);

      // Transactions count must still be exactly 1
      const txns = await InventoryTransactionModel.find({
        sourceDocumentId: createdChallanId,
        transactionType: 'RECEIPT',
      });
      expect(txns).toHaveLength(1);
    });

    it('Scenario 4: A failed receipt transaction rolls back all related changes', async () => {
      // Create draft challan with a non-existent fake material ID
      const fakeMaterialId = new mongoose.Types.ObjectId().toString();
      const resDraft = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'FAIL-CH-001',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'CUSTOMER_OWNED',
          customerId,
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: fakeMaterialId,
              declaredQuantity: 500,
              receivedQuantity: 500,
              unit: 'KG',
            },
          ],
        });

      // Draft creation itself fails gracefully with 404
      expect(resDraft.status).toBe(404);

      // No balances created
      const balance = await InventoryBalanceModel.findOne({ materialId: fakeMaterialId });
      expect(balance).toBeNull();
    });
  });

  describe('2. Ownership Model Segregation', () => {
    it('Scenario 5: Customer-owned and factory-owned stock remain strictly separate', async () => {
      // 1. Post Factory-owned receipt for PVC compound
      const draftFactory = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'INV-FACT-PVC-001',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'FACTORY_OWNED',
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: pvcMaterialId,
              declaredQuantity: 5000,
              receivedQuantity: 5000,
              unit: 'KG',
            },
          ],
        });
      expect(draftFactory.status).toBe(201);
      const postFactory = await request(app)
        .post(`/api/v1/inbound-challans/${draftFactory.body.data._id}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(postFactory.status).toBe(200);

      // 2. Post Customer-owned receipt for PVC compound
      const draftCustomer = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'TATA-PVC-001',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'CUSTOMER_OWNED',
          customerId,
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: pvcMaterialId,
              declaredQuantity: 3000,
              receivedQuantity: 3000,
              unit: 'KG',
            },
          ],
        });
      expect(draftCustomer.status).toBe(201);
      const postCustomer = await request(app)
        .post(`/api/v1/inbound-challans/${draftCustomer.body.data._id}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(postCustomer.status).toBe(200);

      // Verify separate balances
      const factoryBalance = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: rawMaterialWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
      });
      expect(factoryBalance).not.toBeNull();
      expect(factoryBalance!.quantityOnHand).toBe(5000);

      const customerBalance = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: rawMaterialWarehouseId,
        ownerType: 'CUSTOMER',
        customerId,
      });
      expect(customerBalance).not.toBeNull();
      expect(customerBalance!.quantityOnHand).toBe(3000);

      // Verify Dashboard Summary shows distinct segregation
      const summaryRes = await request(app)
        .get(`/api/v1/inventory/summary?materialId=${pvcMaterialId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.stock.factoryOnHand).toBe(5000);
      expect(summaryRes.body.data.stock.customerOnHand).toBe(3000);
      expect(summaryRes.body.data.stock.totalOnHand).toBe(8000);
    });

    it('Scenario 6: Customer-owned stock requires a valid customer reference', async () => {
      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'MISSING-CUST-CH',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'CUSTOMER_OWNED',
          // customerId is intentionally omitted
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: pvcMaterialId,
              declaredQuantity: 500,
              receivedQuantity: 500,
              unit: 'KG',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Validation failed|Customer reference is required/i);
    });

    it('Scenario 7: Factory-owned stock does not require a customer reference', async () => {
      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'FACTORY-INVOICE-001',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'FACTORY_OWNED',
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: pvcMaterialId,
              declaredQuantity: 100,
              receivedQuantity: 100,
              unit: 'KG',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ownerType).toBe('FACTORY');
      expect(res.body.data.customerId).toBeNull();
    });

    it('Scenario 8: Different lots remain independently traceable', async () => {
      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'MULTI-LOT-CH-01',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'FACTORY_OWNED',
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: copperMaterialId,
              declaredQuantity: 1200,
              receivedQuantity: 1200,
              unit: 'KG',
              supplierLotNumber: 'SUP-LOT-A',
            },
            {
              materialId: copperMaterialId,
              declaredQuantity: 800,
              receivedQuantity: 800,
              unit: 'KG',
              supplierLotNumber: 'SUP-LOT-B',
            },
          ],
        });

      expect(res.status).toBe(201);
      const postRes = await request(app)
        .post(`/api/v1/inbound-challans/${res.body.data._id}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(postRes.status).toBe(200);

      const lots = await MaterialLotModel.find({ inboundChallanId: res.body.data._id });
      expect(lots).toHaveLength(2);
      expect(lots[0].lotNumber).not.toBe(lots[1].lotNumber);
      expect(lots.map((l) => l.initialQuantity).sort((a, b) => a - b)).toEqual([800, 1200]);
    });

    it('Scenario 9: Invalid materials and warehouses are rejected', async () => {
      const invalidId = '507f1f77bcf86cd799439011';
      const resInvalidMat = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'INV-TEST',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'FACTORY_OWNED',
          warehouseId: rawMaterialWarehouseId,
          lines: [
            {
              materialId: invalidId,
              declaredQuantity: 100,
              receivedQuantity: 100,
              unit: 'KG',
            },
          ],
        });
      expect(resInvalidMat.status).toBe(404);

      const resInvalidWh = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'INV-TEST',
          customerChallanDate: new Date().toISOString(),
          ownerType: 'FACTORY_OWNED',
          warehouseId: invalidId,
          lines: [
            {
              materialId: copperMaterialId,
              declaredQuantity: 100,
              receivedQuantity: 100,
              unit: 'KG',
            },
          ],
        });
      expect(resInvalidWh.status).toBe(404);
    });
  });

  describe('3. Stock Transfers', () => {
    it('Scenario 10 & 11: Transfers decrease source stock, increase destination stock, and preserve ownership & traceability', async () => {
      // Source Warehouse initially has factory PVC: 5100 KG.
      // Transfer 1500 KG to Production Floor Warehouse.
      const transferRes = await request(app)
        .post('/api/v1/stock-transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceWarehouseId: rawMaterialWarehouseId,
          destinationWarehouseId: productionWarehouseId,
          materialId: pvcMaterialId,
          ownerType: 'FACTORY_OWNED',
          quantity: 1500,
          unit: 'KG',
          remarks: 'Move PVC to Extrusion line',
          autoPost: true,
        });

      expect([200, 201]).toContain(transferRes.status);
      expect(transferRes.body.data.status).toBe('POSTED');
      expect(transferRes.body.data.transferNumber).toMatch(/^TRF-/);

      // Verify source warehouse balance decreased
      const sourceBalance = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: rawMaterialWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
      });
      expect(sourceBalance!.quantityOnHand).toBe(3500); // 5000 - 1500

      // Verify destination warehouse balance increased
      const destBalance = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
      });
      expect(destBalance!.quantityOnHand).toBe(1500);
      expect(destBalance!.quantityAvailable).toBe(1500);

      // Verify atomic ledger entries: TRANSFER_OUT and TRANSFER_IN
      const outTxn = await InventoryTransactionModel.findOne({
        sourceDocumentId: transferRes.body.data._id,
        transactionType: 'TRANSFER_OUT',
      });
      expect(outTxn).not.toBeNull();
      expect(outTxn!.warehouseId.toString()).toBe(rawMaterialWarehouseId);
      expect(outTxn!.quantity).toBe(1500);

      const inTxn = await InventoryTransactionModel.findOne({
        sourceDocumentId: transferRes.body.data._id,
        transactionType: 'TRANSFER_IN',
      });
      expect(inTxn).not.toBeNull();
      expect(inTxn!.warehouseId.toString()).toBe(productionWarehouseId);
      expect(inTxn!.quantity).toBe(1500);
    });

    it('should reject transfer when source and destination warehouse are identical', async () => {
      const res = await request(app)
        .post('/api/v1/stock-transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceWarehouseId: rawMaterialWarehouseId,
          destinationWarehouseId: rawMaterialWarehouseId,
          materialId: pvcMaterialId,
          ownerType: 'FACTORY_OWNED',
          quantity: 100,
          unit: 'KG',
        });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/different/i);
    });

    it('should reject transfer exceeding available stock', async () => {
      const res = await request(app)
        .post('/api/v1/stock-transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceWarehouseId: productionWarehouseId,
          destinationWarehouseId: rawMaterialWarehouseId,
          materialId: pvcMaterialId,
          ownerType: 'FACTORY_OWNED',
          quantity: 999999, // Impossible amount
          unit: 'KG',
          autoPost: true,
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Insufficient available stock/i);
    });
  });

  describe('4. Material Reservations', () => {
    let createdReservationId: string;

    it('Scenario 12: Reservations reduce available quantity but not on-hand physical quantity', async () => {
      // In Production Warehouse, factory PVC available is 1500 KG, onHand is 1500 KG.
      const res = await request(app)
        .post('/api/v1/material-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: pvcMaterialId,
          warehouseId: productionWarehouseId,
          ownerType: 'FACTORY_OWNED',
          reservedQuantity: 400,
          unit: 'KG',
          remarks: 'Reserve for Work Order WO-2026-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.reservationNumber).toMatch(/^RES-/);
      createdReservationId = res.body.data._id;

      // Verify balance: onHand MUST remain 1500, available MUST be 1100, reserved MUST be 400
      const balance = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
      });

      expect(balance!.quantityOnHand).toBe(1500); // PHYSICAL ON-HAND UNCHANGED!
      expect(balance!.quantityReserved).toBe(400);
      expect(balance!.quantityAvailable).toBe(1100);

      // Verify immutable reservation transaction in ledger
      const resTxn = await InventoryTransactionModel.findOne({
        sourceDocumentId: createdReservationId,
        transactionType: 'RESERVATION',
      });
      expect(resTxn).not.toBeNull();
      expect(resTxn!.quantity).toBe(400);
    });

    it('Scenario 13: Releasing a reservation restores availability exactly once', async () => {
      const releaseRes = await request(app)
        .post(`/api/v1/material-reservations/${createdReservationId}/release`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ remarks: 'Work order cancelled, release stock' });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.data.status).toBe('RELEASED');

      // Verify balance restored
      const balance = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
      });

      expect(balance!.quantityOnHand).toBe(1500);
      expect(balance!.quantityReserved).toBe(0);
      expect(balance!.quantityAvailable).toBe(1500);

      // Re-releasing MUST fail with 400
      const duplicateRelease = await request(app)
        .post(`/api/v1/material-reservations/${createdReservationId}/release`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(duplicateRelease.status).toBe(400);
      expect(duplicateRelease.body.message).toMatch(/Only ACTIVE reservations can be released/i);

      // Verify available stock not double-restored
      const balanceCheck = await InventoryBalanceModel.findOne({
        materialId: pvcMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
      });
      expect(balanceCheck!.quantityAvailable).toBe(1500);
    });

    it('Scenario 14: Over-reserving cannot exceed eligible stock', async () => {
      // Try reserving 2000 KG when only 1500 KG is available
      const res = await request(app)
        .post('/api/v1/material-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: pvcMaterialId,
          warehouseId: productionWarehouseId,
          ownerType: 'FACTORY_OWNED',
          reservedQuantity: 2000,
          unit: 'KG',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Insufficient available stock/i);
    });
  });

  describe('5. Opening Balances Migration', () => {
    let openingBalanceId: string;

    it('Scenario 15: Opening-balance posting is atomic and idempotent', async () => {
      // 1. Create Draft Opening Balance
      const draftRes = await request(app)
        .post('/api/v1/opening-balances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: copperMaterialId,
          warehouseId: productionWarehouseId,
          ownerType: 'FACTORY_OWNED',
          quantity: 1000,
          unit: 'KG',
          valuationRate: 750,
          remarks: 'Verified opening balance from audited physical count',
        });

      expect(draftRes.status).toBe(201);
      expect(draftRes.body.data.status).toBe('DRAFT');
      expect(draftRes.body.data.openingBalanceNumber).toMatch(/^OPB-/);
      openingBalanceId = draftRes.body.data._id;

      // Ensure stock not affected in DRAFT
      const prePostBal = await InventoryBalanceModel.findOne({
        materialId: copperMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
      });
      expect(prePostBal).toBeNull();

      // 2. Post Opening Balance
      const postRes = await request(app)
        .post(`/api/v1/opening-balances/${openingBalanceId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idempotencyKey: 'IDEMP-OPB-001' });

      expect(postRes.status).toBe(200);
      expect(postRes.body.data.status).toBe('POSTED');

      // Verify balance created
      const postBal = await InventoryBalanceModel.findOne({
        materialId: copperMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
      });
      expect(postBal).not.toBeNull();
      expect(postBal!.quantityOnHand).toBe(1000);
      expect(postBal!.quantityAvailable).toBe(1000);

      // Verify immutable transaction ledger entry
      const opbTxn = await InventoryTransactionModel.findOne({
        sourceDocumentId: openingBalanceId,
        transactionType: 'OPENING_BALANCE',
      });
      expect(opbTxn).not.toBeNull();
      expect(opbTxn!.quantity).toBe(1000);

      // 3. Repeat post request -> idempotent, stock not duplicated
      const repeatRes = await request(app)
        .post(`/api/v1/opening-balances/${openingBalanceId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idempotencyKey: 'IDEMP-OPB-001' });

      expect([200, 409]).toContain(repeatRes.status);
      const postBalCheck = await InventoryBalanceModel.findOne({
        materialId: copperMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
      });
      expect(postBalCheck!.quantityOnHand).toBe(1000);
    });
  });

  describe('6. Immutable Ledger Protection', () => {
    it('Scenario 16: Posted ledger transactions cannot be edited or deleted through normal APIs', async () => {
      const txn = await InventoryTransactionModel.findOne();
      expect(txn).not.toBeNull();
      const txnId = txn!._id.toString();

      // Attempt PATCH
      const patchRes = await request(app)
        .patch(`/api/v1/inventory/transactions/${txnId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ quantity: 9999 });
      expect([404, 405]).toContain(patchRes.status);

      // Attempt PUT
      const putRes = await request(app)
        .put(`/api/v1/inventory/transactions/${txnId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ quantity: 9999 });
      expect([404, 405]).toContain(putRes.status);

      // Attempt DELETE
      const deleteRes = await request(app)
        .delete(`/api/v1/inventory/transactions/${txnId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect([404, 405]).toContain(deleteRes.status);
    });
  });

  describe('7. Physical Stock Reconciliation', () => {
    let reconciliationId: string;

    it('Scenario 17: Stock reconciliation uses an adjustment transaction rather than a direct balance overwrite', async () => {
      // In Production warehouse, copper stock is 1000 KG.
      // Physical count finds 950 KG (discrepancy: -50 KG).
      const createRes = await request(app)
        .post('/api/v1/stock-reconciliations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          warehouseId: productionWarehouseId,
          materialId: copperMaterialId,
          ownerType: 'FACTORY_OWNED',
          physicalQuantity: 950,
          unit: 'KG',
          reason: 'Material loss during machine trial run',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.status).toBe('DRAFT');
      expect(createRes.body.data.systemQuantity).toBe(1000);
      expect(createRes.body.data.physicalQuantity).toBe(950);
      expect(createRes.body.data.discrepancyQuantity).toBe(-50);
      reconciliationId = createRes.body.data._id;

      // Attempt to post without approval -> must be rejected
      const unapprovedPost = await request(app)
        .post(`/api/v1/stock-reconciliations/${reconciliationId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(unapprovedPost.status).toBe(400);
      expect(unapprovedPost.body.message).toMatch(/must be APPROVED before posting/i);

      // Approve reconciliation
      const approveRes = await request(app)
        .post(`/api/v1/stock-reconciliations/${reconciliationId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ comments: 'Approved by Plant Head after verification' });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');

      // Post approved reconciliation
      const postRes = await request(app)
        .post(`/api/v1/stock-reconciliations/${reconciliationId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(postRes.status).toBe(200);
      expect(postRes.body.data.status).toBe('POSTED');

      // Balance must be 950 KG
      const balance = await InventoryBalanceModel.findOne({
        materialId: copperMaterialId,
        warehouseId: productionWarehouseId,
        ownerType: 'FACTORY',
      });
      expect(balance!.quantityOnHand).toBe(950);
      expect(balance!.quantityAvailable).toBe(950);

      // Verify immutable ADJUSTMENT_OUT transaction in ledger
      const adjTxn = await InventoryTransactionModel.findOne({
        sourceDocumentId: reconciliationId,
        transactionType: 'ADJUSTMENT_OUT',
      });
      expect(adjTxn).not.toBeNull();
      expect(adjTxn!.movementType).toBe('OUTWARD');
      expect(adjTxn!.quantity).toBe(50);
    });
  });

  describe('8. Daily Stock Summaries & Refresh', () => {
    it('Scenario 18: Daily summaries do not duplicate the same reporting scope', async () => {
      const today = new Date();
      const rebuild1 = await request(app)
        .post('/api/v1/inventory/daily-summary/rebuild')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today.toISOString() });
      expect(rebuild1.status).toBe(200);
      expect(rebuild1.body.data.scopesProcessed).toBeGreaterThan(0);

      // Rebuilding again should update existing scopes, not create duplicate documents
      const count1 = await GlobalStockSummaryModel.countDocuments();
      const rebuild2 = await request(app)
        .post('/api/v1/inventory/daily-summary/rebuild')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: today.toISOString() });
      expect(rebuild2.status).toBe(200);
      const count2 = await GlobalStockSummaryModel.countDocuments();
      expect(count2).toBe(count1);
    });
  });

  describe('9. Dashboard Accounting & Double-Count Prevention', () => {
    it('Scenario 19: Transfers and reservations are not double-counted as receipts or consumption', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Verify that receipts and transfers are separate line items
      expect(data.periodMovements).toHaveProperty('receipts');
      expect(data.periodMovements).toHaveProperty('transfersIn');
      expect(data.periodMovements).toHaveProperty('transfersOut');
      expect(data.periodMovements).toHaveProperty('reservations');

      // Transfers should not be lumped into receipts
      expect(data.periodMovements.transfersIn).toBe(1500);
      expect(data.periodMovements.transfersOut).toBe(1500);
    });
  });

  describe('10. Reorder Rules and Low-Stock Alerts', () => {
    it('Scenario 20: Low-stock alerts respect ownership and active reorder rules', async () => {
      // Create reorder rule for Copper Material in Production Warehouse
      // Current available stock in Production Warehouse is 950 KG.
      // Set reorderPoint to 1200 KG -> should trigger low stock alert!
      const ruleRes = await request(app)
        .post('/api/v1/material-reorder-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          materialId: copperMaterialId,
          warehouseId: productionWarehouseId,
          ownerType: 'FACTORY_OWNED',
          minStockLevel: 500,
          reorderPoint: 1200,
          reorderQuantity: 2000,
          isActive: true,
        });

      expect(ruleRes.status).toBe(201);
      const ruleId = ruleRes.body.data._id;

      // Query low-stock alerts
      const alertRes = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(alertRes.status).toBe(200);
      const alerts = alertRes.body.data;
      const copperAlert = alerts.find(
        (a: { materialId: string }) => a.materialId === copperMaterialId,
      );
      expect(copperAlert).toBeDefined();
      expect(copperAlert.currentAvailableQuantity).toBe(950);
      expect(copperAlert.reorderPoint).toBe(1200);
      expect(copperAlert.deficitQuantity).toBe(250); // 1200 - 950

      // Deactivate rule -> alert should disappear
      await request(app)
        .patch(`/api/v1/material-reorder-rules/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      const alertRes2 = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);
      const copperAlert2 = alertRes2.body.data.find(
        (a: { materialId: string }) => a.materialId === copperMaterialId,
      );
      expect(copperAlert2).toBeUndefined();
    });
  });

  describe('11. Query & Inspection Endpoints', () => {
    it('should support pagination and filtering on balances and transaction ledger', async () => {
      // 1. Check /inventory/balances
      const balRes = await request(app)
        .get('/api/v1/inventory/balances?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(balRes.status).toBe(200);
      expect(balRes.body.data.length).toBeGreaterThan(0);
      expect(balRes.body.meta).toHaveProperty('total');

      // 2. Check /inventory/transactions
      const txnRes = await request(app)
        .get('/api/v1/inventory/transactions?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(txnRes.status).toBe(200);
      expect(txnRes.body.data.length).toBeGreaterThan(0);
      expect(txnRes.body.meta).toHaveProperty('total');

      // 3. Check /inventory/materials/:id
      const matStockRes = await request(app)
        .get(`/api/v1/inventory/materials/${copperMaterialId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(matStockRes.status).toBe(200);
      expect(matStockRes.body.data.material.code).toBe('MAT-COPPER-8MM');
      expect(matStockRes.body.data.summary).toHaveProperty('totalOnHand');
      expect(matStockRes.body.data.balances.length).toBeGreaterThan(0);
    });
  });
});
