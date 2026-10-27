import mongoose, { Schema, Document, Model } from 'mongoose';

export type DispatchStatus =
  'DRAFT' | 'READY_FOR_DISPATCH' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface IDispatch extends Document {
  dispatchNumber: string;
  workOrderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  packingListId?: mongoose.Types.ObjectId;
  packingListIds: mongoose.Types.ObjectId[];
  sourceWarehouseId?: mongoose.Types.ObjectId;
  destinationAddress?: string;
  vehicleNumber?: string;
  transporter?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;
  eWayBillNumber?: string;
  eWayBillDate?: Date;
  totalDrums: number;
  totalLengthMeters: number;
  totalNetWeightKg: number;
  totalTareWeightKg: number;
  totalGrossWeightKg: number;
  status: DispatchStatus;
  dispatchedAt?: Date;
  dispatchedBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelReason?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dispatchSchema = new Schema<IDispatch>(
  {
    dispatchNumber: {
      type: String,
      required: [true, 'Dispatch number is required'],
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
      required: [true, 'Customer reference is required'],
    },
    packingListId: {
      type: Schema.Types.ObjectId,
      ref: 'PackingList',
    },
    packingListIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'PackingList',
        },
      ],
      default: [],
    },
    sourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    destinationAddress: {
      type: String,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    transporter: {
      type: String,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    lrNumber: {
      type: String,
      trim: true,
    },
    eWayBillNumber: {
      type: String,
      trim: true,
    },
    eWayBillDate: {
      type: Date,
    },
    totalDrums: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total drums cannot be negative'],
    },
    totalLengthMeters: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total length cannot be negative'],
    },
    totalNetWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total net weight cannot be negative'],
    },
    totalTareWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total tare weight cannot be negative'],
    },
    totalGrossWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total gross weight cannot be negative'],
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'DRAFT',
    },
    dispatchedAt: {
      type: Date,
    },
    dispatchedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelReason: {
      type: String,
      trim: true,
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

dispatchSchema.index({ workOrderId: 1, customerId: 1 });
dispatchSchema.index({ status: 1 });
dispatchSchema.index({ customerId: 1, dispatchedAt: -1 });

export const DispatchModel: Model<IDispatch> =
  mongoose.models.Dispatch || mongoose.model<IDispatch>('Dispatch', dispatchSchema);
