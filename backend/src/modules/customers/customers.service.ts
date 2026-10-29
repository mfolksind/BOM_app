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
import { ScrapRecordModel } from '../production/scrap-record.model';
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
  async getCustomerStockOverview(id: string) {
    const objectId = this.validateId(id);
    const customer = await CustomerModel.findById(objectId);
    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    // 1. Current Raw Material Stock in Hand
    const rawMaterialStock = await InventoryBalanceModel.find({
      customerId: objectId,
      ownerType: 'CUSTOMER',
    })
      .populate('materialId', 'code name category hsnCode baseUnit standardCost')
      .populate('warehouseId', 'code name type')
      .sort({ updatedAt: -1 });

    // 2. Customer Returnable Drums in Plant
    const drums = await DrumModel.find({ customerId: objectId })
      .populate('currentProductId', 'code name')
      .sort({ updatedAt: -1 });

    const drumSummary = {
      totalReceived: drums.length,
      availableEmpty: drums.filter((d) => d.status === 'AVAILABLE').length,
      packed: drums.filter((d) => d.status === 'PACKED' || d.status === 'IN_USE').length,
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

    // 5. Customer Scrap & Process Waste Records
    const scrapRecords = await ScrapRecordModel.find({ customerId: objectId })
      .populate('materialId', 'code name baseUnit category')
      .populate('workOrderId', 'workOrderNumber')
      .populate('scrapWarehouseId', 'code name')
      .sort({ createdAt: -1 })
      .lean();

    const totalScrapKg = scrapRecords.reduce((acc, curr) => acc + (curr.scrapQuantity || 0), 0);
    const scrapByMaterialMap = new Map<string, { materialName: string; materialCode: string; totalKg: number; unit: string }>();
    for (const s of scrapRecords) {
      const mat = s.materialId as any;
      const key = mat?._id?.toString() || 'unknown';
      const existing = scrapByMaterialMap.get(key) || {
        materialName: mat?.name || 'Unknown Material',
        materialCode: mat?.code || '-',
        totalKg: 0,
        unit: s.unit || 'KG',
      };
      existing.totalKg += s.scrapQuantity || 0;
      scrapByMaterialMap.set(key, existing);
    }
    const scrapMaterialBreakdown = Array.from(scrapByMaterialMap.values()).map((v) => ({
      ...v,
      totalKg: Number(v.totalKg.toFixed(2)),
    }));

    // 6. Total Material Stock KG & Value
    const totalStockKg = rawMaterialStock.reduce((acc, curr) => acc + (curr.quantityOnHand || 0), 0);
    const totalAvailableKg = rawMaterialStock.reduce(
      (acc, curr) => acc + (curr.quantityAvailable || 0),
      0,
    );
    const totalReservedKg = rawMaterialStock.reduce(
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
        totalMaterialsCount: rawMaterialStock.length,
        drumSummary,
        inboundChallanCount: inboundChallans.length,
        outboundChallanCount: outboundChallans.length,
        totalScrapKg: Number(totalScrapKg.toFixed(2)),
        scrapRecordsCount: scrapRecords.length,
      },
      rawMaterialStock,
      drums,
      inboundChallans,
      outboundChallans,
      scrapSummary: {
        totalScrapKg: Number(totalScrapKg.toFixed(2)),
        materialBreakdown: scrapMaterialBreakdown,
      },
      scrapRecords,
    };
  }
}

export const customersService = new CustomersService();
