import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type StockMovementType = 'INWARD' | 'OUTWARD' | 'TRANSFER' | 'ADJUSTMENT';

export type InventoryTransactionType =
  | 'RECEIPT'
  | 'ISSUE_TO_PRODUCTION'
  | 'CONSUMPTION'
  | 'PRODUCTION_RECEIPT'
  | 'RETURN_TO_STORE'
  | 'SCRAP'
  | 'DISPATCH'
  | 'OPENING_BALANCE'
  | 'STOCK_ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RESERVATION'
  | 'RESERVATION_RELEASE'
  | 'REVERSAL';

export type InventoryTransactionStatus = 'POSTED' | 'REVERSED';

export type SourceDocumentType =
  | 'INBOUND_CHALLAN'
  | 'MATERIAL_ISSUE'
  | 'PRODUCTION_OUTPUT'
  | 'MATERIAL_CONSUMPTION'
  | 'SCRAP_RECORD'
  | 'DISPATCH'
  | 'OPENING_BALANCE'
  | 'STOCK_RECONCILIATION'
  | 'STOCK_TRANSFER'
  | 'MATERIAL_RESERVATION'
  | 'MATERIAL_RETURN'
  | 'OUTBOUND_CHALLAN';

export interface IInventoryTransaction extends Document {
  transactionNumber: string;
  movementType: StockMovementType;
  transactionType: InventoryTransactionType;
  materialId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  status: InventoryTransactionStatus;
  sourceDocumentType: SourceDocumentType;
  sourceDocumentId: mongoose.Types.ObjectId;
  sourceDocumentLineId?: mongoose.Types.ObjectId;
  reversalTransactionId?: mongoose.Types.ObjectId;
  postedAt: Date;
  postedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    transactionNumber: {
      type: String,
      required: [true, 'Transaction number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    movementType: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: ['INWARD', 'OUTWARD', 'TRANSFER', 'ADJUSTMENT'],
    },
    transactionType: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: [
        'RECEIPT',
        'ISSUE_TO_PRODUCTION',
        'CONSUMPTION',
        'PRODUCTION_RECEIPT',
        'RETURN_TO_STORE',
        'SCRAP',
        'DISPATCH',
        'OPENING_BALANCE',
        'STOCK_ADJUSTMENT',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'RESERVATION',
        'RESERVATION_RELEASE',
        'REVERSAL',
      ],
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
      required: [true, 'Transaction quantity is required'],
      min: [0.000001, 'Transaction quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['POSTED', 'REVERSED'],
      default: 'POSTED',
    },
    sourceDocumentType: {
      type: String,
      required: [true, 'Source document type is required'],
      enum: [
        'INBOUND_CHALLAN',
        'MATERIAL_ISSUE',
        'PRODUCTION_OUTPUT',
        'MATERIAL_CONSUMPTION',
        'SCRAP_RECORD',
        'DISPATCH',
        'OPENING_BALANCE',
        'STOCK_RECONCILIATION',
        'STOCK_TRANSFER',
        'MATERIAL_RESERVATION',
        'MATERIAL_RETURN',
        'OUTBOUND_CHALLAN',
      ],
    },
    sourceDocumentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Source document reference is required'],
    },
    sourceDocumentLineId: {
      type: Schema.Types.ObjectId,
    },
    reversalTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
    },
    postedAt: {
      type: Date,
      required: true,
      default: Date.now,
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

inventoryTransactionSchema.index({ materialId: 1, warehouseId: 1, postedAt: -1 });
inventoryTransactionSchema.index({ ownerType: 1, customerId: 1 });
inventoryTransactionSchema.index({ sourceDocumentType: 1, sourceDocumentId: 1 });
inventoryTransactionSchema.index({ lotId: 1 });

export const InventoryTransactionModel: Model<IInventoryTransaction> =
  mongoose.models.InventoryTransaction ||
  mongoose.model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema);
