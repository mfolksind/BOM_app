import { Router, Request, Response } from 'express';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import { CustomerModel } from '../customers/customer.model';
import { MaterialModel } from '../materials/material.model';
import { ProductModel } from '../products/product.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { DrumModel } from '../packing/drum.model';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { InboundChallanLineModel } from '../inventory/inbound-challan-line.model';
import { MaterialLotModel } from '../materials/material-lot.model';
import { InventoryTransactionModel } from '../inventory/inventory-transaction.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { InventorySequenceUtil } from '../inventory/inventory-sequence.util';
import mongoose from 'mongoose';

const router = Router();

/**
 * Bulk Import Customers
 */
router.post(
  '/customers',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No customer rows provided for import' });
    }

    const results = { imported: 0, updated: 0, errors: [] as any[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.code || !row.name) {
          results.errors.push({ row: i + 1, error: 'Customer code and name are required' });
          continue;
        }

        const existing = await CustomerModel.findOne({ code: row.code.toUpperCase() });
        if (existing) {
          existing.name = row.name || existing.name;
          if (row.legalName) existing.legalName = row.legalName;
          if (row.gstin) existing.gstin = row.gstin;
          if (row.pan) existing.pan = row.pan;
          if (row.contactPerson) existing.contactPerson = row.contactPerson;
          if (row.phone) existing.phone = row.phone;
          if (row.email) existing.email = row.email;
          if (row.billingAddress) existing.billingAddress = { ...existing.billingAddress, ...row.billingAddress };
          await existing.save();
          results.updated++;
        } else {
          await CustomerModel.create({
            code: row.code.toUpperCase(),
            name: row.name,
            legalName: row.legalName || row.name,
            gstin: row.gstin || '',
            pan: row.pan || '',
            contactPerson: row.contactPerson || 'Manager',
            phone: row.phone || '9999999999',
            email: row.email || `contact@${row.code.toLowerCase()}.com`,
            billingAddress: row.billingAddress || {
              street: 'Industrial Area',
              city: 'Alwar',
              state: 'Rajasthan',
              postalCode: '301707',
              country: 'India',
            },
            creditDays: 30,
            isActive: true,
          });
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, code: row.code, error: err.message });
      }
    }

    return ApiResponseUtil.success(res, results, `Processed ${rows.length} customer records`);
  }),
);

/**
 * Bulk Import Raw Materials
 */
router.post(
  '/materials',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No material rows provided for import' });
    }

    const results = { imported: 0, updated: 0, errors: [] as any[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.code || !row.name) {
          results.errors.push({ row: i + 1, error: 'Material code and name are required' });
          continue;
        }

        const existing = await MaterialModel.findOne({ code: row.code.toUpperCase() });
        if (existing) {
          existing.name = row.name || existing.name;
          if (row.category) existing.category = row.category;
          if (row.baseUnit) existing.baseUnit = row.baseUnit;
          if (row.hsnCode) existing.hsnCode = row.hsnCode;
          if (row.standardRate !== undefined) existing.standardRate = row.standardRate;
          if (row.description) existing.description = row.description;
          await existing.save();
          results.updated++;
        } else {
          await MaterialModel.create({
            code: row.code.toUpperCase(),
            name: row.name,
            category: row.category || 'OTHER',
            baseUnit: row.baseUnit || 'KG',
            hsnCode: row.hsnCode || '39011090',
            standardRate: row.standardRate || 0,
            description: row.description || '',
            moduleTags: ['INBOUND', 'PRODUCTION'],
            isActive: true,
          });
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, code: row.code, error: err.message });
      }
    }

    return ApiResponseUtil.success(res, results, `Processed ${rows.length} raw material records`);
  }),
);

/**
 * Bulk Import Cable Products
 */
