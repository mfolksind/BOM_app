import { Request, Response, NextFunction } from 'express';
import { dispatchService } from './dispatch.service';
import { ApiResponseUtil } from '../../common/utils';
import { DispatchStatus } from './dispatch.model';
import { OutboundChallanStatus } from './outbound-challan.model';

export class DispatchController {
  // ==========================================
  // DISPATCH CRUD & LIFECYCLE
  // ==========================================

  async createDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const dispatch = await dispatchService.createDispatch(req.body, userId);
      ApiResponseUtil.created(res, dispatch, 'Dispatch document created successfully');
    } catch (err) {
      next(err);
    }
  }

  async listDispatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const workOrderId = req.query.workOrderId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const status = req.query.status as DispatchStatus | undefined;
      const search = req.query.search as string | undefined;

      const result = await dispatchService.listDispatches({
        page,
        limit,
        workOrderId,
        customerId,
        status,
        search,
      });

      ApiResponseUtil.success(res, result.dispatches, 'Dispatches retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDispatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dispatch = await dispatchService.getDispatchById(req.params.id);
      ApiResponseUtil.success(res, dispatch, 'Dispatch retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const dispatch = await dispatchService.updateDispatch(req.params.id, req.body, userId);
      ApiResponseUtil.success(res, dispatch, 'Dispatch document updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async postDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const idempotencyKey = (req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key']) as string | undefined;
      const dispatch = await dispatchService.postDispatch(req.params.id, userId, idempotencyKey);
      ApiResponseUtil.success(
        res,
        dispatch,
        'Dispatch finalized and posted successfully. Finished goods inventory updated.',
      );
    } catch (err) {
      next(err);
    }
  }

  async cancelDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const dispatch = await dispatchService.cancelDispatch(req.params.id, req.body.reason, userId);
      ApiResponseUtil.success(res, dispatch, 'Dispatch cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // OUTBOUND CHALLAN
  // ==========================================

  async createOutboundChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const { dispatchId, ...dto } = req.body;
      const challan = await dispatchService.generateOutboundChallan(dispatchId, dto, userId);
      ApiResponseUtil.created(res, challan, 'Outbound Delivery Challan generated successfully');
    } catch (err) {
      next(err);
    }
  }

  async generateOutboundChallanFromDispatch(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const challan = await dispatchService.generateOutboundChallan(
        req.params.id,
        req.body || {},
        userId,
      );
      ApiResponseUtil.created(
        res,
        challan,
        'Outbound Delivery Challan generated successfully from Dispatch',
      );
    } catch (err) {
      next(err);
    }
  }

  async listOutboundChallans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const customerId = req.query.customerId as string | undefined;
      const workOrderId = req.query.workOrderId as string | undefined;
      const dispatchId = req.query.dispatchId as string | undefined;
      const status = req.query.status as OutboundChallanStatus | undefined;
      const search = req.query.search as string | undefined;

      const result = await dispatchService.listOutboundChallans({
        page,
        limit,
        customerId,
        workOrderId,
        dispatchId,
        status,
        search,
      });

      ApiResponseUtil.success(
        res,
        result.challans,
        'Outbound challans retrieved successfully',
        200,
        {
          pagination: result.pagination,
        },
      );
    } catch (err) {
      next(err);
    }
  }

  async getOutboundChallanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await dispatchService.getOutboundChallanById(req.params.id);
      ApiResponseUtil.success(res, challan, 'Outbound challan retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getOutboundChallanPrintData(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const printData = await dispatchService.getOutboundChallanPrintData(req.params.id);
      ApiResponseUtil.success(res, printData, 'Outbound challan print data retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getOutboundChallanConsumptionSheet(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const sheet = await dispatchService.getOutboundChallanConsumptionSheet(req.params.id);
      ApiResponseUtil.success(res, sheet, 'Material Consumption Sheet retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async saveOutboundChallanConsumptionSheet(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const saved = await dispatchService.saveOutboundChallanConsumptionSheet(
        req.params.id,
        req.body,
        userId,
      );
      ApiResponseUtil.success(res, saved, 'Material Consumption Sheet saved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // CUSTOMER & ORDER TRACEABILITY
  // ==========================================

  async getCustomerDispatchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.params.customerId || req.params.id;
      const history = await dispatchService.getCustomerDispatchHistory(customerId);
      ApiResponseUtil.success(res, history, 'Customer dispatch history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getWorkOrderPackingSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await dispatchService.getWorkOrderPackingSummary(req.params.id);
      ApiResponseUtil.success(res, summary, 'Work order packing summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getWorkOrderDispatchSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const summary = await dispatchService.getWorkOrderDispatchSummary(req.params.id);
      ApiResponseUtil.success(res, summary, 'Work order dispatch summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const dispatchController = new DispatchController();
