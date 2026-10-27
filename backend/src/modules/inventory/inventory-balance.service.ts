import mongoose from 'mongoose';
import { InventoryBalanceModel, IInventoryBalance } from './inventory-balance.model';
import { StockOwnerType } from '../materials/material-lot.model';
import { BadRequestError } from '../../common/errors';

export interface StockChangeParams {
  materialId: mongoose.Types.ObjectId | string;
  warehouseId: mongoose.Types.ObjectId | string;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId | string | null;
  lotId?: mongoose.Types.ObjectId | string | null;
  quantity: number;
  unit: string;
  transactionId?: mongoose.Types.ObjectId | string;
  session?: mongoose.ClientSession;
}

export class InventoryBalanceService {
  /**
   * Helper to normalize ownership and dimensions for query/upsert
   */
  private normalizeDimensions(params: {
    materialId: mongoose.Types.ObjectId | string;
    warehouseId: mongoose.Types.ObjectId | string;
    ownerType: StockOwnerType;
    customerId?: mongoose.Types.ObjectId | string | null;
    lotId?: mongoose.Types.ObjectId | string | null;
  }) {
    const materialId = new mongoose.Types.ObjectId(params.materialId.toString());
    const warehouseId = new mongoose.Types.ObjectId(params.warehouseId.toString());
    const ownerType = params.ownerType;

    if (ownerType === 'CUSTOMER' && !params.customerId) {
      throw new BadRequestError('Customer reference is required for customer-owned stock');
    }

    const customerId =
      ownerType === 'CUSTOMER' && params.customerId
        ? new mongoose.Types.ObjectId(params.customerId.toString())
        : null;

    const lotId = params.lotId ? new mongoose.Types.ObjectId(params.lotId.toString()) : null;

    return { materialId, warehouseId, ownerType, customerId, lotId };
  }

  /**
   * Atomically increase stock (Receipt, Opening Balance, Transfer In, Adjustment In)
   */
  async increaseStock(params: StockChangeParams): Promise<IInventoryBalance> {
    if (params.quantity <= 0) {
      throw new BadRequestError('Quantity to increase must be strictly positive');
    }

    const filter = this.normalizeDimensions(params);
    const options = {
      new: true,
      upsert: true,
      ...(params.session ? { session: params.session } : {}),
    };

    const updated = await InventoryBalanceModel.findOneAndUpdate(
      filter,
      {
        $inc: {
          quantityOnHand: params.quantity,
          quantityAvailable: params.quantity,
        },
        $set: {
          unit: params.unit,
          ...(params.transactionId
            ? { lastTransactionId: new mongoose.Types.ObjectId(params.transactionId.toString()) }
            : {}),
        },
        $setOnInsert: {
          quantityReserved: 0,
        },
      },
      options,
    );

    if (!updated) {
      throw new BadRequestError('Failed to update inventory balance projection');
    }

    return updated;
  }

  /**
   * Atomically decrease stock (Transfer Out, Adjustment Out, Issue)
   */
  async decreaseStock(params: StockChangeParams): Promise<IInventoryBalance> {
    if (params.quantity <= 0) {
      throw new BadRequestError('Quantity to decrease must be strictly positive');
    }

    const filter = this.normalizeDimensions(params);
    const options = {
      new: true,
      ...(params.session ? { session: params.session } : {}),
    };

    // If a specific lot is requested
    if (filter.lotId) {
      const updated = await InventoryBalanceModel.findOneAndUpdate(
        {
          ...filter,
          quantityOnHand: { $gte: params.quantity },
          quantityAvailable: { $gte: params.quantity },
        },
        {
          $inc: {
            quantityOnHand: -params.quantity,
            quantityAvailable: -params.quantity,
          },
          $set: {
            ...(params.transactionId
              ? { lastTransactionId: new mongoose.Types.ObjectId(params.transactionId.toString()) }
              : {}),
          },
        },
        options,
      );

      if (!updated) {
        throw new BadRequestError(
          `Insufficient available stock for material ${filter.materialId} in warehouse ${filter.warehouseId} (lot ${filter.lotId}). Requested: ${params.quantity}`,
        );
      }
      return updated;
    }

    // If no lot specified, first try exact lotId: null bucket
    let updated = await InventoryBalanceModel.findOneAndUpdate(
      {
        ...filter,
        lotId: null,
        quantityOnHand: { $gte: params.quantity },
        quantityAvailable: { $gte: params.quantity },
      },
      {
        $inc: {
          quantityOnHand: -params.quantity,
          quantityAvailable: -params.quantity,
        },
        $set: {
          ...(params.transactionId
            ? { lastTransactionId: new mongoose.Types.ObjectId(params.transactionId.toString()) }
            : {}),
        },
      },
      options,
    );

    // If not found, find any matching bucket with sufficient available quantity
    if (!updated) {
      updated = await InventoryBalanceModel.findOneAndUpdate(
        {
          materialId: filter.materialId,
          warehouseId: filter.warehouseId,
          ownerType: filter.ownerType,
          customerId: filter.customerId,
          quantityOnHand: { $gte: params.quantity },
          quantityAvailable: { $gte: params.quantity },
        },
        {
          $inc: {
            quantityOnHand: -params.quantity,
            quantityAvailable: -params.quantity,
          },
          $set: {
            ...(params.transactionId
              ? { lastTransactionId: new mongoose.Types.ObjectId(params.transactionId.toString()) }
              : {}),
          },
        },
        options,
      );
    }

    if (!updated) {
      throw new BadRequestError(
        `Insufficient available stock for material ${filter.materialId} in warehouse ${filter.warehouseId}. Requested: ${params.quantity}`,
      );
    }

    return updated;
  }

