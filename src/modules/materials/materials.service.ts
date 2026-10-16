import mongoose from 'mongoose';
import { MaterialModel, IMaterial } from './material.model';
import { BomItemModel } from '../bom/bom-item.model';
import { MaterialLotModel } from './material-lot.model';
import { InboundChallanLineModel } from '../inventory/inbound-challan-line.model';
import { MaterialIssueLineModel } from '../production/material-issue-line.model';
import { InventoryBalanceModel } from '../inventory/inventory-balance.model';
import { InventoryTransactionModel } from '../inventory/inventory-transaction.model';
import { AuditLogModel } from '../shared/audit-log.model';
import {
  CreateMaterialInput,
  UpdateMaterialInput,
  UpdateMaterialStatusInput,
  MaterialQueryParams,
} from './materials.validation';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { PaginatedResult } from '../../common/types';

export class MaterialsService {
  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid material ID format: '${id}'`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create a new master material identity.
   * Note: Never stores current available stock directly on the Material document.
   */
  async createMaterial(
    input: CreateMaterialInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IMaterial> {
    const existing = await MaterialModel.findOne({ code: input.code });
    if (existing) {
      throw new ConflictError(`Material with code '${input.code}' already exists`);
    }

    const material = await MaterialModel.create(input);

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'Material',
      entityId: material._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        code: material.code,
        name: material.name,
        category: material.category,
        baseUnit: material.baseUnit,
      },
    });

    return material;
  }

  /**
   * List materials with pagination, search, category, and status filtering.
   */
  async listMaterials(params: MaterialQueryParams): Promise<PaginatedResult<IMaterial>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.category) {
      filter.category = params.category;
    }

    if (params.isActive !== undefined) {
      filter.isActive = params.isActive;
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { sku: searchRegex },
        { altName: searchRegex },
        { description: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      MaterialModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      MaterialModel.countDocuments(filter),
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
   * Get single material by ID.
   */
  async getMaterialById(id: string): Promise<IMaterial> {
    const objectId = this.validateId(id);
    const material = await MaterialModel.findById(objectId);

    if (!material) {
      throw new NotFoundError(`Material with ID '${id}' not found`);
    }

    return material;
  }

  /**
   * Update permitted details of a material. Code cannot be modified.
   */
  async updateMaterial(
    id: string,
    input: UpdateMaterialInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IMaterial> {
    const objectId = this.validateId(id);
    const material = await MaterialModel.findById(objectId);

    if (!material) {
      throw new NotFoundError(`Material with ID '${id}' not found`);
    }

    const oldValues = material.toObject();

    Object.assign(material, input);
    await material.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Material',
      entityId: material._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues,
      newValues: input,
    });

    return material;
  }

  /**
   * Deactivate or reactivate a material.
   */
  async updateMaterialStatus(
    id: string,
    input: UpdateMaterialStatusInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IMaterial> {
    const objectId = this.validateId(id);
    const material = await MaterialModel.findById(objectId);

    if (!material) {
      throw new NotFoundError(`Material with ID '${id}' not found`);
    }

    const oldStatus = material.isActive;
    material.isActive = input.isActive;
    await material.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'Material',
      entityId: material._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: material.isActive, reason: input.reason },
    });

    return material;
  }

  /**
   * Delete a material only when safe (no BOM items, lots, challans, or ledger references).
   */
  async deleteMaterial(id: string, performedByUserId: string, ipAddress?: string): Promise<void> {
    const objectId = this.validateId(id);
    const material = await MaterialModel.findById(objectId);

    if (!material) {
      throw new NotFoundError(`Material with ID '${id}' not found`);
    }

    const [
      bomItemsCount,
      lotsCount,
      challanLinesCount,
      issueLinesCount,
      balanceCount,
      ledgerCount,
    ] = await Promise.all([
      BomItemModel.countDocuments({ materialId: objectId }),
      MaterialLotModel.countDocuments({ materialId: objectId }),
      InboundChallanLineModel.countDocuments({ materialId: objectId }),
      MaterialIssueLineModel.countDocuments({ materialId: objectId }),
      InventoryBalanceModel.countDocuments({ materialId: objectId }),
      InventoryTransactionModel.countDocuments({ materialId: objectId }),
    ]);

    const totalRefs =
      bomItemsCount + lotsCount + challanLinesCount + issueLinesCount + balanceCount + ledgerCount;

    if (totalRefs > 0) {
      throw new BadRequestError(
        `Cannot permanently delete material '${material.name}' (${material.code}) because it is referenced by ${totalRefs} existing ERP record(s) (BOM Items: ${bomItemsCount}, Material Lots: ${lotsCount}, Inbound Challans: ${challanLinesCount}, Material Issues: ${issueLinesCount}, Inventory Balances: ${balanceCount}, Transactions: ${ledgerCount}). Please deactivate the material instead to maintain historical integrity.`,
      );
    }

    await MaterialModel.findByIdAndDelete(objectId);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'Material',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: {
        code: material.code,
        name: material.name,
      },
    });
  }
}

export const materialsService = new MaterialsService();
