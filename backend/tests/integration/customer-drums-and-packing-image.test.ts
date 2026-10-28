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
import { DrumModel } from '../../src/modules/packing/drum.model';
import { DrumMovementModel } from '../../src/modules/packing/drum-movement.model';
import { InboundChallanModel } from '../../src/modules/inventory/inbound-challan.model';
import { OutboundChallanModel } from '../../src/modules/dispatch/outbound-challan.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Customer Drum Receiving, Packing List (Image Match), and Challan Generation', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;

  let customerId: string;
  let productId: string;
  let warehouseId: string;
  let workOrderId: string;
  let packingListId: string;

  let drumMf01Id: string;
  let drumMf02Id: string;
  let drumMf03Id: string;
  let drumMf06Id: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-PACK',
      email: 'admin.pack@mfolks.com',
      passwordHash: 'hashed_pwd',
      firstName: 'Packing',
      lastName: 'Manager',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      role: 'ADMIN',
      employeeCode: admin.employeeCode,
    });

    // Customer as shown in image: V-MARC INDIA LIMITED
    const customer = await CustomerModel.create({
      code: 'CUST-VMARC-001',
      name: 'V-MARC INDIA LIMITED',
      gstin: '08AAOCM2650D1ZI',
      email: 'contact@vmarc.com',
      phone: '+919876543210',
      billingAddress: {
        street: 'Industrial Area, Chopanki',
        city: 'Alwar',
        state: 'Rajasthan',
        postalCode: '301707',
        country: 'India',
      },
      isActive: true,
    });
    customerId = customer._id.toString();

    // Product matching SIZE: 4CX35 SQMM A2XFY
    const product = await ProductModel.create({
      code: '4CX35 SQMM A2XFY',
      name: '4C x 35 sq.mm Aluminum XLPE Armoured Cable',
      description: '4CX35 SQMM A2XFY',
      cableCategory: 'LT_POWER',
      voltageGrade: '1.1KV',
      coreCount: 4,
      crossSectionSqMm: 35,
      standardUnit: 'METER',
      baseUnit: 'METER',
      isActive: true,
    });
    productId = product._id.toString();

    const warehouse = await WarehouseModel.create({
      code: 'WH-DRUM-YARD',
      name: 'Drum Yard / Storage',
      type: 'FINISHED_GOODS',
      isActive: true,
    });
    warehouseId = warehouse._id.toString();

    const stage = await ProcessStageModel.create({
      code: 'STAGE-FINAL-TEST',
      name: 'Final Inspection & Packaging',
      sequenceOrder: 1,
      isActive: true,
    });

    // Work Order matching image: MF-2026-01
    const workOrder = await WorkOrderModel.create({
      workOrderNumber: 'MF-2026-01',
      customerId: customer._id,
      productId: product._id,
      bomVersionId: new mongoose.Types.ObjectId(),
      orderedLengthMeters: 2000,
      deliveredLengthMeters: 0,
      targetCompletionDate: new Date('2026-08-30'),
      status: 'IN_PRODUCTION',
    });
    workOrderId = workOrder._id.toString();

    const prodOrder = await ProductionOrderModel.create({
      productionOrderNumber: 'PO-2026-01',
      workOrderId: workOrder._id,
      customerId: customer._id,
      productId: product._id,
      bomVersionId: workOrder.bomVersionId,
      plannedLengthMeters: 2000,
      targetCompletionDate: new Date('2026-08-25'),
      status: 'RELEASED',
    });

    const batch = await ProductionBatchModel.create({
      batchNumber: 'BATCH-2026-01',
      productionOrderId: prodOrder._id,
      workOrderId: workOrder._id,
      processStageId: stage._id,
      plannedQuantity: 2000,
      machineCode: 'MCH-01',
      unit: 'METER',
      status: 'COMPLETED',
    });

    // Pre-record 2000 meters of finished good output so FG check passes
    await ProductionOutputModel.create({
      outputNumber: 'OUT-2026-01',
      productionOrderId: prodOrder._id,
      workOrderId: workOrder._id,
      productionBatchId: batch._id,
      processStageId: stage._id,
      outputLengthMeters: 2000,
      outputWeightKg: 2000,
      targetWarehouseId: warehouse._id,
      isFinalStage: true,
      qualityStatus: 'PASSED',
      status: 'POSTED',
      postedAt: new Date(),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. INBOUND CUSTOMER DRUM RECEIVING WITH CHALLAN / RGP
  // =========================================================================
  it('1. should receive customer-supplied empty drums with Inbound Challan (Ref RGP No: 262740872)', async () => {
    const res = await request(app)
      .post('/api/v1/drums/receive-inbound')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        customerChallanNumber: '262740872', // Ref RGP No from image
        customerChallanDate: '2026-08-10',
        warehouseId,
        vehicleNumber: 'RJ-02-GB-5511',
        transporter: 'V-Trans Logistics',
        lrNumber: 'LR-2627-991',
        remarks: 'Customer empty wooden drums received against RGP 262740872',
        drums: [
          { drumNumber: 'MF/01', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGNTH' },
          { drumNumber: 'MF/02', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGNTH' },
          { drumNumber: 'MF/03', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGNTH' },
          { drumNumber: 'MF/06', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGNTH' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.drums.length).toBe(4);

    const drums = res.body.data.drums;
    drumMf01Id = drums[0]._id;
    drumMf02Id = drums[1]._id;
    drumMf03Id = drums[2]._id;
    drumMf06Id = drums[3]._id;

    // Verify drum properties
    expect(drums[0].drumNumber).toBe('MF/01');
    expect(drums[0].drumSize).toBe('44X16X24');
    expect(drums[0].refRgpNumber).toBe('262740872');
    expect(drums[0].ownership).toBe('CUSTOMER_SUPPLIED');
    expect(drums[0].status).toBe('AVAILABLE');

    // Verify Inbound Challan was recorded
    const challan = await InboundChallanModel.findOne({ customerChallanNumber: '262740872' });
    expect(challan).toBeDefined();
    expect(challan?.ownerType).toBe('CUSTOMER');
    expect(challan?.customerId?.toString()).toBe(customerId);

    // Verify INBOUND_RECEIPT drum movement recorded
    const movements = await DrumMovementModel.find({ drumId: drumMf01Id, movementType: 'INBOUND_RECEIPT' });
    expect(movements.length).toBe(1);
    expect(movements[0].referenceDocumentType).toBe('InboundChallan');
  });

  // =========================================================================
  // 2. CREATE PACKING LIST MATCHING THE IMAGE
  // =========================================================================
  it('2. should create packing list matching header and table columns from the image', async () => {
    const res = await request(app)
      .post('/api/v1/packing-lists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        workOrderId,
        customerId,
        productId,
        packingListNumber: 'MF/PL/389', // PACKING NO.
        invoiceNumber: '2025-26/RJ/JW/337', // INVOICE NO.
        challanNumber: 'MF/DC/408', // CHALLAN NO.
        sizeDescription: '4CX35 SQMM A2XFY', // SIZE
        packingDate: '2026-08-17', // DATE: 17-08-2026
        packingWarehouseId: warehouseId,
        remarks: 'Standard packaging as per customer schedule',
        lines: [
          {
            sNo: 1,
            drumId: drumMf01Id,
            drumNumber: 'MF/01',
            lengthBottom: 0,
            lengthTop: 495,
            lengthTotal: 495,
            drumSize: '44X16X24',
            refRgpNo: '262740872',
            remarks: 'STD.LENGNTH',
          },
          {
            sNo: 2,
            drumId: drumMf02Id,
            drumNumber: 'MF/02',
            lengthBottom: 0,
            lengthTop: 495,
            lengthTotal: 495,
            drumSize: '44X16X24',
            refRgpNo: '262740872',
            remarks: 'STD.LENGNTH',
          },
          {
            sNo: 3,
            drumId: drumMf03Id,
            drumNumber: 'MF/03',
            lengthBottom: 0,
            lengthTop: 499,
            lengthTotal: 499,
            drumSize: '44X16X24',
            refRgpNo: '262740872',
            remarks: 'STD.LENGNTH',
          },
          {
            sNo: 4,
            drumId: drumMf06Id,
            drumNumber: 'MF/06',
            lengthBottom: 0,
            lengthTop: 508,
            lengthTotal: 508,
            drumSize: '44X16X24',
            refRgpNo: '262740872',
            remarks: 'STD.LENGNTH',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    packingListId = res.body.data._id;

    expect(res.body.data.packingListNumber).toBe('MF/PL/389');
    expect(res.body.data.invoiceNumber).toBe('2025-26/RJ/JW/337');
    expect(res.body.data.challanNumber).toBe('MF/DC/408');
    expect(res.body.data.sizeDescription).toBe('4CX35 SQMM A2XFY');
    expect(res.body.data.totalDrums).toBe(4);
    // 495 + 495 + 499 + 508 = 1997.0
    expect(res.body.data.totalLengthMeters).toBe(1997);
  });

  // =========================================================================
  // 3. FINALIZE & PACK DRUMS
  // =========================================================================
  it('3. should finalize packing list and transition drums to PACKED status', async () => {
    const res = await request(app)
      .post(`/api/v1/packing-lists/${packingListId}/pack`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PACKED');

    const drumMf01 = await DrumModel.findById(drumMf01Id);
    expect(drumMf01?.status).toBe('PACKED');
    expect(drumMf01?.cableLengthMeters).toBe(495);
    expect(drumMf01?.packingListId?.toString()).toBe(packingListId);
  });

  // =========================================================================
  // 4. RENDER COMPLETE DOCUMENT MATCHING IMAGE
  // =========================================================================
  it('4. should render the exact printable document structure matching the scanned image', async () => {
    const res = await request(app)
      .get(`/api/v1/packing-lists/${packingListId}/document`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = res.body.data;

    // Company Header
    expect(doc.company.name).toBe('MFOLKS INDUSTRIES PRIVATE LIMITED');
    expect(doc.company.gstin).toBe('08AAOCM2650D1ZI');
    expect(doc.documentTitle).toBe('PACKING LIST');

    // Header Meta
    expect(doc.header.customerName).toBe('V-MARC INDIA LIMITED');
    expect(doc.header.workOrder).toBe('MF-2026-01');
    expect(doc.header.size).toBe('4CX35 SQMM A2XFY');
    expect(doc.header.invoiceNumber).toBe('2025-26/RJ/JW/337');
    expect(doc.header.challanNumber).toBe('MF/DC/408');
    expect(doc.header.packingNumber).toBe('MF/PL/389');

    // Table Rows
    expect(doc.table.length).toBe(4);

    expect(doc.table[0]).toEqual({
      sNo: 1,
      dNo: 'MF/01',
      lengthBottom: 0,
      lengthTop: 495,
      lengthTotal: 495,
      drumSize: '44X16X24',
      refRgpNo: '262740872',
      type: 'WOODEN',
      remark: 'STD.LENGNTH',
    });

    expect(doc.table[1]).toEqual({
      sNo: 2,
      dNo: 'MF/02',
      lengthBottom: 0,
      lengthTop: 495,
      lengthTotal: 495,
      drumSize: '44X16X24',
      refRgpNo: '262740872',
      type: 'WOODEN',
      remark: 'STD.LENGNTH',
    });

    expect(doc.table[2]).toEqual({
      sNo: 3,
      dNo: 'MF/03',
      lengthBottom: 0,
      lengthTop: 499,
      lengthTotal: 499,
      drumSize: '44X16X24',
      refRgpNo: '262740872',
      type: 'WOODEN',
      remark: 'STD.LENGNTH',
    });

    expect(doc.table[3]).toEqual({
      sNo: 4,
      dNo: 'MF/06',
      lengthBottom: 0,
      lengthTop: 508,
      lengthTotal: 508,
      drumSize: '44X16X24',
      refRgpNo: '262740872',
      type: 'WOODEN',
      remark: 'STD.LENGNTH',
    });

    // Summary Totals
    expect(doc.totalLength).toBe(1997.0);
    expect(doc.totalDrums).toBe(4);
    expect(doc.footer).toBe('For MFOLKS INDUSTRIES PRIVATE LIMITED');
  });

  // =========================================================================
  // 5. OUTBOUND DELIVERY CHALLAN GENERATION (MF/DC/408)
  // =========================================================================
  it('5. should generate Outbound Delivery Challan (MF/DC/408) linking invoice and packing list', async () => {
    const res = await request(app)
      .post(`/api/v1/packing-lists/${packingListId}/generate-challan`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        challanNumber: 'MF/DC/408',
        invoiceNumber: '2025-26/RJ/JW/337',
        vehicleNumber: 'RJ-02-GB-5511',
        transporter: 'V-Trans Logistics',
        eWayBillNumber: 'EWB-2627-009988',
        remarks: 'Packed cable drums dispatched for job-work contract',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const challan = res.body.data;
    expect(challan.challanNumber).toBe('MF/DC/408');
    expect(challan.invoiceNumber).toBe('2025-26/RJ/JW/337');
    expect(challan.packingListNumber).toBe('MF/PL/389');
    expect(challan.sizeDescription).toBe('4CX35 SQMM A2XFY');
    expect(challan.totalDrums).toBe(4);
    expect(challan.totalLengthMeters).toBe(1997);
    expect(challan.items.length).toBe(4);

    expect(challan.items[0].drumNumber).toBe('MF/01');
    expect(challan.items[0].drumSize).toBe('44X16X24');
    expect(challan.items[0].refRgpNumber).toBe('262740872');
    expect(challan.items[0].lengthMeters).toBe(495);

    // Verify stored in DB
    const dbChallan = await OutboundChallanModel.findOne({ challanNumber: 'MF/DC/408' });
    expect(dbChallan).toBeDefined();
    expect(dbChallan?.packingListId?.toString()).toBe(packingListId);
  });
});
