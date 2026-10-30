import mongoose, { Schema, Document, Model } from 'mongoose';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'CLOSED';

export type WorkOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface IBomSnapshotItem {
  materialId: mongoose.Types.ObjectId;
  materialCode: string;
  materialName: string;
  quantityPerUnit: number;
  scrapTolerancePercentage: number;
  stageSequence: number;
  unit: string;
  processStageId?: mongoose.Types.ObjectId;
}

export interface IBomSnapshot {
  bomVersionId: mongoose.Types.ObjectId;
  bomNumber: string;
  versionNumber: number;
  batchSize: number;
  outputUnit: string;
  items: IBomSnapshotItem[];
}

export interface IWorkOrder extends Document {
  workOrderNumber: string;
  customerId: mongoose.Types.ObjectId;
  inboundChallanId?: mongoose.Types.ObjectId;
  inboundChallanNumber?: string;
  customerPoNumber?: string;
  customerPoDate?: Date;
  productId: mongoose.Types.ObjectId;
  bomVersionId: mongoose.Types.ObjectId;
  bomSnapshot?: IBomSnapshot;
  orderedLengthMeters: number;
  deliveredLengthMeters: number;
  jobWorkRatePerMeter?: number;
  targetDeliveryDate: Date;
  plannedStartDate?: Date;
  plannedCompletionDate?: Date;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  remarks?: string;
  notes?: string;
  customerSpecifications?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  confirmedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  heldAt?: Date;
  heldReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bomSnapshotItemSchema = new Schema<IBomSnapshotItem>(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
    },
    materialCode: { type: String, required: true },
    materialName: { type: String, required: true },
    quantityPerUnit: { type: Number, required: true },
    scrapTolerancePercentage: { type: Number, default: 0 },
    stageSequence: { type: Number, default: 1 },
    unit: { type: String, required: true },
    processStageId: { type: Schema.Types.ObjectId, ref: 'ProcessStage' },
  },
  { _id: false },
);

const bomSnapshotSchema = new Schema<IBomSnapshot>(
  {
    bomVersionId: { type: Schema.Types.ObjectId, ref: 'BomVersion', required: true },
    bomNumber: { type: String, required: true },
    versionNumber: { type: Number, required: true },
    batchSize: { type: Number, required: true },
    outputUnit: { type: String, required: true },
    items: [bomSnapshotItemSchema],
  },
  { _id: false },
);

const workOrderSchema = new Schema<IWorkOrder>(
  {
    workOrderNumber: {
      type: String,
      required: [true, 'Work order number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
    },
    inboundChallanId: {
      type: Schema.Types.ObjectId,
      ref: 'InboundChallan',
    },
    inboundChallanNumber: {
      type: String,
      trim: true,
    },
    customerPoNumber: {
      type: String,
      trim: true,
    },
    customerPoDate: {
      type: Date,
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
    bomSnapshot: {
      type: bomSnapshotSchema,
      default: undefined,
    },
    orderedLengthMeters: {
      type: Number,
      required: [true, 'Ordered length in meters is required'],
      min: [1, 'Ordered length must be at least 1 meter'],
    },
    deliveredLengthMeters: {
      type: Number,
      default: 0,
      min: [0, 'Delivered length cannot be negative'],
    },
    jobWorkRatePerMeter: {
      type: Number,
      min: [0, 'Job work rate cannot be negative'],
    },
    targetDeliveryDate: {
      type: Date,
    },
    plannedStartDate: {
      type: Date,
    },
    plannedCompletionDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
    },
    status: {
      type: String,
      required: true,
      enum: [
        'DRAFT',
        'CONFIRMED',
        'IN_PROGRESS',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED',
        'APPROVED',
        'IN_PRODUCTION',
        'CLOSED',
      ],
      default: 'DRAFT',
    },
    remarks: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    customerSpecifications: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    confirmedAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
    heldAt: {
      type: Date,
    },
    heldReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

workOrderSchema.index({ customerId: 1, status: 1 });
workOrderSchema.index({ inboundChallanId: 1 });
workOrderSchema.index({ productId: 1 });
workOrderSchema.index({ targetDeliveryDate: 1 });
workOrderSchema.index({ status: 1 });

export const WorkOrderModel: Model<IWorkOrder> =
  mongoose.models.WorkOrder || mongoose.model<IWorkOrder>('WorkOrder', workOrderSchema);
