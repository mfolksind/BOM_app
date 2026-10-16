import mongoose from 'mongoose';
import { CustomerModel, ICustomer } from './customer.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { InboundChallanModel } from '../inventory/inbound-challan.model';
import { MaterialLotModel } from '../materials/material-lot.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { OutboundChallanModel } from '../dispatch/outbound-challan.model';
import { DispatchModel } from '../dispatch/dispatch.model';
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
}

export const customersService = new CustomersService();
