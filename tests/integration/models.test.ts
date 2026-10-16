import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  CustomerModel,
  MaterialModel,
  MaterialLotModel,
  ProductModel,
  BomVersionModel,
  BomItemModel,
  WarehouseModel,
  ProcessStageModel,
  UserModel,
  WorkOrderModel,
  InboundChallanModel,
  InboundChallanLineModel,
  OpeningBalanceModel,
  InventoryTransactionModel,
  InventoryBalanceModel,
  MaterialReservationModel,
  ProductionOrderModel,
  ProductionBatchModel,
  MaterialIssueModel,
  MaterialIssueLineModel,
  MaterialConsumptionModel,
  ProductionOutputModel,
  ScrapRecordModel,
  DrumModel,
  PackingListModel,
  PackingListLineModel,
  DispatchModel,
  DispatchLineModel,
  OutboundChallanModel,
  DrumMovementModel,
  DocumentSequenceModel,
  ApprovalModel,
  AuditLogModel,
  AttachmentModel,
  StockReconciliationModel,
  IdempotencyRecordModel,
  GlobalStockSummaryModel,
  MaterialReorderRuleModel,
} from '../../src/models';

describe('MongoDB Data Model Layer Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Model Registration & Export Verification', () => {
    it('should have all 38 models properly compiled and accessible', () => {
      const models = [
        CustomerModel,
        MaterialModel,
        MaterialLotModel,
        ProductModel,
        BomVersionModel,
        BomItemModel,
        WarehouseModel,
        ProcessStageModel,
        UserModel,
        WorkOrderModel,
        InboundChallanModel,
        InboundChallanLineModel,
        OpeningBalanceModel,
        InventoryTransactionModel,
        InventoryBalanceModel,
        MaterialReservationModel,
        ProductionOrderModel,
        ProductionBatchModel,
        MaterialIssueModel,
        MaterialIssueLineModel,
        MaterialConsumptionModel,
        ProductionOutputModel,
        ScrapRecordModel,
        DrumModel,
        PackingListModel,
        PackingListLineModel,
        DispatchModel,
        DispatchLineModel,
        OutboundChallanModel,
        DrumMovementModel,
        DocumentSequenceModel,
        ApprovalModel,
        AuditLogModel,
        AttachmentModel,
        StockReconciliationModel,
        IdempotencyRecordModel,
        GlobalStockSummaryModel,
        MaterialReorderRuleModel,
      ];

      expect(models.length).toBe(38);
      models.forEach((model) => {
        expect(model).toBeDefined();
        expect(model.modelName).toBeDefined();
      });
    });
  });

  describe('2. Validation Constraints & Required Fields', () => {
    it('should fail validation when required fields are missing on Material', async () => {
      const invalidMaterial = new MaterialModel({});
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await invalidMaterial.validate();
      } catch (e) {
        err = e as mongoose.Error.ValidationError;
      }
      expect(err).not.toBeNull();
      expect(err?.errors.code).toBeDefined();
      expect(err?.errors.name).toBeDefined();
      expect(err?.errors.category).toBeDefined();
    });

    it('should reject invalid enum values on Material category', async () => {
      const invalidCategoryMaterial = new MaterialModel({
        code: 'MAT-INVALID-01',
        name: 'Invalid Item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: 'INVALID_CATEGORY' as any,
      });
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await invalidCategoryMaterial.validate();
      } catch (e) {
        err = e as mongoose.Error.ValidationError;
      }
      expect(err).not.toBeNull();
      expect(err?.errors.category).toBeDefined();
    });

    it('should reject negative quantities in inventory balance', async () => {
      const negativeBalance = new InventoryBalanceModel({
        materialId: new mongoose.Types.ObjectId(),
        warehouseId: new mongoose.Types.ObjectId(),
        ownerType: 'FACTORY',
        quantityOnHand: -10,
        unit: 'KG',
      });
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await negativeBalance.validate();
      } catch (e) {
        err = e as mongoose.Error.ValidationError;
      }
      expect(err).not.toBeNull();
      expect(err?.errors.quantityOnHand).toBeDefined();
    });

    it('should require customerId on MaterialLot when ownerType is CUSTOMER', async () => {
      const customerLotWithoutCustomer = new MaterialLotModel({
        lotNumber: 'LOT-CUST-MISSING-01',
        materialId: new mongoose.Types.ObjectId(),
        ownerType: 'CUSTOMER',
        initialQuantity: 100,
        currentBalance: 100,
        unit: 'KG',
      });
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await customerLotWithoutCustomer.validate();
      } catch (e) {
        err = e as mongoose.Error.ValidationError;
      }
      expect(err).not.toBeNull();
      expect(err?.errors.customerId).toBeDefined();
    });
  });

  describe('3. Unique Business Identifiers', () => {
    it('should enforce unique index on Customer code', async () => {
      await CustomerModel.init();

      const customer1 = new CustomerModel({
        code: 'CUST-TEST-001',
        name: 'Polycab Cables Ltd',
        contactPerson: 'Mr. Shah',
        email: 'purchase@polycab.test',
        phone: '9876543210',
        billingAddress: {
          street: '12 Industrial Area',
          city: 'Halol',
          state: 'Gujarat',
          postalCode: '389350',
          country: 'India',
        },
      });
      await customer1.save();

      const duplicateCustomer = new CustomerModel({
        code: 'CUST-TEST-001', // duplicate code
        name: 'Duplicate Ltd',
        contactPerson: 'Mr. Duplicate',
        email: 'dup@polycab.test',
        phone: '9876543211',
        billingAddress: {
          street: '14 Industrial Area',
          city: 'Halol',
          state: 'Gujarat',
          postalCode: '389350',
          country: 'India',
        },
      });

      let duplicateErr: { code?: number } | null = null;
      try {
        await duplicateCustomer.save();
      } catch (e) {
        duplicateErr = e as { code?: number };
      }
      expect(duplicateErr).not.toBeNull();
      expect(duplicateErr?.code).toBe(11000);
    });

    it('should enforce unique index on Material code', async () => {
      await MaterialModel.init();

      await MaterialModel.create({
        code: 'MAT-CU-8MM',
        name: 'Copper 8mm Continuous Cast Wire Rod',
        category: 'COPPER',
        baseUnit: 'KG',
      });

      let duplicateErr: { code?: number } | null = null;
      try {
        await MaterialModel.create({
          code: 'MAT-CU-8MM', // duplicate code
          name: 'Another Copper Rod',
          category: 'COPPER',
          baseUnit: 'KG',
        });
      } catch (e) {
        duplicateErr = e as { code?: number };
      }
      expect(duplicateErr).not.toBeNull();
      expect(duplicateErr?.code).toBe(11000);
    });
  });

  describe('4. Duplicate Daily Stock Summary Prevention', () => {
    it('should prevent duplicate daily stock summaries for same date, material, warehouse and owner scope', async () => {
      await GlobalStockSummaryModel.init();

      const snapshotDate = new Date('2026-10-15T00:00:00.000Z');
      const testMaterialId = new mongoose.Types.ObjectId();
      const testWarehouseId = new mongoose.Types.ObjectId();

      await GlobalStockSummaryModel.create({
        date: snapshotDate,
        materialId: testMaterialId,
        warehouseId: testWarehouseId,
        ownerType: 'FACTORY',
        customerId: null,
        openingQuantity: 1000,
        receiptsQuantity: 500,
        issuedToProductionQuantity: 200,
        closingQuantity: 1300,
        unit: 'KG',
      });

      let duplicateErr: { code?: number } | null = null;
      try {
        await GlobalStockSummaryModel.create({
          date: snapshotDate,
          materialId: testMaterialId,
          warehouseId: testWarehouseId,
          ownerType: 'FACTORY',
          customerId: null,
          openingQuantity: 1000,
          receiptsQuantity: 100,
          closingQuantity: 1100,
          unit: 'KG',
        });
      } catch (e) {
        duplicateErr = e as { code?: number };
      }

      expect(duplicateErr).not.toBeNull();
      expect(duplicateErr?.code).toBe(11000);
    });
  });

  describe('5. Cable Drum Modeling', () => {
    it('should store cable length separately from tare, net and gross weights', async () => {
      const drum = new DrumModel({
        drumNumber: 'DRUM-TEST-140-001',
        drumType: 'WOODEN',
        tareWeightKg: 180,
        grossWeightKg: 1420,
        netWeightKg: 1240,
        cableLengthMeters: 1000,
        status: 'FILLED',
      });
      const savedDrum = await drum.save();

      expect(savedDrum.cableLengthMeters).toBe(1000);
      expect(savedDrum.tareWeightKg).toBe(180);
      expect(savedDrum.netWeightKg).toBe(1240);
      expect(savedDrum.grossWeightKg).toBe(1420);
    });
  });

  describe('6. User Password Protection', () => {
    it('should not include passwordHash in default query results', async () => {
      await UserModel.create({
        employeeCode: 'EMP-SEC-001',
        email: 'security.check@mfolks.com',
        passwordHash: '$2b$10$e8wSDFJKSDFJLSDFKJSDFK',
        firstName: 'Security',
        lastName: 'Admin',
        role: 'ADMIN',
        department: 'MANAGEMENT',
      });

      const fetchedUser = await UserModel.findOne({ employeeCode: 'EMP-SEC-001' });
      expect(fetchedUser).not.toBeNull();
      expect(fetchedUser?.passwordHash).toBeUndefined();
    });
  });
});
