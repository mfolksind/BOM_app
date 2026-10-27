import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductionBatchStatus = 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'HALTED' | 'REJECTED';

export type ProductionShift = 'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C';

export interface IProductionBatch extends Document {
  batchNumber: string;
  productionOrderId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  processStageId: mongoose.Types.ObjectId;
  machineCode: string;
  operatorId?: mongoose.Types.ObjectId;
  plannedQuantity: number;
  completedQuantity: number;
  unit: string;
  status: ProductionBatchStatus;
  shift?: ProductionShift;
  startedAt?: Date;
  completedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productionBatchSchema = new Schema<IProductionBatch>(
  {
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: [true, 'Production Order reference is required'],
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
    machineCode: {
      type: String,
      required: [true, 'Machine code is required'],
      trim: true,
      uppercase: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    plannedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Planned quantity cannot be negative'],
    },
    completedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Completed quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      default: 'METER',
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'IN_PROCESS', 'COMPLETED', 'HALTED', 'REJECTED'],
      default: 'PENDING',
    },
    shift: {
      type: String,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
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

productionBatchSchema.index({ productionOrderId: 1, processStageId: 1 });
productionBatchSchema.index({ status: 1 });

export const ProductionBatchModel: Model<IProductionBatch> =
  mongoose.models.ProductionBatch ||
  mongoose.model<IProductionBatch>('ProductionBatch', productionBatchSchema);
