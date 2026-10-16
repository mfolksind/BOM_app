import mongoose, { Schema, Document, Model } from 'mongoose';

export type OutputQualityStatus = 'PASSED' | 'PENDING' | 'REJECTED';

export interface IProductionOutput extends Document {
  outputNumber: string;
  productionOrderId: mongoose.Types.ObjectId;
  productionBatchId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  processStageId: mongoose.Types.ObjectId;
  outputLengthMeters: number;
  outputWeightKg: number;
  targetWarehouseId: mongoose.Types.ObjectId;
  isFinalStage: boolean;
  drumId?: mongoose.Types.ObjectId;
  qualityStatus: OutputQualityStatus;
  status: 'DRAFT' | 'POSTED';
  testedBy?: mongoose.Types.ObjectId;
  testReportNumber?: string;
  postedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productionOutputSchema = new Schema<IProductionOutput>(
  {
    outputNumber: {
      type: String,
      required: [true, 'Output number is required'],
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
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    processStageId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStage',
      required: [true, 'Process Stage reference is required'],
    },
    outputLengthMeters: {
      type: Number,
      required: [true, 'Output length in meters is required'],
      min: [0.000001, 'Output length must be positive'],
    },
    outputWeightKg: {
      type: Number,
      required: [true, 'Output weight in kg is required'],
      min: [0.000001, 'Output weight must be positive'],
    },
    targetWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Target warehouse reference is required'],
    },
    isFinalStage: {
      type: Boolean,
      default: false,
    },
    drumId: {
      type: Schema.Types.ObjectId,
      ref: 'Drum',
    },
    qualityStatus: {
      type: String,
      required: true,
      enum: ['PASSED', 'PENDING', 'REJECTED'],
      default: 'PENDING',
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'POSTED'],
      default: 'DRAFT',
    },
    testedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    testReportNumber: {
      type: String,
      trim: true,
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
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

productionOutputSchema.index({ productionBatchId: 1 });
productionOutputSchema.index({ productionOrderId: 1, isFinalStage: 1 });

export const ProductionOutputModel: Model<IProductionOutput> =
  mongoose.models.ProductionOutput ||
  mongoose.model<IProductionOutput>('ProductionOutput', productionOutputSchema);
