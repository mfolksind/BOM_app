import mongoose from 'mongoose';
import { BomVersionModel, IBomVersion } from './bom-version.model';
import { BomItemModel, IBomItem } from './bom-item.model';
import { ProductModel } from '../products/product.model';
import { MaterialModel } from '../materials/material.model';
import { ProcessStageModel } from '../shared/process-stage.model';
import { WorkOrderModel } from '../work-orders/work-order.model';
import { ProductionOrderModel } from '../production/production-order.model';
import { AuditLogModel } from '../shared/audit-log.model';
import { CreateBomInput, UpdateBomInput, BomQueryParams, BomItemInput } from './bom.validation';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { PaginatedResult } from '../../common/types';

export interface BomDetails {
  version: IBomVersion;
  items: IBomItem[];
}

export class BomService {
  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid BOM ID format: '${id}'`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Validate material uniqueness and existence for BOM items.
   */
  private async validateItems(items: BomItemInput[]): Promise<void> {
    const materialIds = items.map((i) => i.materialId);
    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      throw new BadRequestError(
        'Duplicate materials found in BOM items. Each material must appear only once per BOM version.',
      );
    }

    const materialCount = await MaterialModel.countDocuments({
      _id: { $in: Array.from(uniqueIds).map((id) => new mongoose.Types.ObjectId(id)) },
    });

    if (materialCount !== uniqueIds.size) {
      throw new NotFoundError('One or more referenced materials do not exist');
    }

    // Validate optional process stages
    const stageIds = items.map((i) => i.processStageId).filter((id): id is string => Boolean(id));

    if (stageIds.length > 0) {
      const uniqueStageIds = Array.from(new Set(stageIds));
      const stageCount = await ProcessStageModel.countDocuments({
        _id: { $in: uniqueStageIds.map((id) => new mongoose.Types.ObjectId(id)) },
      });
      if (stageCount !== uniqueStageIds.length) {
        throw new NotFoundError('One or more referenced process stages do not exist');
      }
    }
  }

  /**
   * Create a new BOM version with item lines.
   */
  async createBom(
    input: CreateBomInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<BomDetails> {
    const productObjectId = this.validateId(input.productId);
    const product = await ProductModel.findById(productObjectId);

    if (!product) {
      throw new NotFoundError(`Referenced Product with ID '${input.productId}' not found`);
    }

    // Auto-compute version number if omitted
    let versionNumber = input.versionNumber;
    if (!versionNumber) {
      const latest = await BomVersionModel.findOne({ productId: productObjectId }).sort({
        versionNumber: -1,
      });
      versionNumber = latest ? latest.versionNumber + 1 : 1;
    }

    // Auto-generate unique BOM number if omitted
    const bomNumber = input.bomNumber || `BOM-${product.code}-V${versionNumber}`.toUpperCase();

    const existingBom = await BomVersionModel.findOne({ bomNumber });
    if (existingBom) {
      throw new ConflictError(`BOM with number '${bomNumber}' already exists`);
    }

    const existingVersion = await BomVersionModel.findOne({
      productId: productObjectId,
      versionNumber,
    });
    if (existingVersion) {
      throw new ConflictError(
        `Version ${versionNumber} already exists for product '${product.code}'`,
      );
    }

    await this.validateItems(input.items);

    const bomVersion = await BomVersionModel.create({
      bomNumber,
      productId: productObjectId,
      versionNumber,
      status: 'DRAFT',
      effectiveFrom: input.effectiveFrom || new Date(),
      batchSize: input.batchSize,
      outputUnit: input.outputUnit || product.baseUnit,
      notes: input.notes,
    });

    const itemsToCreate = input.items.map((item) => ({
      bomVersionId: bomVersion._id,
      materialId: new mongoose.Types.ObjectId(item.materialId),
      processStageId: item.processStageId
        ? new mongoose.Types.ObjectId(item.processStageId)
        : undefined,
      quantityPerUnit: item.quantityPerUnit,
      scrapTolerancePercentage: item.scrapTolerancePercentage,
      isMandatory: item.isMandatory ?? true,
      stageSequence: item.stageSequence ?? 1,
      notes: item.notes,
    }));

    const createdItems = await BomItemModel.insertMany(itemsToCreate);

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'BomVersion',
      entityId: bomVersion._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        bomNumber: bomVersion.bomNumber,
        productId: bomVersion.productId,
        versionNumber: bomVersion.versionNumber,
        itemCount: createdItems.length,
      },
    });

    return {
      version: bomVersion,
      items: createdItems as unknown as IBomItem[],
    };
  }

  /**
   * List BOM versions with pagination, product filter, and status filter.
   */
  async listBoms(params: BomQueryParams): Promise<PaginatedResult<IBomVersion>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.productId) {
      filter.productId = new mongoose.Types.ObjectId(params.productId);
    }

    if (params.status) {
      filter.status = params.status;
    }

    const [items, total] = await Promise.all([
      BomVersionModel.find(filter)
        .populate('productId', 'code name cableCategory')
        .populate('approvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BomVersionModel.countDocuments(filter),
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
   * Get complete BOM version details along with populated material items.
   */
  async getBomById(id: string): Promise<BomDetails> {
    const objectId = this.validateId(id);
    const version = await BomVersionModel.findById(objectId)
      .populate('productId', 'code name cableCategory baseUnit')
      .populate('approvedBy', 'firstName lastName email');

    if (!version) {
      throw new NotFoundError(`BOM version with ID '${id}' not found`);
    }

    const items = await BomItemModel.find({ bomVersionId: objectId })
      .populate('materialId', 'code name category baseUnit standardRate')
      .populate('processStageId', 'code name sequenceOrder')
      .sort({ stageSequence: 1, _id: 1 });

    return {
      version,
      items,
    };
  }

  /**
   * Update draft BOM version or its items.
   * Active and archived versions are locked against modifications.
   */
  async updateBom(
    id: string,
    input: UpdateBomInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<BomDetails> {
    const objectId = this.validateId(id);
    const version = await BomVersionModel.findById(objectId);

    if (!version) {
      throw new NotFoundError(`BOM version with ID '${id}' not found`);
    }

    if (version.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot edit BOM version '${version.bomNumber}' because its status is '${version.status}'. Only DRAFT BOMs can be edited to prevent altering historical production records. Please create a new version instead.`,
      );
    }

    if (input.batchSize !== undefined) version.batchSize = input.batchSize;
    if (input.outputUnit !== undefined) version.outputUnit = input.outputUnit;
    if (input.notes !== undefined) version.notes = input.notes;

    await version.save();

    let items: IBomItem[] = [];

    if (input.items) {
      await this.validateItems(input.items);

      await BomItemModel.deleteMany({ bomVersionId: objectId });

      const itemsToCreate = input.items.map((item) => ({
        bomVersionId: objectId,
        materialId: new mongoose.Types.ObjectId(item.materialId),
        processStageId: item.processStageId
          ? new mongoose.Types.ObjectId(item.processStageId)
          : undefined,
        quantityPerUnit: item.quantityPerUnit,
        scrapTolerancePercentage: item.scrapTolerancePercentage,
        isMandatory: item.isMandatory ?? true,
        stageSequence: item.stageSequence ?? 1,
        notes: item.notes,
      }));

      items = (await BomItemModel.insertMany(itemsToCreate)) as unknown as IBomItem[];
    } else {
      items = await BomItemModel.find({ bomVersionId: objectId });
    }

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'BomVersion',
      entityId: version._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        batchSize: version.batchSize,
        itemCount: items.length,
      },
    });

    return { version, items };
  }

  /**
   * Activate a BOM version.
   * Business rule: Only one BOM version per product can be ACTIVE.
   * Any previously ACTIVE BOM version is superseded/archived.
   */
  async activateBom(
    id: string,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<BomDetails> {
    const objectId = this.validateId(id);
    const version = await BomVersionModel.findById(objectId);

    if (!version) {
      throw new NotFoundError(`BOM version with ID '${id}' not found`);
    }

    if (version.status === 'ACTIVE') {
      throw new BadRequestError(`BOM version '${version.bomNumber}' is already ACTIVE`);
    }

    const itemsCount = await BomItemModel.countDocuments({ bomVersionId: objectId });
    if (itemsCount === 0) {
      throw new BadRequestError(
        'Cannot activate a BOM version without material items. Add at least one item first.',
      );
    }

    const now = new Date();

    // Supersede any currently active BOM version for the same product
    await BomVersionModel.updateMany(
      {
        productId: version.productId,
        status: 'ACTIVE',
        _id: { $ne: objectId },
      },
      {
        status: 'SUPERSEDED',
        effectiveTo: now,
      },
    );

    version.status = 'ACTIVE';
    version.approvedBy = new mongoose.Types.ObjectId(performedByUserId);
    version.approvedAt = now;
    if (!version.effectiveFrom || version.effectiveFrom > now) {
      version.effectiveFrom = now;
    }
    await version.save();

    // Set as product default BOM version
    await ProductModel.findByIdAndUpdate(version.productId, {
      defaultBomVersionId: version._id,
    });

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'BomVersion',
      entityId: version._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      metadata: { event: 'BOM_ACTIVATION', bomNumber: version.bomNumber },
    });

    return this.getBomById(id);
  }

  /**
   * Archive a BOM version.
   */
  async archiveBom(
    id: string,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IBomVersion> {
    const objectId = this.validateId(id);
    const version = await BomVersionModel.findById(objectId);

    if (!version) {
      throw new NotFoundError(`BOM version with ID '${id}' not found`);
    }

    version.status = 'ARCHIVED';
    version.effectiveTo = new Date();
    await version.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'BomVersion',
      entityId: version._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      metadata: { event: 'BOM_ARCHIVAL', bomNumber: version.bomNumber },
    });

    return version;
  }

  /**
   * Delete a draft BOM version. Active or referenced versions cannot be deleted.
   */
  async deleteBom(id: string, performedByUserId: string, ipAddress?: string): Promise<void> {
    const objectId = this.validateId(id);
    const version = await BomVersionModel.findById(objectId);

    if (!version) {
      throw new NotFoundError(`BOM version with ID '${id}' not found`);
    }

    if (version.status === 'ACTIVE') {
      throw new BadRequestError(
        `Cannot delete ACTIVE BOM version '${version.bomNumber}'. Archive it instead.`,
      );
    }

    const [workOrdersCount, productionOrdersCount] = await Promise.all([
      WorkOrderModel.countDocuments({ bomVersionId: objectId }),
      ProductionOrderModel.countDocuments({ bomVersionId: objectId }),
    ]);

    const totalRefs = workOrdersCount + productionOrdersCount;
    if (totalRefs > 0) {
      throw new BadRequestError(
        `Cannot delete BOM version '${version.bomNumber}' because it is referenced by ${totalRefs} manufacturing record(s) (Work Orders: ${workOrdersCount}, Production Orders: ${productionOrdersCount}). Please archive it instead.`,
      );
    }

    await Promise.all([
      BomItemModel.deleteMany({ bomVersionId: objectId }),
      BomVersionModel.findByIdAndDelete(objectId),
    ]);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'BomVersion',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: { bomNumber: version.bomNumber },
    });
  }
}

export const bomService = new BomService();
