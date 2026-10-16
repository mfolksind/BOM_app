import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { MaterialModel } from '../../src/modules/materials/material.model';
import { ProductModel } from '../../src/modules/products/product.model';
import { BomVersionModel } from '../../src/modules/bom/bom-version.model';
import { BomItemModel } from '../../src/modules/bom/bom-item.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';
import { ProcessStageModel } from '../../src/modules/shared/process-stage.model';
import { WorkOrderModel } from '../../src/modules/work-orders/work-order.model';
import { InventoryBalanceModel } from '../../src/modules/inventory/inventory-balance.model';
import { TokenUtil } from '../../src/common/utils/token.util';

describe('Master Data Modules Integration Tests (Prompt 4)', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let superAdminToken: string;
  let superAdminId: string;
  let adminId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create Super Admin user
    const superAdmin = await UserModel.create({
      employeeCode: 'EMP-SA-001',
      email: 'sa.master@mfolks.com',
      passwordHash: 'hashed_password_sa',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
    });
    superAdminId = superAdmin._id.toString();

    // Create Admin user
    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-001',
      email: 'admin.master@mfolks.com',
      passwordHash: 'hashed_password_adm',
      firstName: 'Factory',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'PRODUCTION',
      isActive: true,
    });
    adminId = admin._id.toString();

    // Generate JWT Access Tokens
    superAdminToken = TokenUtil.generateAccessToken({
      userId: superAdminId,
      email: superAdmin.email,
      role: superAdmin.role,
    });

    adminToken = TokenUtil.generateAccessToken({
      userId: adminId,
      email: admin.email,
      role: admin.role,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // -------------------------------------------------------------
  // 1. Customer Module Tests
  // -------------------------------------------------------------
  describe('1. Customer Master Module', () => {
    let createdCustomerId: string;

    it('should reject unauthenticated customer requests (401)', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.status).toBe(401);
    });

    it('should allow Admin to create a new customer master record', async () => {
      const payload = {
        code: 'CUST-APAR-01',
        name: 'Apar Industries Ltd',
        legalName: 'Apar Industries Private Limited',
        contactPerson: 'Ramesh Patel',
        email: 'ramesh.patel@apar.com',
        phone: '+919820011223',
        gstin: '24AAACA1234A1ZB',
        pan: 'AAACA1234A',
        billingAddress: {
          street: 'Plot 42, GIDC Estate',
          city: 'Vapi',
          state: 'Gujarat',
          postalCode: '396195',
          country: 'India',
        },
        shippingAddresses: [
          {
            street: 'Unit 2, Silvassa Road',
            city: 'Vapi',
            state: 'Gujarat',
            postalCode: '396195',
            country: 'India',
          },
        ],
        jobWorkTerms: '30 days payment, 2% scrap allowance',
        creditDays: 45,
        notes: 'Priority customer for HT power cables',
      };

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('CUST-APAR-01');
      expect(res.body.data.name).toBe('Apar Industries Ltd');
      expect(res.body.data.isActive).toBe(true);

      createdCustomerId = res.body.data._id;
    });

    it('should reject duplicate customer code (409 Conflict)', async () => {
      const payload = {
        code: 'CUST-APAR-01', // Duplicate
        name: 'Apar Duplicate Inc',
        contactPerson: 'Duplicate Contact',
        email: 'dup@apar.com',
        phone: '+919820011224',
        billingAddress: {
          street: 'Street 1',
          city: 'Vapi',
          state: 'Gujarat',
          postalCode: '396195',
        },
      };

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('should validate required fields and formats (e.g. invalid GSTIN)', async () => {
      const payload = {
        code: 'CUST-BAD',
        name: 'Bad Customer',
        contactPerson: 'Test',
        email: 'invalid-email',
        phone: '123', // Too short
        gstin: 'NOT-A-GSTIN',
        billingAddress: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
        },
      };

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should list customers with pagination and search filter', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({ search: 'Apar', page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should update customer details and deactivate status', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contactPerson: 'Suresh Shah', creditDays: 60 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.contactPerson).toBe('Suresh Shah');
      expect(updateRes.body.data.creditDays).toBe(60);

      // Deactivate
      const statusRes = await request(app)
        .patch(`/api/v1/customers/${createdCustomerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false, reason: 'Temporary suspension' });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.isActive).toBe(false);
    });

    it('should prevent permanent deletion of customer referenced by work orders', async () => {
      // Create a mock WorkOrder referencing this customer
      await WorkOrderModel.create({
        workOrderNumber: 'WO-TEST-CUST-001',
        customerId: new mongoose.Types.ObjectId(createdCustomerId),
        productId: new mongoose.Types.ObjectId(),
        bomVersionId: new mongoose.Types.ObjectId(),
        orderedLengthMeters: 5000,
        deliveredLengthMeters: 0,
        targetDeliveryDate: new Date(),
        status: 'APPROVED',
      });

      const deleteRes = await request(app)
        .delete(`/api/v1/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.message).toContain('Cannot permanently delete customer');
      expect(deleteRes.body.message).toContain('referenced by');
    });
  });

  // -------------------------------------------------------------
  // 2. Global Material Master Module Tests
  // -------------------------------------------------------------
  describe('2. Global Material Master Module', () => {
    let createdMaterialId: string;
    let copperMaterialId: string;

    it('should create master material identity without storing stock balance', async () => {
      const payload = {
        code: 'MAT-AL-ROD-08',
        name: 'Aluminium Wire Rod 8mm',
        category: 'ALUMINUM',
        baseUnit: 'KG',
        sku: 'SKU-AL-08MM',
        altName: '8mm EC Grade Aluminum Rod',
        description: 'Electrical conductivity grade aluminum rod for drawing',
        specifications: {
          purityPercentage: 99.7,
          tensileStrength: '110-130 MPa',
          conductivityIACS: 61.2,
        },
        defaultReorderThreshold: 5000,
        standardRate: 220,
      };

      const res = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('MAT-AL-ROD-08');
      expect(res.body.data.category).toBe('ALUMINUM');
      // Crucial requirement: Stock balance is NOT stored on Material document
      expect(res.body.data).not.toHaveProperty('stockQuantity');
      expect(res.body.data).not.toHaveProperty('currentBalance');

      createdMaterialId = res.body.data._id;

      // Also create a copper material for BOM testing
      const copperRes = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'MAT-CU-ROD-08',
          name: 'Copper Wire Rod 8mm',
          category: 'COPPER',
          baseUnit: 'KG',
          sku: 'SKU-CU-08MM',
          standardRate: 750,
        });

      copperMaterialId = copperRes.body.data._id;
    });

    it('should reject invalid reorder threshold or negative rate', async () => {
      const res = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'MAT-INVALID',
          name: 'Invalid Material',
          category: 'COPPER',
          baseUnit: 'KG',
          defaultReorderThreshold: -100, // Invalid negative
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate material code', async () => {
      const res = await request(app)
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'MAT-AL-ROD-08', // Duplicate
          name: 'Aluminium Duplicate',
          category: 'ALUMINUM',
          baseUnit: 'KG',
        });

      expect(res.status).toBe(409);
    });

    it('should list materials with category filtering and search', async () => {
      const res = await request(app)
        .get('/api/v1/materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ category: 'ALUMINUM', search: 'Wire Rod' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].category).toBe('ALUMINUM');
    });

    it('should update material details and status', async () => {
      const res = await request(app)
        .patch(`/api/v1/materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ standardRate: 235 });

      expect(res.status).toBe(200);
      expect(res.body.data.standardRate).toBe(235);
    });
  });

  // -------------------------------------------------------------
  // 3. Product Module Tests
  // -------------------------------------------------------------
  describe('3. Cable Product Master Module', () => {
    let createdProductId: string;

    it('should create a manufactured cable product master with full technical specs', async () => {
      const payload = {
        code: 'PROD-4CX35-A2XFY',
        name: '4C x 35 SQMM A2XFY 1.1KV Aluminum XLPE Armoured Cable',
        description: '1.1 KV grade XLPE insulated, aluminum conductor, strip armoured cable',
        cableCategory: 'LT_POWER',
        voltageGrade: '1.1KV',
        coreCount: 4,
        crossSectionSqMm: 35,
        conductorMaterial: 'ALUMINUM',
        insulationType: 'XLPE',
        armourType: 'STRIP_ARMOURED',
        outerSheath: 'PVC_ST2',
        standardSpecification: 'IS 7098 Part 1',
        baseUnit: 'METER',
        specifications: {
          nominalDiameterMm: 28.5,
          approxWeightKgPerKm: 1420,
          standardDrumLengthMeters: 1000,
        },
      };

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('PROD-4CX35-A2XFY');
      expect(res.body.data.coreCount).toBe(4);
      expect(res.body.data.crossSectionSqMm).toBe(35);
      // Stock balance is NOT stored directly on Product
      expect(res.body.data).not.toHaveProperty('stockQuantity');

      createdProductId = res.body.data._id;
    });

    it('should reject invalid numeric specifications (e.g. 0 core count)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PROD-INVALID',
          name: 'Invalid Cable',
          cableCategory: 'LT_POWER',
          voltageGrade: '1.1KV',
          coreCount: 0, // Invalid
          crossSectionSqMm: -10, // Invalid
          conductorMaterial: 'ALUMINUM',
          insulationType: 'XLPE',
        });

      expect(res.status).toBe(400);
    });

    it('should list products with category and voltage filtering', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({ cableCategory: 'LT_POWER', voltageGrade: '1.1KV' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve single product by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(createdProductId);
      expect(res.body.data.code).toBe('PROD-4CX35-A2XFY');
    });
  });

  // -------------------------------------------------------------
  // 4. Process Stage Module Tests
  // -------------------------------------------------------------
  describe('4. Process Stage Module', () => {
    let drawingStageId: string;
    let strandingStageId: string;

    it('should create process stages with sequential order', async () => {
      const stage1 = await request(app)
        .post('/api/v1/process-stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'STAGE-DRAWING',
          name: 'Wire Drawing',
          sequenceOrder: 1,
          category: 'CONDUCTOR_PREPARATION',
          description: 'Drawing 8mm rod down to specified wire gauge',
        });

      expect(stage1.status).toBe(201);
      drawingStageId = stage1.body.data._id;

      const stage2 = await request(app)
        .post('/api/v1/process-stages')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'STAGE-STRANDING',
          name: 'Wire Stranding & Compacting',
          sequenceOrder: 2,
          category: 'CONDUCTOR_PREPARATION',
          description: 'Stranding drawn wires into compacted circular conductor',
        });

      expect(stage2.status).toBe(201);
      strandingStageId = stage2.body.data._id;
    });

    it('should reject duplicate stage code', async () => {
      const res = await request(app)
        .post('/api/v1/process-stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'STAGE-DRAWING', // Duplicate
          name: 'Drawing Duplicate',
          sequenceOrder: 3,
        });

      expect(res.status).toBe(409);
    });

    it('should list stages sorted by sequence order', async () => {
      const res = await request(app)
        .get('/api/v1/process-stages')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0].sequenceOrder).toBeLessThanOrEqual(res.body.data[1].sequenceOrder);
    });

    it('should update stage details and status', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/process-stages/${drawingStageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description for multi-die wire drawing' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toContain('multi-die');
    });
  });

  // -------------------------------------------------------------
  // 5. Bill of Materials (BOM) Module Tests
  // -------------------------------------------------------------
  describe('5. Bill of Materials (BOM) Module', () => {
    let testProductId: string;
    let alMaterialId: string;
    let cuMaterialId: string;
    let bomVersion1Id: string;
    let bomVersion2Id: string;

    beforeAll(async () => {
      const product = await ProductModel.findOne({ code: 'PROD-4CX35-A2XFY' });
      testProductId = product!._id.toString();

      const alMat = await MaterialModel.findOne({ code: 'MAT-AL-ROD-08' });
      alMaterialId = alMat!._id.toString();

      const cuMat = await MaterialModel.findOne({ code: 'MAT-CU-ROD-08' });
      cuMaterialId = cuMat!._id.toString();
    });

    it('should reject BOM creation with duplicate materials in same version', async () => {
      const payload = {
        productId: testProductId,
        items: [
          {
            materialId: alMaterialId,
            quantityPerUnit: 348,
          },
          {
            materialId: alMaterialId, // DUPLICATE MATERIAL
            quantityPerUnit: 50,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/boms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Duplicate materials');
    });

    it('should reject BOM creation with zero or negative quantity', async () => {
      const payload = {
        productId: testProductId,
        items: [
          {
            materialId: alMaterialId,
            quantityPerUnit: -10, // Negative quantity
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/boms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('should create initial draft BOM version with multiple material items', async () => {
      const payload = {
        productId: testProductId,
        versionNumber: 1,
        batchSize: 1000,
        outputUnit: 'METER',
        notes: 'Standard production recipe for 1,000m 4Cx35 cable',
        items: [
          {
            materialId: alMaterialId,
            quantityPerUnit: 348,
            scrapTolerancePercentage: 1.5,
            stageSequence: 1,
            notes: 'Aluminum wire drawing norm',
          },
          {
            materialId: cuMaterialId,
            quantityPerUnit: 15,
            scrapTolerancePercentage: 0.5,
            stageSequence: 2,
            notes: 'Copper earth tape norm',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/boms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version.status).toBe('DRAFT');
      expect(res.body.data.version.versionNumber).toBe(1);
      expect(res.body.data.items.length).toBe(2);

      bomVersion1Id = res.body.data.version._id;
    });

    it('should retrieve populated BOM details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/boms/${bomVersion1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.version._id).toBe(bomVersion1Id);
      expect(res.body.data.items[0]).toHaveProperty('materialId');
      expect(res.body.data.items[0].materialId).toHaveProperty('name');
    });

    it('should allow editing a DRAFT BOM version', async () => {
      const res = await request(app)
        .patch(`/api/v1/boms/${bomVersion1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Updated recipe notes before activation',
          items: [
            {
              materialId: alMaterialId,
              quantityPerUnit: 350, // Adjusted norm
              scrapTolerancePercentage: 1.8,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.version.notes).toContain('Updated recipe notes');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantityPerUnit).toBe(350);
    });

    it('should activate BOM version and set as default on Product', async () => {
      const activateRes = await request(app)
        .post(`/api/v1/boms/${bomVersion1Id}/activate`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data.version.status).toBe('ACTIVE');
      expect(activateRes.body.data.version).toHaveProperty('approvedAt');

      // Verify product's defaultBomVersionId was updated
      const product = await ProductModel.findById(testProductId);
      expect(product?.defaultBomVersionId?.toString()).toBe(bomVersion1Id);
    });

    it('should lock ACTIVE BOM against direct modifications', async () => {
      const res = await request(app)
        .patch(`/api/v1/boms/${bomVersion1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ batchSize: 2000 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only DRAFT BOMs can be edited');
    });

    it('should create version 2 and supersede version 1 when activated', async () => {
      // Create version 2
      const v2Res = await request(app)
        .post('/api/v1/boms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProductId,
          versionNumber: 2,
          notes: 'Version 2 with revised insulation compound',
          items: [
            {
              materialId: alMaterialId,
              quantityPerUnit: 345,
            },
          ],
        });

      expect(v2Res.status).toBe(201);
      bomVersion2Id = v2Res.body.data.version._id;

      // Activate Version 2
      const activateV2Res = await request(app)
        .post(`/api/v1/boms/${bomVersion2Id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(activateV2Res.status).toBe(200);
      expect(activateV2Res.body.data.version.status).toBe('ACTIVE');

      // Verify Version 1 is now SUPERSEDED
      const v1 = await BomVersionModel.findById(bomVersion1Id);
      expect(v1?.status).toBe('SUPERSEDED');
      expect(v1?.effectiveTo).toBeDefined();

      // Verify Product default BOM is now Version 2
      const product = await ProductModel.findById(testProductId);
      expect(product?.defaultBomVersionId?.toString()).toBe(bomVersion2Id);
    });

    it('should retrieve all BOM versions for a product via GET /api/v1/products/:productId/boms', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProductId}/boms`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------
  // 6. Warehouse Module Tests
  // -------------------------------------------------------------
  describe('6. Warehouse Master Module', () => {
    let createdWarehouseId: string;

    it('should create a warehouse storage location with validated type', async () => {
      const payload = {
        code: 'WH-MAIN-RM',
        name: 'Main Raw Material Warehouse',
        type: 'RAW_MATERIAL',
        description: 'Primary receiving store for copper/aluminum rods and compounds',
        location: 'Bay 1, East Plant',
        address: 'Plot 10, Industrial Zone',
        capacity: 500000,
      };

      const res = await request(app)
        .post('/api/v1/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('WH-MAIN-RM');
      expect(res.body.data.type).toBe('RAW_MATERIAL');

      createdWarehouseId = res.body.data._id;
    });

    it('should reject duplicate warehouse code', async () => {
      const res = await request(app)
        .post('/api/v1/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'WH-MAIN-RM', // Duplicate
          name: 'Duplicate Store',
          type: 'SCRAP',
        });

      expect(res.status).toBe(409);
    });

    it('should list warehouses with type filter and search', async () => {
      const res = await request(app)
        .get('/api/v1/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'RAW_MATERIAL' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent deactivation of warehouse with active stock balances', async () => {
      // Mock an active inventory balance in this warehouse
      await InventoryBalanceModel.create({
        materialId: new mongoose.Types.ObjectId(),
        warehouseId: new mongoose.Types.ObjectId(createdWarehouseId),
        ownerType: 'FACTORY',
        quantityOnHand: 2500, // Active physical stock!
        quantityReserved: 0,
        quantityAvailable: 2500,
        unit: 'KG',
      });

      const res = await request(app)
        .patch(`/api/v1/warehouses/${createdWarehouseId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot deactivate warehouse');
      expect(res.body.message).toContain('holds active stock');
    });

    it('should update permitted details of a warehouse', async () => {
      const res = await request(app)
        .patch(`/api/v1/warehouses/${createdWarehouseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ location: 'Bay 1 & Bay 2, East Plant' });

      expect(res.status).toBe(200);
      expect(res.body.data.location).toBe('Bay 1 & Bay 2, East Plant');
    });
  });
});
