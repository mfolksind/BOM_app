import { MaterialReorderRuleModel } from './material-reorder-rule.model';
import { MaterialModel } from '../materials/material.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { InventoryAuditUtil } from './inventory-audit.util';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';
import {
  CreateMaterialReorderRuleInput,
  UpdateMaterialReorderRuleInput,
  MaterialReorderRuleQueryParams,
} from './material-reorder-rules.validation';

export class MaterialReorderRulesService {
  async createRule(
    input: CreateMaterialReorderRuleInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const material = await MaterialModel.findById(input.materialId);
    if (!material) throw new NotFoundError(`Material with ID '${input.materialId}' not found`);
    if (!material.isActive) throw new BadRequestError(`Material '${material.name}' is inactive`);

    if (input.warehouseId) {
      const warehouse = await WarehouseModel.findById(input.warehouseId);
      if (!warehouse) throw new NotFoundError(`Warehouse with ID '${input.warehouseId}' not found`);
      if (!warehouse.isActive)
        throw new BadRequestError(`Warehouse '${warehouse.name}' is inactive`);
    }

    const existing = await MaterialReorderRuleModel.findOne({
      materialId: input.materialId,
      warehouseId: input.warehouseId || null,
      ownerType: input.ownerType,
    });

    if (existing) {
      throw new ConflictError(
        'A reorder rule already exists for this material, warehouse, and ownership scope',
      );
    }

    const rule = await MaterialReorderRuleModel.create({
      materialId: input.materialId,
      warehouseId: input.warehouseId || null,
      ownerType: input.ownerType,
      minStockLevel: input.minStockLevel,
      maxStockLevel: input.maxStockLevel,
      reorderPoint: input.reorderPoint,
      reorderQuantity: input.reorderQuantity,
      targetQuantity: input.targetQuantity,
      leadTimeDays: input.leadTimeDays,
      isActive: input.isActive,
    });

    await InventoryAuditUtil.record({
      action: 'CREATE',
      entityType: 'MaterialReorderRule',
      entityId: rule._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: input,
    });

    return rule;
  }

  async getById(id: string) {
    const rule = await MaterialReorderRuleModel.findById(id)
      .populate('materialId', 'code name category baseUnit')
      .populate('warehouseId', 'code name');

    if (!rule) {
      throw new NotFoundError(`Material Reorder Rule with ID '${id}' not found`);
    }
    return rule;
  }

  async list(query: MaterialReorderRuleQueryParams) {
    const filter: Record<string, unknown> = {};

    if (query.materialId) filter.materialId = query.materialId;
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      MaterialReorderRuleModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('materialId', 'code name category baseUnit')
        .populate('warehouseId', 'code name')
        .lean(),
      MaterialReorderRuleModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
      hasNext: query.page < Math.ceil(total / query.limit),
      hasPrev: query.page > 1,
    };
  }

  async updateRule(
    id: string,
    input: UpdateMaterialReorderRuleInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const rule = await MaterialReorderRuleModel.findById(id);
    if (!rule) {
      throw new NotFoundError(`Material Reorder Rule with ID '${id}' not found`);
    }

    if (input.minStockLevel !== undefined) rule.minStockLevel = input.minStockLevel;
    if (input.maxStockLevel !== undefined) rule.maxStockLevel = input.maxStockLevel;
    if (input.reorderPoint !== undefined) rule.reorderPoint = input.reorderPoint;
    if (input.reorderQuantity !== undefined) rule.reorderQuantity = input.reorderQuantity;
    if (input.targetQuantity !== undefined) rule.targetQuantity = input.targetQuantity;
    if (input.leadTimeDays !== undefined) rule.leadTimeDays = input.leadTimeDays;
    if (input.isActive !== undefined) rule.isActive = input.isActive;

    await rule.save();

    await InventoryAuditUtil.record({
      action: 'UPDATE',
      entityType: 'MaterialReorderRule',
      entityId: rule._id,
      performedBy: userId,
      ipAddress,
      userAgent,
      newValues: input,
    });

    return rule;
  }

  async deleteRule(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const rule = await MaterialReorderRuleModel.findByIdAndDelete(id);
    if (!rule) {
      throw new NotFoundError(`Material Reorder Rule with ID '${id}' not found`);
    }

    await InventoryAuditUtil.record({
      action: 'DELETE',
      entityType: 'MaterialReorderRule',
      entityId: rule._id,
      performedBy: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Reorder rule deleted successfully' };
  }
}

export const materialReorderRulesService = new MaterialReorderRulesService();
