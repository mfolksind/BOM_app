import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export interface IGlobalStockSummary extends Document {
  date: Date;
  materialId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  openingQuantity: number;
  receiptsQuantity: number;
  transfersInQuantity: number;
  transfersOutQuantity: number;
  issuedToProductionQuantity: number;
  consumedQuantity: number;
  returnsFromProductionQuantity: number;
  scrapQuantity: number;
  adjustmentsQuantity: number;
  closingQuantity: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

const globalStockSummarySchema = new Schema<IGlobalStockSummary>(
  {
    date: {
      type: Date,
      required: [true, 'Stock summary snapshot date is required'],
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
    openingQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Opening quantity cannot be negative'],
    },
    receiptsQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Receipts quantity cannot be negative'],
    },
    transfersInQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Transfers in quantity cannot be negative'],
    },
    transfersOutQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Transfers out quantity cannot be negative'],
    },
    issuedToProductionQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Issued to production quantity cannot be negative'],
    },
    consumedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Consumed quantity cannot be negative'],
    },
    returnsFromProductionQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Returns from production quantity cannot be negative'],
    },
    scrapQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Scrap quantity cannot be negative'],
    },
    adjustmentsQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    closingQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Closing quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index preventing duplicate daily summaries for the same scope
globalStockSummarySchema.index(
  {
    date: 1,
    materialId: 1,
    warehouseId: 1,
    ownerType: 1,
    customerId: 1,
  },
  { unique: true },
);

globalStockSummarySchema.index({ date: -1, materialId: 1 });

export const GlobalStockSummaryModel: Model<IGlobalStockSummary> =
  mongoose.models.GlobalStockSummary ||
  mongoose.model<IGlobalStockSummary>('GlobalStockSummary', globalStockSummarySchema);
