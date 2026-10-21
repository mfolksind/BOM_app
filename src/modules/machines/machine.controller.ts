import { Request, Response, NextFunction } from 'express';
import { machineService } from './machine.service';

export class MachineController {
  async createMachine(req: Request, res: Response, next: NextFunction) {
    try {
      const machine = await machineService.createMachine(req.body);
      res.status(201).json({
        success: true,
        message: 'Machine registered successfully',
        data: machine,
      });
    } catch (err) {
      next(err);
    }
  }

  async listMachines(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, processStageId, status, machineType, search, isActive } =
        req.query as Record<string, string>;
      const result = await machineService.listMachines({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        processStageId,
        status,
        machineType,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      res.json({
        success: true,
        data: result.machines,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMachineById(req: Request, res: Response, next: NextFunction) {
    try {
      const machine = await machineService.getMachineById(req.params.id);
      res.json({
        success: true,
        data: machine,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMachine(req: Request, res: Response, next: NextFunction) {
    try {
      const machine = await machineService.updateMachine(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Machine updated successfully',
        data: machine,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const machineController = new MachineController();
