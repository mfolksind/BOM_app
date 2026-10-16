import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type MaterialReturnStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface IMaterialReturn extends Document {
  returnNumber: string;
  workOrderId?: mongoose.Types.ObjectId;
  productionOrderId?: mongoose.Types.ObjectId;
  productionBatchId?: mongoose.Types.ObjectId;
  materialIssueId?: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  returnQuantity: number;
  unit: string;
  sourceWarehouseId: mongoose.Types.ObjectId;
  destinationWarehouseId: mongoose.Types.ObjectId;
  status: MaterialReturnStatus;
  reason?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedAt: Date;
  postedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const materialReturnSchema = new Schema<IMaterialReturn>(
  {
    returnNumber: {
      type: String,
      required: [true, 'Return number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    productionBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionBatch',
    },
    materialIssueId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialIssue',
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
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
    },
    returnQuantity: {
      type: Number,
      required: [true, 'Return quantity is required'],
      min: [0.000001, 'Return quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    sourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source WIP warehouse is required'],
    },
    destinationWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required'],
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'POSTED', 'CANCELLED'],
      default: 'POSTED',
    },
    reason: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    postedAt: {
      type: Date,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inventoryTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
    },
  },
  {
    timestamps: true,
  },
);

materialReturnSchema.index({ productionBatchId: 1 });
materialReturnSchema.index({ workOrderId: 1 });
materialReturnSchema.index({ materialId: 1 });

export const MaterialReturnModel: Model<IMaterialReturn> =
  mongoose.models.MaterialReturn ||
  mongoose.model<IMaterialReturn>('MaterialReturn', materialReturnSchema);
