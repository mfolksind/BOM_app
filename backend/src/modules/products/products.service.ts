import mongoose from 'mongoose';
import { ProductModel, IProduct } from './product.model';
import { CustomerModel } from '../customers/customer.model';
import { BomVersionModel } from '../bom/bom-version.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { ProductionOrderModel } from '../production/production-order.model';
import { DispatchLineModel } from '../dispatch/dispatch-line.model';
import { AuditLogModel } from '../shared/audit-log.model';
import {
  CreateProductInput,
  UpdateProductInput,
  UpdateProductStatusInput,
  ProductQueryParams,
} from './products.validation';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { PaginatedResult } from '../../common/types';

export class ProductsService {
  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid product ID format: '${id}'`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create a new cable product master record.
   * Note: Never stores stock balance on Product document.
   */
  async createProduct(
    input: CreateProductInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IProduct> {
    const existing = await ProductModel.findOne({ code: input.code });
    if (existing) {
      throw new ConflictError(`Product with code '${input.code}' already exists`);
    }

    if (input.customerId) {
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) {
        throw new NotFoundError(`Referenced Customer with ID '${input.customerId}' not found`);
      }
    }

    const product = await ProductModel.create(input);

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'Product',
      entityId: product._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        code: product.code,
        name: product.name,
        cableCategory: product.cableCategory,
        voltageGrade: product.voltageGrade,
        coreCount: product.coreCount,
        crossSectionSqMm: product.crossSectionSqMm,
      },
    });

    return product;
  }

  /**
   * List products with pagination, search, category, voltage, and customer filtering.
   */
  async listProducts(params: ProductQueryParams): Promise<PaginatedResult<IProduct>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.cableCategory) filter.cableCategory = params.cableCategory;
    if (params.voltageGrade) filter.voltageGrade = params.voltageGrade;
    if (params.conductorMaterial) filter.conductorMaterial = params.conductorMaterial;
    if (params.customerId) filter.customerId = new mongoose.Types.ObjectId(params.customerId);
    if (params.isActive !== undefined) filter.isActive = params.isActive;

    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { standardSpecification: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      ProductModel.find(filter)
        .populate('customerId', 'name code')
        .populate('defaultBomVersionId', 'bomNumber versionNumber status')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(filter),
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
   * Get product details by ID, populated with references.
   */
  async getProductById(id: string): Promise<IProduct> {
    const objectId = this.validateId(id);
    const product = await ProductModel.findById(objectId)
      .populate('customerId', 'name code email phone')
      .populate('defaultBomVersionId', 'bomNumber versionNumber status effectiveFrom');

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    return product;
  }

  /**
   * Update permitted details of an existing product.
   */
  async updateProduct(
    id: string,
    input: UpdateProductInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IProduct> {
    const objectId = this.validateId(id);
    const product = await ProductModel.findById(objectId);

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    if (input.customerId) {
      const customer = await CustomerModel.findById(input.customerId);
      if (!customer) {
        throw new NotFoundError(`Referenced Customer with ID '${input.customerId}' not found`);
      }
    }

    const oldValues = product.toObject();

    Object.assign(product, input);
    await product.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Product',
      entityId: product._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues,
      newValues: input,
    });

    return product;
  }

  /**
   * Deactivate or reactivate a product.
   */
  async updateProductStatus(
    id: string,
    input: UpdateProductStatusInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IProduct> {
    const objectId = this.validateId(id);
    const product = await ProductModel.findById(objectId);

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    const oldStatus = product.isActive;
    product.isActive = input.isActive;
    await product.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Product',
      entityId: product._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: product.isActive, reason: input.reason },
    });

    return product;
  }

  /**
   * Delete a product only if no BOM versions, work orders, production orders, or dispatches reference it.
   */
  async deleteProduct(id: string, performedByUserId: string, ipAddress?: string): Promise<void> {
    const objectId = this.validateId(id);
    const product = await ProductModel.findById(objectId);

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    const [bomVersionsCount, workOrdersCount, productionOrdersCount, dispatchCount] =
      await Promise.all([
        BomVersionModel.countDocuments({ productId: objectId }),
        WorkOrderModel.countDocuments({ productId: objectId }),
        ProductionOrderModel.countDocuments({ productId: objectId }),
        DispatchLineModel.countDocuments({ productId: objectId }),
      ]);

    const totalRefs = bomVersionsCount + workOrdersCount + productionOrdersCount + dispatchCount;

    if (totalRefs > 0) {
      throw new BadRequestError(
        `Cannot permanently delete product '${product.name}' (${product.code}) because it is referenced by ${totalRefs} existing ERP record(s) (BOM Versions: ${bomVersionsCount}, Work Orders: ${workOrdersCount}, Production Orders: ${productionOrdersCount}, Dispatches: ${dispatchCount}). Please deactivate the product instead.`,
      );
    }

    await ProductModel.findByIdAndDelete(objectId);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'Product',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: {
        code: product.code,
        name: product.name,
      },
    });
  }
}

export const productsService = new ProductsService();
