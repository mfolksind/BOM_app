import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { ProductModel } from '../../src/modules/products/product.model';
import { BomVersionModel } from '../../src/modules/bom/bom-version.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { ProductionOrderModel } from '../../src/modules/production/production-order.model';
import { MachineModel } from '../../src/modules/machines/machine.model';
import { ProcessStageModel } from '../../src/modules/shared/process-stage.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Process Stages, Machine Custom Quality Tests (Free Hand), and Pass/Fail Machine Workflow', () => {
  let replSet: MongoMemoryReplSet;
  let adminToken: string;

  let customerId: string;
  let productId: string;
  let bomVersionId: string;
  let workOrderId: string;
  let productionOrderId: string;
  let machine1Id: string;
  let machine2Id: string;
  let stage1Id: string;
  let stage2Id: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-TEST',
      email: 'admin.qa@mfolks.com',
      passwordHash: 'hashed_pwd',
      firstName: 'Quality',
      lastName: 'Manager',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = TokenUtil.generateAccessToken({
      userId: admin._id.toString(),
      role: 'ADMIN',
      employeeCode: admin.employeeCode,
    });

    const cust = await CustomerModel.create({
      code: 'CUST-QA-01',
      name: 'Havells India Ltd',
      gstin: '07AAACH1111A1Z1',
      email: 'havells@example.com',
      phone: '+919876543210',
      billingAddress: {
        street: 'Noida Sector 59',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201301',
        country: 'India',
      },
      isActive: true,
    });
    customerId = cust._id.toString();

    const prod = await ProductModel.create({
      code: 'PROD-3CX2.5-CU',
      name: '3C x 2.5 sqmm Flexible Copper Cable',
      voltageGrade: '1.1KV',
      cableCategory: 'LT_POWER',
      coreCount: 3,
      crossSectionSqMm: 2.5,
      baseUnit: 'METER',
      isActive: true,
    });
    productId = prod._id.toString();

    const bom = await BomVersionModel.create({
      bomNumber: 'BOM-3CX2.5-V1',
      productId: prod._id,
      versionNumber: 1,
      batchSize: 1000,
      outputUnit: 'METER',
      effectiveFrom: new Date(),
      status: 'ACTIVE',
    });
    bomVersionId = bom._id.toString();

    const storeWh = await WarehouseModel.create({
      code: 'WH-STORE-QA',
      name: 'Central Store',
      type: 'RAW_MATERIAL',
      address: 'Central Plant Area',
      isActive: true,
    });

    const workOrder = await WorkOrderModel.create({
      workOrderNumber: 'WO-QA-001',
      customerId: cust._id,
      productId: prod._id,
      bomVersionId: bom._id,
      orderedLengthMeters: 1000,
      targetCompletionDate: new Date(Date.now() + 10 * 86400000),
      status: 'CONFIRMED',
    });
    workOrderId = workOrder._id.toString();

    const prodOrder = await ProductionOrderModel.create({
      productionOrderNumber: 'PO-QA-001',
      workOrderId: workOrder._id,
      productId: prod._id,
      bomVersionId: bom._id,
      customerId: cust._id,
      plannedLengthMeters: 1000,
      status: 'IN_PROGRESS',
      startDate: new Date(),
      targetCompletionDate: new Date(Date.now() + 10 * 86400000),
    });
    productionOrderId = prodOrder._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. should seed standard cable process stages and list them', async () => {
    const seedRes = await request(app)
      .post('/api/v1/process-stages/seed-defaults')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(seedRes.status).toBe(200);
    expect(seedRes.body.data.length).toBeGreaterThanOrEqual(8);

    const listRes = await request(app)
      .get('/api/v1/process-stages')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(8);

    // Save drawing & stranding stage IDs
    const drawing = listRes.body.data.find((s: { code: string }) => s.code === 'STAGE-DRAWING');
    const stranding = listRes.body.data.find((s: { code: string }) => s.code === 'STAGE-STRANDING');
    expect(drawing).toBeDefined();
    expect(stranding).toBeDefined();
    stage1Id = drawing._id;
    stage2Id = stranding._id;
  });

  it('2. should register machines with free-hand custom quality test checklists', async () => {
    // Machine 1 for Stage 1 (Drawing) with custom tests: Wire Diameter, Elongation, Surface Finish
    const m1Res = await request(app)
      .post('/api/v1/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'MCH-DRAW-TEST',
        name: 'Henrich Fast Wire Drawing Line',
        processStageIds: [stage1Id],
        machineType: 'DRAWING',
        capacityPerShift: 4000,
        speedMetersPerMinute: 600,
        location: 'Bay 1',
        customTests: [
          {
            testName: 'Conductor Diameter Check',
            testType: 'DIMENSIONAL',
            unit: 'mm',
            standardSpecification: 'IS 8130',
            minValue: 1.78,
            maxValue: 1.82,
            isMandatory: true,
          },
          {
            testName: 'Tensile Elongation Test',
            testType: 'MECHANICAL',
            unit: '%',
            standardSpecification: 'IS 8130 Min 25%',
            minValue: 25,
            maxValue: 40,
            isMandatory: true,
          },
          {
            testName: 'Surface Smoothness & Oxidation',
            testType: 'VISUAL',
            standardSpecification: 'Clean & Bright Copper',
            isMandatory: false,
          },
        ],
      });

    expect(m1Res.status).toBe(201);
    expect(m1Res.body.data.customTests.length).toBe(3);
    machine1Id = m1Res.body.data._id;

    // Machine 2 for Stage 2 (Stranding)
    const m2Res = await request(app)
      .post('/api/v1/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'MCH-STRAND-TEST',
        name: 'Pourtier High Speed Buncher',
        processStageIds: [stage2Id],
        machineType: 'STRANDING',
        capacityPerShift: 3000,
        speedMetersPerMinute: 300,
        location: 'Bay 2',
        customTests: [
          {
            testName: 'Stranded Conductor Outer Diameter',
            testType: 'DIMENSIONAL',
            unit: 'mm',
            minValue: 2.1,
            maxValue: 2.3,
          },
        ],
      });
    expect(m2Res.status).toBe(201);
    machine2Id = m2Res.body.data._id;
  });

  it('3. should create batch on Machine 1, transition machine to RUNNING', async () => {
    const batchRes = await request(app)
      .post(`/api/v1/production-orders/${productionOrderId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        processStageId: stage1Id,
        machineId: machine1Id,
        plannedQuantity: 1000,
        unit: 'METER',
        shift: 'SHIFT_A',
        remarks: 'Stage 1 Drawing Run',
      });

    expect(batchRes.status).toBe(201);
    const batch = batchRes.body.data;
    expect(batch.machineId).toBe(machine1Id);
    expect(batch.machineCode).toBe('MCH-DRAW-TEST');
    expect(batch.status).toBe('IN_PROCESS');
    expect(batch.testStatus).toBe('NOT_TESTED');

    // Machine should be RUNNING
    const machine = await MachineModel.findById(machine1Id);
    expect(machine?.status).toBe('RUNNING');
    expect(machine?.currentBatchId?.toString()).toBe(batch._id);
  });

  it('4. should handle FAIL TEST -> restart work on the SAME machine with rework count incremented', async () => {
    const batchesRes = await request(app)
      .get(`/api/v1/production-batches?productionOrderId=${productionOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(batchesRes.status).toBe(200);
    const batch = batchesRes.body.data[0];
    const batchId = batch._id;

    // Operator tests wire: Elongation failed at 18% (below 25% min requirement)
    const failRes = await request(app)
      .post(`/api/v1/production-batches/${batchId}/fail-test`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Elongation failed at 18% (annealer temperature was too low)',
        testReportNumber: 'QC-FAIL-DRAW-01',
        tests: [
          {
            testName: 'Conductor Diameter Check',
            actualValue: '1.80 mm',
            result: 'PASSED',
          },
          {
            testName: 'Tensile Elongation Test',
            actualValue: '18%',
            result: 'FAILED',
            remarks: 'Must be >= 25%',
          },
        ],
        remarks: 'Adjusted annealer voltage and re-threading wire on MCH-DRAW-TEST',
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.data.reworkCount).toBe(1);
    expect(failRes.body.data.batch.status).toBe('IN_PROCESS'); // Work restarts on SAME machine!
    expect(failRes.body.data.batch.testStatus).toBe('TEST_FAILED');
    expect(failRes.body.data.batch.reworkHistory.length).toBe(1);

    // Verify machine is STILL RUNNING on this batch (not released to next machine)
    const machine = await MachineModel.findById(machine1Id);
    expect(machine?.status).toBe('RUNNING');
    expect(machine?.currentBatchId?.toString()).toBe(batchId);
  });

  it('5. should handle PASS TEST -> complete batch, release Machine 1, and return Next Machine (Stage 2 Stranding)', async () => {
    const batchesRes = await request(app)
      .get(`/api/v1/production-batches?productionOrderId=${productionOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const batch = batchesRes.body.data[0];
    const batchId = batch._id;

    // Operator adjusts annealer and re-runs test -> NOW PASSES!
    const passRes = await request(app)
      .post(`/api/v1/production-batches/${batchId}/pass-test`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        testReportNumber: 'QC-PASS-DRAW-01',
        completedQuantity: 1000,
        tests: [
          {
            testName: 'Conductor Diameter Check',
            actualValue: '1.80 mm',
            result: 'PASSED',
          },
          {
            testName: 'Tensile Elongation Test',
            actualValue: '28%',
            result: 'PASSED',
          },
          {
            testName: 'Surface Smoothness & Oxidation',
            actualValue: 'Bright Copper - PASS',
            result: 'PASSED',
          },
        ],
        remarks: 'Annealer recalibrated, all tests within specs',
      });

    expect(passRes.status).toBe(200);
    expect(passRes.body.data.batch.status).toBe('COMPLETED');
    expect(passRes.body.data.batch.testStatus).toBe('TEST_PASSED');

    // Machine 1 is now released to AVAILABLE!
    const machine1 = await MachineModel.findById(machine1Id);
    expect(machine1?.status).toBe('AVAILABLE');
    expect(machine1?.currentBatchId).toBeNull();

    // Next stage info returned for moving to next machine!
    expect(passRes.body.data.nextStage).toBeDefined();
    expect(passRes.body.data.nextStage.hasMoreStages).toBe(true);
    expect(passRes.body.data.nextStage.nextStageName).toBe('Conductor Stranding / Bunching');
    expect(passRes.body.data.nextStage.availableMachines.length).toBeGreaterThanOrEqual(1);
    expect(passRes.body.data.nextStage.availableMachines[0].code).toBe('MCH-STRAND-TEST');
  });
});
