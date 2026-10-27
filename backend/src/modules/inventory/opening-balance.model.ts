import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type OpeningBalanceStatus = 'DRAFT' | 'POSTED';

export interface IOpeningBalance extends Document {
  openingBalanceNumber: string;
  materialId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  valuationRate?: number;
  effectiveDate: Date;
  status: OpeningBalanceStatus;
  createdBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const openingBalanceSchema = new Schema<IOpeningBalance>(
  {
    openingBalanceNumber: {
      type: String,
      required: [true, 'Opening balance number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required'],
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
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.000001, 'Quantity must be greater than 0'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    valuationRate: {
      type: Number,
      min: [0, 'Valuation rate cannot be negative'],
    },
    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'POSTED'],
      default: 'DRAFT',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: {
      type: Date,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

openingBalanceSchema.index({ materialId: 1, warehouseId: 1, status: 1 });

export const OpeningBalanceModel: Model<IOpeningBalance> =
  mongoose.models.OpeningBalance ||
  mongoose.model<IOpeningBalance>('OpeningBalance', openingBalanceSchema);
