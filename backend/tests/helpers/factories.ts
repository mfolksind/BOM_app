import mongoose from 'mongoose';
import { UserModel, IUser } from '../../src/modules/users/user.model';
import { CustomerModel, ICustomer } from '../../src/modules/customers/customer.model';
import { WarehouseModel, IWarehouse } from '../../src/modules/warehouses/warehouse.model';
import { MaterialModel, IMaterial } from '../../src/modules/materials/material.model';
import { ProductModel, IProduct } from '../../src/modules/products/product.model';
import { BomVersionModel, IBomVersion } from '../../src/modules/bom/bom-version.model';
import { BomItemModel, IBomItem } from '../../src/modules/bom/bom-item.model';
import { ProcessStageModel, IProcessStage } from '../../src/modules/shared/process-stage.model';
import { DrumModel, IDrum } from '../../src/modules/packing/drum.model';
import { TokenUtil } from '../../src/common/utils/token.util';
import { PasswordUtil } from '../../src/common/utils/password.util';

/**
 * Reusable Test Fixture Factories.
 * Generates deterministic, isolated test records adhering to all schema rules.
 */
export class TestFactories {
  private static counter = 1;

  public static nextId(prefix = 'ID'): string {
    return `${prefix}-${Date.now().toString().slice(-6)}-${this.counter++}`;
  }