  /**
   * Atomically reserve stock (Material Reservation)
   * Decrements quantityAvailable, increments quantityReserved, keeps quantityOnHand constant.
   */
  async reserveStock(params: Omit<StockChangeParams, 'transactionId'>): Promise<IInventoryBalance> {
    if (params.quantity <= 0) {
      throw new BadRequestError('Quantity to reserve must be strictly positive');
    }

    const filter = this.normalizeDimensions(params);
    const options = {
      new: true,
      ...(params.session ? { session: params.session } : {}),
    };

    // If a specific lot is requested
    if (filter.lotId) {
      const updated = await InventoryBalanceModel.findOneAndUpdate(
        {
          ...filter,
          quantityAvailable: { $gte: params.quantity },
        },
        {
          $inc: {
            quantityReserved: params.quantity,
            quantityAvailable: -params.quantity,
          },
        },
        options,
      );

      if (!updated) {
        throw new BadRequestError(
          `Insufficient available stock in specified lot ${filter.lotId}. Requested: ${params.quantity}`,
        );
      }
      return updated;
    }

    // If no lot restriction, try exact lotId: null bucket first
    let updated = await InventoryBalanceModel.findOneAndUpdate(
      {
        ...filter,
        lotId: null,
        quantityAvailable: { $gte: params.quantity },
      },
      {
        $inc: {
          quantityReserved: params.quantity,
          quantityAvailable: -params.quantity,
        },
      },
      options,
    );

    // If not found, find any matching bucket with sufficient available quantity
    if (!updated) {
      updated = await InventoryBalanceModel.findOneAndUpdate(
        {
          materialId: filter.materialId,
          warehouseId: filter.warehouseId,
          ownerType: filter.ownerType,
          customerId: filter.customerId,
          quantityAvailable: { $gte: params.quantity },
        },
        {
          $inc: {
            quantityReserved: params.quantity,
            quantityAvailable: -params.quantity,
          },
        },
        options,
      );
    }

    if (!updated) {
      throw new BadRequestError(
        `Insufficient available stock to reserve ${params.quantity} ${params.unit} of material ${filter.materialId} in warehouse ${filter.warehouseId}`,
      );
    }

    return updated;
  }

  /**
   * Atomically release reserved stock
   * Increments quantityAvailable, decrements quantityReserved, keeps quantityOnHand constant.
   */
  async releaseReservation(
    params: Omit<StockChangeParams, 'transactionId'>,
  ): Promise<IInventoryBalance> {
    if (params.quantity <= 0) {
      throw new BadRequestError('Quantity to release must be strictly positive');
    }

    const filter = this.normalizeDimensions(params);
    const options = {
      new: true,
      ...(params.session ? { session: params.session } : {}),
    };

    // Try releasing on exact lot bucket if lotId was provided
    if (filter.lotId) {
      const updated = await InventoryBalanceModel.findOneAndUpdate(
        {
          ...filter,
          quantityReserved: { $gte: params.quantity },
        },
        {
          $inc: {
            quantityReserved: -params.quantity,
            quantityAvailable: params.quantity,
          },
        },
        options,
      );

      if (updated) return updated;
    }

    // Otherwise release from any matching bucket with sufficient reserved quantity
    const updated = await InventoryBalanceModel.findOneAndUpdate(
      {
        materialId: filter.materialId,
        warehouseId: filter.warehouseId,
        ownerType: filter.ownerType,
        customerId: filter.customerId,
        quantityReserved: { $gte: params.quantity },
      },
      {
        $inc: {
          quantityReserved: -params.quantity,
          quantityAvailable: params.quantity,
        },
      },
      options,
    );

    if (!updated) {
      throw new BadRequestError(
        `Cannot release reservation: insufficient reserved stock found in warehouse ${filter.warehouseId}`,
      );
    }

    return updated;
  }

  /**
   * Atomically adjust stock (Stock Reconciliation)
   */
  async adjustStock(
    params: StockChangeParams & { discrepancyQuantity: number },
  ): Promise<IInventoryBalance | null> {
    if (params.discrepancyQuantity > 0) {
      return this.increaseStock({
        ...params,
        quantity: params.discrepancyQuantity,
      });
    } else if (params.discrepancyQuantity < 0) {
      return this.decreaseStock({
        ...params,
        quantity: Math.abs(params.discrepancyQuantity),
      });
    }

    // discrepancy === 0
    const filter = this.normalizeDimensions(params);
    return InventoryBalanceModel.findOne(filter);
  }

  /**
   * Get single inventory balance
   */
  async getBalance(params: {
    materialId: string;
    warehouseId: string;
    ownerType: StockOwnerType;
    customerId?: string | null;
    lotId?: string | null;
  }): Promise<IInventoryBalance | null> {
    const filter = this.normalizeDimensions(params);
    let doc = await InventoryBalanceModel.findOne(filter);
    if (!doc && !filter.lotId) {
      doc = await InventoryBalanceModel.findOne({
        materialId: filter.materialId,
        warehouseId: filter.warehouseId,
        ownerType: filter.ownerType,
        customerId: filter.customerId,
      });
    }
    return doc;
  }
}

export const inventoryBalanceService = new InventoryBalanceService();
