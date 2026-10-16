import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { TestEnvironment } from '../helpers/test-env';
import {
  createTestSuperAdmin,
  createTestAdmin,
  createTestCustomer,
  createTestWarehouse,
  createTestMaterial,
  createTestProduct,
  createTestBomVersion,
} from '../helpers/factories';
import { InventoryTransactionModel } from '../../src/modules/inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { MaterialLotModel } from '../../src/modules/materials/material-lot.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { DrumModel } from '../../src/modules/packing/drum.model';
import { PackingListModel } from '../../src/modules/packing/packing-list.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { ProductionOutputModel } from '../../src/modules/production/production-output.model';
import { TransactionUtil } from '../../src/common/utils/transaction.util';
import { BadRequestError } from '../../src/common/errors';

describe('Concurrency, Idempotency & Negative Business Rule Tests (Section 13)', () => {
  let adminToken: string;
  let adminId: string;

  let customerAId: string;
  let customerBId: string;
  let storeWarehouseId: string;
  let wipWarehouseId: string;
  let fgWarehouseId: string;
  let copperMaterialId: string;
  let cableProductId: string;
  let bomVersionId: string;
  let sharedWoId: string;

  beforeAll(async () => {
    await TestEnvironment.setup();

    // Pre-create collections to prevent MongoDB WiredTiger write conflicts on metadata
    const collections = [
      'users',
      'customers',
      'warehouses',
      'materials',
      'products',
      'bomversions',
      'materiallots',
      'inboundchallans',
      'inboundchallanlines',
      'inventorytransactions',
      'inventorybalances',
      'workorders',
      'productionorders',
      'productionbatches',
      'materialissues',
      'materialissuelines',
      'materialconsumptions',
      'materialreturns',
      'scraprecords',
      'productionoutputs',
      'drums',
      'packinglists',
      'packinglistlines',
      'dispatches',
      'dispatchlines',
      'outboundchallans',
      'idempotencyrecords',
      'documentsequences',
    ];
    for (const c of collections) {
      try {
        await mongoose.connection.createCollection(c);
      } catch {
        // collection already exists
      }
    }

    const admin = await createTestAdmin();
    adminId = admin.user._id.toString();
    adminToken = admin.token;

    const custA = await createTestCustomer({ code: 'CUST-CONCUR-A', name: 'Concur Corp A' });
    customerAId = custA._id.toString();

    const custB = await createTestCustomer({ code: 'CUST-CONCUR-B', name: 'Concur Corp B' });
    customerBId = custB._id.toString();

    const whStore = await createTestWarehouse({
      code: 'WH-STORE-CONCUR',
      name: 'Main Store Concur',
      type: 'RAW_MATERIAL',
    });
    storeWarehouseId = whStore._id.toString();

    const whWip = await createTestWarehouse({
      code: 'WH-WIP-CONCUR',
      name: 'WIP Concur',
      type: 'WORK_IN_PROGRESS',
    });
    wipWarehouseId = whWip._id.toString();

    const whFg = await createTestWarehouse({
      code: 'WH-FG-CONCUR',
      name: 'FG Concur',
      type: 'FINISHED_GOODS',
    });
    fgWarehouseId = whFg._id.toString();

    const matCopper = await createTestMaterial({
      code: 'MAT-COP-CONCUR',
      name: 'Electrolytic Copper Rod Concur',
      category: 'COPPER',
      baseUnit: 'KG',
    });
    copperMaterialId = matCopper._id.toString();

    const product = await createTestProduct({
      code: 'PROD-CONCUR-01',
      name: 'Concur 1.1kV 4C Cable',
    });
    cableProductId = product._id.toString();

    const bom = await createTestBomVersion({
      productId: cableProductId,
      versionNumber: 'V1.0',
      status: 'APPROVED',
      isCurrent: true,
      items: [
        {
          materialId: copperMaterialId,
          quantityPerUnit: 80.0, // 80 KG per 1,000 meters
          unit: 'KG',
          processStageName: 'STRANDING',
          scrapAllowancePercent: 2.0,
        },
      ],
    });
    bomVersionId = bom._id.toString();

    const wo = await WorkOrderModel.create({
      workOrderNumber: 'WO-CONCUR-SHARED-01',
      customerId: new mongoose.Types.ObjectId(customerAId),
      productId: new mongoose.Types.ObjectId(cableProductId),
      bomVersionId: new mongoose.Types.ObjectId(bomVersionId),
      targetDeliveryDate: new Date(),
      orderedLengthMeters: 1000,
      status: 'CONFIRMED',
    });
    sharedWoId = wo._id.toString();
  });

  afterAll(async () => {
    await TestEnvironment.teardown();
  });

  // =========================================================================
  // 1. IDEMPOTENCY TESTS
  // =========================================================================
  describe('1. Idempotency Controls', () => {
    let inboundChallanId: string;

    it('1.1 creates draft inbound receipt challan', async () => {
      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          customerChallanNumber: 'CH-IDEMP-001',
          customerChallanDate: new Date().toISOString(),
          warehouseId: storeWarehouseId,
          vehicleNumber: 'MH-12-CONCUR',
          lines: [
            {
              materialId: copperMaterialId,
              declaredQuantity: 100.0,
              receivedQuantity: 100.0,
              unit: 'KG',
              ownerType: 'CUSTOMER',
              supplierLotNumber: 'SUP-IDEMP-01',
            },
          ],
        });

      expect(res.status).toBe(201);
      inboundChallanId = res.body.data._id;
    });

    it('1.2 posting with Idempotency-Key succeeds on first attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/inbound-challans/${inboundChallanId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', 'KEY-IDEMP-RECEIPT-001')
        .send({ remarks: 'First post attempt' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('POSTED');

      // Verify exactly 1 ledger transaction created
      const txnCount = await InventoryTransactionModel.countDocuments({
        sourceDocumentId: inboundChallanId,
      });
      expect(txnCount).toBe(1);

      // Verify store balance is exactly 100 KG
      const bal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(bal?.quantityOnHand).toBe(100.0);
    });

    it('1.3 retrying the post request with identical Idempotency-Key returns cached response without duplicating ledger', async () => {
      const res = await request(app)
        .post(`/api/v1/inbound-challans/${inboundChallanId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', 'KEY-IDEMP-RECEIPT-001')
        .send({ remarks: 'First post attempt' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Ledger must STILL have only 1 transaction (no double-credit)
      const txnCount = await InventoryTransactionModel.countDocuments({
        sourceDocumentId: inboundChallanId,
      });
      expect(txnCount).toBe(1);

      // Store balance must STILL be exactly 100 KG (not 200 KG)
      const bal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(bal?.quantityOnHand).toBe(100.0);
    });

    it('1.4 attempting to post an already posted challan without idempotency key returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/inbound-challans/${inboundChallanId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ remarks: 'Duplicate post attempt without key' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. CONCURRENT STOCK RESERVATION COMPETITION
  // =========================================================================
  describe('2. Concurrent Stock Reservation Competition', () => {
    let wo1Id: string;
    let wo2Id: string;

    beforeAll(async () => {
      // Total available stock in store = 100 KG
      // Create two work orders that each require 80 KG (total required = 160 KG > 100 KG available)
      const res1 = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 1000,
          customerPoNumber: 'PO-CONCUR-01',
          targetDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        });
      wo1Id = res1.body.data._id;
      await request(app).post(`/api/v1/work-orders/${wo1Id}/confirm`).set('Authorization', `Bearer ${adminToken}`).send({});

      const res2 = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          productId: cableProductId,
          bomVersionId: bomVersionId,
          orderedLengthMeters: 1000,
          customerPoNumber: 'PO-CONCUR-02',
          targetDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        });
      wo2Id = res2.body.data._id;
      await request(app).post(`/api/v1/work-orders/${wo2Id}/confirm`).set('Authorization', `Bearer ${adminToken}`).send({});
    });

    it('2.1 executes concurrent reservation requests competing for 100 KG available stock', async () => {
      // Fire both reservation requests concurrently
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/work-orders/${wo1Id}/reserve-materials`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({}),
        request(app)
          .post(`/api/v1/work-orders/${wo2Id}/reserve-materials`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({}),
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly one must succeed (200), and competing request rejected with 400 Bad Request (Insufficient stock)
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);
      expect(statuses).not.toContain(500);

      // Verify Database state:
      const bal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        warehouseId: new mongoose.Types.ObjectId(storeWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });

      // Total physical on-hand MUST still be 100 KG
      expect(bal?.quantityOnHand).toBeCloseTo(100.0, 4);
      // Exactly 81.6 KG was reserved by the winning work order (80 KG + 2% scrap allowance)
      expect(bal?.quantityReserved).toBeCloseTo(81.6, 4);
      // Exactly 18.4 KG remains available (100 - 81.6)
      expect(bal?.quantityAvailable).toBeCloseTo(18.4, 4);

      // Verify ledger transactions: exactly 1 reservation transaction of 81.6 KG created
      const resLedger = await InventoryTransactionModel.find({
        materialId: new mongoose.Types.ObjectId(copperMaterialId),
        transactionType: 'RESERVATION',
      });
      expect(resLedger).toHaveLength(1);
      expect(resLedger[0].quantity).toBeCloseTo(81.6, 4);
    });
  });

  // =========================================================================
  // 3. CONCURRENT DISPATCH OF SAME DRUM COMPETITION
  // =========================================================================
  describe('3. Concurrent Dispatch of Same Drum', () => {
    let drumId: string;
    let packingListId: string;
    let dispatch1Id: string;
    let dispatch2Id: string;

    beforeAll(async () => {
      // 1. Create Drum
      const drumRes = await request(app)
        .post('/api/v1/drums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drumNumber: 'DRM-CONCUR-999',
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
          workOrderId: sharedWoId,
          currentWarehouseId: fgWarehouseId,
          status: 'AVAILABLE',
        });
      drumId = drumRes.body.data._id;

      // Ensure finished goods stock is present in FG warehouse
      await InventoryBalanceModel.findOneAndUpdate(
        {
          materialId: new mongoose.Types.ObjectId(cableProductId),
          warehouseId: new mongoose.Types.ObjectId(fgWarehouseId),
          customerId: new mongoose.Types.ObjectId(customerAId),
        },
        {
          $inc: { quantityOnHand: 1000, quantityAvailable: 1000 },
          $setOnInsert: {
            unit: 'MTR',
            ownerType: 'CUSTOMER',
            quantityReserved: 0,
          },
        },
        { upsert: true, new: true },
      );

      // Seed approved Production Output for this work order so packing validation passes
      await ProductionOutputModel.create({
        outputNumber: 'OUT-CONCUR-01',
        productionOrderId: new mongoose.Types.ObjectId(),
        productionBatchId: new mongoose.Types.ObjectId(),
        workOrderId: new mongoose.Types.ObjectId(sharedWoId),
        productId: new mongoose.Types.ObjectId(cableProductId),
        processStageId: new mongoose.Types.ObjectId(),
        outputLengthMeters: 1000,
        outputWeightKg: 480,
        targetWarehouseId: new mongoose.Types.ObjectId(fgWarehouseId),
        isFinalStage: true,
        qualityStatus: 'PASSED',
        status: 'POSTED',
        postedAt: new Date(),
      });

      // 2. Create Packing List
      const plRes = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: sharedWoId,
          customerId: customerAId,
          packingWarehouseId: fgWarehouseId,
          remarks: 'Packed for concurrent dispatch test',
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
      packingListId = plRes.body.data._id;

      // Pack and finalize packing list
      await request(app)
        .post(`/api/v1/packing-lists/${packingListId}/pack`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Create two distinct dispatch drafts referencing the same packed drum
      const d1Res = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: sharedWoId,
          customerId: customerAId,
          sourceWarehouseId: fgWarehouseId,
          destinationAddress: 'Site 1',
          vehicleNumber: 'MH-12-D1',
          transporter: 'Express Logistics 1',
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
      dispatch1Id = d1Res.body.data._id;

      const d2Res = await request(app)
        .post('/api/v1/dispatches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workOrderId: sharedWoId,
          customerId: customerAId,
          sourceWarehouseId: fgWarehouseId,
          destinationAddress: 'Site 2',
          vehicleNumber: 'MH-12-D2',
          transporter: 'Express Logistics 2',
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
      dispatch2Id = d2Res.body.data._id;
    });

    it('3.1 concurrent dispatch posting on the same packed drum allows exactly one to succeed', async () => {
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/dispatches/${dispatch1Id}/dispatch`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ remarks: 'Dispatch posting 1' }),
        request(app)
          .post(`/api/v1/dispatches/${dispatch2Id}/dispatch`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ remarks: 'Dispatch posting 2' }),
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly one must succeed (200), and competing dispatch blocked with 409 Conflict (already dispatched)
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);
      expect(statuses).not.toContain(500);

      // Verify Drum status in database: MUST be DISPATCHED exactly once
      const drum = await DrumModel.findById(drumId);
      expect(drum?.status).toBe('DISPATCHED');

      // Verify finished goods inventory was deducted exactly once (from 1,000m to 0m)
      const fgBal = await InventoryBalanceModel.findOne({
        materialId: new mongoose.Types.ObjectId(cableProductId),
        warehouseId: new mongoose.Types.ObjectId(fgWarehouseId),
        customerId: new mongoose.Types.ObjectId(customerAId),
      });
      expect(fgBal?.quantityOnHand).toBe(0.0);

      // Verify dispatch ledger transaction was created exactly once (no duplicate deduction)
      const dispatchTxns = await InventoryTransactionModel.find({
        materialId: new mongoose.Types.ObjectId(cableProductId),
        transactionType: 'DISPATCH',
      });
      expect(dispatchTxns).toHaveLength(1);
      expect(dispatchTxns[0].quantity).toBe(1000);
    });
  });

  // =========================================================================
  // 4. NEGATIVE BUSINESS RULES & INVALID STATE TRANSITIONS
  // =========================================================================
  describe('4. Negative Business Rules & State Transition Violations', () => {
    it('4.1 rejects reservation on an unconfirmed (DRAFT) work order', async () => {
      const draftWo = await WorkOrderModel.create({
        workOrderNumber: 'WO-DRAFT-INVALID-01',
        customerId: new mongoose.Types.ObjectId(customerAId),
        productId: new mongoose.Types.ObjectId(cableProductId),
        bomVersionId: new mongoose.Types.ObjectId(bomVersionId),
        targetDeliveryDate: new Date(),
        orderedLengthMeters: 500,
        status: 'DRAFT',
      });

      const res = await request(app)
        .post(`/api/v1/work-orders/${draftWo._id}/reserve-materials`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('4.2 rejects confirming an already CANCELLED work order', async () => {
      const cancelledWo = await WorkOrderModel.create({
        workOrderNumber: 'WO-CANCEL-INVALID-01',
        customerId: new mongoose.Types.ObjectId(customerAId),
        productId: new mongoose.Types.ObjectId(cableProductId),
        bomVersionId: new mongoose.Types.ObjectId(bomVersionId),
        targetDeliveryDate: new Date(),
        orderedLengthMeters: 500,
        status: 'CANCELLED',
      });

      const res = await request(app)
        .post(`/api/v1/work-orders/${cancelledWo._id}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('4.3 rejects packing an already DISPATCHED drum into a new packing list', async () => {
      const dispatchedDrum = await DrumModel.create({
        drumNumber: 'DRM-ALREADY-DISP-01',
        productId: new mongoose.Types.ObjectId(cableProductId),
        lengthMeters: 500,
        tareWeightKg: 100,
        netWeightKg: 200,
        grossWeightKg: 300,
        status: 'DISPATCHED',
      });

      const res = await request(app)
        .post('/api/v1/packing-lists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customerAId,
          warehouseId: fgWarehouseId,
          drums: [
            {
              drumId: dispatchedDrum._id.toString(),
              productId: cableProductId,
              drumNumber: 'DRM-ALREADY-DISP-01',
              packedLengthMeters: 500,
              grossWeightKg: 300,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('4.4 rejects creating inbound challan with missing mandatory customerId', async () => {
      const res = await request(app)
        .post('/api/v1/inbound-challans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerChallanNumber: 'CH-NO-CUST',
          warehouseId: storeWarehouseId,
          lines: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 5. TRANSACTION RETRY UTILITY & ATOMIC ROLLBACK TESTS
  // =========================================================================
  describe('5. TransactionUtil Retry & Rollback Guarantees', () => {
    it('5.1 detects transient transaction errors correctly', () => {
      expect(TransactionUtil.isTransientError({ code: 112 })).toBe(true);
      expect(
        TransactionUtil.isTransientError({
          name: 'MongoServerError',
          message: 'Write conflict during plan execution and yielding is disabled.',
        }),
      ).toBe(true);
      expect(
        TransactionUtil.isTransientError({
          errorLabels: ['TransientTransactionError'],
        }),
      ).toBe(true);
      expect(TransactionUtil.isTransientError(new Error('Validation failed'))).toBe(false);
      expect(TransactionUtil.isTransientError(null)).toBe(false);
    });

    it('5.2 retries when TransientTransactionError occurs and commits cleanly on retry', async () => {
      let attempts = 0;
      const testCode = `CUST-RETRY-${Date.now()}`;

      const customer = await TransactionUtil.runInTransaction(async (session) => {
        attempts++;
        if (attempts === 1) {
          // Simulate MongoDB Transient WriteConflict on first attempt
          const err: any = new Error('Write conflict during plan execution');
          err.name = 'MongoServerError';
          err.code = 112;
          err.errorLabels = ['TransientTransactionError'];
          throw err;
        }

        // Second attempt succeeds and creates record
        const [doc] = await CustomerModel.create(
          [
            {
              code: testCode,
              name: 'Retry Customer',
              contactPerson: 'Retry Contact',
              email: `retry.${Date.now()}@example.com`,
              phone: '+919876543210',
              billingAddress: {
                street: '123 Test St',
                city: 'Mumbai',
                state: 'Maharashtra',
                postalCode: '400001',
                country: 'India',
              },
              isActive: true,
            },
          ],
          { session },
        );
        return doc;
      });

      expect(attempts).toBe(2);
      expect(customer.code).toBe(testCode);

      // Verify DB has exactly 1 customer created (no duplicates from attempt 1)
      const count = await CustomerModel.countDocuments({ code: testCode });
      expect(count).toBe(1);
    });

    it('5.3 aborts immediately on non-transient error and rolls back partial records cleanly', async () => {
      const rollbackCode = `CUST-ROLLBACK-${Date.now()}`;

      await expect(
        TransactionUtil.runInTransaction(async (session) => {
          await CustomerModel.create(
            [
              {
                code: rollbackCode,
                name: 'Rollback Customer',
                contactPerson: 'Rollback Contact',
                email: `rollback.${Date.now()}@example.com`,
                phone: '+919876543211',
                billingAddress: {
                  street: '456 Rollback Rd',
                  city: 'Pune',
                  state: 'Maharashtra',
                  postalCode: '411001',
                  country: 'India',
                },
                isActive: true,
              },
            ],
            { session },
          );

          // Throw non-transient application error
          throw new BadRequestError('Deliberate application error to test atomic rollback');
        }),
      ).rejects.toThrow('Deliberate application error to test atomic rollback');

      // Verify that Customer was rolled back and 0 records exist
      const count = await CustomerModel.countDocuments({ code: rollbackCode });
      expect(count).toBe(0);
    });
  });
});