  /**
   * Creates a Super Admin user and returns the user document + JWT access token.
   */
  public static async createSuperAdmin(overrides: Partial<IUser> = {}): Promise<{ user: IUser; token: string }> {
    const code = overrides.employeeCode || `EMP-SA-${this.counter++}`;
    const email = overrides.email || `sa.${Date.now()}.${this.counter++}@mfolks.com`;
    const passwordHash = overrides.passwordHash || (await PasswordUtil.hash('SuperAdmin@123'));

    const user = await UserModel.create({
      employeeCode: code,
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
      ...overrides,
    });

    const token = TokenUtil.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Creates an Admin user and returns the user document + JWT access token.
   */
  public static async createAdmin(overrides: Partial<IUser> = {}): Promise<{ user: IUser; token: string }> {
    const code = overrides.employeeCode || `EMP-ADM-${this.counter++}`;
    const email = overrides.email || `admin.${Date.now()}.${this.counter++}@mfolks.com`;
    const passwordHash = overrides.passwordHash || (await PasswordUtil.hash('Admin@123'));

    const user = await UserModel.create({
      employeeCode: code,
      email,
      passwordHash,
      firstName: 'Plant',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'PRODUCTION',
      isActive: true,
      ...overrides,
    });

    const token = TokenUtil.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Creates a Customer record.
   */
  public static async createCustomer(overrides: Partial<ICustomer> = {}): Promise<ICustomer> {
    const code = overrides.code || `CUST-${this.counter++}`;
    return CustomerModel.create({
      code,
      name: overrides.name || `Test Customer ${code}`,
      contactPerson: overrides.contactPerson || 'Rajesh Mehta',
      email: overrides.email || `contact@${code.toLowerCase()}.com`,
      phone: overrides.phone || '+919876543210',
      gstin: overrides.gstin || '07AAAAA0000A1Z5',
      billingAddress: overrides.billingAddress || {
        street: '123 Industrial Area',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
      },
      isActive: true,
      ...overrides,
    });
  }

  /**
   * Creates a Warehouse record.
   */
  public static async createWarehouse(
    type: 'RAW_MATERIAL' | 'WORK_IN_PROGRESS' | 'FINISHED_GOODS' | 'SCRAP' = 'RAW_MATERIAL',
    overrides: Partial<IWarehouse> = {},
  ): Promise<IWarehouse> {
    const code = overrides.code || `WH-${type.slice(0, 3)}-${this.counter++}`;
    return WarehouseModel.create({
      code,
      name: overrides.name || `Warehouse ${code}`,
      type,
      location: typeof overrides.location === 'string' ? overrides.location : 'Main Plant, Shed 1',
      isActive: true,
      ...overrides,
    });
  }

  /**
   * Creates a Raw Material record.
   */
  public static async createMaterial(
    category:
      | 'COPPER'
      | 'ALUMINUM'
      | 'PVC_COMPOUND'
      | 'XLPE_COMPOUND'
      | 'MASTERBATCH'
      | 'GI_WIRE_STRIP'
      | 'TAPE_BINDING'
      | 'PACKING_MATERIAL'
      | 'CHEMICAL_SOLVENT'
      | 'OTHER' = 'ALUMINUM',
    overrides: Partial<IMaterial> = {},
  ): Promise<IMaterial> {
    const code = overrides.code || `MAT-${category.slice(0, 3)}-${this.counter++}`;
    return MaterialModel.create({
      code,
      name: overrides.name || `Material ${code}`,
      category,
      baseUnit: overrides.baseUnit || 'KG',
      defaultReorderThreshold: overrides.defaultReorderThreshold ?? 100,
      isActive: true,
      ...overrides,
    });
  }

  /**
   * Creates a Process Stage record.
   */
  public static async createProcessStage(
    code = `STAGE-${TestFactories.counter++}`,
    name = `Process Stage ${code}`,
    sequence = 1,
  ): Promise<IProcessStage> {
    return ProcessStageModel.create({
      code,
      name,
      sequenceOrder: sequence,
      isActive: true,
    });
  }

  /**
   * Creates a Finished Cable Product record.
   */
  public static async createProduct(overrides: Partial<IProduct> = {}): Promise<IProduct> {
    const code = overrides.code || `PROD-CBL-${this.counter++}`;
    return ProductModel.create({
      code,
      name: overrides.name || `Cable ${code}`,
      cableCategory: 'LT_POWER',
      voltageGrade: '1.1KV',
      coreCount: 4,
      crossSectionSqMm: 70,
      conductorMaterial: 'ALUMINUM',
      insulationType: 'XLPE',
      armourType: 'ROUND_WIRE_ARMOURED',
      outerSheath: 'PVC_ST2',
      baseUnit: 'METER',
      isActive: true,
      ...overrides,
    });
  }

  /**
   * Creates a versioned BOM with items.
   */
  public static async createBom(
    productId: mongoose.Types.ObjectId | string,
    items: Array<{
      materialId: mongoose.Types.ObjectId | string;
      quantityPerUnit: number;
      scrapTolerancePercentage?: number;
      processStageId?: mongoose.Types.ObjectId | string;
      stageSequence?: number;
    }>,
    versionNumber = 1,
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' = 'ACTIVE',
  ): Promise<{ bomVersion: IBomVersion; bomItems: IBomItem[] }> {
    const bomNumber = `BOM-PROD-${this.counter++}-V${versionNumber}`;
    const bomVersion = await BomVersionModel.create({
      bomNumber,
      productId: new mongoose.Types.ObjectId(productId),
      versionNumber,
      status,
      effectiveFrom: new Date(),
      batchSize: 1000,
      outputUnit: 'METER',
    });

    const bomItems: IBomItem[] = [];
    let seq = 1;
    for (const item of items) {
      const createdItem = await BomItemModel.create({
        bomVersionId: bomVersion._id,
        materialId: new mongoose.Types.ObjectId(item.materialId),
        processStageId: item.processStageId ? new mongoose.Types.ObjectId(item.processStageId) : undefined,
        quantityPerUnit: item.quantityPerUnit,
        scrapTolerancePercentage: item.scrapTolerancePercentage ?? 0,
        stageSequence: item.stageSequence ?? seq++,
      });
      bomItems.push(createdItem);
    }

    // Set as default BOM version on Product
    await ProductModel.findByIdAndUpdate(productId, { defaultBomVersionId: bomVersion._id });

    return { bomVersion, bomItems };
  }

  /**
   * Creates a Drum record.
   */
  public static async createDrum(overrides: Partial<IDrum> = {}): Promise<IDrum> {
    const drumNumber = overrides.drumNumber || `DRM-TEST-${this.counter++}`;
    return DrumModel.create({
      drumNumber,
      drumType: 'WOODEN',
      flangeDiameterMm: 1600,
      barrelDiameterMm: 800,
      traverseWidthMm: 1050,
      tareWeightKg: 175.0,
      status: 'AVAILABLE',
      ownershipType: 'RETURNABLE',
      ...overrides,
    });
  }
}

export const createTestSuperAdmin = TestFactories.createSuperAdmin.bind(TestFactories);
export const createTestAdmin = TestFactories.createAdmin.bind(TestFactories);
export const createTestCustomer = TestFactories.createCustomer.bind(TestFactories);
export const createTestWarehouse = (overrides: any = {}) =>
  TestFactories.createWarehouse(overrides?.type || 'RAW_MATERIAL', overrides);
export const createTestMaterial = (overrides: any = {}) =>
  TestFactories.createMaterial(overrides?.category || 'ALUMINUM', overrides);
export const createTestProduct = TestFactories.createProduct.bind(TestFactories);
export const createTestProcessStage = TestFactories.createProcessStage.bind(TestFactories);
export const createTestDrum = TestFactories.createDrum.bind(TestFactories);
export const createTestBomVersion = async (options: {
  productId: string | mongoose.Types.ObjectId;
  versionNumber?: string | number;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'APPROVED';
  isCurrent?: boolean;
  items: Array<{
    materialId: string | mongoose.Types.ObjectId;
    quantityPerUnit: number;
    unit?: string;
    processStageName?: string;
    scrapAllowancePercent?: number;
  }>;
}) => {
  const versionNum = typeof options.versionNumber === 'number' ? options.versionNumber : 1;
  const status = (options.status === 'APPROVED' ? 'ACTIVE' : options.status) || 'ACTIVE';
  const res = await TestFactories.createBom(
    options.productId,
    options.items.map((it) => ({
      materialId: it.materialId,
      quantityPerUnit: it.quantityPerUnit,
      scrapTolerancePercentage: it.scrapAllowancePercent ?? 0,
    })),
    versionNum,
    status,
  );
  return res.bomVersion;
};
