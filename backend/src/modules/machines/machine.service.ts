import mongoose from 'mongoose';
import { MachineModel, IMachine, MachineStatus } from './machine.model';
import { NotFoundError, ConflictError } from '../../common/errors';

export class MachineService {
  async createMachine(dto: {
    code: string;
    name: string;
    processStageIds?: string[];
    machineType?: string;
    status?: MachineStatus;
    capacityPerShift?: number;
    speedMetersPerMinute?: number;
    location?: string;
    specifications?: Record<string, unknown>;
    isActive?: boolean;
  }): Promise<IMachine> {
    const existing = await MachineModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Machine with code '${dto.code}' already exists`);
    }

    const machine = await MachineModel.create({
      code: dto.code.toUpperCase(),
      name: dto.name,
      processStageIds: dto.processStageIds?.map((id) => new mongoose.Types.ObjectId(id)) || [],
      machineType: dto.machineType,
      status: dto.status || 'AVAILABLE',
      capacityPerShift: dto.capacityPerShift,
      speedMetersPerMinute: dto.speedMetersPerMinute,
      location: dto.location,
      specifications: dto.specifications || {},
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return machine;
  }

  async listMachines(filter: {
    page: number;
    limit: number;
    processStageId?: string;
    status?: string;
    machineType?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const query: Record<string, unknown> = {};

    if (filter.processStageId) {
      query.processStageIds = new mongoose.Types.ObjectId(filter.processStageId);
    }
    if (filter.status) query.status = filter.status;
    if (filter.machineType) query.machineType = filter.machineType;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.search) {
      query.$or = [
        { code: new RegExp(filter.search, 'i') },
        { name: new RegExp(filter.search, 'i') },
        { machineType: new RegExp(filter.search, 'i') },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;
    const [machines, total] = await Promise.all([
      MachineModel.find(query)
        .populate('processStageIds', 'code name sequenceOrder category')
        .sort({ code: 1 })
        .skip(skip)
        .limit(filter.limit)
        .lean(),
      MachineModel.countDocuments(query),
    ]);

    return {
      machines,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit) || 1,
      },
    };
  }

  async getMachineById(id: string): Promise<IMachine> {
    const machine = await MachineModel.findById(id).populate(
      'processStageIds',
      'code name sequenceOrder category',
    );
    if (!machine) throw new NotFoundError(`Machine with ID '${id}' not found`);
    return machine;
  }

  async updateMachine(
    id: string,
    dto: Partial<{
      name: string;
      processStageIds: string[];
      machineType: string;
      status: MachineStatus;
      capacityPerShift: number;
      speedMetersPerMinute: number;
      location: string;
      specifications: Record<string, unknown>;
      isActive: boolean;
    }>,
  ): Promise<IMachine> {
    const machine = await MachineModel.findById(id);
    if (!machine) throw new NotFoundError(`Machine with ID '${id}' not found`);

    if (dto.name !== undefined) machine.name = dto.name;
    if (dto.processStageIds !== undefined) {
      machine.processStageIds = dto.processStageIds.map((pid) => new mongoose.Types.ObjectId(pid));
    }
    if (dto.machineType !== undefined) machine.machineType = dto.machineType;
    if (dto.status !== undefined) machine.status = dto.status;
    if (dto.capacityPerShift !== undefined) machine.capacityPerShift = dto.capacityPerShift;
    if (dto.speedMetersPerMinute !== undefined)
      machine.speedMetersPerMinute = dto.speedMetersPerMinute;
    if (dto.location !== undefined) machine.location = dto.location;
    if (dto.specifications !== undefined) machine.specifications = dto.specifications;
    if (dto.isActive !== undefined) machine.isActive = dto.isActive;

    await machine.save();
    return machine;
  }
}

export const machineService = new MachineService();
