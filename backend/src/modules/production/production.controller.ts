import { Request, Response, NextFunction } from 'express';
import { productionService } from './production.service';

export class ProductionController {
  // ==========================================
  // PRODUCTION ORDERS
  // ==========================================

  async createProductionOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.createProductionOrder(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Production order created successfully in RELEASED status',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listProductionOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listProductionOrders(req.query as never);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production orders retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductionOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.getProductionOrderById(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production order retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async startProductionOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.startProductionOrder(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production order started successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeProductionOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.completeProductionOrder(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production order completed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PRODUCTION BATCHES
  // ==========================================

  async createProductionBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.createProductionBatch(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Production batch created successfully in IN_PROCESS status',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductionBatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.getProductionBatchById(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production batch retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProductionBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.updateProductionBatch(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production batch updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listProductionBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listProductionBatches(req.query as never);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production batches retrieved successfully',
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async passBatchTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.passBatchTest(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async failBatchTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.failBatchTest(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async reverseBatchWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.reverseBatchWork(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production batch work reversed and machine released successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // MATERIAL ISSUES
  // ==========================================

  async createMaterialIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.createMaterialIssue(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Material issue draft created successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listMaterialIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listMaterialIssues(req.query as never);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Material issues retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMaterialIssueById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.getMaterialIssueById(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Material issue retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async postMaterialIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || undefined;
      const result = await productionService.postMaterialIssue(
        req.params.id,
        idempotencyKey,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Material issue posted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // ACTUAL MATERIAL CONSUMPTION
  // ==========================================

  async recordConsumption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.recordConsumption(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Actual material consumption posted successfully to stock ledger and WIP',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listConsumptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listConsumptions(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Material consumptions retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordBatchConsumption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.recordBatchConsumption(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Bulk material consumption posted successfully to stock ledger and WIP',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // UNUSED MATERIAL RETURNS
  // ==========================================

  async recordMaterialReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.recordMaterialReturn(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Unused material return posted successfully to stock ledger and store',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listMaterialReturns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listMaterialReturns(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Material returns retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PRODUCTION OUTPUT
  // ==========================================

  async createProductionOutput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.createProductionOutput(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Production output draft recorded successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listProductionOutputs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listProductionOutputs(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production outputs retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductionOutputById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.getProductionOutputById(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production output retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async postProductionOutput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.postProductionOutput(
        req.params.id,
        req.user?._id?.toString(),
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production output posted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SCRAP RECORD
  // ==========================================

  async recordScrap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.recordScrap(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Scrap record posted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listScrapRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productionService.listScrapRecords(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Scrap records retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async calculateAndRecordAutoScrap(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await productionService.calculateAndRecordAutoScrap(
        req.params.id,
        req.body,
        req.user?._id?.toString(),
      );
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Auto-calculated scrap records posted successfully based on BOM constants',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // RECONCILIATIONS
  // ==========================================

  async getCustomerMaterialReconciliation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await productionService.getCustomerMaterialReconciliation(
        req.params.customerId,
        req.query as never,
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Customer material reconciliation report generated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getWorkOrderMaterialReconciliation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await productionService.getWorkOrderMaterialReconciliation(req.params.id);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Work order material reconciliation report generated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductionBatchMaterialReconciliation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await productionService.getProductionBatchMaterialReconciliation(
        req.params.id,
      );
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Production batch material reconciliation report generated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const productionController = new ProductionController();
