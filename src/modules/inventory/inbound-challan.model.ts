import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type InboundChallanStatus = 'DRAFT' | 'RECEIVED' | 'VERIFIED' | 'POSTED' | 'CANCELLED';

export interface IInboundChallan extends Document {
  challanNumber: string;
  customerChallanNumber: string;
  customerChallanDate: Date;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  vehicleNumber?: string;
  transporterName?: string;
  lrNumber?: string;
  status: InboundChallanStatus;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inboundChallanSchema = new Schema<IInboundChallan>(
  {
    challanNumber: {
      type: String,
      required: [true, 'Challan number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    customerChallanNumber: {
      type: String,
      required: [true, 'Customer challan number is required'],
      trim: true,
    },
    customerChallanDate: {
      type: Date,
      required: [true, 'Customer challan date is required'],
    },
    ownerType: {
      type: String,
      required: true,
      enum: ['FACTORY', 'CUSTOMER'],
      default: 'CUSTOMER',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      required: [
        function (this: IInboundChallan) {
          return this.ownerType === 'CUSTOMER';
        },
        'Customer reference is required when ownerType is CUSTOMER',
      ],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Receiving warehouse reference is required'],
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    transporterName: {
      type: String,
      trim: true,
    },
    lrNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'RECEIVED', 'VERIFIED', 'POSTED', 'CANCELLED'],
      default: 'DRAFT',
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: {
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

inboundChallanSchema.index({ customerId: 1, customerChallanNumber: 1 });
inboundChallanSchema.index({ status: 1, createdAt: -1 });

export const InboundChallanModel: Model<IInboundChallan> =
  mongoose.models.InboundChallan ||
  mongoose.model<IInboundChallan>('InboundChallan', inboundChallanSchema);
