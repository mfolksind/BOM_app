import { Request, Response, NextFunction } from 'express';
import { packingService } from './packing.service';
import { ApiResponseUtil } from '../../common/utils';
import { DrumStatus, DrumType } from './drum.model';

export class PackingController {
  // Drums
  async createDrum(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const drum = await packingService.createDrum(req.body, userId);
      ApiResponseUtil.created(res, drum, 'Drum registered successfully');
    } catch (err) {
      next(err);
    }
  }

  async listDrums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as DrumStatus | undefined;
      const drumType = req.query.drumType as DrumType | undefined;
      const currentProductId = req.query.currentProductId as string | undefined;
      const workOrderId = req.query.workOrderId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const currentWarehouseId = req.query.currentWarehouseId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await packingService.listDrums({
        page,
        limit,
        status,
        drumType,
        currentProductId,
        workOrderId,
        customerId,
        currentWarehouseId,
        search,
      });

      ApiResponseUtil.success(res, result.drums, 'Drums retrieved successfully', 200, {
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDrumById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drum = await packingService.getDrumById(req.params.id);
      ApiResponseUtil.success(res, drum, 'Drum retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateDrum(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const drum = await packingService.updateDrum(req.params.id, req.body, userId);
      ApiResponseUtil.success(res, drum, 'Drum updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getDrumHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await packingService.getDrumHistory(req.params.id);
      ApiResponseUtil.success(res, history, 'Drum history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // Packing Lists
  async createPackingList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const packingList = await packingService.createPackingList(req.body, userId);
      ApiResponseUtil.created(res, packingList, 'Packing list created in draft status');
    } catch (err) {
      next(err);
    }
  }

  async listPackingLists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const workOrderId = req.query.workOrderId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await packingService.listPackingLists({
        page,
        limit,
        workOrderId,
        customerId,
        status,
        search,
      });

      ApiResponseUtil.success(
        res,
        result.packingLists,
        'Packing lists retrieved successfully',
        200,
        {
          pagination: result.pagination,
        },
      );
    } catch (err) {
      next(err);
    }
  }

  async getPackingListById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const packingList = await packingService.getPackingListById(req.params.id);
      ApiResponseUtil.success(res, packingList, 'Packing list retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updatePackingList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const packingList = await packingService.updatePackingList(req.params.id, req.body, userId);
      ApiResponseUtil.success(res, packingList, 'Packing list updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async receiveCustomerDrums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const result = await packingService.receiveCustomerDrums(req.body, userId);
      ApiResponseUtil.created(
        res,
        result,
        'Customer drums received successfully and inbound challan logged',
      );
    } catch (err) {
      next(err);
    }
  }

  async packPackingList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const packingList = await packingService.packPackingList(req.params.id, userId);
      ApiResponseUtil.success(
        res,
        packingList,
        'Packing list successfully finalized and drums packed',
      );
    } catch (err) {
      next(err);
    }
  }

  async cancelPackingList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const packingList = await packingService.cancelPackingList(
        req.params.id,
        req.body.reason,
        userId,
      );
      ApiResponseUtil.success(
        res,
        packingList,
        'Packing list cancelled and drums released back to available pool',
      );
    } catch (err) {
      next(err);
    }
  }

  async getPackingListDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await packingService.getPackingListDocument(req.params.id);
      ApiResponseUtil.success(res, document, 'Packing list document rendered successfully');
    } catch (err) {
      next(err);
    }
  }

  async generateChallanFromPackingList(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = (req.user as unknown as { _id?: string })?._id?.toString();
      const challan = await packingService.generateChallanFromPackingList(
        req.params.id,
        req.body,
        userId,
      );
      ApiResponseUtil.created(res, challan, 'Outbound delivery challan generated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const packingController = new PackingController();
