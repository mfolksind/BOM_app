import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type StockTransferStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface IStockTransfer extends Document {
  transferNumber: string;
  sourceWarehouseId: mongoose.Types.ObjectId;
  destinationWarehouseId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  status: StockTransferStatus;
  transferredBy?: mongoose.Types.ObjectId;
  transferredAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    transferNumber: {
      type: String,
      required: [true, 'Transfer number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    sourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse reference is required'],
    },
    destinationWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse reference is required'],
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
      default: null,
    },
    ownerType: {
      type: String,
      required: true,
      enum: ['FACTORY', 'CUSTOMER'],
      default: 'FACTORY',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      required: [
        function (this: IStockTransfer) {
          return this.ownerType === 'CUSTOMER';
        },
        'Customer reference is required when ownerType is CUSTOMER',
      ],
    },
    quantity: {
      type: Number,
      required: [true, 'Transfer quantity is required'],
      min: [0.000001, 'Transfer quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'POSTED', 'CANCELLED'],
      default: 'DRAFT',
    },
    transferredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    transferredAt: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

stockTransferSchema.index({ sourceWarehouseId: 1, destinationWarehouseId: 1 });
stockTransferSchema.index({ materialId: 1, status: 1 });

export const StockTransferModel: Model<IStockTransfer> =
  mongoose.models.StockTransfer ||
  mongoose.model<IStockTransfer>('StockTransfer', stockTransferSchema);
