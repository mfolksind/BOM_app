import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export interface IMaterialIssueLine extends Document {
  materialIssueId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  issuedQuantity: number;
  unit: string;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialIssueLineSchema = new Schema<IMaterialIssueLine>(
  {
    materialIssueId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialIssue',
      required: [true, 'Material Issue reference is required'],
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
    issuedQuantity: {
      type: Number,
      required: [true, 'Issued quantity is required'],
      min: [0.000001, 'Issued quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    inventoryTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
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

materialIssueLineSchema.index({ materialIssueId: 1, materialId: 1 });
materialIssueLineSchema.index({ lotId: 1 });

export const MaterialIssueLineModel: Model<IMaterialIssueLine> =
  mongoose.models.MaterialIssueLine ||
  mongoose.model<IMaterialIssueLine>('MaterialIssueLine', materialIssueLineSchema);
