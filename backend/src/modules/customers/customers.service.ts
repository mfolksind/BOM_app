import mongoose from 'mongoose';
import { CustomerModel, ICustomer } from './customer.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { InboundChallanLineModel } from '../inventory/inbound-challan-line.model';
import { MaterialLotModel } from '../materials/material-lot.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { OutboundChallanModel } from '../dispatch/outbound-challan.model';
import { DispatchModel } from '../dispatch/dispatch.model';
import { DrumModel } from '../packing/drum.model';
import { AuditLogModel } from '../shared/audit-log.model';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpdateCustomerStatusInput,
  CustomerQueryParams,
} from './customers.validation';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { PaginatedResult } from '../../common/types';

export class CustomersService {
  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid customer ID format: '${id}'`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create a new customer master record.
   */
  async createCustomer(
    input: CreateCustomerInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<ICustomer> {
    const existing = await CustomerModel.findOne({ code: input.code });
    if (existing) {
      throw new ConflictError(`Customer with code '${input.code}' already exists`);
    }

    const customer = await CustomerModel.create(input);

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'Customer',
      entityId: customer._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        code: customer.code,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gstin: customer.gstin,
      },
    });

    return customer;
  }

  /**
   * List customers with pagination, search, and active/inactive filtering.
   */
  async listCustomers(params: CustomerQueryParams): Promise<PaginatedResult<ICustomer>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.isActive !== undefined) {
      filter.isActive = params.isActive;
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { legalName: searchRegex },
        { phone: searchRegex },
        { gstin: searchRegex },
        { contactPerson: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      CustomerModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      CustomerModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get single customer by ID.
   */
  async getCustomerById(id: string): Promise<ICustomer> {
    const objectId = this.validateId(id);
    const customer = await CustomerModel.findById(objectId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    return customer;
  }

  /**
   * Update permitted details of an existing customer.
   */
  async updateCustomer(
    id: string,
    input: UpdateCustomerInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<ICustomer> {
    const objectId = this.validateId(id);
    const customer = await CustomerModel.findById(objectId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    const oldValues = customer.toObject();

    Object.assign(customer, input);
    await customer.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: customer._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues,
      newValues: input,
    });

    return customer;
  }

  /**
   * Deactivate or reactivate a customer.
   */
  async updateCustomerStatus(
    id: string,
    input: UpdateCustomerStatusInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<ICustomer> {
    const objectId = this.validateId(id);
    const customer = await CustomerModel.findById(objectId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    const oldStatus = customer.isActive;
    customer.isActive = input.isActive;
    await customer.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: customer._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: customer.isActive, reason: input.reason },
    });

    return customer;
  }

  /**
   * Delete a customer only if no historical ERP records reference them.
   */
  async deleteCustomer(id: string, performedByUserId: string, ipAddress?: string): Promise<void> {
    const objectId = this.validateId(id);
    const customer = await CustomerModel.findById(objectId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    // Safe deletion checks across related ERP collections
    const [workOrdersCount, challansCount, lotsCount, stockCount, outboundCount, dispatchCount] =
      await Promise.all([
        WorkOrderModel.countDocuments({ customerId: objectId }),
        InboundChallanModel.countDocuments({ customerId: objectId }),
        MaterialLotModel.countDocuments({ customerId: objectId }),
        InventoryBalanceModel.countDocuments({ customerId: objectId }),
        OutboundChallanModel.countDocuments({ customerId: objectId }),
        DispatchModel.countDocuments({ customerId: objectId }),
      ]);

    const totalRefs =
      workOrdersCount + challansCount + lotsCount + stockCount + outboundCount + dispatchCount;

    if (totalRefs > 0) {
      throw new BadRequestError(
        `Cannot permanently delete customer '${customer.name}' (${customer.code}) because they are referenced by ${totalRefs} existing ERP record(s) (Work Orders: ${workOrdersCount}, Inbound Challans: ${challansCount}, Material Lots: ${lotsCount}, Stock: ${stockCount}, Dispatches: ${outboundCount + dispatchCount}). Please deactivate the customer instead to preserve historical integrity.`,
      );
    }

    await CustomerModel.findByIdAndDelete(objectId);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'Customer',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: {
        code: customer.code,
        name: customer.name,
      },
    });
  }

  /**
   * Complete Customer Stock Overview:
   * Returns customer raw material balances in warehouse, returnable drums inventory,
   * inbound challans, and outbound delivery challans with consumption sheets.
   */
  async getCustomerStockOverview(id: string): Promise<Record<string, any>> {
    const objectId = this.validateId(id);
    const customer = await CustomerModel.findById(objectId);
    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    // 1. Current Raw Material Stock in Hand & Warehouse Balances
    const rawMaterialStock = await InventoryBalanceModel.find({
      customerId: objectId,
      ownerType: 'CUSTOMER',
    })
      .populate('materialId', 'code name category hsnCode baseUnit standardCost')
      .populate('warehouseId', 'code name type location')
      .populate({
        path: 'lotId',
        select: 'lotNumber supplierLotNumber inboundChallanId initialQuantity currentBalance',
        populate: {
          path: 'inboundChallanId',
          select: 'challanNumber customerChallanNumber customerChallanDate',
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Also fetch active material lots received from this customer
    const activeLots = await MaterialLotModel.find({
      customerId: objectId,
      ownerType: 'CUSTOMER',
      currentBalance: { $gt: 0 },
    })
      .populate('materialId', 'code name category hsnCode baseUnit standardCost')
      .populate('warehouseId', 'code name type location')
      .populate('inboundChallanId', 'challanNumber customerChallanNumber customerChallanDate')
      .sort({ createdAt: -1 })
      .lean();

    // 1b. Build Reconciled Warehouse Balances & Consolidated Material Balances
    const warehouseMap = new Map<string, any>();
    const materialMap = new Map<string, any>();

    // Process InventoryBalance records
    for (const b of rawMaterialStock) {
      const wh = b.warehouseId as any;
      const mat = b.materialId as any;
      if (!wh || !mat) continue;

      const whId = wh._id?.toString() || 'unknown';
      const matId = mat._id?.toString() || 'unknown';

      // Group by Warehouse
      if (!warehouseMap.has(whId)) {
        warehouseMap.set(whId, {
          warehouseId: whId,
          warehouseCode: wh.code || 'WH',
          warehouseName: wh.name || 'Main Warehouse',
          warehouseType: wh.type || 'RAW_MATERIALS',
          totalOnHandKg: 0,
          totalAvailableKg: 0,
          totalReservedKg: 0,
          materialsMap: new Map<string, any>(),
        });
      }
      const whEntry = warehouseMap.get(whId);
      whEntry.totalOnHandKg += b.quantityOnHand || 0;
      whEntry.totalAvailableKg += b.quantityAvailable || 0;
      whEntry.totalReservedKg += b.quantityReserved || 0;

      if (!whEntry.materialsMap.has(matId)) {
        whEntry.materialsMap.set(matId, {
          materialId: matId,
          materialCode: mat.code,
          materialName: mat.name,
          category: mat.category,
          unit: mat.baseUnit || b.unit || 'KG',
          hsnCode: mat.hsnCode,
          quantityOnHand: 0,
          quantityAvailable: 0,
          quantityReserved: 0,
        });
      }
      const whMat = whEntry.materialsMap.get(matId);
      whMat.quantityOnHand += b.quantityOnHand || 0;
      whMat.quantityAvailable += b.quantityAvailable || 0;
      whMat.quantityReserved += b.quantityReserved || 0;

      // Group by Material across all warehouses
      if (!materialMap.has(matId)) {
        materialMap.set(matId, {
          materialId: matId,
          materialCode: mat.code,
          materialName: mat.name,
          category: mat.category,
          hsnCode: mat.hsnCode,
          unit: mat.baseUnit || b.unit || 'KG',
          quantityOnHand: 0,
          quantityAvailable: 0,
          quantityReserved: 0,
          warehousesMap: new Map<string, any>(),
          lots: [],
        });
      }
      const matEntry = materialMap.get(matId);
      matEntry.quantityOnHand += b.quantityOnHand || 0;
      matEntry.quantityAvailable += b.quantityAvailable || 0;
      matEntry.quantityReserved += b.quantityReserved || 0;

      if (!matEntry.warehousesMap.has(whId)) {
        matEntry.warehousesMap.set(whId, {
          warehouseId: whId,
          warehouseName: wh.name,
          warehouseCode: wh.code,
          quantityOnHand: 0,
          quantityAvailable: 0,
          quantityReserved: 0,
        });
      }
      const matWh = matEntry.warehousesMap.get(whId);
      matWh.quantityOnHand += b.quantityOnHand || 0;
      matWh.quantityAvailable += b.quantityAvailable || 0;
      matWh.quantityReserved += b.quantityReserved || 0;
    }

    // Attach active lot details to material entries
    for (const lot of activeLots) {
      const mat = lot.materialId as any;
      const wh = lot.warehouseId as any;
      const ch = lot.inboundChallanId as any;
      if (!mat) continue;

      const matId = mat._id?.toString() || 'unknown';
      if (!materialMap.has(matId)) {
        materialMap.set(matId, {
          materialId: matId,
          materialCode: mat.code,
          materialName: mat.name,
          category: mat.category,
          hsnCode: mat.hsnCode,
          unit: mat.baseUnit || lot.unit || 'KG',
          quantityOnHand: lot.currentBalance || 0,
          quantityAvailable: lot.currentBalance || 0,
          quantityReserved: 0,
          warehousesMap: new Map<string, any>(),
          lots: [],
        });
      }
      const matEntry = materialMap.get(matId);
      matEntry.lots.push({
        lotNumber: lot.lotNumber,
        supplierLotNumber: lot.supplierLotNumber,
        currentBalance: lot.currentBalance,
        initialQuantity: lot.initialQuantity,
        unit: lot.unit,
        warehouseName: wh?.name || 'Main Warehouse',
        challanNumber: ch?.customerChallanNumber || ch?.challanNumber || 'Direct Inward',
        challanDate: ch?.customerChallanDate || null,
      });
    }

    const warehouseBreakdown = Array.from(warehouseMap.values()).map((wh) => ({
      warehouseId: wh.warehouseId,
      warehouseCode: wh.warehouseCode,
      warehouseName: wh.warehouseName,
      warehouseType: wh.warehouseType,
      totalOnHandKg: Number(wh.totalOnHandKg.toFixed(2)),
      totalAvailableKg: Number(wh.totalAvailableKg.toFixed(2)),
      totalReservedKg: Number(wh.totalReservedKg.toFixed(2)),
      materialsCount: wh.materialsMap.size,
      materials: Array.from(wh.materialsMap.values()).map((m: any) => ({
        ...m,
        quantityOnHand: Number(m.quantityOnHand.toFixed(2)),
        quantityAvailable: Number(m.quantityAvailable.toFixed(2)),
        quantityReserved: Number(m.quantityReserved.toFixed(2)),
      })),
    }));

    const materialBalances = Array.from(materialMap.values()).map((m) => ({
      materialId: m.materialId,
      materialCode: m.materialCode,
      materialName: m.materialName,
      category: m.category,
      hsnCode: m.hsnCode,
      unit: m.unit,
      quantityOnHand: Number(m.quantityOnHand.toFixed(2)),
      quantityAvailable: Number(m.quantityAvailable.toFixed(2)),
      quantityReserved: Number(m.quantityReserved.toFixed(2)),
      warehouses: Array.from(m.warehousesMap.values()).map((w: any) => ({
        ...w,
        quantityOnHand: Number(w.quantityOnHand.toFixed(2)),
        quantityAvailable: Number(w.quantityAvailable.toFixed(2)),
        quantityReserved: Number(w.quantityReserved.toFixed(2)),
      })),
      lots: m.lots,
    }));

    // 2. Customer Returnable Drums in Plant
    const drums = await DrumModel.find({ customerId: objectId })
      .populate('currentProductId', 'code name')
      .sort({ updatedAt: -1 });

    const drumSummary = {
      totalReceived: drums.length,
      availableEmpty: drums.filter((d) => d.status === 'AVAILABLE').length,
      packed: drums.filter((d) => (d.status as string) === 'PACKED' || (d.status as string) === 'FILLED').length,
      dispatched: drums.filter((d) => d.status === 'DISPATCHED').length,
      damaged: drums.filter((d) => d.status === 'DAMAGED').length,
    };

    // 3. Inbound Delivery Challans (Raw Materials & Drums received from this Customer)
    const rawInboundChallans = await InboundChallanModel.find({ customerId: objectId })
      .populate('warehouseId', 'code name')
      .sort({ customerChallanDate: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const challanIds = rawInboundChallans.map((ic) => ic._id);
    const challanLines = await InboundChallanLineModel.find({
      inboundChallanId: { $in: challanIds },
    })
      .populate('materialId', 'code name baseUnit')
      .lean();

    const linesByChallan = challanLines.reduce((acc: Record<string, any[]>, line) => {
      const cid = line.inboundChallanId.toString();
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push({
        materialId: line.materialId,
        materialName: (line.materialId as any)?.name,
        quantityReceived: line.receivedQuantity,
        declaredQuantity: line.declaredQuantity,
        unit: line.unit,
        lotId: line.lotId,
        supplierLotNumber: line.supplierLotNumber,
      });
      return acc;
    }, {});

    const inboundChallans = rawInboundChallans.map((ic) => ({
      ...ic,
      lines: linesByChallan[ic._id.toString()] || [],
    }));

    // 4. Outbound Delivery Challans sent to this Customer
    const outboundChallans = await OutboundChallanModel.find({ customerId: objectId })
      .populate('workOrderId', 'workOrderNumber')
      .populate('packingListId', 'packingListNumber invoiceNumber')
      .sort({ challanDate: -1, createdAt: -1 })
      .limit(50);

    // 5. Total Material Stock KG & Value
    const totalStockKg = materialBalances.reduce((acc, curr) => acc + (curr.quantityOnHand || 0), 0);
    const totalAvailableKg = materialBalances.reduce(
      (acc, curr) => acc + (curr.quantityAvailable || 0),
      0,
    );
    const totalReservedKg = materialBalances.reduce(
      (acc, curr) => acc + (curr.quantityReserved || 0),
      0,
    );

    return {
      customer: {
        _id: customer._id,
        code: customer.code,
        name: customer.name,
        legalName: customer.legalName,
        gstin: customer.gstin,
        pan: customer.pan,
        billingAddress: customer.billingAddress,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
      },
      summary: {
        totalStockKg: Number(totalStockKg.toFixed(2)),
        totalAvailableKg: Number(totalAvailableKg.toFixed(2)),
        totalReservedKg: Number(totalReservedKg.toFixed(2)),
        totalMaterialsCount: materialBalances.length,
        warehouseCount: warehouseBreakdown.length,
        drumSummary,
        inboundChallanCount: inboundChallans.length,
        outboundChallanCount: outboundChallans.length,
      },
      rawMaterialStock,
      warehouseBreakdown,
      materialBalances,
      drums,
      inboundChallans,
      outboundChallans,
    };
  }
}

export const customersService = new CustomersService();
