import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type ScrapType =
  | 'COPPER_SCRAP'
  | 'ALUMINUM_SCRAP'
  | 'PVC_LUMPS'
  | 'XLPE_LUMPS'
  | 'PROCESS_WASTE'
  | 'END_PIECES'
  | 'ARMOUR_WIRE_OFFCUTS';

export type ScrapCategory = 'REUSABLE' | 'SALEABLE' | 'PROCESS_LOSS' | 'REJECTED';

export type ScrapRecordStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface IScrapRecord extends Document {
  scrapNumber: string;
  productionOrderId?: mongoose.Types.ObjectId;
  productionBatchId?: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  processStageId?: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  scrapType: ScrapType;
  scrapCategory: ScrapCategory;
  scrapQuantity: number;
  unit: string;
  sourceWarehouseId?: mongoose.Types.ObjectId;
  scrapWarehouseId: mongoose.Types.ObjectId;
  status: ScrapRecordStatus;
  reason?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedAt: Date;
  postedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scrapRecordSchema = new Schema<IScrapRecord>(
  {
    scrapNumber: {
      type: String,
      required: [true, 'Scrap record number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    productionBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionBatch',
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    processStageId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStage',
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
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
    },
    scrapType: {
      type: String,
      required: [true, 'Scrap type is required'],
      enum: [
        'COPPER_SCRAP',
        'ALUMINUM_SCRAP',
        'PVC_LUMPS',
        'XLPE_LUMPS',
        'PROCESS_WASTE',
        'END_PIECES',
        'ARMOUR_WIRE_OFFCUTS',
      ],
    },
    scrapCategory: {
      type: String,
      required: true,
      enum: ['REUSABLE', 'SALEABLE', 'PROCESS_LOSS', 'REJECTED'],
      default: 'SALEABLE',
    },
    scrapQuantity: {
      type: Number,
      required: [true, 'Scrap quantity is required'],
      min: [0.000001, 'Scrap quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      default: 'KG',
    },
    sourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    scrapWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Scrap warehouse reference is required'],
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'POSTED', 'CANCELLED'],
      default: 'POSTED',
    },
    reason: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
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
  },
  {
    timestamps: true,
  },
);

scrapRecordSchema.index({ materialId: 1, scrapType: 1 });
scrapRecordSchema.index({ productionOrderId: 1 });

export const ScrapRecordModel: Model<IScrapRecord> =
  mongoose.models.ScrapRecord || mongoose.model<IScrapRecord>('ScrapRecord', scrapRecordSchema);