router.post(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No product rows provided for import' });
    }

    const results = { imported: 0, updated: 0, errors: [] as any[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.code || !row.name) {
          results.errors.push({ row: i + 1, error: 'Product code and name are required' });
          continue;
        }

        const existing = await ProductModel.findOne({ code: row.code.toUpperCase() });
        if (existing) {
          existing.name = row.name || existing.name;
          if (row.cableCategory) existing.cableCategory = row.cableCategory;
          if (row.voltageGrade) existing.voltageGrade = row.voltageGrade;
          if (row.coreCount) existing.coreCount = row.coreCount;
          if (row.crossSectionSqMm) existing.crossSectionSqMm = row.crossSectionSqMm;
          if (row.conductorMaterial) existing.conductorMaterial = row.conductorMaterial;
          if (row.insulationType) existing.insulationType = row.insulationType;
          if (row.armourType) existing.armourType = row.armourType;
          if (row.outerSheath) existing.outerSheath = row.outerSheath;
          await existing.save();
          results.updated++;
        } else {
          await ProductModel.create({
            code: row.code.toUpperCase(),
            name: row.name,
            cableCategory: row.cableCategory || 'LT_POWER',
            voltageGrade: row.voltageGrade || '1.1KV',
            coreCount: row.coreCount || 4,
            crossSectionSqMm: row.crossSectionSqMm || 35,
            conductorMaterial: row.conductorMaterial || 'ALUMINUM',
            insulationType: row.insulationType || 'XLPE',
            armourType: row.armourType || 'STRIP_ARMOURED',
            outerSheath: row.outerSheath || 'PVC_ST2',
            baseUnit: row.baseUnit || 'METER',
            isActive: true,
          });
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, code: row.code, error: err.message });
      }
    }

    return ApiResponseUtil.success(res, results, `Processed ${rows.length} product records`);
  }),
);

/**
 * Bulk Import Warehouses
 */
router.post(
  '/warehouses',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No warehouse rows provided for import' });
    }

    const results = { imported: 0, updated: 0, errors: [] as any[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.code || !row.name) {
          results.errors.push({ row: i + 1, error: 'Warehouse code and name are required' });
          continue;
        }

        const existing = await WarehouseModel.findOne({ code: row.code.toUpperCase() });
        if (existing) {
          existing.name = row.name || existing.name;
          if (row.type) existing.type = row.type;
          if (row.location) existing.location = row.location;
          await existing.save();
          results.updated++;
        } else {
          await WarehouseModel.create({
            code: row.code.toUpperCase(),
            name: row.name,
            type: row.type || 'RAW_MATERIAL',
            location: row.location || 'Chopanki Plant',
            isActive: true,
          });
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, code: row.code, error: err.message });
      }
    }

    return ApiResponseUtil.success(res, results, `Processed ${rows.length} warehouse records`);
  }),
);

/**
 * Bulk Import Cable Drums
 */
router.post(
  '/drums',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No drum rows provided for import' });
    }

    const results = { imported: 0, updated: 0, errors: [] as any[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.drumNumber) {
          results.errors.push({ row: i + 1, error: 'Drum number is required' });
          continue;
        }

        let customerId: mongoose.Types.ObjectId | undefined;
        if (row.customerCode) {
          const cust = await CustomerModel.findOne({ code: row.customerCode.toUpperCase() });
          if (cust) customerId = cust._id;
        }

        const existing = await DrumModel.findOne({ drumNumber: row.drumNumber.toUpperCase() });
        if (existing) {
          if (row.drumType) existing.drumType = row.drumType;
          if (row.ownership) existing.ownership = row.ownership;
          if (row.drumSize) existing.drumSize = row.drumSize;
          if (row.refRgpNumber) existing.refRgpNumber = row.refRgpNumber;
          if (customerId) existing.customerId = customerId;
          if (row.tareWeightKg !== undefined) existing.tareWeightKg = row.tareWeightKg;
          await existing.save();
          results.updated++;
        } else {
          await DrumModel.create({
            drumNumber: row.drumNumber.toUpperCase(),
            drumType: row.drumType || 'WOODEN',
            ownership: row.ownership || 'CUSTOMER_SUPPLIED',
            customerId,
            drumSize: row.drumSize || '44X16X24',
            refRgpNumber: row.refRgpNumber || '',
            tareWeightKg: row.tareWeightKg || 120,
            grossWeightKg: row.tareWeightKg || 120,
            netWeightKg: 0,
            cableLengthMeters: 0,
            status: 'AVAILABLE',
          });
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, drumNumber: row.drumNumber, error: err.message });
      }
    }

    return ApiResponseUtil.success(res, results, `Processed ${rows.length} drum records`);
  }),
);

/**
 * Bulk Import Inbound Delivery Challans (Paper Receipt Log Archive)
 */
