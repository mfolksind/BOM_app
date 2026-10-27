import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type ReconciliationStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'POSTED';

export interface IStockReconciliation extends Document {
  reconciliationNumber: string;
  warehouseId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  systemQuantity: number;
  physicalQuantity: number;
  discrepancyQuantity: number;
  unit: string;
  reason: string;
  status: ReconciliationStatus;
  conductedBy?: mongoose.Types.ObjectId;
  conductedAt: Date;
  approvedBy?: mongoose.Types.ObjectId;
  appliedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockReconciliationSchema = new Schema<IStockReconciliation>(
  {
    reconciliationNumber: {
      type: String,
      required: [true, 'Reconciliation number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required'],
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
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
    systemQuantity: {
      type: Number,
      required: [true, 'System recorded quantity is required'],
      min: [0, 'System quantity cannot be negative'],
    },
    physicalQuantity: {
      type: Number,
      required: [true, 'Physical counted quantity is required'],
      min: [0, 'Physical quantity cannot be negative'],
    },
    discrepancyQuantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for reconciliation is required'],
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'APPROVED', 'REJECTED', 'APPLIED', 'POSTED'],
      default: 'DRAFT',
    },
    conductedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    conductedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    appliedAt: {
      type: Date,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: {
      type: Date,
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

stockReconciliationSchema.index({ warehouseId: 1, materialId: 1, status: 1 });

export const StockReconciliationModel: Model<IStockReconciliation> =
  mongoose.models.StockReconciliation ||
  mongoose.model<IStockReconciliation>('StockReconciliation', stockReconciliationSchema);
