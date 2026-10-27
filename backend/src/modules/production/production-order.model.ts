import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductionOrderStatus =
  'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'HALTED' | 'CANCELLED';

export interface IProductionOrder extends Document {
  productionOrderNumber: string;
  workOrderId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  bomVersionId: mongoose.Types.ObjectId;
  plannedLengthMeters: number;
  producedLengthMeters: number;
  startDate: Date;
  startedAt?: Date;
  targetCompletionDate: Date;
  status: ProductionOrderStatus;
  releasedBy?: mongoose.Types.ObjectId;
  releasedAt?: Date;
  completedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productionOrderSchema = new Schema<IProductionOrder>(
  {
    productionOrderNumber: {
      type: String,
      required: [true, 'Production order number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      required: [true, 'Work Order reference is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    bomVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'BomVersion',
      required: [true, 'BOM Version reference is required'],
    },
    plannedLengthMeters: {
      type: Number,
      required: [true, 'Planned length in meters is required'],
      min: [1, 'Planned length must be at least 1 meter'],
    },
    producedLengthMeters: {
      type: Number,
      default: 0,
      min: [0, 'Produced length cannot be negative'],
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    targetCompletionDate: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['RELEASED', 'IN_PROGRESS', 'COMPLETED', 'HALTED', 'CANCELLED'],
      default: 'RELEASED',
    },
    releasedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    releasedAt: {
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

productionOrderSchema.index({ workOrderId: 1, status: 1 });

export const ProductionOrderModel: Model<IProductionOrder> =
  mongoose.models.ProductionOrder ||
  mongoose.model<IProductionOrder>('ProductionOrder', productionOrderSchema);