router.post(
  '/inbound-challans',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No inbound challan rows provided for import' });
    }

    const results = { imported: 0, linesCreated: 0, errors: [] as any[] };

    // Group rows by customerChallanNumber + customerCode
    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const key = `${r.customerCode || 'DEFAULT'}_${r.customerChallanNumber || 'UNKNOWN'}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    for (const [key, items] of grouped.entries()) {
      try {
        const first = items[0];
        if (!first.customerChallanNumber) {
          results.errors.push({ key, error: 'Customer challan number is required' });
          continue;
        }

        let customer = null;
        if (first.customerCode) {
          customer = await CustomerModel.findOne({ code: first.customerCode.toUpperCase() });
        }
        if (!customer) {
          customer = await CustomerModel.findOne();
        }

        let warehouse = null;
        if (first.warehouseCode) {
          warehouse = await WarehouseModel.findOne({ code: first.warehouseCode.toUpperCase() });
        }
        if (!warehouse) {
          warehouse = (await WarehouseModel.findOne({ type: 'RAW_MATERIAL' })) || (await WarehouseModel.findOne());
        }

        const challanDate = first.customerChallanDate ? new Date(first.customerChallanDate) : new Date();

        // Check if challan already exists
        let challan = await InboundChallanModel.findOne({
          customerChallanNumber: first.customerChallanNumber,
          customerId: customer?._id,
        });

        if (!challan) {
          const sysChallanNo = await InventorySequenceUtil.getNextSequence('INBOUND_CHALLAN', 'IC');
          challan = await InboundChallanModel.create({
            challanNumber: sysChallanNo,
            customerChallanNumber: first.customerChallanNumber,
            customerChallanDate: challanDate,
            ownerType: 'CUSTOMER',
            customerId: customer?._id,
            warehouseId: warehouse?._id,
            vehicleNumber: first.vehicleNumber || '',
            lrNumber: first.lrNumber || '',
            status: 'POSTED',
            receivedAt: challanDate,
            postedAt: challanDate,
          });
          results.imported++;
        }

        // Add line items
        for (const item of items) {
          let material = null;
          if (item.materialCode) {
            material = await MaterialModel.findOne({ code: item.materialCode.toUpperCase() });
          }
          if (!material) {
            material = await MaterialModel.findOne();
          }

          const qty = parseFloat(item.receivedQuantity) || 0;
          const rate = parseFloat(item.unitRate) || material?.standardRate || 100;
          const lotNo = `LOT-${first.customerChallanNumber}-${material?.code || 'RM'}`;

          // Create Line
          const line = await InboundChallanLineModel.create({
            inboundChallanId: challan._id,
            materialId: material?._id,
            materialCode: material?.code || item.materialCode,
            materialName: material?.name || 'Raw Material',
            challanQuantity: qty,
            receivedQuantity: qty,
            acceptedQuantity: qty,
            rejectedQuantity: 0,
            unitRate: rate,
            totalValue: Number((qty * rate).toFixed(2)),
            unit: material?.baseUnit || 'KG',
            lotNumber: lotNo,
            status: 'ACCEPTED',
          });

          // Create Material Lot
          const lot = await MaterialLotModel.create({
            lotNumber: lotNo,
            materialId: material?._id,
            initialQuantity: qty,
            availableQuantity: qty,
            reservedQuantity: 0,
            consumedQuantity: 0,
            unitRate: rate,
            unit: material?.baseUnit || 'KG',
            status: 'AVAILABLE',
            ownerType: 'CUSTOMER',
            customerId: customer?._id,
            inboundChallanId: challan._id,
            warehouseId: warehouse?._id,
            receivedDate: challanDate,
          });

          // Record Inventory Transaction
          const txNo = await InventorySequenceUtil.getNextSequence('INVENTORY_TX', 'TX');
          await InventoryTransactionModel.create({
            transactionNumber: txNo,
            movementType: 'INWARD',
            transactionType: 'RECEIPT',
            materialId: material?._id,
            warehouseId: warehouse?._id,
            lotId: lot._id,
            ownerType: 'CUSTOMER',
            customerId: customer?._id,
            quantity: qty,
            unit: material?.baseUnit || 'KG',
            status: 'POSTED',
            sourceDocumentType: 'INBOUND_CHALLAN',
            sourceDocumentId: challan._id,
            sourceDocumentLineId: line._id,
            postedAt: challanDate,
            remarks: `Paper archive import: Challan ${first.customerChallanNumber}`,
          });

          // Update Inventory Balance
          await InventoryBalanceModel.findOneAndUpdate(
            {
              materialId: material?._id,
              warehouseId: warehouse?._id,
              ownerType: 'CUSTOMER',
              customerId: customer?._id,
              lotId: lot._id,
            },
            {
              $inc: {
                quantityOnHand: qty,
                quantityAvailable: qty,
              },
              $setOnInsert: {
                unit: material?.baseUnit || 'KG',
                quantityReserved: 0,
              },
            },
            { upsert: true, new: true },
          );

          results.linesCreated++;
        }
      } catch (err: any) {
        results.errors.push({ key, error: err.message });
      }
    }

    return ApiResponseUtil.success(res, results, 'Inbound challans imported with stock ledger postings');
  }),
);

export const importRoutes = router;
