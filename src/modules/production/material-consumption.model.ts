import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type MaterialConsumptionStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface IMaterialConsumption extends Document {
  consumptionNumber: string;
  productionOrderId: mongoose.Types.ObjectId;
  productionBatchId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  processStageId: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  materialIssueLineId?: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  consumedQuantity: number;
  unit: string;
  status: MaterialConsumptionStatus;
  consumedAt: Date;
  postedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  recordedBy?: mongoose.Types.ObjectId;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialConsumptionSchema = new Schema<IMaterialConsumption>(
  {
    consumptionNumber: {
      type: String,
      required: [true, 'Consumption number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: [true, 'Production Order reference is required'],
    },
    productionBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionBatch',
      required: [true, 'Production Batch reference is required'],
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    processStageId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStage',
      required: [true, 'Process Stage reference is required'],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    materialIssueLineId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialIssueLine',
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
    consumedQuantity: {
      type: Number,
      required: [true, 'Consumed quantity is required'],
      min: [0.000001, 'Consumed quantity must be positive'],
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
      default: 'POSTED',
    },
    consumedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    postedAt: {
      type: Date,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inventoryTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
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

materialConsumptionSchema.index({ productionBatchId: 1, materialId: 1 });
materialConsumptionSchema.index({ productionOrderId: 1 });

export const MaterialConsumptionModel: Model<IMaterialConsumption> =
  mongoose.models.MaterialConsumption ||
  mongoose.model<IMaterialConsumption>('MaterialConsumption', materialConsumptionSchema);
