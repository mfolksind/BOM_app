import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Models
import { CustomerModel } from '../modules/customers/customer.model';
import { WarehouseModel } from '../modules/warehouses/warehouse.model';
import { MaterialModel } from '../modules/materials/material.model';
import { ProductModel } from '../modules/products/product.model';
import { ProcessStageModel } from '../modules/shared/process-stage.model';
import { BomVersionModel } from '../modules/bom/bom-version.model';
import { BomItemModel } from '../modules/bom/bom-item.model';
import { InboundChallanModel } from '../modules/inventory/inbound-challan.model';
import { InboundChallanLineModel } from '../modules/inventory/inbound-challan-line.model';
import { MaterialLotModel } from '../modules/materials/material-lot.model';
import { InventoryBalanceModel } from '../modules/inventory/inventory-balance.model';
import { InventoryTransactionModel } from '../modules/inventory/inventory-transaction.model';
import { WorkOrderModel } from '../modules/work-orders/work-order.model';
import { MaterialReservationModel } from '../modules/inventory/material-reservation.model';
import { ProductionOrderModel } from '../modules/production/production-order.model';
import { ProductionBatchModel } from '../modules/production/production-batch.model';
import { ProductionOutputModel } from '../modules/production/production-output.model';
import { DrumModel } from '../modules/packing/drum.model';
import { DrumMovementModel } from '../modules/packing/drum-movement.model';
import { PackingListModel } from '../modules/packing/packing-list.model';
import { PackingListLineModel } from '../modules/packing/packing-list-line.model';
import { DispatchModel } from '../modules/dispatch/dispatch.model';
import { DispatchLineModel } from '../modules/dispatch/dispatch-line.model';
import { OutboundChallanModel } from '../modules/dispatch/outbound-challan.model';
import { MachineModel } from '../modules/machines/machine.model';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db?replicaSet=rs0&directConnection=true';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // 1. CLEAR COLLECTIONS EXCEPT users
  console.log('Clearing existing operational collections...');
  const collectionsToClear = [
    'customers',
    'warehouses',
    'materials',
    'products',
    'processstages',
    'machines',
    'bomversions',
    'bomitems',
    'inboundchallans',
    'inboundchallanlines',
    'materiallots',
    'inventorybalances',
    'inventorytransactions',
    'workorders',
    'materialreservations',
    'productionorders',
    'productionbatches',
    'productionoutputs',
    'drums',
    'drummovements',
    'packinglists',
    'packinglistlines',
    'dispatches',
    'dispatchlines',
    'outboundchallans',
    'materialissues',
    'materialissuelines',
    'materialconsumptions',
    'materialreturns',
    'scraprecords',
    'stocktransfers',
    'stockreconciliations',
    'materialreorderrules',
    'openingbalances',
    'documentsequences',
    'auditlogs',
    'approvals',
    'attachments',
    'idempotencyrecords',
    'globalstocksummaries'
  ];

  if (mongoose.connection.db) {
    for (const name of collectionsToClear) {
      try {
        await mongoose.connection.db.collection(name).deleteMany({});
      } catch (e) {
        // ignore
      }
    }
  }
  console.log('Cleared all transactional and master data.');

  // Ensure default superadmin & admin exist
  if (mongoose.connection.db) {
    const existingUsers = await mongoose.connection.db.collection('users').countDocuments();
    if (existingUsers === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await mongoose.connection.db.collection('users').insertOne({
      employeeCode: 'EMP-SA-001',
      email: 'superadmin@mfolks.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created default Super Admin: superadmin@mfolks.com / admin123');
    }
  }

  // 2. CREATE WAREHOUSES
  console.log('Creating Warehouses...');
  const whRaw = await WarehouseModel.create({
    code: 'WH-RAW-01',
    name: 'Raw Material Central Warehouse',
    type: 'RAW_MATERIAL',
    address: 'Plot 101, GIDC Estate, Vadodara, Gujarat - 390010',
    isActive: true,
  });

  const whWip = await WarehouseModel.create({
    code: 'WH-WIP-01',
    name: 'Shopfloor WIP Bay',
    type: 'WORK_IN_PROGRESS',
    address: 'Bay 2, Production Plant, Vadodara, Gujarat',
    isActive: true,
  });

  const whFg = await WarehouseModel.create({
    code: 'WH-FG-01',
    name: 'Finished Goods & Drum Yard',
    type: 'FINISHED_GOODS',
    address: 'Bay 4 Logistics & Drum Yard, Vadodara, Gujarat',
    isActive: true,
  });

  // 3. CREATE PROCESS STAGES & MACHINES
  console.log('Creating Process Stages & Machines...');
  const stageDrawing = await ProcessStageModel.create({
    code: 'STG-01-DRAW',
    name: 'Rods Wire Drawing',
    stageType: 'DRAWING',
    sequenceOrder: 1,
    isActive: true,
  });

  const stageStranding = await ProcessStageModel.create({
    code: 'STG-02-STRAND',
    name: 'Conductor Stranding',
    stageType: 'STRANDING',
    sequenceOrder: 2,
    isActive: true,
  });

  const stageInsulation = await ProcessStageModel.create({
    code: 'STG-03-INSUL',
    name: 'Extrusion Insulation',
    stageType: 'INSULATION',
    sequenceOrder: 3,
    isActive: true,
  });

  const stageArmouring = await ProcessStageModel.create({
    code: 'STG-04-ARMOUR',
    name: 'Armouring & Inner Sheathing',
    stageType: 'ARMOURING',
    sequenceOrder: 4,
    isActive: true,
  });

  const stageSheathing = await ProcessStageModel.create({
    code: 'STG-05-SHEATH',
    name: 'Outer Sheathing & Spark Testing',
    stageType: 'SHEATHING',
    sequenceOrder: 5,
    isActive: true,
  });

  await MachineModel.create({
    code: 'MCH-EXT-01',
    name: 'Heavy Duty 90mm Extruder Line 1',
    processStageId: stageSheathing._id,
    type: 'EXTRUDER',
    status: 'AVAILABLE',
    isActive: true,
  });

  // 4. CREATE CUSTOMERS
  console.log('Creating Customers...');
  const custHavells = await CustomerModel.create({
    code: 'CUST-HVL-01',
    name: 'Havells India Limited',
    legalName: 'Havells India Limited',
    contactPerson: 'Sunil Verma',
    email: 'sunil.verma@havells.com',
    phone: '+919876543210',
    gstin: '07AAACH1234A1Z5',
    pan: 'AAACH1234A',
    billingAddress: {
      street: 'QRG Towers, 2D Expressway',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201304',
      country: 'India',
    },
    shippingAddresses: [
      {
        street: 'Havells Cable Logistics Depot, Sector 63',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201301',
        country: 'India',
      },
    ],
    isActive: true,
  });

  const custVmarc = await CustomerModel.create({
    code: 'CUST-VMARC-01',
    name: 'V-MARC INDIA LIMITED',
    legalName: 'V-Marc India Limited',
    contactPerson: 'Vikas Sharma',
    email: 'supplychain@vmarc.com',
    phone: '+919820011888',
    gstin: '08AAOCM2650D1ZI',
    pan: 'AAOCM2650D',
    billingAddress: {
      street: 'Plot No. 42-44, Industrial Area, Chopanki',
      city: 'Alwar',
      state: 'Rajasthan',
      postalCode: '301707',
      country: 'India',
    },
    shippingAddresses: [
      {
        street: 'Plot No. 42-44, Industrial Area, Chopanki',
        city: 'Alwar',
        state: 'Rajasthan',
        postalCode: '301707',
        country: 'India',
      },
    ],
    isActive: true,
  });

  const custPolycab = await CustomerModel.create({
    code: 'CUST-POLY-01',
    name: 'Polycab India Limited',
    legalName: 'Polycab India Limited',
    contactPerson: 'Amitabh Joshi',
    email: 'contracts@polycab.com',
    phone: '+919830022334',
    gstin: '24AAACP1234B1Z2',
    pan: 'AAACP1234B',
    billingAddress: {
      street: 'Polycab House, Mogra Village Road, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400093',
      country: 'India',
    },
    shippingAddresses: [
      {
        street: 'Polycab Central Warehouse, Halol',
        city: 'Halol',
        state: 'Gujarat',
        postalCode: '389350',
        country: 'India',
      },
    ],
    isActive: true,
  });

  // 5. CREATE RAW MATERIALS
  console.log('Creating Raw Materials...');
  const matCopper = await MaterialModel.create({
    code: 'MAT-CU-8MM',
    name: 'Copper Continuous Cast Rod 8mm',
    category: 'COPPER',
    baseUnit: 'KG',
    hsnCode: '74081190',
    standardRate: 750,
    isActive: true,
  });

  const matAluminium = await MaterialModel.create({
    code: 'MAT-AL-9.5MM',
    name: 'EC Grade Continuous Cast Aluminium Rod 9.5mm',
    category: 'ALUMINIUM',
    baseUnit: 'KG',
    hsnCode: '76051100',
    standardRate: 240,
    isActive: true,
  });

  const matXlpe = await MaterialModel.create({
    code: 'MAT-XLPE-INSUL',
    name: 'Silane Grafted Cross-Linkable PE (XLPE) Insulation Compound',
    category: 'XLPE_COMPOUND',
    baseUnit: 'KG',
    hsnCode: '39011090',
    standardRate: 145,
    isActive: true,
  });

  const matPvcSt2 = await MaterialModel.create({
    code: 'MAT-PVC-ST2',
    name: 'Type ST-2 FRLS PVC Sheathing Compound',
    category: 'PVC_COMPOUND',
    baseUnit: 'KG',
    hsnCode: '39042200',
    standardRate: 110,
    isActive: true,
  });

  const matGiArmour = await MaterialModel.create({
    code: 'MAT-GI-STRIP',
    name: 'Galvanized Steel Strip Armour 4.0 x 0.8mm',
    category: 'GI_STRIP',
    baseUnit: 'KG',
    hsnCode: '72123090',
    standardRate: 85,
    isActive: true,
  });

  const matMasterbatch = await MaterialModel.create({
    code: 'MAT-MB-RED',
    name: 'Red Color Polymer Masterbatch',
    category: 'MASTERBATCH',
    baseUnit: 'KG',
    hsnCode: '32064900',
    standardRate: 350,
    isActive: true,
  });

  // 6. CREATE MULTIPLE CABLE PRODUCTS & MULTI-RAW BOMs
  console.log('Creating Cable Products & BOMs...');
  
  // Product 1: 1.1kV 4C x 35 sq.mm Aluminium XLPE Armoured Cable (A2XFY)
  const prodAl4C35 = await ProductModel.create({
    code: '4CX35 SQMM A2XFY',
    name: '1.1kV 4C x 35 sq.mm Aluminium XLPE Armoured Cable',
    description: '4CX35 SQMM A2XFY',
    cableCategory: 'LT_POWER',
    voltageGrade: '1.1KV',
    coreCount: 4,
    crossSectionSqMm: 35,
    conductorMaterial: 'ALUMINIUM',
    insulationType: 'XLPE',
    armourType: 'STRIP_ARMOURED',
    outerSheath: 'PVC_ST2',
    baseUnit: 'METER',
    standardUnit: 'METER',
    isActive: true,
  });

  const bomAl4C35 = await BomVersionModel.create({
    productId: prodAl4C35._id,
    bomNumber: 'BOM-4CX35-V1',
    versionNumber: 1,
    status: 'ACTIVE',
    batchSize: 1000, // 1,000 meters batch
    outputUnit: 'METER',
    effectiveFrom: new Date('2026-01-01'),
    notes: 'Standard industrial recipe for 1,000m of 4C x 35 sqmm A2XFY Cable',
  });

  // BOM items per 1,000 meters:
  // - Aluminium: 380 kg (norm 0.380 kg/m, scrap 1.5%)
  // - XLPE: 110 kg (norm 0.110 kg/m, scrap 2.0%)
  // - GI Strip Armour: 240 kg (norm 0.240 kg/m, scrap 1.0%)
  // - PVC ST-2: 210 kg (norm 0.210 kg/m, scrap 2.5%)
  await BomItemModel.create([
    {
      bomVersionId: bomAl4C35._id,
      materialId: matAluminium._id,
      processStageId: stageDrawing._id,
      quantityPerUnit: 380,
      scrapTolerancePercentage: 1.5,
      stageSequence: 1,
      notes: 'Aluminium Conductor Rods',
    },
    {
      bomVersionId: bomAl4C35._id,
      materialId: matXlpe._id,
      processStageId: stageInsulation._id,
      quantityPerUnit: 110,
      scrapTolerancePercentage: 2.0,
      stageSequence: 3,
      notes: 'Cores Insulation',
    },
    {
      bomVersionId: bomAl4C35._id,
      materialId: matGiArmour._id,
      processStageId: stageArmouring._id,
      quantityPerUnit: 240,
      scrapTolerancePercentage: 1.0,
      stageSequence: 4,
      notes: 'Mechanical Armouring',
    },
    {
      bomVersionId: bomAl4C35._id,
      materialId: matPvcSt2._id,
      processStageId: stageSheathing._id,
      quantityPerUnit: 210,
      scrapTolerancePercentage: 2.5,
      stageSequence: 5,
      notes: 'Outer Protective Sheath',
    },
  ]);

  // Product 2: 1.1kV 4C x 4 sq.mm Copper Armoured Power Cable
  const prodCu4C4 = await ProductModel.create({
    code: 'CBL-1.1KV-4C-4',
    name: '1.1kV 4C x 4 sq.mm Copper XLPE Armoured Cable',
    description: '1.1kV 4C x 4 sq.mm Copper Cable',
    cableCategory: 'LT_POWER',
    voltageGrade: '1.1KV',
    coreCount: 4,
    crossSectionSqMm: 4,
    conductorMaterial: 'COPPER',
    insulationType: 'XLPE',
    armourType: 'STRIP_ARMOURED',
    outerSheath: 'PVC_ST2',
    baseUnit: 'METER',
    standardUnit: 'METER',
    isActive: true,
  });

  const bomCu4C4 = await BomVersionModel.create({
    productId: prodCu4C4._id,
    bomNumber: 'BOM-4C-4-V1',
    versionNumber: 1,
    status: 'ACTIVE',
    batchSize: 1000,
    outputUnit: 'METER',
    effectiveFrom: new Date('2026-01-01'),
    notes: 'Standard recipe for 1,000m 4C x 4 sqmm Copper Armoured Cable',
  });

  // BOM items per 1,000 meters:
  // - Copper: 155 kg (norm 0.155 kg/m, scrap 1.0%)
  // - XLPE: 45 kg (norm 0.045 kg/m, scrap 2.0%)
  // - PVC ST-2: 120 kg (norm 0.120 kg/m, scrap 2.5%)
  await BomItemModel.create([
    {
      bomVersionId: bomCu4C4._id,
      materialId: matCopper._id,
      processStageId: stageDrawing._id,
      quantityPerUnit: 155,
      scrapTolerancePercentage: 1.0,
      stageSequence: 1,
      notes: 'Copper Rod 8mm',
    },
    {
      bomVersionId: bomCu4C4._id,
      materialId: matXlpe._id,
      processStageId: stageInsulation._id,
      quantityPerUnit: 45,
      scrapTolerancePercentage: 2.0,
      stageSequence: 3,
      notes: 'XLPE Insulation',
    },
    {
      bomVersionId: bomCu4C4._id,
      materialId: matPvcSt2._id,
      processStageId: stageSheathing._id,
      quantityPerUnit: 120,
      scrapTolerancePercentage: 2.5,
      stageSequence: 5,
      notes: 'Outer PVC Compound',
    },
  ]);

  // Product 3: 1.1kV 3C x 2.5 sq.mm Flexible Control Cable
  const prodCu3C25 = await ProductModel.create({
    code: 'CBL-3C-2.5-FLEX',
    name: '1.1kV 3C x 2.5 sq.mm Copper Flexible Control Cable',
    description: '3C x 2.5 sqmm Flexible Cable',
    cableCategory: 'CONTROL',
    voltageGrade: '1.1KV',
    coreCount: 3,
    crossSectionSqMm: 2.5,
    conductorMaterial: 'COPPER',
    insulationType: 'PVC',
    armourType: 'UNARMOURED',
    outerSheath: 'PVC_ST1',
    baseUnit: 'METER',
    standardUnit: 'METER',
    isActive: true,
  });

  const bomCu3C25 = await BomVersionModel.create({
    productId: prodCu3C25._id,
    bomNumber: 'BOM-3C25-V1',
    versionNumber: 1,
    status: 'ACTIVE',
    batchSize: 1000,
    outputUnit: 'METER',
    effectiveFrom: new Date('2026-01-01'),
    notes: 'Recipe for 1,000m 3C x 2.5 sqmm Flexible Cable',
  });

  await BomItemModel.create([
    {
      bomVersionId: bomCu3C25._id,
      materialId: matCopper._id,
      processStageId: stageDrawing._id,
      quantityPerUnit: 70,
      scrapTolerancePercentage: 1.0,
      stageSequence: 1,
    },
    {
      bomVersionId: bomCu3C25._id,
      materialId: matPvcSt2._id,
      processStageId: stageSheathing._id,
      quantityPerUnit: 85,
      scrapTolerancePercentage: 2.5,
      stageSequence: 5,
    },
  ]);

  // 7. INBOUND CHALLANS (RAW MATERIAL SHIPMENTS FROM CUSTOMERS)
  console.log('Receiving Inbound Raw Material Challans...');

  // Helper to post an Inbound Challan with Lot, Balance and Transaction
  async function postInboundChallan(params: {
    challanNumber: string;
    customerChallanNumber: string;
    customerChallanDate: Date;
    customerId: any;
    warehouseId: any;
    vehicleNumber: string;
    transporterName: string;
    ownerType?: string;
    lines: Array<{
      materialId: any;
      materialCode: string;
      materialName: string;
      unitRate: number;
      declaredQuantity: number;
      receivedQuantity: number;
      unit: string;
      supplierLotNumber: string;
    }>;
  }) {
    const totalQty = params.lines.reduce((s, l) => s + l.receivedQuantity, 0);
    const totalVal = params.lines.reduce((s, l) => s + l.receivedQuantity * l.unitRate, 0);

    const ic = await InboundChallanModel.create({
      challanNumber: params.challanNumber,
      customerChallanNumber: params.customerChallanNumber,
      customerChallanDate: params.customerChallanDate,
      customerId: params.customerId,
      warehouseId: params.warehouseId,
      vehicleNumber: params.vehicleNumber,
      transporterName: params.transporterName,
      ownerType: params.ownerType || 'CUSTOMER',
      totalLines: params.lines.length,
      totalQuantity: totalQty,
      status: 'POSTED',
      postedAt: params.customerChallanDate,
    });

    for (let i = 0; i < params.lines.length; i++) {
      const line = params.lines[i];
      const icLine = await InboundChallanLineModel.create({
        inboundChallanId: ic._id,
        lineNumber: i + 1,
        materialId: line.materialId,
        materialCode: line.materialCode,
        declaredQuantity: line.declaredQuantity,
        receivedQuantity: line.receivedQuantity,
        acceptedQuantity: line.receivedQuantity,
        unit: line.unit,
        unitRate: line.unitRate,
        totalValue: line.receivedQuantity * line.unitRate,
        supplierLotNumber: line.supplierLotNumber,
        status: 'ACCEPTED',
      });

      // Material Lot
      await MaterialLotModel.create({
        lotNumber: `LOT-${line.materialCode}-${Date.now().toString().slice(-5)}-${i + 1}`,
        inboundChallanId: ic._id,
        inboundChallanLineId: icLine._id,
        materialId: line.materialId,
        warehouseId: params.warehouseId,
        ownerType: params.ownerType || 'CUSTOMER',
        customerId: params.customerId,
        initialQuantity: line.receivedQuantity,
        currentBalance: line.receivedQuantity,
        unit: line.unit,
        status: 'AVAILABLE',
      });

      // Inventory Balance
      const existingBal = await InventoryBalanceModel.findOne({
        materialId: line.materialId,
        warehouseId: params.warehouseId,
        customerId: params.customerId,
      });

      if (existingBal) {
        existingBal.quantityOnHand += line.receivedQuantity;
        existingBal.quantityAvailable += line.receivedQuantity;
        await existingBal.save();
      } else {
        await InventoryBalanceModel.create({
          materialId: line.materialId,
          warehouseId: params.warehouseId,
          ownerType: params.ownerType || 'CUSTOMER',
          customerId: params.customerId,
          quantityOnHand: line.receivedQuantity,
          quantityAvailable: line.receivedQuantity,
          quantityReserved: 0,
          unit: line.unit,
        });
      }

      // Ledger transaction
      await InventoryTransactionModel.create({
        transactionNumber: `TXN-IBC-${Date.now().toString().slice(-6)}-${i + 1}`,
        materialId: line.materialId,
        warehouseId: params.warehouseId,
        movementType: 'INWARD',
        transactionType: 'RECEIPT',
        quantity: line.receivedQuantity,
        unit: line.unit,
        sourceDocumentId: ic._id,
        sourceDocumentType: 'INBOUND_CHALLAN',
        ownerType: params.ownerType || 'CUSTOMER',
        customerId: params.customerId,
        status: 'POSTED',
        createdAt: params.customerChallanDate,
      });
    }

    return ic;
  }

  // --- Customer 1: V-MARC INDIA LIMITED Inbound Deliveries ---
  // Delivery 1 (Challan 1 - 20 days ago): Aluminium Rods 10,000 kg, XLPE 3,000 kg, GI Strip 6,000 kg, PVC 5,500 kg
  const vmarcChallan1 = await postInboundChallan({
    challanNumber: 'IBC-2026-VM-001',
    customerChallanNumber: 'VM-CH-8821',
    customerChallanDate: new Date('2026-10-05'),
    customerId: custVmarc._id,
    warehouseId: whRaw._id,
    vehicleNumber: 'RJ-02-GB-5511',
    transporterName: 'V-Trans Logistics',
    lines: [
      {
        materialId: matAluminium._id,
        materialCode: 'MAT-AL-9.5MM',
        materialName: matAluminium.name,
        unitRate: 240,
        declaredQuantity: 10000,
        receivedQuantity: 10000,
        unit: 'KG',
        supplierLotNumber: 'VM-LOT-AL-01',
      },
      {
        materialId: matXlpe._id,
        materialCode: 'MAT-XLPE-INSUL',
        materialName: matXlpe.name,
        unitRate: 145,
        declaredQuantity: 3000,
        receivedQuantity: 3000,
        unit: 'KG',
        supplierLotNumber: 'VM-LOT-XL-01',
      },
      {
        materialId: matGiArmour._id,
        materialCode: 'MAT-GI-STRIP',
        materialName: matGiArmour.name,
        unitRate: 85,
        declaredQuantity: 6000,
        receivedQuantity: 6000,
        unit: 'KG',
        supplierLotNumber: 'VM-LOT-GI-01',
      },
      {
        materialId: matPvcSt2._id,
        materialCode: 'MAT-PVC-ST2',
        materialName: matPvcSt2.name,
        unitRate: 110,
        declaredQuantity: 5500,
        receivedQuantity: 5500,
        unit: 'KG',
        supplierLotNumber: 'VM-LOT-PVC-01',
      },
    ],
  });

  // Delivery 2 (Challan 2 - 10 days ago): Supplementary Aluminium 5,000 kg and XLPE 1,500 kg
  const vmarcChallan2 = await postInboundChallan({
    challanNumber: 'IBC-2026-VM-002',
    customerChallanNumber: 'VM-CH-8904',
    customerChallanDate: new Date('2026-10-15'),
    customerId: custVmarc._id,
    warehouseId: whRaw._id,
    vehicleNumber: 'RJ-02-GB-7744',
    transporterName: 'V-Trans Logistics',
    lines: [
      {
        materialId: matAluminium._id,
        materialCode: 'MAT-AL-9.5MM',
        materialName: matAluminium.name,
        unitRate: 240,
        declaredQuantity: 5000,
        receivedQuantity: 5000,
        unit: 'KG',
        supplierLotNumber: 'VM-LOT-AL-02',
      },
      {
        materialId: matXlpe._id,
        materialCode: 'MAT-XLPE-INSUL',
        materialName: matXlpe.name,
        unitRate: 145,
        declaredQuantity: 1500,
        receivedQuantity: 1500,
        unit: 'KG',
        supplierLotNumber: 'VM-LOT-XL-02',
      },
    ],
  });

  // --- Customer 2: HAVELLS INDIA LIMITED Inbound Deliveries ---
  // Delivery 1: Copper Continuous Cast Rod 8mm: 5,000 kg, XLPE: 1,500 kg, PVC: 3,500 kg
  const havellsChallan1 = await postInboundChallan({
    challanNumber: 'IBC-2026-HV-001',
    customerChallanNumber: 'HV-CH-4410',
    customerChallanDate: new Date('2026-10-08'),
    customerId: custHavells._id,
    warehouseId: whRaw._id,
    vehicleNumber: 'UP-16-AB-9922',
    transporterName: 'SafeXpress Logistics',
    lines: [
      {
        materialId: matCopper._id,
        materialCode: 'MAT-CU-8MM',
        materialName: matCopper.name,
        unitRate: 750,
        declaredQuantity: 5000,
        receivedQuantity: 5000,
        unit: 'KG',
        supplierLotNumber: 'HV-CU-LOT-01',
      },
      {
        materialId: matXlpe._id,
        materialCode: 'MAT-XLPE-INSUL',
        materialName: matXlpe.name,
        unitRate: 145,
        declaredQuantity: 1500,
        receivedQuantity: 1500,
        unit: 'KG',
        supplierLotNumber: 'HV-XL-LOT-01',
      },
      {
        materialId: matPvcSt2._id,
        materialCode: 'MAT-PVC-ST2',
        materialName: matPvcSt2.name,
        unitRate: 110,
        declaredQuantity: 3500,
        receivedQuantity: 3500,
        unit: 'KG',
        supplierLotNumber: 'HV-PVC-LOT-01',
      },
    ],
  });

  // Delivery 2: Supplementary Copper 4,000 kg
  const havellsChallan2 = await postInboundChallan({
    challanNumber: 'IBC-2026-HV-002',
    customerChallanNumber: 'HV-CH-4528',
    customerChallanDate: new Date('2026-10-20'),
    customerId: custHavells._id,
    warehouseId: whRaw._id,
    vehicleNumber: 'UP-16-BC-1144',
    transporterName: 'SafeXpress Logistics',
    lines: [
      {
        materialId: matCopper._id,
        materialCode: 'MAT-CU-8MM',
        materialName: matCopper.name,
        unitRate: 750,
        declaredQuantity: 4000,
        receivedQuantity: 4000,
        unit: 'KG',
        supplierLotNumber: 'HV-CU-LOT-02',
      },
    ],
  });

  // --- Customer 3: POLYCAB INDIA LIMITED Inbound Delivery ---
  const polycabChallan = await postInboundChallan({
    challanNumber: 'IBC-2026-PL-001',
    customerChallanNumber: 'PL-CH-9021',
    customerChallanDate: new Date('2026-10-12'),
    customerId: custPolycab._id,
    warehouseId: whRaw._id,
    vehicleNumber: 'GJ-06-ZZ-3301',
    transporterName: 'VRL Logistics',
    lines: [
      {
        materialId: matCopper._id,
        materialCode: 'MAT-CU-8MM',
        materialName: matCopper.name,
        unitRate: 750,
        declaredQuantity: 3000,
        receivedQuantity: 3000,
        unit: 'KG',
        supplierLotNumber: 'PL-CU-LOT-01',
      },
      {
        materialId: matPvcSt2._id,
        materialCode: 'MAT-PVC-ST2',
        materialName: matPvcSt2.name,
        unitRate: 110,
        declaredQuantity: 3500,
        receivedQuantity: 3500,
        unit: 'KG',
        supplierLotNumber: 'PL-PVC-LOT-01',
      },
    ],
  });

  // 8. CUSTOMER DRUMS INBOUND RECEIVING
  console.log('Receiving Inbound Customer Cable Drums (RGP)...');
  let drumMoveSeq = 0;
  // V-Marc Wooden Drums (Ref RGP No: 262740872)
  const vmarcDrumsData = [
    { num: 'VM-DRM-01', size: '44X16X24', tare: 150 },
    { num: 'VM-DRM-02', size: '44X16X24', tare: 150 },
    { num: 'VM-DRM-03', size: '44X16X24', tare: 150 },
    { num: 'VM-DRM-04', size: '44X16X24', tare: 150 },
    { num: 'VM-DRM-05', size: '48X20X28', tare: 175 },
    { num: 'VM-DRM-06', size: '48X20X28', tare: 175 },
  ];

  const vmarcDrums: any[] = [];
  for (const d of vmarcDrumsData) {
    const drum = await DrumModel.create({
      drumNumber: d.num,
      drumType: 'WOODEN',
      drumSize: d.size,
      tareWeightKg: d.tare,
      ownership: 'CUSTOMER_SUPPLIED',
      customerId: custVmarc._id,
      currentWarehouseId: whFg._id,
      refRgpNumber: '262740872',
      status: 'AVAILABLE',
      inboundChallanNumber: 'VM-CH-8821',
    });
    vmarcDrums.push(drum);
    drumMoveSeq++;
    await DrumMovementModel.create({
      movementNumber: `DM-${Date.now().toString().slice(-6)}-${drumMoveSeq}`,
      drumId: drum._id,
      movementType: 'INBOUND_RECEIPT',
      referenceDocumentType: 'InboundChallan',
      toWarehouseId: whFg._id,
      movedAt: new Date(),
      remarks: 'Customer empty wooden drums received against RGP 262740872',
    });
  }

  // Havells Steel & Wooden Drums
  const havellsDrumsData = [
    { num: 'HVL-DRM-01', size: '52X22X30', tare: 210, type: 'STEEL' },
    { num: 'HVL-DRM-02', size: '52X22X30', tare: 210, type: 'STEEL' },
    { num: 'HVL-DRM-03', size: '48X20X28', tare: 170, type: 'WOODEN' },
    { num: 'HVL-DRM-04', size: '48X20X28', tare: 170, type: 'WOODEN' },
  ];

  const havellsDrums: any[] = [];
  for (const d of havellsDrumsData) {
    const drum = await DrumModel.create({
      drumNumber: d.num,
      drumType: d.type,
      drumSize: d.size,
      tareWeightKg: d.tare,
      ownership: 'CUSTOMER_SUPPLIED',
      customerId: custHavells._id,
      currentWarehouseId: whFg._id,
      refRgpNumber: 'HVL-RGP-771',
      status: 'AVAILABLE',
      inboundChallanNumber: 'HV-CH-4410',
    });
    havellsDrums.push(drum);
    drumMoveSeq++;
    await DrumMovementModel.create({
      movementNumber: `DM-${Date.now().toString().slice(-6)}-${drumMoveSeq}`,
      drumId: drum._id,
      movementType: 'INBOUND_RECEIPT',
      referenceDocumentType: 'InboundChallan',
      toWarehouseId: whFg._id,
      movedAt: new Date(),
      remarks: 'Customer empty drums received against RGP HVL-RGP-771',
    });
  }

  // 9. WORK ORDERS
  console.log('Creating Work Orders & Reserving Stock...');

  // --- Work Order 1: V-Marc (2,000 meters 4CX35 SQMM A2XFY) -> Packed & Outbound Dispatched! ---
  const woVmarc1 = await WorkOrderModel.create({
    workOrderNumber: 'WO-2026-VM-001',
    customerId: custVmarc._id,
    productId: prodAl4C35._id,
    bomVersionId: bomAl4C35._id,
    bomSnapshot: {
      bomVersionId: bomAl4C35._id,
      bomNumber: 'BOM-4CX35-V1',
      versionNumber: 1,
      batchSize: 1000,
      outputUnit: 'METER',
      items: [
        {
          materialId: matAluminium._id,
          materialCode: 'MAT-AL-9.5MM',
          materialName: matAluminium.name,
          quantityPerUnit: 380,
          scrapTolerancePercentage: 1.5,
          stageSequence: 1,
          unit: 'KG',
        },
        {
          materialId: matXlpe._id,
          materialCode: 'MAT-XLPE-INSUL',
          materialName: matXlpe.name,
          quantityPerUnit: 110,
          scrapTolerancePercentage: 2.0,
          stageSequence: 3,
          unit: 'KG',
        },
        {
          materialId: matGiArmour._id,
          materialCode: 'MAT-GI-STRIP',
          materialName: matGiArmour.name,
          quantityPerUnit: 240,
          scrapTolerancePercentage: 1.0,
          stageSequence: 4,
          unit: 'KG',
        },
        {
          materialId: matPvcSt2._id,
          materialCode: 'MAT-PVC-ST2',
          materialName: matPvcSt2.name,
          quantityPerUnit: 210,
          scrapTolerancePercentage: 2.5,
          stageSequence: 5,
          unit: 'KG',
        },
      ],
    },
    orderedLengthMeters: 2000,
    deliveredLengthMeters: 2000,
    customerPoNumber: 'PO-VM-2026-901',
    customerPoDate: new Date('2026-10-06'),
    targetDeliveryDate: new Date('2026-10-25'),
    status: 'COMPLETED',
  });

  // Production Order, Batch & Output for WO 1
  const poVmarc1 = await ProductionOrderModel.create({
    productionOrderNumber: 'PO-2026-VM-001',
    workOrderId: woVmarc1._id,
    customerId: custVmarc._id,
    productId: prodAl4C35._id,
    bomVersionId: bomAl4C35._id,
    plannedLengthMeters: 2000,
    producedLengthMeters: 2000,
    startDate: new Date('2026-10-07'),
    targetCompletionDate: new Date('2026-10-18'),
    status: 'COMPLETED',
  });

  const batchVmarc1 = await ProductionBatchModel.create({
    batchNumber: 'BAT-2026-VM-01',
    productionOrderId: poVmarc1._id,
    workOrderId: woVmarc1._id,
    processStageId: stageSheathing._id,
    machineCode: 'MCH-EXT-01',
    plannedQuantity: 2000,
    completedQuantity: 2000,
    unit: 'METER',
    status: 'COMPLETED',
  });

  await ProductionOutputModel.create({
    outputNumber: 'OUT-2026-VM-01',
    productionOrderId: poVmarc1._id,
    productionBatchId: batchVmarc1._id,
    workOrderId: woVmarc1._id,
    productId: prodAl4C35._id,
    processStageId: stageSheathing._id,
    outputLengthMeters: 2000,
    outputWeightKg: 1980,
    targetWarehouseId: whFg._id,
    isFinalStage: true,
    qualityStatus: 'PASSED',
    status: 'POSTED',
    postedAt: new Date('2026-10-18'),
  });

  // Packing List for WO 1: 4 drums (495m + 495m + 499m + 508m = 1,997 meters)
  console.log('Creating Packing List & Packing Drums for Work Order 1...');
  const plVmarc = await PackingListModel.create({
    packingListNumber: 'MF/PL/389',
    invoiceNumber: '2025-26/RJ/JW/337',
    challanNumber: 'MF/DC/408',
    sizeDescription: '4CX35 SQMM A2XFY',
    workOrderId: woVmarc1._id,
    customerId: custVmarc._id,
    productId: prodAl4C35._id,
    packingDate: new Date('2026-10-19'),
    packingWarehouseId: whFg._id,
    totalDrums: 4,
    totalLengthMeters: 1997,
    totalTareWeightKg: 600,
    totalNetWeightKg: 1980,
    totalGrossWeightKg: 2580,
    status: 'PACKED',
    remarks: 'Standard packaging as per customer schedule',
  });

  const plDrumLengths = [495, 495, 499, 508];
  for (let i = 0; i < 4; i++) {
    const drum = vmarcDrums[i];
    const len = plDrumLengths[i];
    await PackingListLineModel.create({
      packingListId: plVmarc._id,
      productId: prodAl4C35._id,
      sNo: i + 1,
      drumId: drum._id,
      drumNumber: drum.drumNumber,
      lengthBottom: 0,
      lengthTop: len,
      lengthTotal: len,
      lengthMeters: len,
      drumSize: drum.drumSize,
      refRgpNo: '262740872',
      tareWeightKg: drum.tareWeightKg,
      netWeightKg: 495,
      grossWeightKg: drum.tareWeightKg + 495,
      remarks: 'STD.LENGTH',
    });

    drum.status = 'DISPATCHED';
    drum.cableLengthMeters = len;
    drum.netWeightKg = 495;
    drum.grossWeightKg = drum.tareWeightKg + 495;
    drum.currentProductId = prodAl4C35._id;
    drum.workOrderId = woVmarc1._id;
    drum.packingListId = plVmarc._id;
    await drum.save();

    drumMoveSeq++;
    await DrumMovementModel.create({
      movementNumber: `DM-${Date.now().toString().slice(-6)}-${drumMoveSeq}`,
      drumId: drum._id,
      movementType: 'PACKING',
      referenceDocumentType: 'PackingList',
      referenceDocumentId: plVmarc._id,
      movedAt: new Date(),
      remarks: `Packed with ${len}m cable`,
    });
  }

  // Dispatch for WO 1
  console.log('Creating Dispatch & Outbound Delivery Challan...');
  const dispatchVmarc = await DispatchModel.create({
    dispatchNumber: 'DSP-2026-VM-001',
    workOrderId: woVmarc1._id,
    customerId: custVmarc._id,
    sourceWarehouseId: whFg._id,
    destinationAddress: 'Plot No. 42-44, Industrial Area, Chopanki, Alwar, Rajasthan',
    vehicleNumber: 'RJ-02-GB-5511',
    transporter: 'V-Trans Logistics',
    driverName: 'Mohan Singh',
    driverPhone: '+919876501122',
    lrNumber: 'LR-2627-991',
    eWayBillNumber: 'EWB-2627-009988',
    totalDrums: 4,
    totalLengthMeters: 1997,
    totalTareWeightKg: 600,
    totalNetWeightKg: 1980,
    totalGrossWeightKg: 2580,
    status: 'DISPATCHED',
    dispatchedAt: new Date('2026-10-20'),
  });

  for (let i = 0; i < 4; i++) {
    const drum = vmarcDrums[i];
    await DispatchLineModel.create({
      dispatchId: dispatchVmarc._id,
      drumId: drum._id,
      drumNumber: drum.drumNumber,
      productId: prodAl4C35._id,
      lengthMeters: plDrumLengths[i],
      tareWeightKg: drum.tareWeightKg,
      netWeightKg: 495,
      grossWeightKg: drum.tareWeightKg + 495,
    });
  }

  // Outbound Delivery Challan (MF/DC/408) for WO 1
  const outboundChallanVmarc = await OutboundChallanModel.create({
    challanNumber: 'MF/DC/408',
    dispatchId: dispatchVmarc._id,
    packingListId: plVmarc._id,
    packingListNumber: 'MF/PL/389',
    invoiceNumber: '2025-26/RJ/JW/337',
    sizeDescription: '4CX35 SQMM A2XFY',
    workOrderId: woVmarc1._id,
    workOrderNumber: woVmarc1.workOrderNumber,
    customerId: custVmarc._id,
    challanDate: new Date('2026-10-20'),
    deliveryTerms: 'Door Delivery / Job Work Return Under Rule 4(5)(a)',
    vehicleNumber: 'RJ-02-GB-5511',
    transporter: 'V-Trans Logistics',
    lrNumber: 'LR-2627-991',
    eWayBillNumber: 'EWB-2627-009988',
    totalDrums: 4,
    totalLengthMeters: 1997,
    totalTareWeightKg: 600,
    totalNetWeightKg: 1980,
    totalGrossWeightKg: 2580,
    status: 'ISSUED',
    acknowledgedByCustomer: true,
    acknowledgedDate: new Date('2026-10-22'),
    remarks: 'Packed cable drums dispatched for job-work contract',
    items: vmarcDrums.slice(0, 4).map((d, i) => ({
      drumId: d._id,
      drumNumber: d.drumNumber,
      sNo: i + 1,
      productId: prodAl4C35._id,
      productCode: '4CX35 SQMM A2XFY',
      productName: prodAl4C35.name,
      sizeDescription: '4CX35 SQMM A2XFY',
      lengthMeters: plDrumLengths[i],
      drumSize: d.drumSize,
      refRgpNumber: '262740872',
      drumType: 'WOODEN',
      tareWeightKg: d.tareWeightKg,
      netWeightKg: 495,
      grossWeightKg: d.tareWeightKg + 495,
      remarks: 'STD.LENGTH',
    })),
  });

  // --- Work Order 2: Havells (3,000 meters 4C x 4 sqmm Copper Armoured Cable) ---
  const woHavells1 = await WorkOrderModel.create({
    workOrderNumber: 'WO-2026-HV-001',
    customerId: custHavells._id,
    productId: prodCu4C4._id,
    bomVersionId: bomCu4C4._id,
    bomSnapshot: {
      bomVersionId: bomCu4C4._id,
      bomNumber: 'BOM-4C-4-V1',
      versionNumber: 1,
      batchSize: 1000,
      outputUnit: 'METER',
      items: [
        {
          materialId: matCopper._id,
          materialCode: 'MAT-CU-8MM',
          materialName: matCopper.name,
          quantityPerUnit: 155,
          scrapTolerancePercentage: 1.0,
          stageSequence: 1,
          unit: 'KG',
        },
        {
          materialId: matXlpe._id,
          materialCode: 'MAT-XLPE-INSUL',
          materialName: matXlpe.name,
          quantityPerUnit: 45,
          scrapTolerancePercentage: 2.0,
          stageSequence: 3,
          unit: 'KG',
        },
        {
          materialId: matPvcSt2._id,
          materialCode: 'MAT-PVC-ST2',
          materialName: matPvcSt2.name,
          quantityPerUnit: 120,
          scrapTolerancePercentage: 2.5,
          stageSequence: 5,
          unit: 'KG',
        },
      ],
    },
    orderedLengthMeters: 3000,
    deliveredLengthMeters: 3000,
    customerPoNumber: 'PO-HV-2026-104',
    customerPoDate: new Date('2026-10-10'),
    targetDeliveryDate: new Date('2026-10-28'),
    status: 'COMPLETED',
  });

  // Production Order, Output & Packing for WO 2
  const poHavells1 = await ProductionOrderModel.create({
    productionOrderNumber: 'PO-2026-HV-001',
    workOrderId: woHavells1._id,
    customerId: custHavells._id,
    productId: prodCu4C4._id,
    bomVersionId: bomCu4C4._id,
    plannedLengthMeters: 3000,
    producedLengthMeters: 3000,
    startDate: new Date('2026-10-11'),
    targetCompletionDate: new Date('2026-10-22'),
    status: 'COMPLETED',
  });

  const batchHavells1 = await ProductionBatchModel.create({
    batchNumber: 'BAT-2026-HV-01',
    productionOrderId: poHavells1._id,
    workOrderId: woHavells1._id,
    processStageId: stageSheathing._id,
    machineCode: 'MCH-EXT-01',
    plannedQuantity: 3000,
    completedQuantity: 3000,
    unit: 'METER',
    status: 'COMPLETED',
  });

  await ProductionOutputModel.create({
    outputNumber: 'OUT-2026-HV-01',
    productionOrderId: poHavells1._id,
    productionBatchId: batchHavells1._id,
    workOrderId: woHavells1._id,
    productId: prodCu4C4._id,
    processStageId: stageSheathing._id,
    outputLengthMeters: 3000,
    outputWeightKg: 1050,
    targetWarehouseId: whFg._id,
    isFinalStage: true,
    qualityStatus: 'PASSED',
    status: 'POSTED',
    postedAt: new Date('2026-10-22'),
  });

  // Packing List for Havells WO: 3 drums (1000m + 1000m + 1000m = 3000m)
  const plHavells = await PackingListModel.create({
    packingListNumber: 'MF/PL/412',
    invoiceNumber: '2025-26/UP/JW/441',
    challanNumber: 'MF/DC/430',
    sizeDescription: '1.1KV 4C X 4 SQMM CU ARMOURED',
    workOrderId: woHavells1._id,
    customerId: custHavells._id,
    productId: prodCu4C4._id,
    packingDate: new Date('2026-10-23'),
    packingWarehouseId: whFg._id,
    totalDrums: 3,
    totalLengthMeters: 3000,
    totalTareWeightKg: 590,
    totalNetWeightKg: 1050,
    totalGrossWeightKg: 1640,
    status: 'PACKED',
    remarks: 'Dispatched for Havells Noida Central Depot',
  });

  for (let i = 0; i < 3; i++) {
    const drum = havellsDrums[i];
    await PackingListLineModel.create({
      packingListId: plHavells._id,
      productId: prodCu4C4._id,
      sNo: i + 1,
      drumId: drum._id,
      drumNumber: drum.drumNumber,
      lengthBottom: 0,
      lengthTop: 1000,
      lengthTotal: 1000,
      lengthMeters: 1000,
      drumSize: drum.drumSize,
      refRgpNo: 'HVL-RGP-771',
      tareWeightKg: drum.tareWeightKg,
      netWeightKg: 350,
      grossWeightKg: drum.tareWeightKg + 350,
      remarks: 'STD.LENGTH',
    });

    drum.status = 'DISPATCHED';
    drum.cableLengthMeters = 1000;
    drum.netWeightKg = 350;
    drum.grossWeightKg = drum.tareWeightKg + 350;
    drum.currentProductId = prodCu4C4._id;
    drum.workOrderId = woHavells1._id;
    drum.packingListId = plHavells._id;
    await drum.save();
  }

  const dispatchHavells = await DispatchModel.create({
    dispatchNumber: 'DSP-2026-HV-001',
    workOrderId: woHavells1._id,
    customerId: custHavells._id,
    sourceWarehouseId: whFg._id,
    destinationAddress: 'Havells Cable Logistics Depot, Sector 63, Noida, UP',
    vehicleNumber: 'UP-16-AB-9922',
    transporter: 'SafeXpress Logistics',
    driverName: 'Rajendra Kumar',
    driverPhone: '+919811223344',
    lrNumber: 'LR-HV-4401',
    eWayBillNumber: 'EWB-HV-99887766',
    totalDrums: 3,
    totalLengthMeters: 3000,
    totalTareWeightKg: 590,
    totalNetWeightKg: 1050,
    totalGrossWeightKg: 1640,
    status: 'DISPATCHED',
    dispatchedAt: new Date('2026-10-24'),
  });

  const outboundChallanHavells = await OutboundChallanModel.create({
    challanNumber: 'MF/DC/430',
    dispatchId: dispatchHavells._id,
    packingListId: plHavells._id,
    packingListNumber: 'MF/PL/412',
    invoiceNumber: '2025-26/UP/JW/441',
    sizeDescription: '1.1KV 4C X 4 SQMM CU ARMOURED',
    workOrderId: woHavells1._id,
    workOrderNumber: woHavells1.workOrderNumber,
    customerId: custHavells._id,
    challanDate: new Date('2026-10-24'),
    deliveryTerms: 'Door Delivery / Job Work Return Under Rule 4(5)(a)',
    vehicleNumber: 'UP-16-AB-9922',
    transporter: 'SafeXpress Logistics',
    lrNumber: 'LR-HV-4401',
    eWayBillNumber: 'EWB-HV-99887766',
    totalDrums: 3,
    totalLengthMeters: 3000,
    totalTareWeightKg: 590,
    totalNetWeightKg: 1050,
    totalGrossWeightKg: 1640,
    status: 'ISSUED',
    acknowledgedByCustomer: false,
    remarks: 'Dispatched for Havells Noida Central Depot',
    items: havellsDrums.slice(0, 3).map((d, i) => ({
      drumId: d._id,
      drumNumber: d.drumNumber,
      sNo: i + 1,
      productId: prodCu4C4._id,
      productCode: 'CBL-1.1KV-4C-4',
      productName: prodCu4C4.name,
      sizeDescription: '1.1KV 4C X 4 SQMM CU ARMOURED',
      lengthMeters: 1000,
      drumSize: d.drumSize,
      refRgpNumber: 'HVL-RGP-771',
      drumType: d.drumType,
      tareWeightKg: d.tareWeightKg,
      netWeightKg: 350,
      grossWeightKg: d.tareWeightKg + 350,
      remarks: 'STD.LENGTH',
    })),
  });

  // --- Work Order 3: Active in-progress Work Order (Polycab 2,000 meters Flexible Cable) ---
  const woPolycab = await WorkOrderModel.create({
    workOrderNumber: 'WO-2026-PL-001',
    customerId: custPolycab._id,
    productId: prodCu3C25._id,
    bomVersionId: bomCu3C25._id,
    bomSnapshot: {
      bomVersionId: bomCu3C25._id,
      bomNumber: 'BOM-3C25-V1',
      versionNumber: 1,
      batchSize: 1000,
      outputUnit: 'METER',
      items: [
        {
          materialId: matCopper._id,
          materialCode: 'MAT-CU-8MM',
          materialName: matCopper.name,
          quantityPerUnit: 70,
          scrapTolerancePercentage: 1.0,
          stageSequence: 1,
          unit: 'KG',
        },
        {
          materialId: matPvcSt2._id,
          materialCode: 'MAT-PVC-ST2',
          materialName: matPvcSt2.name,
          quantityPerUnit: 85,
          scrapTolerancePercentage: 2.5,
          stageSequence: 5,
          unit: 'KG',
        },
      ],
    },
    orderedLengthMeters: 2000,
    deliveredLengthMeters: 0,
    customerPoNumber: 'PO-PL-2026-880',
    customerPoDate: new Date('2026-10-15'),
    targetDeliveryDate: new Date('2026-11-10'),
    status: 'IN_PRODUCTION',
  });

  // Material Reservation for Active WO
  await MaterialReservationModel.create([
    {
      reservationNumber: `RES-${Date.now().toString().slice(-6)}-1`,
      workOrderId: woPolycab._id,
      materialId: matCopper._id,
      warehouseId: whRaw._id,
      ownerType: 'CUSTOMER',
      customerId: custPolycab._id,
      reservedQuantity: 140, // 2000m * 70kg / 1000m
      unit: 'KG',
      status: 'ACTIVE',
    },
    {
      reservationNumber: `RES-${Date.now().toString().slice(-6)}-2`,
      workOrderId: woPolycab._id,
      materialId: matPvcSt2._id,
      warehouseId: whRaw._id,
      ownerType: 'CUSTOMER',
      customerId: custPolycab._id,
      reservedQuantity: 170, // 2000m * 85kg / 1000m
      unit: 'KG',
      status: 'ACTIVE',
    },
  ]);

  console.log('\n======================================================');
  console.log('✅ TEST DATA SEEDED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Summary of Created Data:');
  console.log('- Warehouses: 3 (Raw Material, WIP, Finished Goods/Yard)');
  console.log('- Process Stages: 5 standard stages (Drawing, Stranding, Insulation, Armouring, Sheathing)');
  console.log('- Customers: 3 (V-MARC INDIA, Havells India, Polycab India)');
  console.log('- Raw Materials: 6 (Copper, Aluminium, XLPE, PVC ST-2, GI Armour Strip, Red Masterbatch)');
  console.log('- Cable Products: 3 (4CX35 SQMM A2XFY, 4C x 4 Cu Armoured, 3C x 2.5 Cu Flexible)');
  console.log('- Active BOMs: 3 Multi-Raw Material BOM recipes with scrap percentages');
  console.log('- Inbound Challans: 5 posted delivery challans with lots & ledger movements');
  console.log('- Customer Cable Drums: 10 drums with RGP numbers, movements & weights');
  console.log('- Work Orders: 3 (2 Completed & Dispatched with Outbound Challans, 1 In-Production)');
  console.log('- Packing Lists: 2 finalized with drums, weights and meterages');
  console.log('- Outbound Delivery Challans: 2 (MF/DC/408 & MF/DC/430) with consumption sheets ready!');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
