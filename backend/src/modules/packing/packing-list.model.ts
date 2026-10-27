import mongoose, { Schema, Document, Model } from 'mongoose';

export type PackingListStatus = 'DRAFT' | 'PACKED' | 'COMPLETED' | 'DISPATCHED' | 'CANCELLED';

export interface IPackingList extends Document {
  packingListNumber: string;
  workOrderId: mongoose.Types.ObjectId;
  workOrderNumber?: string;
  workOrderDate?: Date;
  sizeDescription?: string;
  customerId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  challanNumber?: string;
  outboundChallanId?: mongoose.Types.ObjectId;
  packingWarehouseId?: mongoose.Types.ObjectId;
  totalDrums: number;
  totalLengthMeters: number;
  totalNetWeightKg: number;
  totalTareWeightKg: number;
  totalGrossWeightKg: number;
  status: PackingListStatus;
  packedBy?: mongoose.Types.ObjectId;
  packedAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  packingDate: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const packingListSchema = new Schema<IPackingList>(
  {
    packingListNumber: {
      type: String,
      required: [true, 'Packing list number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      required: [true, 'Work Order reference is required'],
    },
    workOrderNumber: {
      type: String,
      trim: true,
    },
    workOrderDate: {
      type: Date,
    },
    sizeDescription: {
      type: String,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    challanNumber: {
      type: String,
      trim: true,
    },
    outboundChallanId: {
      type: Schema.Types.ObjectId,
      ref: 'OutboundChallan',
    },
    packingWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
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
      enum: ['DRAFT', 'PACKED', 'COMPLETED', 'DISPATCHED', 'CANCELLED'],
      default: 'DRAFT',
    },
    packedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    packedAt: {
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
    packingDate: {
      type: Date,
      required: true,
      default: Date.now,
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

packingListSchema.index({ workOrderId: 1, status: 1 });
packingListSchema.index({ customerId: 1, status: 1 });

export const PackingListModel: Model<IPackingList> =
  mongoose.models.PackingList || mongoose.model<IPackingList>('PackingList', packingListSchema);
