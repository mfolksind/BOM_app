import { Request, Response, NextFunction } from 'express';
import { workOrdersService } from './work-orders.service';

export class WorkOrdersController {
  async createWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.createWorkOrder(req.body, req.user?._id?.toString());
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Work order created successfully in DRAFT status',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listWorkOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.listWorkOrders(req.query as never);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work orders retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getWorkOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.getWorkOrderById(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.updateWorkOrder(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async confirmWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.confirmWorkOrder(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order confirmed and BOM snapshot captured successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async holdWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.holdWorkOrder(
        req.params.id,
        req.body.reason,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order put on hold',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async resumeWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.resumeWorkOrder(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order resumed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.cancelWorkOrder(
        req.params.id,
        req.body.reason,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order cancelled and reservations released successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMaterialRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.getMaterialRequirements(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order material requirements calculated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMaterialAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.getMaterialAvailability(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order material availability checked successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async previewMaterialAvailability(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await workOrdersService.previewMaterialAvailability(req.body);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'BOM material availability preview calculated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async reserveMaterials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.reserveMaterials(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order materials reserved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async releaseReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.releaseReservations(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order reservations released successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCompletionSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.getCompletionSummary(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order completion summary retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.completeWorkOrder(
        req.params.id,
        req.body?.force,
        req.body?.remarks,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order completed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const workOrdersController = new WorkOrdersController();
