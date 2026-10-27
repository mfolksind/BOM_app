import mongoose from 'mongoose';
import { ProcessStageModel, IProcessStage } from '../shared/process-stage.model';
import { BomItemModel } from '../bom/bom-item.model';
import { ProductionBatchModel } from '../production/production-batch.model';
import { ProductionOutputModel } from '../production/production-output.model';
import { AuditLogModel } from '../shared/audit-log.model';
import {
  CreateProcessStageInput,
  UpdateProcessStageInput,
  UpdateProcessStageStatusInput,
  ProcessStageQueryParams,
} from './process-stages.validation';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { PaginatedResult } from '../../common/types';

export class ProcessStagesService {
  private validateId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid process stage ID format: '${id}'`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create a new manufacturing process stage.
   */
  async createProcessStage(
    input: CreateProcessStageInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IProcessStage> {
    const existing = await ProcessStageModel.findOne({ code: input.code });
    if (existing) {
      throw new ConflictError(`Process stage with code '${input.code}' already exists`);
    }

    const stage = await ProcessStageModel.create(input);

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'ProcessStage',
      entityId: stage._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      newValues: {
        code: stage.code,
        name: stage.name,
        sequenceOrder: stage.sequenceOrder,
      },
    });

    return stage;
  }

  /**
   * List process stages sorted by sequence order.
   */
  async listProcessStages(
    params: ProcessStageQueryParams,
  ): Promise<PaginatedResult<IProcessStage>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.category) filter.category = params.category;
    if (params.isActive !== undefined) filter.isActive = params.isActive;

    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      filter.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      ProcessStageModel.find(filter).sort({ sequenceOrder: 1, name: 1 }).skip(skip).limit(limit),
      ProcessStageModel.countDocuments(filter),
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
   * Get process stage details by ID.
   */
  async getProcessStageById(id: string): Promise<IProcessStage> {
    const objectId = this.validateId(id);
    const stage = await ProcessStageModel.findById(objectId);

    if (!stage) {
      throw new NotFoundError(`Process stage with ID '${id}' not found`);
    }

    return stage;
  }

  /**
   * Update permitted details of a process stage.
   */
  async updateProcessStage(
    id: string,
    input: UpdateProcessStageInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IProcessStage> {
    const objectId = this.validateId(id);
    const stage = await ProcessStageModel.findById(objectId);

    if (!stage) {
      throw new NotFoundError(`Process stage with ID '${id}' not found`);
    }

    const oldValues = stage.toObject();

    Object.assign(stage, input);
    await stage.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'ProcessStage',
      entityId: stage._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues,
      newValues: input,
    });

    return stage;
  }

  /**
   * Deactivate or reactivate a process stage.
   * Prevents deactivation if the stage is currently scheduled or running in active batches.
   */
  async updateProcessStageStatus(
    id: string,
    input: UpdateProcessStageStatusInput,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<IProcessStage> {
    const objectId = this.validateId(id);
    const stage = await ProcessStageModel.findById(objectId);

    if (!stage) {
      throw new NotFoundError(`Process stage with ID '${id}' not found`);
    }

    if (!input.isActive) {
      const activeBatchesCount = await ProductionBatchModel.countDocuments({
        stageId: objectId,
        status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
      });

      if (activeBatchesCount > 0) {
        throw new BadRequestError(
          `Cannot deactivate stage '${stage.name}' (${stage.code}) because it has ${activeBatchesCount} active or in-progress manufacturing batch(es). Complete or cancel batches before deactivating.`,
        );
      }
    }

    const oldStatus = stage.isActive;
    stage.isActive = input.isActive;
    await stage.save();

    await AuditLogModel.create({
      action: 'UPDATE',
      entityType: 'ProcessStage',
      entityId: stage._id,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: stage.isActive, reason: input.reason },
    });

    return stage;
  }

  /**
   * Delete a process stage only when safe.
   */
  async deleteProcessStage(
    id: string,
    performedByUserId: string,
    ipAddress?: string,
  ): Promise<void> {
    const objectId = this.validateId(id);
    const stage = await ProcessStageModel.findById(objectId);

    if (!stage) {
      throw new NotFoundError(`Process stage with ID '${id}' not found`);
    }

    const [bomItemsCount, batchesCount, outputsCount] = await Promise.all([
      BomItemModel.countDocuments({ processStageId: objectId }),
      ProductionBatchModel.countDocuments({ stageId: objectId }),
      ProductionOutputModel.countDocuments({ stageId: objectId }),
    ]);

    const totalRefs = bomItemsCount + batchesCount + outputsCount;
    if (totalRefs > 0) {
      throw new BadRequestError(
        `Cannot permanently delete stage '${stage.name}' (${stage.code}) because it is referenced by ${totalRefs} manufacturing record(s) (BOM Items: ${bomItemsCount}, Production Batches: ${batchesCount}, Output Logs: ${outputsCount}). Please deactivate the stage instead.`,
      );
    }

    await ProcessStageModel.findByIdAndDelete(objectId);

    await AuditLogModel.create({
      action: 'DELETE',
      entityType: 'ProcessStage',
      entityId: objectId,
      performedBy: new mongoose.Types.ObjectId(performedByUserId),
      ipAddress,
      oldValues: {
        code: stage.code,
        name: stage.name,
      },
    });
  }
}

export const processStagesService = new ProcessStagesService();
